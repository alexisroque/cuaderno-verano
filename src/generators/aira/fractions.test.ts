import { describe, expect, it } from 'vitest'
import { fraccionesGenerator } from './fractions'
import { createRng } from '../../lib/rng'
import { propertyTestWithDeterminism, REAL_CHAPTER_FLAVORS } from '../testUtils'

const DIFFICULTIES = [3, 4, 5]

describe('fraccionesGenerator', () => {
  it('is registered under subskill "fracciones"', () => {
    expect(fraccionesGenerator.subskill).toBe('fracciones')
  })

  it('clamps difficulty to [3, 5] and sets challenge:true', () => {
    propertyTestWithDeterminism(fraccionesGenerator, { difficulties: [1, 2, 3, 4, 5, 6, 99] }, (ex) => {
      expect(ex.difficulty).toBeGreaterThanOrEqual(3)
      expect(ex.difficulty).toBeLessThanOrEqual(5)
      expect(ex.challenge).toBe(true)
    })
  })

  it('every exercise has at least one strategy and a well-formed prompt', () => {
    propertyTestWithDeterminism(fraccionesGenerator, { difficulties: DIFFICULTIES }, (ex) => {
      expect(ex.strategies.length).toBeGreaterThan(0)
      expect(ex.prompt.text.length).toBeGreaterThan(0)
    })
  })

  it('part-of-collection: answer = (whole/den)*num exactly, whole always divisible by den', () => {
    propertyTestWithDeterminism(fraccionesGenerator, { difficulties: DIFFICULTIES, seeds: 400 }, (ex) => {
      const match = ex.prompt.text.match(/^¿Cuánto es (\d+)\/(\d+) de (\d+)\?$/)
      if (!match) return
      const [, numStr, denStr, wholeStr] = match
      const num = Number(numStr)
      const den = Number(denStr)
      const whole = Number(wholeStr)

      expect(whole % den).toBe(0)
      const expected = (whole / den) * num
      expect(ex.answer).toEqual({ kind: 'number', value: expected })
    })
  })

  it('part-of-unit: answer text is num/den with num < den, and grid-figure visual has num shaded cells', () => {
    propertyTestWithDeterminism(fraccionesGenerator, { difficulties: DIFFICULTIES, seeds: 400 }, (ex) => {
      const match = ex.prompt.text.match(/se corta en (\d+) trozos iguales\. Aira se come (\d+) trozos/)
      if (!match) return
      const [, denStr, numStr] = match
      const den = Number(denStr)
      const num = Number(numStr)

      expect(num).toBeLessThan(den)
      expect(ex.answer).toEqual({ kind: 'text', value: `${num}/${den}` })
      expect(ex.prompt.visual).toEqual({ kind: 'grid-figure', cells: expect.any(Array) })
      if (ex.prompt.visual?.kind === 'grid-figure') {
        expect(ex.prompt.visual.cells.length).toBe(num)
      }
    })
  })

  it('comparison: correct choice is genuinely the larger fraction (cross-multiplication check)', () => {
    propertyTestWithDeterminism(fraccionesGenerator, { difficulties: DIFFICULTIES, seeds: 400 }, (ex) => {
      const match = ex.prompt.text.match(/^¿Cuál es mayor: (\d+)\/(\d+) o (\d+)\/(\d+)\?$/)
      if (!match) return
      const [n1, d1, n2, d2] = match.slice(1).map(Number)
      expect(ex.answer.kind).toBe('choice')
      if (ex.answer.kind !== 'choice') return
      const correctId = ex.answer.correctId
      const correctChoice = ex.choices?.find((c) => c.id === correctId)
      expect(correctChoice).toBeDefined()

      const firstIsBigger = n1 * d2 > n2 * d1
      const expectedLabel = firstIsBigger ? `${n1}/${d1}` : `${n2}/${d2}`
      expect(correctChoice?.label).toBe(expectedLabel)
      // Never equal by construction.
      expect(n1 * d2).not.toBe(n2 * d1)
    })
  })

  it('equivalents: a/b == (a*k)/(b*k) genuinely holds for the equivalence used', () => {
    propertyTestWithDeterminism(fraccionesGenerator, { difficulties: DIFFICULTIES, seeds: 400 }, (ex) => {
      const matchNum = ex.prompt.text.match(/^(\d+)\/(\d+) es equivalente a \?\/(\d+)\. ¿Qué número falta\?$/)
      const matchDen = ex.prompt.text.match(/^(\d+)\/(\d+) es equivalente a (\d+)\/\?\. ¿Qué número falta\?$/)
      if (matchNum) {
        const [num, den, equivDen] = matchNum.slice(1).map(Number)
        const answerValue = ex.answer.kind === 'number' ? ex.answer.value : NaN
        // num/den == answerValue/equivDen  <=>  num*equivDen == answerValue*den
        expect(num * equivDen).toBe(answerValue * den)
      } else if (matchDen) {
        const [num, den, equivNum] = matchDen.slice(1).map(Number)
        const answerValue = ex.answer.kind === 'number' ? ex.answer.value : NaN
        expect(num * answerValue).toBe(equivNum * den)
      }
    })
  })

  it('all 4 kinds appear across many seeds', () => {
    const kinds = new Set<string>()
    for (let i = 0; i < 200; i++) {
      const rng = createRng(`kind-sweep:${i}`)
      const ex = fraccionesGenerator.generate(rng, 4, REAL_CHAPTER_FLAVORS[0])
      if (ex.answer.kind === 'text') kinds.add('part-of-unit')
      else if (ex.answer.kind === 'choice') kinds.add('comparison')
      else if (/es equivalente a/.test(ex.prompt.text)) kinds.add('equivalent')
      else kinds.add('part-of-collection')
    }
    expect(kinds.size).toBe(4)
  })
})
