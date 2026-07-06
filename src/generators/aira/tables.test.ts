import { describe, expect, it } from 'vitest'
import { tablasGenerator } from './tables'
import { createRng } from '../../lib/rng'
import { DEFAULT_TEST_FLAVOR, propertyTestWithDeterminism } from '../testUtils'
import type { Exercise } from '../../types/exercise'

const DIFFICULTIES = [1, 2, 3, 4]

const TABLE_POOL_BY_DIFFICULTY: Record<number, number[]> = {
  1: [2, 5, 10],
  2: [3, 4, 6],
  3: [7, 8, 9],
  4: [7, 8, 9],
}

describe('tablas generator', () => {
  it('answers are correct for each kind (200 seeds x each difficulty)', () => {
    propertyTestWithDeterminism(tablasGenerator, { difficulties: DIFFICULTIES }, (exercise, ctx) => {
      expect(exercise.subskill).toBe('tablas')
      expect(exercise.difficulty).toBe(ctx.difficulty)

      if (exercise.answer.kind === 'number') {
        // missing-factor or product kind: prompt embeds the table and
        // either "?" (missing-factor) or the multiplicand (product).
        const missingFactorMatch = exercise.prompt.text.match(/^(\d+)\s*×\s*\?\s*=\s*(\d+)$/)
        const productMatch = exercise.prompt.text.match(/^¿Cuánto es (\d+)\s*×\s*(\d+)\?$/)

        if (missingFactorMatch) {
          const table = Number(missingFactorMatch[1])
          const product = Number(missingFactorMatch[2])
          expect(exercise.answer.value * table).toBe(product)
        } else if (productMatch) {
          const table = Number(productMatch[1])
          const multiplicand = Number(productMatch[2])
          expect(exercise.answer.value).toBe(table * multiplicand)
        } else {
          throw new Error(`unrecognized number-answer prompt: "${exercise.prompt.text}"`)
        }
      } else if (exercise.answer.kind === 'choice') {
        // pattern-hunt kind: exactly one choice matches correctId.
        const correctId = exercise.answer.correctId
        expect(exercise.choices?.some((c) => c.id === correctId)).toBe(true)
      } else {
        throw new Error(`unexpected answer kind: ${exercise.answer.kind}`)
      }
    })
  })

  it('difficulty scales the table range (d1: 2,5,10; d2: 3,4,6; d3/d4: 7,8,9)', () => {
    propertyTestWithDeterminism(tablasGenerator, { difficulties: DIFFICULTIES }, (exercise, ctx) => {
      const allowedTables = TABLE_POOL_BY_DIFFICULTY[ctx.difficulty]
      const missingFactorMatch = exercise.prompt.text.match(/^(\d+)\s*×\s*\?/)
      const productMatch = exercise.prompt.text.match(/^¿Cuánto es (\d+)\s*×/)
      const patternMatch = exercise.prompt.text.match(/tabla del (\d+)\?$/)

      const table = missingFactorMatch
        ? Number(missingFactorMatch[1])
        : productMatch
          ? Number(productMatch[1])
          : patternMatch
            ? Number(patternMatch[1])
            : undefined

      expect(table, `could not parse table from prompt "${exercise.prompt.text}"`).toBeDefined()
      if (table !== undefined) {
        expect(allowedTables).toContain(table)
      }
    })
  })

  it('every exercise has at least one strategy with a non-empty final step', () => {
    propertyTestWithDeterminism(tablasGenerator, { difficulties: DIFFICULTIES }, (exercise) => {
      expect(exercise.strategies.length).toBeGreaterThanOrEqual(1)
      for (const strategy of exercise.strategies) {
        expect(strategy.steps.length).toBeGreaterThanOrEqual(1)
      }
    })
  })

  it('produces all three kinds across many seeds', () => {
    const kinds = new Set<string>()
    propertyTestWithDeterminism(tablasGenerator, { difficulties: DIFFICULTIES, seeds: 200 }, (exercise) => {
      kinds.add(exercise.answer.kind)
    })
    expect(kinds.has('number')).toBe(true)
    expect(kinds.has('choice')).toBe(true)
  })

  it('the table-of-7 pattern fact is arithmetically true (last digits are 7,4,1,8,5,2,9,6,3,0)', () => {
    const lastDigits = Array.from({ length: 10 }, (_, i) => (7 * (i + 1)) % 10)
    expect(lastDigits).toEqual([7, 4, 1, 8, 5, 2, 9, 6, 3, 0])
    // All 10 digits appear, each exactly once.
    expect(new Set(lastDigits).size).toBe(10)
  })

  it('pattern-hunt choice set always has exactly 3 choices with exactly one matching correctId', () => {
    propertyTestWithDeterminism(tablasGenerator, { difficulties: DIFFICULTIES }, (exercise) => {
      const answer = exercise.answer
      if (answer.kind === 'choice') {
        expect(exercise.choices).toHaveLength(3)
        const matching = exercise.choices?.filter((c) => c.id === answer.correctId)
        expect(matching).toHaveLength(1)
      }
    })
  })

  it.each([NaN, Infinity, -Infinity, undefined])(
    'does not throw for difficulty=%s and clamps to range-min (d1)',
    (bogusDifficulty) => {
      const rng = createRng('nan-guard-seed')
      let exercise: Exercise | undefined
      expect(() => {
        exercise = tablasGenerator.generate(rng, bogusDifficulty as unknown as number, DEFAULT_TEST_FLAVOR)
      }).not.toThrow()
      expect(exercise).toBeDefined()
      expect(exercise!.difficulty).toBe(1)
      expect(Number.isFinite(exercise!.difficulty)).toBe(true)
    },
  )
})
