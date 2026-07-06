import { describe, expect, it } from 'vitest'
import { divRestoGenerator } from './division'
import { createRng } from '../../lib/rng'
import { DEFAULT_TEST_FLAVOR, propertyTestWithDeterminism, REAL_CHAPTER_FLAVORS } from '../testUtils'
import type { Exercise, Strategy } from '../../types/exercise'

/** Extracts every "N × M = P" claim from a strategy's steps. */
function extractMultiplicationClaims(strategy: Strategy): [number, number, number][] {
  const claims: [number, number, number][] = []
  const re = /(-?\d+)\s*×\s*(-?\d+)\s*=\s*(-?\d+)/g
  for (const step of strategy.steps) {
    for (const match of step.text.matchAll(re)) {
      claims.push([Number(match[1]), Number(match[2]), Number(match[3])])
    }
  }
  return claims
}

/** Extracts every "N ÷ M = Q" claim from a strategy's steps. */
function extractDivisionClaims(strategy: Strategy): [number, number, number][] {
  const claims: [number, number, number][] = []
  const re = /(-?\d+)\s*÷\s*(-?\d+)\s*=\s*(-?\d+)/g
  for (const step of strategy.steps) {
    for (const match of step.text.matchAll(re)) {
      claims.push([Number(match[1]), Number(match[2]), Number(match[3])])
    }
  }
  return claims
}

/** Extracts every "N − M = P" claim from a strategy's steps. */
function extractSubtractionClaims(strategy: Strategy): [number, number, number][] {
  const claims: [number, number, number][] = []
  const re = /(-?\d+)\s*−\s*(-?\d+)\s*=\s*(-?\d+)/g
  for (const step of strategy.steps) {
    for (const match of step.text.matchAll(re)) {
      claims.push([Number(match[1]), Number(match[2]), Number(match[3])])
    }
  }
  return claims
}

/** Extracts every N-ary "a + b (+ ...) = sum" claim from a strategy's steps. */
function extractAdditionClaims(strategy: Strategy): { addends: number[]; sum: number }[] {
  const claims: { addends: number[]; sum: number }[] = []
  const re = /(-?\d+(?:\s*\+\s*-?\d+)+)\s*=\s*(-?\d+)/g
  for (const step of strategy.steps) {
    for (const match of step.text.matchAll(re)) {
      const addends = match[1].split('+').map((s) => Number(s.trim()))
      claims.push({ addends, sum: Number(match[2]) })
    }
  }
  return claims
}

function assertStrategyArithmeticIsConsistent(strategy: Strategy) {
  for (const [n, m, p] of extractMultiplicationClaims(strategy)) {
    expect(n * m, `strategy "${strategy.id}": "${n} × ${m} = ${p}" is wrong (expected ${n * m})`).toBe(p)
  }
  for (const [n, m, q] of extractDivisionClaims(strategy)) {
    expect(Math.floor(n / m), `strategy "${strategy.id}": "${n} ÷ ${m} = ${q}" is wrong`).toBe(q)
  }
  for (const [n, m, p] of extractSubtractionClaims(strategy)) {
    expect(n - m, `strategy "${strategy.id}": "${n} − ${m} = ${p}" is wrong (expected ${n - m})`).toBe(p)
  }
  for (const { addends, sum } of extractAdditionClaims(strategy)) {
    const actual = addends.reduce((acc, n) => acc + n, 0)
    expect(actual, `strategy "${strategy.id}": "${addends.join(' + ')} = ${sum}" is wrong (expected ${actual})`).toBe(
      sum,
    )
  }
}

function assertStrategyEndsWithQuotientAndRemainder(strategy: Strategy, quotient: number, remainder: number) {
  const lastStep = strategy.steps[strategy.steps.length - 1]
  expect(lastStep, `strategy "${strategy.id}" has no steps`).toBeDefined()
  expect(
    lastStep.text.includes(String(quotient)),
    `strategy "${strategy.id}"'s final step "${lastStep.text}" does not mention quotient ${quotient}`,
  ).toBe(true)
  if (remainder > 0) {
    expect(
      lastStep.text.includes(String(remainder)),
      `strategy "${strategy.id}"'s final step "${lastStep.text}" does not mention remainder ${remainder}`,
    ).toBe(true)
  }
}

const DIFFICULTIES = [2, 3, 4, 5]

describe('divRestoGenerator', () => {
  it('divisor*quotient + remainder === dividend, 0 <= remainder < divisor, d2 forces remainder 0 (200 seeds x each difficulty)', () => {
    propertyTestWithDeterminism(divRestoGenerator, { difficulties: DIFFICULTIES }, (exercise, ctx) => {
      expect(exercise.subskill).toBe('div-resto')
      expect(exercise.difficulty).toBe(ctx.difficulty)

      // Recover divisor/dividend from the reparto-sucesivo or cajita strategy's arithmetic.
      const cajita = exercise.strategies.find((s) => s.id === 'cajita')
      expect(cajita, 'cajita strategy always present').toBeDefined()
      const firstStepMatch = cajita!.steps[0].text.match(/(\d+)\s*×\s*(\d+)\s*=\s*(\d+)\s*se acerca a\s*(\d+)/)
      expect(firstStepMatch, `cajita first step malformed: "${cajita!.steps[0].text}"`).toBeTruthy()
      if (!firstStepMatch) return

      const divisor = Number(firstStepMatch[1])
      const quotient = Number(firstStepMatch[2])
      const nearestMultiple = Number(firstStepMatch[3])
      const dividend = Number(firstStepMatch[4])
      expect(divisor * quotient).toBe(nearestMultiple)
      const remainder = dividend - nearestMultiple

      expect(divisor * quotient + remainder).toBe(dividend)
      expect(remainder).toBeGreaterThanOrEqual(0)
      expect(remainder).toBeLessThan(divisor)
      if (ctx.difficulty === 2) {
        expect(remainder).toBe(0)
      }
    })
  })

  it('every strategy is present (reparto-sucesivo + cajita always, descomposicion when dividend >= 100), arithmetic is consistent, and final step states quotient (+ remainder if nonzero)', () => {
    propertyTestWithDeterminism(divRestoGenerator, { difficulties: DIFFICULTIES }, (exercise) => {
      const strategyIds = exercise.strategies.map((s) => s.id)
      expect(strategyIds).toContain('reparto-sucesivo')
      expect(strategyIds).toContain('cajita')

      const cajita = exercise.strategies.find((s) => s.id === 'cajita')!
      const firstStepMatch = cajita.steps[0].text.match(/(\d+)\s*×\s*(\d+)\s*=\s*(\d+)\s*se acerca a\s*(\d+)/)
      expect(firstStepMatch).toBeTruthy()
      if (!firstStepMatch) return
      const divisor = Number(firstStepMatch[1])
      const quotient = Number(firstStepMatch[2])
      const nearestMultiple = Number(firstStepMatch[3])
      const dividend = Number(firstStepMatch[4])
      const remainder = dividend - nearestMultiple

      if (dividend >= 100) {
        expect(strategyIds).toContain('descomposicion')
      } else {
        expect(strategyIds).not.toContain('descomposicion')
      }

      for (const strategy of exercise.strategies) {
        expect(strategy.steps.length).toBeGreaterThanOrEqual(1)
        assertStrategyArithmeticIsConsistent(strategy)
        assertStrategyEndsWithQuotientAndRemainder(strategy, quotient, remainder)
      }
      void divisor
    })
  })

  it('rolls both repartir and agrupar meanings across many seeds, with phrasing matching the rolled meaning', () => {
    let repartirCount = 0
    let agruparCount = 0
    propertyTestWithDeterminism(divRestoGenerator, { difficulties: DIFFICULTIES, seeds: 200 }, (exercise) => {
      const text = exercise.prompt.text
      const isRepartir = /^Repartimos/.test(text)
      const isAgrupar = /^\d/.test(text)
      expect(isRepartir || isAgrupar, `prompt matches neither known template: "${text}"`).toBe(true)

      if (isRepartir) {
        repartirCount++
        const match = text.match(/entre (\d+)/)
        expect(match, `repartir prompt missing "entre N": "${text}"`).toBeTruthy()
      } else {
        agruparCount++
        const match = text.match(/(?:grupos|botes|cajas) de (\d+)/)
        expect(match, `agrupar prompt missing "grupos/botes/cajas de N": "${text}"`).toBeTruthy()
      }
    })
    expect(repartirCount).toBeGreaterThan(0)
    expect(agruparCount).toBeGreaterThan(0)
  })

  it('never mismatches "Cuántos/Cuántas" against a masculine/feminine noun (200 seeds x each difficulty)', () => {
    propertyTestWithDeterminism(divRestoGenerator, { difficulties: DIFFICULTIES, seeds: 200 }, (exercise) => {
      const text = exercise.prompt.text
      // Masculine nouns ("grupos", "botes", "pinchos de saté") must never follow "Cuántas".
      expect(text, `"${text}"`).not.toMatch(/Cuántas (grupos|botes|pinchos)/)
      // Feminine nouns ("cajas", "pegatinas", "fotos", "cartas", "canicas", "pulseras") must never follow "Cuántos".
      expect(text, `"${text}"`).not.toMatch(/Cuántos (cajas|pegatinas|fotos|cartas|canicas|pulseras)/)
    })
  })

  it('rolls both ask-quotient and ask-remainder variants, each with a correct answer.value', () => {
    let quotientVariantCount = 0
    let remainderVariantCount = 0
    propertyTestWithDeterminism(divRestoGenerator, { difficulties: DIFFICULTIES, seeds: 200 }, (exercise) => {
      expect(exercise.answer.kind).toBe('number')
      if (exercise.answer.kind !== 'number') return

      const cajita = exercise.strategies.find((s) => s.id === 'cajita')!
      const firstStepMatch = cajita.steps[0].text.match(/(\d+)\s*×\s*(\d+)\s*=\s*(\d+)\s*se acerca a\s*(\d+)/)
      if (!firstStepMatch) return
      const quotient = Number(firstStepMatch[2])
      const nearestMultiple = Number(firstStepMatch[3])
      const dividend = Number(firstStepMatch[4])
      const remainder = dividend - nearestMultiple

      const isRemainderQuestion = /sobran|quedan sin/.test(exercise.prompt.text)
      if (isRemainderQuestion) {
        remainderVariantCount++
        expect(remainder).toBeGreaterThan(0)
        expect(exercise.answer.value).toBe(remainder)
      } else {
        quotientVariantCount++
        expect(exercise.answer.value).toBe(quotient)
      }
    })
    expect(quotientVariantCount).toBeGreaterThan(0)
    expect(remainderVariantCount).toBeGreaterThan(0)
  })

  it('does not throw for NaN/Infinity/undefined difficulty and clamps to range-min (2)', () => {
    for (const bogusDifficulty of [NaN, Infinity, -Infinity, undefined]) {
      const rng = createRng('nan-guard-seed')
      let exercise: Exercise | undefined
      expect(() => {
        exercise = divRestoGenerator.generate(rng, bogusDifficulty as unknown as number, DEFAULT_TEST_FLAVOR)
      }).not.toThrow()
      expect(exercise).toBeDefined()
      expect(exercise!.difficulty).toBe(2)
      expect(Number.isFinite(exercise!.difficulty)).toBe(true)
    }
  })

  it.each(REAL_CHAPTER_FLAVORS.map((flavor) => ({ flavor, label: flavor.placeName })))(
    'produces well-formed prompt text for chapter place "$label"',
    ({ flavor }) => {
      propertyTestWithDeterminism(
        divRestoGenerator,
        { difficulties: DIFFICULTIES, flavor, seeds: 40, seedPrefix: `div-resto:${flavor.placeName}` },
        (exercise) => {
          const text = exercise.prompt.text
          expect(text).not.toMatch(/undefined/)
          expect(text).not.toMatch(/ {2,}/)
          expect(text).not.toMatch(/\d[a-zA-Z]/)
          expect(text.match(/^\d|^[A-ZÁÉÍÓÚÑ]/), `prompt does not start uppercase or with a digit: "${text}"`).toBeTruthy()
          expect(text).not.toMatch(/En En/)
        },
      )
    },
  )
})
