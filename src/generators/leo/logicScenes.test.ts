import { describe, expect, it } from 'vitest'
import { clasificarGenerator, posicionesGenerator } from './logicScenes'
import { propertyTestWithDeterminism } from '../testUtils'

describe('clasificarGenerator (clasificar)', () => {
  const DIFFICULTIES = [1, 2, 3]

  it('offers 4 distinct choices, exactly one from the other category, and phrasing is genderless', () => {
    propertyTestWithDeterminism(clasificarGenerator, { difficulties: DIFFICULTIES }, (exercise, ctx) => {
      expect(exercise.subskill).toBe('clasificar')
      expect(exercise.difficulty).toBe(ctx.difficulty)

      expect(exercise.prompt.text).toMatch(/^¿Cuál de estos NO es (animales|comidas)\?$/)

      expect(exercise.choices?.length).toBe(4)
      const labels = exercise.choices!.map((c) => c.label)
      expect(new Set(labels).size).toBe(4)

      expect(exercise.answer.kind).toBe('choice')
      const answer = exercise.answer
      if (answer.kind !== 'choice') return
      expect(exercise.choices!.some((c) => c.id === answer.correctId)).toBe(true)
      expect(exercise.audioText).toBeDefined()
    })
  })

  it('hits both categories (animales and comida) across many seeds', () => {
    const seenCategories = new Set<string>()
    propertyTestWithDeterminism(clasificarGenerator, { difficulties: DIFFICULTIES, seeds: 100 }, (exercise) => {
      const match = exercise.prompt.text.match(/NO es (animales|comidas)\?/)
      if (match) seenCategories.add(match[1])
    })
    expect(seenCategories.size).toBe(2)
  })
})

describe('posicionesGenerator (posiciones)', () => {
  const DIFFICULTIES = [1, 2, 3]

  it('places exactly 2 actors on the scene visual and the correct choice is always the "mover" actor', () => {
    propertyTestWithDeterminism(posicionesGenerator, { difficulties: DIFFICULTIES }, (exercise, ctx) => {
      expect(exercise.subskill).toBe('posiciones')
      expect(exercise.difficulty).toBe(ctx.difficulty)

      expect(exercise.prompt.visual?.kind).toBe('scene')
      if (exercise.prompt.visual?.kind !== 'scene') return
      expect(exercise.prompt.visual.actors.length).toBe(2)

      // The two actors must occupy distinct cells, otherwise the scene is ambiguous.
      const [a, b] = exercise.prompt.visual.actors
      expect(a.row === b.row && a.col === b.col).toBe(false)

      expect(exercise.choices?.length).toBe(2)
      expect(exercise.answer.kind).toBe('choice')
      const answer = exercise.answer
      if (answer.kind !== 'choice') return
      expect(answer.correctId).toBe('mover')

      expect(exercise.audioText).toBeDefined()
    })
  })

  it('the prompt/audio text never leaks which emoji is the mover (answering requires reading the scene visual)', () => {
    propertyTestWithDeterminism(posicionesGenerator, { difficulties: DIFFICULTIES, seeds: 100 }, (exercise) => {
      if (exercise.prompt.visual?.kind !== 'scene') return
      const moverEmoji = exercise.prompt.visual.actors.find((_a, i) => i === 0)?.emoji
      if (!moverEmoji) return
      expect(exercise.prompt.text.includes(moverEmoji)).toBe(false)
      expect(exercise.audioText?.includes(moverEmoji)).toBe(false)
    })
  })

  it('only offers encima/debajo at every difficulty — "al lado" and "delante" were dropped for having an ambiguous or duplicate scene', () => {
    const seen = new Set<string>()
    for (const difficulty of DIFFICULTIES) {
      propertyTestWithDeterminism(posicionesGenerator, { difficulties: [difficulty], seeds: 100 }, (exercise) => {
        const match = exercise.prompt.text.match(/está (encima|debajo|al lado|delante) del otro/)
        if (match) seen.add(match[1])
      })
    }
    expect(seen.size).toBeGreaterThan(0)
    for (const pos of seen) {
      expect(['encima', 'debajo']).toContain(pos)
    }
  })
})
