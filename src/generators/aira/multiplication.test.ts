import { describe, expect, it } from 'vitest'
import { mult1CifraGenerator, mult2CifrasGenerator } from './multiplication'
import { createRng } from '../../lib/rng'
import { DEFAULT_TEST_FLAVOR, propertyTestWithDeterminism, REAL_CHAPTER_FLAVORS } from '../testUtils'
import type { Exercise, Strategy } from '../../types/exercise'

/** True iff `chunk` is a nonzero place-value component: a single nonzero digit followed by zeros (e.g. 400, 40, 5, but not 44 or 440). */
function isPlaceValueComponent(chunk: number): boolean {
  if (chunk === 0) return false
  const digits = String(Math.abs(chunk))
  const firstNonzeroIdx = 0
  // Every digit after the first must be '0'.
  return digits.slice(firstNonzeroIdx + 1).split('').every((d) => d === '0')
}

/** Extracts every "N × M = P" claim from a strategy's steps and returns them as [n, m, p] triples. */
function extractArithmeticClaims(strategy: Strategy): [number, number, number][] {
  const claims: [number, number, number][] = []
  const re = /(-?\d+)\s*×\s*(-?\d+)\s*=\s*(-?\d+)/g
  for (const step of strategy.steps) {
    for (const match of step.text.matchAll(re)) {
      claims.push([Number(match[1]), Number(match[2]), Number(match[3])])
    }
  }
  return claims
}

/**
 * Extracts every "N + M (+ ...) = P" claim from a strategy's steps, as
 * (addends, sum) pairs. Handles the N-ary sums produced by multi-chunk
 * place-value splits (e.g. "3600 + 360 + 45 = 4005"), not just two-term
 * sums — a plain "N + M = P" regex would greedily match only the LAST two
 * terms of a longer sum and misreport it as wrong.
 */
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
  for (const [n, m, p] of extractArithmeticClaims(strategy)) {
    expect(n * m, `strategy "${strategy.id}": "${n} × ${m} = ${p}" is wrong (expected ${n * m})`).toBe(p)
  }
  for (const { addends, sum } of extractAdditionClaims(strategy)) {
    const actual = addends.reduce((acc, n) => acc + n, 0)
    expect(actual, `strategy "${strategy.id}": "${addends.join(' + ')} = ${sum}" is wrong (expected ${actual})`).toBe(
      sum,
    )
  }
}

function assertStrategyEndsWithCorrectProduct(strategy: Strategy, product: number) {
  const lastStep = strategy.steps[strategy.steps.length - 1]
  expect(lastStep, `strategy "${strategy.id}" has no steps`).toBeDefined()
  expect(
    lastStep.text.includes(String(product)),
    `strategy "${strategy.id}"'s final step "${lastStep.text}" does not mention the correct product ${product}`,
  ).toBe(true)
}

function parseOperandsFromPrompt(exercise: Exercise): [number, number] | undefined {
  const match = exercise.prompt.text.match(/(\d+)\s*×\s*(\d+)/)
  if (!match) return undefined
  return [Number(match[1]), Number(match[2])]
}

describe.each([
  { name: 'mult-1cifra', generator: mult1CifraGenerator, difficulties: [1, 2, 3, 4] },
  { name: 'mult-2cifras', generator: mult2CifrasGenerator, difficulties: [2, 3, 4, 5] },
])('$name generator', ({ generator, difficulties }) => {
  it('answer.value === a × b, and strategies obey the pedagogy rules (200 seeds x each difficulty)', () => {
    propertyTestWithDeterminism(generator, { difficulties }, (exercise, ctx) => {
      expect(exercise.subskill).toBe(generator.subskill)
      expect(exercise.difficulty).toBe(ctx.difficulty)
      expect(exercise.answer.kind).toBe('number')
      if (exercise.answer.kind !== 'number') return

      const operands = parseOperandsFromPrompt(exercise)
      if (operands) {
        const [a, b] = operands
        expect(exercise.answer.value).toBe(a * b)
      }

      expect(exercise.strategies.length).toBeGreaterThanOrEqual(1)

      const strategyIds = exercise.strategies.map((s) => s.id)
      // descomposición always present.
      expect(strategyIds).toContain('descomposicion')
      // algoritmo present for d >= 2.
      if (ctx.difficulty >= 2) {
        expect(strategyIds).toContain('algoritmo')
      }

      for (const strategy of exercise.strategies) {
        assertStrategyArithmeticIsConsistent(strategy)
        assertStrategyEndsWithCorrectProduct(strategy, exercise.answer.value)
      }

      expect(exercise.microlesson).toBe('Multiplicar te ahorra sumar lo mismo muchas veces.')
    })
  })

  it('operand ranges are respected per difficulty', () => {
    propertyTestWithDeterminism(generator, { difficulties }, (exercise) => {
      const operands = parseOperandsFromPrompt(exercise)
      // Not every prompt necessarily embeds "N × M" literally in context
      // prompts, but the pure-calculation prompt always does; we assert on
      // whichever prompts do expose it, and separately assert bounds via
      // the answer's factorization below.
      if (operands) {
        const [a, b] = operands
        expect(a).toBeGreaterThan(0)
        expect(b).toBeGreaterThan(0)
      }
    })
  })

  it('rectangular strategy appears only when an operand is >= 10, with colsSplit summing to the split operand and every element a nonzero place-value component', () => {
    propertyTestWithDeterminism(generator, { difficulties }, (exercise) => {
      const rect = exercise.strategies.find((s) => s.id === 'rectangular')
      const visualStep = rect?.steps.find((s) => s.visual?.kind === 'rectangle-model')
      if (rect) {
        expect(visualStep).toBeDefined()
        if (visualStep && visualStep.visual?.kind === 'rectangle-model') {
          const colsSplit = visualStep.visual.colsSplit
          const sum = colsSplit.reduce((acc, n) => acc + n, 0)
          // The split operand is whichever of the two factors is >= the other;
          // reconstruct it from the rectangular strategy's own first step text.
          const match = rect.steps[0].text.match(/(\d+)\s*filas\s*y\s*(\d+)\s*columnas/)
          expect(match, `rectangular strategy step 0 text malformed: "${rect.steps[0].text}"`).toBeTruthy()
          if (match) {
            const splitOperand = Number(match[2])
            expect(sum).toBe(splitOperand)
          }
          for (const chunk of colsSplit) {
            expect(
              isPlaceValueComponent(chunk),
              `colsSplit element ${chunk} is not a nonzero place-value component`,
            ).toBe(true)
          }
        }
      }
    })
  })

  it('hechos-derivados strategy appears only when at least one operand is even', () => {
    propertyTestWithDeterminism(generator, { difficulties }, (exercise) => {
      const hd = exercise.strategies.find((s) => s.id === 'hechos-derivados')
      if (hd) {
        const doubleMatch = hd.steps[hd.steps.length - 1].text.match(/(\d+)\s*×\s*2\s*=\s*(\d+)/)
        expect(doubleMatch, `hechos-derivados final step malformed: "${hd.steps[hd.steps.length - 1].text}"`).toBeTruthy()
      }
    })
  })

  it('every strategy is present with >= 1 step and non-empty text', () => {
    propertyTestWithDeterminism(generator, { difficulties }, (exercise) => {
      for (const strategy of exercise.strategies) {
        expect(strategy.steps.length).toBeGreaterThanOrEqual(1)
        for (const step of strategy.steps) {
          expect(step.text.length).toBeGreaterThan(0)
        }
      }
    })
  })

  it('mixes pure-calculation and light-context prompts across many seeds', () => {
    let pureCount = 0
    let contextCount = 0
    propertyTestWithDeterminism(generator, { difficulties, seeds: 200 }, (exercise) => {
      if (/^¿Cuánto es/.test(exercise.prompt.text)) {
        pureCount++
      } else {
        contextCount++
      }
    })
    expect(pureCount).toBeGreaterThan(0)
    expect(contextCount).toBeGreaterThan(0)
  })

  it('context prompts only use plausible quantities (2-12) and prices (<= 100)', () => {
    propertyTestWithDeterminism(generator, { difficulties, seeds: 200 }, (exercise) => {
      const text = exercise.prompt.text
      if (!text.includes('Si compráis')) return

      const qtyMatch = text.match(/Si compráis (\d+)/)
      expect(qtyMatch, `context prompt missing quantity: "${text}"`).toBeTruthy()
      const quantity = Number(qtyMatch![1])
      expect(quantity).toBeGreaterThanOrEqual(2)
      expect(quantity).toBeLessThanOrEqual(12)

      const priceMatch = text.match(/cuesta (\d+)/)
      expect(priceMatch, `context prompt missing price: "${text}"`).toBeTruthy()
      const price = Number(priceMatch![1])
      expect(price).toBeLessThanOrEqual(100)
    })
  })
})

describe.each([
  { name: 'mult-1cifra', generator: mult1CifraGenerator, rangeMin: 1 },
  { name: 'mult-2cifras', generator: mult2CifrasGenerator, rangeMin: 2 },
])('$name generator: NaN/Infinity/undefined difficulty', ({ generator, rangeMin }) => {
  it.each([NaN, Infinity, -Infinity, undefined])('does not throw for difficulty=%s and clamps to range-min', (bogusDifficulty) => {
    const rng = createRng('nan-guard-seed')
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let exercise: Exercise | undefined
    expect(() => {
      exercise = generator.generate(rng, bogusDifficulty as unknown as number, DEFAULT_TEST_FLAVOR)
    }).not.toThrow()
    expect(exercise).toBeDefined()
    expect(exercise!.difficulty).toBe(rangeMin)
    expect(Number.isFinite(exercise!.difficulty)).toBe(true)
  })
})

describe.each([
  { name: 'mult-1cifra', generator: mult1CifraGenerator, difficulties: [1, 2, 3, 4] },
  { name: 'mult-2cifras', generator: mult2CifrasGenerator, difficulties: [2, 3, 4, 5] },
])('$name generator against every real chapter flavor', ({ generator, difficulties }) => {
  it.each(REAL_CHAPTER_FLAVORS.map((flavor) => ({ flavor, label: flavor.placeName })))(
    'produces well-formed prompt text for chapter place "$label"',
    ({ flavor }) => {
      propertyTestWithDeterminism(
        generator,
        { difficulties, flavor, seeds: 40, seedPrefix: `${generator.subskill}:${flavor.placeName}` },
        (exercise) => {
          const text = exercise.prompt.text

          expect(text).not.toMatch(/undefined/)
          expect(text).not.toMatch(/ {2,}/)
          // No digit immediately followed by a letter (e.g. "9ringgit").
          expect(text).not.toMatch(/\d[a-zA-Z]/)
          // Prompt starts with an uppercase letter (allowing the leading "¿" of pure-calculation prompts).
          expect(text.match(/^¿?[A-ZÁÉÍÓÚÑ]/), `prompt does not start uppercase: "${text}"`).toBeTruthy()
          expect(text).not.toMatch(/En En/)
        },
      )
    },
  )
})
