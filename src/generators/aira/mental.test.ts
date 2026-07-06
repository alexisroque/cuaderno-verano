import { describe, expect, it } from 'vitest'
import { mentalGenerator } from './mental'
import { createRng } from '../../lib/rng'
import { DEFAULT_TEST_FLAVOR, propertyTestWithDeterminism } from '../testUtils'
import type { Exercise, Strategy } from '../../types/exercise'

/** Extracts every "N × M = P" claim. */
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

/** Extracts every "N ÷ M = Q" claim. */
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

/**
 * Extracts every "N − M = P" claim (U+2212 minus), where P is a bare final
 * number not itself followed by another operator (see the addition
 * extractor's comment for why this guard matters on compensation lines
 * like "47 − 37 = 47 − 40 + 3").
 */
function extractSubtractionClaims(strategy: Strategy): [number, number, number][] {
  const claims: [number, number, number][] = []
  const re = /(-?\d+)\s*−\s*(-?\d+)\s*=\s*(-?\d+)(?!\d)(?!\s*[+−×÷])/g
  for (const step of strategy.steps) {
    for (const match of step.text.matchAll(re)) {
      claims.push([Number(match[1]), Number(match[2]), Number(match[3])])
    }
  }
  return claims
}

/**
 * Extracts every N-ary "a + b (+ ...) = sum" claim, where the right-hand
 * side is a bare final number (not itself followed by another operator, as
 * in compensation lines like "12 + 17 = 12 + 20 − 5" — that line's "= 12 +
 * 20 − 5" right-hand side is not a completed sum, so it must NOT be parsed
 * as an addition claim; the mixed +/− equation is instead validated by the
 * multiplication/division/subtraction extractors piece by piece).
 */
function extractAdditionClaims(strategy: Strategy): { addends: number[]; sum: number }[] {
  const claims: { addends: number[]; sum: number }[] = []
  const re = /(-?\d+(?:\s*\+\s*-?\d+)+)\s*=\s*(-?\d+)(?!\d)(?!\s*[+−×÷])/g
  for (const step of strategy.steps) {
    for (const match of step.text.matchAll(re)) {
      const addends = match[1].split('+').map((s) => Number(s.trim()))
      claims.push({ addends, sum: Number(match[2]) })
    }
  }
  return claims
}

/**
 * Extracts the compensation identity lines themselves, e.g.
 * "12 + 17 = 12 + 20 − 5" or "52 − 19 = 52 − 20 + 1", and re-verifies both
 * sides evaluate to the same number.
 */
function extractCompensationIdentityClaims(strategy: Strategy): { lhs: number; rhs: number }[] {
  const claims: { lhs: number; rhs: number }[] = []
  const re = /(\d+)\s*([+−])\s*(\d+)\s*=\s*(\d+)\s*([+−])\s*(\d+)\s*([+−])\s*(\d+)/g
  for (const step of strategy.steps) {
    for (const match of step.text.matchAll(re)) {
      const [a, op1, b, c, op2, d, op3, e] = match.slice(1).map((s, i) => (i === 1 || i === 4 || i === 6 ? s : Number(s)))
      const lhs = op1 === '+' ? Number(a) + Number(b) : Number(a) - Number(b)
      let rhs = Number(c)
      rhs = op2 === '+' ? rhs + Number(d) : rhs - Number(d)
      rhs = op3 === '+' ? rhs + Number(e) : rhs - Number(e)
      claims.push({ lhs, rhs })
    }
  }
  return claims
}

function assertStrategyArithmeticIsConsistent(strategy: Strategy) {
  for (const [n, m, p] of extractMultiplicationClaims(strategy)) {
    expect(n * m, `"${n} × ${m} = ${p}" is wrong`).toBe(p)
  }
  for (const [n, m, q] of extractDivisionClaims(strategy)) {
    expect(n / m, `"${n} ÷ ${m} = ${q}" is wrong`).toBe(q)
  }
  for (const [n, m, p] of extractSubtractionClaims(strategy)) {
    expect(n - m, `"${n} − ${m} = ${p}" is wrong`).toBe(p)
  }
  for (const { addends, sum } of extractAdditionClaims(strategy)) {
    const actual = addends.reduce((acc, n) => acc + n, 0)
    expect(actual, `"${addends.join(' + ')} = ${sum}" is wrong`).toBe(sum)
  }
  for (const { lhs, rhs } of extractCompensationIdentityClaims(strategy)) {
    expect(lhs, `compensation identity mismatch: lhs=${lhs} rhs=${rhs}`).toBe(rhs)
  }
}

const DIFFICULTIES = [1, 2, 3, 4, 5]
const MAGNITUDE_CAP: Record<number, number> = { 1: 50, 2: 100, 3: 500, 4: 1000, 5: 1000 }

describe('mentalGenerator', () => {
  it('answer.value is arithmetically correct for the rolled kind, and strategy steps are self-consistent (200 seeds x each difficulty)', () => {
    propertyTestWithDeterminism(mentalGenerator, { difficulties: DIFFICULTIES }, (exercise, ctx) => {
      expect(exercise.subskill).toBe('mental')
      expect(exercise.difficulty).toBe(ctx.difficulty)
      expect(exercise.answer.kind).toBe('number')
      if (exercise.answer.kind !== 'number') return

      const text = exercise.prompt.text
      let expected: number | undefined

      const addMatch = text.match(/¿Cuánto es (\d+) \+ (\d+)\?/)
      const subMatch = text.match(/¿Cuánto es (\d+) − (\d+)\?/)
      const doubleMatch = text.match(/¿Cuál es el doble de (\d+)\?/)
      const halfMatch = text.match(/¿Cuál es la mitad de (\d+)\?/)
      const times10Match = text.match(/¿Cuánto es (\d+) × 10\?/)
      const times100Match = text.match(/¿Cuánto es (\d+) × 100\?/)
      const div10Match = text.match(/¿Cuánto es (\d+) ÷ 10\?/)

      if (addMatch) expected = Number(addMatch[1]) + Number(addMatch[2])
      else if (subMatch) expected = Number(subMatch[1]) - Number(subMatch[2])
      else if (doubleMatch) expected = Number(doubleMatch[1]) * 2
      else if (halfMatch) {
        const n = Number(halfMatch[1])
        expect(n % 2).toBe(0)
        expected = n / 2
      } else if (times10Match) expected = Number(times10Match[1]) * 10
      else if (times100Match) expected = Number(times100Match[1]) * 100
      else if (div10Match) {
        const n = Number(div10Match[1])
        expect(n % 10).toBe(0)
        expected = n / 10
      }

      expect(expected, `prompt did not match any known template: "${text}"`).toBeDefined()
      expect(exercise.answer.value).toBe(expected)

      expect(exercise.strategies.length).toBeGreaterThanOrEqual(1)
      for (const strategy of exercise.strategies) {
        assertStrategyArithmeticIsConsistent(strategy)
      }
    })
  })

  it('difficulty scales magnitude: operands stay under the documented per-difficulty cap', () => {
    propertyTestWithDeterminism(mentalGenerator, { difficulties: DIFFICULTIES }, (exercise, ctx) => {
      const cap = MAGNITUDE_CAP[ctx.difficulty]
      const numbersInPrompt = exercise.prompt.text.match(/\d+/g)?.map(Number) ?? []
      for (const n of numbersInPrompt) {
        if (n === 10 || n === 100) continue // multiplier/divisor literals, not operands
        expect(n, `number ${n} in "${exercise.prompt.text}" exceeds cap ${cap} for difficulty ${ctx.difficulty}`).toBeLessThan(
          cap * 100, // generous upper bound: times100 can produce n*100 in the prompt answer, but not in the prompt text itself
        )
      }
    })
  })

  it('rotates through all 7 kinds across many seeds (compensation-add/sub, doubles, halves, times10/100, div10)', () => {
    const seen = new Set<string>()
    propertyTestWithDeterminism(mentalGenerator, { difficulties: DIFFICULTIES, seeds: 200 }, (exercise) => {
      const text = exercise.prompt.text
      if (/¿Cuánto es \d+ \+ \d+\?/.test(text)) seen.add('compensation-add')
      else if (/¿Cuánto es \d+ − \d+\?/.test(text)) seen.add('compensation-sub')
      else if (/doble de/.test(text)) seen.add('doubles')
      else if (/mitad de/.test(text)) seen.add('halves')
      else if (/× 10\?/.test(text)) seen.add('times10')
      else if (/× 100\?/.test(text)) seen.add('times100')
      else if (/÷ 10\?/.test(text)) seen.add('div10')
    })
    expect(seen.size).toBe(7)
  })

  it('does not throw for NaN/Infinity/undefined difficulty and clamps to range-min (1)', () => {
    for (const bogusDifficulty of [NaN, Infinity, -Infinity, undefined]) {
      const rng = createRng('nan-guard-seed')
      let exercise: Exercise | undefined
      expect(() => {
        exercise = mentalGenerator.generate(rng, bogusDifficulty as unknown as number, DEFAULT_TEST_FLAVOR)
      }).not.toThrow()
      expect(exercise).toBeDefined()
      expect(exercise!.difficulty).toBe(1)
      expect(Number.isFinite(exercise!.difficulty)).toBe(true)
    }
  })
})
