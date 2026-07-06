import { describe, expect, it } from 'vitest'
import {
  descomponerCuatroSeisGenerator,
  descomponerSieteNueveGenerator,
  doblesGenerator,
  masMenosUnoDosGenerator,
  simbolosGenerator,
  estimarGenerator,
} from './decomposition'
import { propertyTestWithDeterminism } from '../testUtils'

describe('descomponerCuatroSeisGenerator (descomponer-4-6)', () => {
  const DIFFICULTIES = [1, 2, 3]

  it('total in [4,6], hidden = total - visible, no challenge flag', () => {
    propertyTestWithDeterminism(descomponerCuatroSeisGenerator, { difficulties: DIFFICULTIES }, (exercise, ctx) => {
      expect(exercise.subskill).toBe('descomponer-4-6')
      expect(exercise.difficulty).toBe(ctx.difficulty)
      expect(exercise.challenge).toBeUndefined()

      const match = exercise.prompt.text.match(/Hay (\d+) .+ en total\. Ves (\d+)\./)
      expect(match).toBeTruthy()
      if (!match) return
      const total = Number(match[1])
      const visible = Number(match[2])
      expect(total).toBeGreaterThanOrEqual(4)
      expect(total).toBeLessThanOrEqual(6)
      expect(visible).toBeGreaterThanOrEqual(1)
      expect(visible).toBeLessThan(total)

      expect(exercise.answer.kind).toBe('choice')
      const answer = exercise.answer
      if (answer.kind !== 'choice') return
      const correctChoice = exercise.choices!.find((c) => c.id === answer.correctId)
      expect(correctChoice?.label).toBe(String(total - visible))
      expect(exercise.audioText).toBeDefined()
    })
  })
})

describe('descomponerSieteNueveGenerator (descomponer-7-9, I5 challenge)', () => {
  const DIFFICULTIES = [2, 3, 4]

  it('total in [7,9] and challenge flag is set', () => {
    propertyTestWithDeterminism(descomponerSieteNueveGenerator, { difficulties: DIFFICULTIES }, (exercise, ctx) => {
      expect(exercise.subskill).toBe('descomponer-7-9')
      expect(exercise.difficulty).toBe(ctx.difficulty)
      expect(exercise.challenge).toBe(true)

      const match = exercise.prompt.text.match(/Hay (\d+) .+ en total\. Ves (\d+)\./)
      expect(match).toBeTruthy()
      if (!match) return
      const total = Number(match[1])
      expect(total).toBeGreaterThanOrEqual(7)
      expect(total).toBeLessThanOrEqual(9)
    })
  })
})

describe('doblesGenerator (dobles, I5 challenge)', () => {
  const DIFFICULTIES = [2, 3, 4]

  it('answer = 2n, n in [1,6], challenge flag set', () => {
    propertyTestWithDeterminism(doblesGenerator, { difficulties: DIFFICULTIES }, (exercise, ctx) => {
      expect(exercise.subskill).toBe('dobles')
      expect(exercise.difficulty).toBe(ctx.difficulty)
      expect(exercise.challenge).toBe(true)
      expect(exercise.prompt.visual?.kind).toBe('compare-groups')
      if (exercise.prompt.visual?.kind !== 'compare-groups') return
      const { left, right } = exercise.prompt.visual
      expect(left.count).toBe(right.count)
      expect(left.count).toBeGreaterThanOrEqual(1)
      expect(left.count).toBeLessThanOrEqual(6)

      expect(exercise.answer.kind).toBe('choice')
      const answer = exercise.answer
      if (answer.kind !== 'choice') return
      const correctChoice = exercise.choices!.find((c) => c.id === answer.correctId)
      expect(correctChoice?.label).toBe(String(left.count * 2))
    })
  })
})

describe('masMenosUnoDosGenerator (mas-menos-1-2, I5 challenge)', () => {
  const DIFFICULTIES = [2, 3, 4]

  it('result stays within [1,10] and challenge flag is set', () => {
    propertyTestWithDeterminism(masMenosUnoDosGenerator, { difficulties: DIFFICULTIES }, (exercise, ctx) => {
      expect(exercise.subskill).toBe('mas-menos-1-2')
      expect(exercise.difficulty).toBe(ctx.difficulty)
      expect(exercise.challenge).toBe(true)

      expect(exercise.answer.kind).toBe('choice')
      const answer = exercise.answer
      if (answer.kind !== 'choice') return
      const correctChoice = exercise.choices!.find((c) => c.id === answer.correctId)
      const value = Number(correctChoice?.label)
      expect(value).toBeGreaterThanOrEqual(1)
      expect(value).toBeLessThanOrEqual(10)
    })
  })
})

describe('simbolosGenerator (simbolos, I5 challenge)', () => {
  const DIFFICULTIES = [2, 3, 4]

  it('exactly 3 symbol choices (+, −, =), correct one makes the shown equation true, operands in [1,9]', () => {
    propertyTestWithDeterminism(simbolosGenerator, { difficulties: DIFFICULTIES }, (exercise, ctx) => {
      expect(exercise.subskill).toBe('simbolos')
      expect(exercise.difficulty).toBe(ctx.difficulty)
      expect(exercise.challenge).toBe(true)

      expect(exercise.choices?.length).toBe(3)
      const labels = exercise.choices!.map((c) => c.label).sort()
      expect(labels).toEqual(['+', '=', '−'].sort())

      const match = exercise.prompt.text.match(/^(\d+) \? (\d+) = (\d+)\./)
      expect(match).toBeTruthy()
      if (!match) return
      const a = Number(match[1])
      const b = Number(match[2])
      const result = Number(match[3])
      expect(a).toBeGreaterThanOrEqual(1)
      expect(a).toBeLessThanOrEqual(9)
      expect(b).toBeGreaterThanOrEqual(1)
      expect(b).toBeLessThanOrEqual(9)

      expect(exercise.answer.kind).toBe('choice')
      const answer = exercise.answer
      if (answer.kind !== 'choice') return
      const correctSymbol = exercise.choices!.find((c) => c.id === answer.correctId)?.label
      const computed = correctSymbol === '+' ? a + b : correctSymbol === '−' ? a - b : a
      expect(computed).toBe(result)
      if (correctSymbol === '=') expect(a).toBe(b)
    })
  })
})

describe('estimarGenerator (estimar, I5 challenge)', () => {
  const DIFFICULTIES = [2, 3, 4]

  it('offers 3 non-overlapping range choices, one of which contains the true count', () => {
    propertyTestWithDeterminism(estimarGenerator, { difficulties: DIFFICULTIES }, (exercise, ctx) => {
      expect(exercise.subskill).toBe('estimar')
      expect(exercise.difficulty).toBe(ctx.difficulty)
      expect(exercise.challenge).toBe(true)

      expect(exercise.prompt.visual?.kind).toBe('emoji-count')
      if (exercise.prompt.visual?.kind !== 'emoji-count') return
      const n = exercise.prompt.visual.count

      expect(exercise.choices?.length).toBe(3)
      const ranges = exercise.choices!.map((c) => {
        const m = c.label.match(/Entre (\d+) y (\d+)/)
        expect(m).toBeTruthy()
        return [Number(m![1]), Number(m![2])] as [number, number]
      })

      // Ranges must not overlap.
      const sorted = [...ranges].sort((a, b) => a[0] - b[0])
      for (let i = 1; i < sorted.length; i++) {
        expect(sorted[i][0]).toBeGreaterThan(sorted[i - 1][1])
      }

      expect(exercise.answer.kind).toBe('choice')
      const answer = exercise.answer
      if (answer.kind !== 'choice') return
      const correctChoice = exercise.choices!.find((c) => c.id === answer.correctId)!
      const m = correctChoice.label.match(/Entre (\d+) y (\d+)/)!
      const [lo, hi] = [Number(m[1]), Number(m[2])]
      expect(n).toBeGreaterThanOrEqual(lo)
      expect(n).toBeLessThanOrEqual(hi)
    })
  })
})
