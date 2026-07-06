import { describe, expect, it } from 'vitest'
import { cajitasGenerator } from './cajitas'
import { createRng } from '../../lib/rng'
import { DEFAULT_TEST_FLAVOR, propertyTestWithDeterminism } from '../testUtils'
import type { Exercise } from '../../types/exercise'

const DIFFICULTIES = [1, 2, 3, 4]

const OPERAND_RANGES: Record<number, [number, number]> = {
  1: [2, 5],
  2: [3, 9],
  3: [5, 15],
  4: [10, 25],
}

/** Parses the "A × B = C" box (with exactly one side replaced by "?") from a cajitas prompt. */
function parseBox(promptText: string): { a: number | '?'; b: number | '?'; product: number | '?' } {
  const match = promptText.match(/:\s*(\?|\d+)\s*×\s*(\?|\d+)\s*=\s*(\?|\d+)/)
  if (!match) throw new Error(`could not parse cajita box from prompt: "${promptText}"`)
  const parse = (s: string) => (s === '?' ? '?' : Number(s))
  return { a: parse(match[1]), b: parse(match[2]), product: parse(match[3]) }
}

describe('cajitas generator', () => {
  it('hidden value is correct for all three hide-positions (200 seeds x each difficulty)', () => {
    propertyTestWithDeterminism(cajitasGenerator, { difficulties: DIFFICULTIES }, (exercise, ctx) => {
      expect(exercise.subskill).toBe('cajitas')
      expect(exercise.difficulty).toBe(ctx.difficulty)
      expect(exercise.answer.kind).toBe('number')
      if (exercise.answer.kind !== 'number') return

      const box = parseBox(exercise.prompt.text)
      const hiddenSlots = (['a', 'b', 'product'] as const).filter((slot) => box[slot] === '?')
      expect(hiddenSlots).toHaveLength(1)
      const hidden = hiddenSlots[0]

      const a = box.a === '?' ? exercise.answer.value : box.a
      const b = box.b === '?' ? exercise.answer.value : box.b
      const product = box.product === '?' ? exercise.answer.value : box.product

      expect(a * b).toBe(product)

      if (hidden === 'a') expect(exercise.answer.value).toBe(a)
      if (hidden === 'b') expect(exercise.answer.value).toBe(b)
      if (hidden === 'product') expect(exercise.answer.value).toBe(product)
    })
  })

  it('difficulty scales operand size per OPERAND_RANGES', () => {
    propertyTestWithDeterminism(cajitasGenerator, { difficulties: DIFFICULTIES }, (exercise, ctx) => {
      const box = parseBox(exercise.prompt.text)
      const [min, max] = OPERAND_RANGES[ctx.difficulty]

      const answerValue = exercise.answer.kind === 'number' ? exercise.answer.value : undefined
      const a = box.a === '?' ? answerValue! : box.a
      const b = box.b === '?' ? answerValue! : box.b

      expect(a).toBeGreaterThanOrEqual(min)
      expect(a).toBeLessThanOrEqual(max)
      expect(b).toBeGreaterThanOrEqual(min)
      expect(b).toBeLessThanOrEqual(max)
    })
  })

  it('produces all three hide-positions across many seeds', () => {
    const positions = new Set<string>()
    propertyTestWithDeterminism(cajitasGenerator, { difficulties: DIFFICULTIES, seeds: 200 }, (exercise) => {
      const box = parseBox(exercise.prompt.text)
      if (box.a === '?') positions.add('a')
      if (box.b === '?') positions.add('b')
      if (box.product === '?') positions.add('product')
    })
    expect(positions).toEqual(new Set(['a', 'b', 'product']))
  })

  it('strategy explains all 4 related operations and ends consistently', () => {
    propertyTestWithDeterminism(cajitasGenerator, { difficulties: DIFFICULTIES }, (exercise) => {
      expect(exercise.strategies).toHaveLength(1)
      const strategy = exercise.strategies[0]
      const relationTexts = strategy.steps.slice(1).map((s) => s.text)
      expect(relationTexts).toHaveLength(4)

      for (const text of relationTexts) {
        const multMatch = text.match(/^(\d+)\s*×\s*(\d+)\s*=\s*(\d+)$/)
        const divMatch = text.match(/^(\d+)\s*÷\s*(\d+)\s*=\s*(\d+)$/)
        if (multMatch) {
          const [, n, m, p] = multMatch.map(Number)
          expect(n * m).toBe(p)
        } else if (divMatch) {
          const [, n, m, p] = divMatch.map(Number)
          expect(m * p).toBe(n)
        } else {
          throw new Error(`unrecognized relation step text: "${text}"`)
        }
      }
    })
  })

  it.each([NaN, Infinity, -Infinity, undefined])(
    'does not throw for difficulty=%s and clamps to range-min (d1)',
    (bogusDifficulty) => {
      const rng = createRng('nan-guard-seed')
      let exercise: Exercise | undefined
      expect(() => {
        exercise = cajitasGenerator.generate(rng, bogusDifficulty as unknown as number, DEFAULT_TEST_FLAVOR)
      }).not.toThrow()
      expect(exercise).toBeDefined()
      expect(exercise!.difficulty).toBe(1)
      expect(Number.isFinite(exercise!.difficulty)).toBe(true)
    },
  )
})
