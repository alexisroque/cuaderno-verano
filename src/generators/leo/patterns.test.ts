import { describe, expect, it } from 'vitest'
import { patronesGenerator, formasGenerator, simetriaGenerator } from './patterns'
import { propertyTestWithDeterminism } from '../testUtils'

describe('patronesGenerator (patrones)', () => {
  const DIFFICULTIES = [1, 2, 3]

  it('shows exactly one hidden slot (❓), 3 distinct choices, and the correct choice matches the hidden emoji', () => {
    propertyTestWithDeterminism(patronesGenerator, { difficulties: DIFFICULTIES }, (exercise, ctx) => {
      expect(exercise.subskill).toBe('patrones')
      expect(exercise.difficulty).toBe(ctx.difficulty)

      const questionMarks = exercise.prompt.text.match(/❓/g) ?? []
      expect(questionMarks.length).toBe(1)

      expect(exercise.choices?.length).toBe(3)
      const labels = exercise.choices!.map((c) => c.label)
      expect(new Set(labels).size).toBe(3)

      expect(exercise.answer.kind).toBe('choice')
      const answer = exercise.answer
      if (answer.kind !== 'choice') return
      const correctChoice = exercise.choices!.find((c) => c.id === answer.correctId)
      expect(correctChoice).toBeDefined()

      expect(exercise.audioText).toBeDefined()
      expect(exercise.strategies.length).toBeGreaterThanOrEqual(1)
    })
  })
})

describe('formasGenerator (formas)', () => {
  const DIFFICULTIES = [1, 2, 3]
  const SHAPE_NAMES = ['círculo', 'cuadrado', 'triángulo', 'estrella']

  it('names one of the 4 known shapes, offers 3-4 distinct choices, and the correct choice matches the named shape emoji', () => {
    propertyTestWithDeterminism(formasGenerator, { difficulties: DIFFICULTIES }, (exercise, ctx) => {
      expect(exercise.subskill).toBe('formas')
      expect(exercise.difficulty).toBe(ctx.difficulty)

      const match = exercise.prompt.text.match(/^Toca el (\S+)\.$/)
      expect(match).toBeTruthy()
      if (!match) return
      expect(SHAPE_NAMES).toContain(match[1])

      const choiceCount = exercise.choices!.length
      expect(choiceCount).toBeGreaterThanOrEqual(3)
      expect(choiceCount).toBeLessThanOrEqual(4)
      const labels = exercise.choices!.map((c) => c.label)
      expect(new Set(labels).size).toBe(choiceCount)

      expect(exercise.answer.kind).toBe('choice')
      const answer = exercise.answer
      if (answer.kind !== 'choice') return
      expect(exercise.choices!.some((c) => c.id === answer.correctId)).toBe(true)
    })
  })

  it('hits all 4 shape names across many seeds', () => {
    const seen = new Set<string>()
    propertyTestWithDeterminism(formasGenerator, { difficulties: [1, 2, 3], seeds: 100 }, (exercise) => {
      const match = exercise.prompt.text.match(/^Toca el (\S+)\.$/)
      if (match) seen.add(match[1])
    })
    expect(seen.size).toBe(4)
  })
})

describe('simetriaGenerator (simetria)', () => {
  const DIFFICULTIES = [1, 2, 3]

  it('offers exactly 2 choices and the correct one is always the symmetric-looking glyph', () => {
    propertyTestWithDeterminism(simetriaGenerator, { difficulties: DIFFICULTIES }, (exercise, ctx) => {
      expect(exercise.subskill).toBe('simetria')
      expect(exercise.difficulty).toBe(ctx.difficulty)
      expect(exercise.choices?.length).toBe(2)

      expect(exercise.answer.kind).toBe('choice')
      const answer = exercise.answer
      if (answer.kind !== 'choice') return
      expect(exercise.choices!.some((c) => c.id === answer.correctId)).toBe(true)
      expect(exercise.audioText).toBeDefined()
    })
  })
})
