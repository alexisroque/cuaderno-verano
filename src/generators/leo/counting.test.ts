import { describe, expect, it } from 'vitest'
import { contarSeisGenerator, contarVeinteGenerator, compararGenerator } from './counting'
import { propertyTestWithDeterminism, REAL_CHAPTER_FLAVORS } from '../testUtils'

describe('contarSeisGenerator (contar-6)', () => {
  const DIFFICULTIES = [1, 2, 3]

  it('n stays within [1,6], the emoji-count visual matches n, and the correct choice equals n', () => {
    propertyTestWithDeterminism(contarSeisGenerator, { difficulties: DIFFICULTIES }, (exercise, ctx) => {
      expect(exercise.subskill).toBe('contar-6')
      expect(exercise.difficulty).toBe(ctx.difficulty)
      expect(exercise.challenge).toBeUndefined()

      expect(exercise.prompt.visual?.kind).toBe('emoji-count')
      if (exercise.prompt.visual?.kind !== 'emoji-count') return
      const n = exercise.prompt.visual.count
      expect(n).toBeGreaterThanOrEqual(1)
      expect(n).toBeLessThanOrEqual(6)

      expect(exercise.choices?.length).toBe(3)
      const labels = exercise.choices!.map((c) => c.label)
      expect(new Set(labels).size).toBe(3)

      expect(exercise.answer.kind).toBe('choice')
      const answer = exercise.answer
      if (answer.kind !== 'choice') return
      const correctChoice = exercise.choices!.find((c) => c.id === answer.correctId)
      expect(correctChoice?.label).toBe(String(n))

      expect(exercise.audioText).toBeDefined()
      expect(exercise.audioText!.length).toBeGreaterThan(0)
      expect(exercise.strategies.length).toBeGreaterThanOrEqual(1)
    })
  })

  it('works across every real chapter flavor without throwing', () => {
    for (const flavor of REAL_CHAPTER_FLAVORS) {
      propertyTestWithDeterminism(contarSeisGenerator, { difficulties: DIFFICULTIES, flavor, seeds: 20 }, (exercise) => {
        expect(exercise.prompt.visual?.kind).toBe('emoji-count')
      })
    }
  })
})

describe('contarVeinteGenerator (contar-20, I5 challenge)', () => {
  const DIFFICULTIES = [2, 3, 4]

  it('n stays within [7,20], challenge flag is set, and rows keep the grid readable', () => {
    propertyTestWithDeterminism(contarVeinteGenerator, { difficulties: DIFFICULTIES }, (exercise, ctx) => {
      expect(exercise.subskill).toBe('contar-20')
      expect(exercise.difficulty).toBe(ctx.difficulty)
      expect(exercise.challenge).toBe(true)

      expect(exercise.prompt.visual?.kind).toBe('emoji-count')
      if (exercise.prompt.visual?.kind !== 'emoji-count') return
      const n = exercise.prompt.visual.count
      expect(n).toBeGreaterThanOrEqual(7)
      expect(n).toBeLessThanOrEqual(20)
      expect(exercise.prompt.visual.rows).toBeDefined()
      expect(exercise.prompt.visual.rows!).toBeGreaterThanOrEqual(1)

      expect(exercise.answer.kind).toBe('choice')
      const answer = exercise.answer
      if (answer.kind !== 'choice') return
      const correctChoice = exercise.choices!.find((c) => c.id === answer.correctId)
      expect(correctChoice?.label).toBe(String(n))
    })
  })
})

describe('compararGenerator (comparar)', () => {
  const DIFFICULTIES = [1, 2, 3]

  it('counts stay within [0,6], answer matches the actual bigger side (or ties), phrasing is genderless', () => {
    propertyTestWithDeterminism(compararGenerator, { difficulties: DIFFICULTIES }, (exercise) => {
      expect(exercise.subskill).toBe('comparar')
      expect(exercise.prompt.visual?.kind).toBe('compare-groups')
      if (exercise.prompt.visual?.kind !== 'compare-groups') return

      const { left, right } = exercise.prompt.visual
      expect(left.count).toBeGreaterThanOrEqual(0)
      expect(left.count).toBeLessThanOrEqual(6)
      expect(right.count).toBeGreaterThanOrEqual(0)
      expect(right.count).toBeLessThanOrEqual(6)

      expect(exercise.answer.kind).toBe('choice')
      const answer = exercise.answer
      if (answer.kind !== 'choice') return
      const expectedWinner = left.count === right.count ? 'iguales' : left.count > right.count ? 'izquierda' : 'derecha'
      expect(answer.correctId).toBe(expectedWinner)

      // Genderless phrasing: "dónde hay más", never "cuántos/cuántas" mismatched to the noun.
      expect(exercise.prompt.text).toMatch(/¿Dónde hay más/)
    })
  })

  it('produces ties ("iguales") at least sometimes across many seeds', () => {
    let ties = 0
    propertyTestWithDeterminism(compararGenerator, { difficulties: DIFFICULTIES, seeds: 200 }, (exercise) => {
      if (exercise.answer.kind === 'choice' && exercise.answer.correctId === 'iguales') ties++
    })
    expect(ties).toBeGreaterThan(0)
  })
})
