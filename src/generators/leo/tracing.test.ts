import { describe, expect, it } from 'vitest'
import { letrasGenerator, numerosTrazoGenerator, espejoGenerator, mirrorStroke } from './tracing'
import { propertyTestWithDeterminism } from '../testUtils'
import { createRng } from '../../lib/rng'
import { isMirrorProne } from '../../lib/strokes'

describe('mirrorStroke', () => {
  it('flips x -> 1 - x and leaves y untouched', () => {
    const stroke = [{ x: 0.2, y: 0.5 }, { x: 0.8, y: 0.9 }]
    const mirrored = mirrorStroke(stroke)
    expect(mirrored[0].x).toBeCloseTo(0.8)
    expect(mirrored[0].y).toBeCloseTo(0.5)
    expect(mirrored[1].x).toBeCloseTo(0.2)
    expect(mirrored[1].y).toBeCloseTo(0.9)
  })
})

describe('letrasGenerator (letras)', () => {
  const DIFFICULTIES = [1, 2, 3]

  it('trace.glyph is a single known letter with >=1 stroke, all points in [0,1]', () => {
    propertyTestWithDeterminism(letrasGenerator, { difficulties: DIFFICULTIES }, (exercise, ctx) => {
      expect(exercise.subskill).toBe('letras')
      expect(exercise.difficulty).toBe(ctx.difficulty)
      expect(exercise.trace).toBeDefined()
      expect(exercise.trace!.glyph.length).toBe(1)
      expect(/^[A-ZÑa-zñ]$/.test(exercise.trace!.glyph)).toBe(true)
      expect(exercise.trace!.strokes.length).toBeGreaterThanOrEqual(1)
      for (const stroke of exercise.trace!.strokes) {
        for (const p of stroke) {
          expect(p.x).toBeGreaterThanOrEqual(0)
          expect(p.x).toBeLessThanOrEqual(1)
          expect(p.y).toBeGreaterThanOrEqual(0)
          expect(p.y).toBeLessThanOrEqual(1)
        }
      }
      expect(exercise.prompt.text).toContain(exercise.trace!.glyph)
      expect(exercise.audioText).toContain(exercise.trace!.glyph)
      expect(exercise.answer).toEqual({ kind: 'text', value: exercise.trace!.glyph })
    })
  })

  it('difficulty 1 only offers uppercase letters', () => {
    propertyTestWithDeterminism(letrasGenerator, { difficulties: [1], seeds: 100 }, (exercise) => {
      expect(exercise.trace!.glyph).toBe(exercise.trace!.glyph.toUpperCase())
    })
  })

  it('same seed -> deterministic glyph pick (documented determinism, re-checked explicitly here)', () => {
    const a = letrasGenerator.generate(createRng('glyph-of-the-day'), 3, { placeName: 'x', currencySymbol: '€', placePhrase: 'x', priceItems: ['a', 'b', 'c', 'd'], landmarks: [], animals: [], foods: [] })
    const b = letrasGenerator.generate(createRng('glyph-of-the-day'), 3, { placeName: 'x', currencySymbol: '€', placePhrase: 'x', priceItems: ['a', 'b', 'c', 'd'], landmarks: [], animals: [], foods: [] })
    expect(a.trace!.glyph).toBe(b.trace!.glyph)
  })
})

describe('numerosTrazoGenerator (numeros-trazo)', () => {
  const DIFFICULTIES = [1, 2, 3]

  it('trace.glyph is a single digit with >=1 stroke, all points in [0,1]', () => {
    propertyTestWithDeterminism(numerosTrazoGenerator, { difficulties: DIFFICULTIES }, (exercise, ctx) => {
      expect(exercise.subskill).toBe('numeros-trazo')
      expect(exercise.difficulty).toBe(ctx.difficulty)
      expect(exercise.trace).toBeDefined()
      expect(/^[0-9]$/.test(exercise.trace!.glyph)).toBe(true)
      expect(exercise.trace!.strokes.length).toBeGreaterThanOrEqual(1)
      for (const stroke of exercise.trace!.strokes) {
        for (const p of stroke) {
          expect(p.x).toBeGreaterThanOrEqual(0)
          expect(p.x).toBeLessThanOrEqual(1)
          expect(p.y).toBeGreaterThanOrEqual(0)
          expect(p.y).toBeLessThanOrEqual(1)
        }
      }
    })
  })

  it('difficulty 1 only offers digits 0-5', () => {
    propertyTestWithDeterminism(numerosTrazoGenerator, { difficulties: [1], seeds: 100 }, (exercise) => {
      expect(Number(exercise.trace!.glyph)).toBeLessThanOrEqual(5)
    })
  })
})

describe('espejoGenerator (espejo)', () => {
  const DIFFICULTIES = [1, 2, 3]

  it('answer always identifies the correct (non-mirrored) orientation, mirrored stroke is the x-flip of the true one', () => {
    propertyTestWithDeterminism(espejoGenerator, { difficulties: DIFFICULTIES }, (exercise, ctx) => {
      expect(exercise.subskill).toBe('espejo')
      expect(exercise.difficulty).toBe(ctx.difficulty)
      expect(exercise.answer).toEqual({ kind: 'choice', correctId: 'correct' })
      expect(exercise.choices?.some((c) => c.id === 'correct')).toBe(true)
      expect(exercise.choices?.some((c) => c.id === 'mirrored')).toBe(true)

      expect(exercise.prompt.visual?.kind).toBe('mirror-pair')
      if (exercise.prompt.visual?.kind !== 'mirror-pair') return
      const correctOption = exercise.prompt.visual.options.find((o) => o.choiceId === 'correct')!
      const mirroredOption = exercise.prompt.visual.options.find((o) => o.choiceId === 'mirrored')!
      expect(correctOption.strokes).toEqual(exercise.trace!.strokes)
      expect(mirroredOption.strokes).toEqual(correctOption.strokes.map(mirrorStroke))
    })
  })

  it('difficulty 3 draws from a pool that includes mirror-prone letters, not just digits', () => {
    let sawLetter = false
    propertyTestWithDeterminism(espejoGenerator, { difficulties: [3], seeds: 200 }, (exercise) => {
      if (/[A-Z]/.test(exercise.trace!.glyph)) sawLetter = true
    })
    expect(sawLetter).toBe(true)
  })

  it('every glyph in the espejo pool is mirror-prone by design', () => {
    propertyTestWithDeterminism(espejoGenerator, { difficulties: DIFFICULTIES, seeds: 100 }, (exercise) => {
      expect(isMirrorProne(exercise.trace!.glyph)).toBe(true)
    })
  })
})
