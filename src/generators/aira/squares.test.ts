import { describe, expect, it } from 'vitest'
import { cuadradosGenerator } from './squares'
import { propertyTestWithDeterminism } from '../testUtils'

const DIFFICULTIES = [3, 4, 5]

describe('cuadradosGenerator', () => {
  it('is registered under subskill "cuadrados"', () => {
    expect(cuadradosGenerator.subskill).toBe('cuadrados')
  })

  it('clamps difficulty to [3, 5] and sets challenge:true', () => {
    propertyTestWithDeterminism(cuadradosGenerator, { difficulties: [1, 2, 3, 4, 5, 6, 99] }, (ex) => {
      expect(ex.difficulty).toBeGreaterThanOrEqual(3)
      expect(ex.difficulty).toBeLessThanOrEqual(5)
      expect(ex.challenge).toBe(true)
    })
  })

  it('forward kind: answer = n², and the dot-grid visual n matches the prompt n', () => {
    propertyTestWithDeterminism(cuadradosGenerator, { difficulties: DIFFICULTIES, seeds: 400 }, (ex) => {
      const match = ex.prompt.text.match(/^¿Cuánto es (\d+) al cuadrado \(\d+²\)\?$/)
      if (!match) return
      const n = Number(match[1])
      expect(ex.answer).toEqual({ kind: 'number', value: n * n })
      expect(ex.prompt.visual).toEqual({ kind: 'dot-grid', n })

      const strategyVisualStep = ex.strategies[0].steps.find((s) => s.visual?.kind === 'dot-grid')
      expect(strategyVisualStep?.visual).toEqual({ kind: 'dot-grid', n })
    })
  })

  it('reverse kind: answer n satisfies n*n = the given perfect square', () => {
    propertyTestWithDeterminism(cuadradosGenerator, { difficulties: DIFFICULTIES, seeds: 400 }, (ex) => {
      const match = ex.prompt.text.match(/^¿Qué número multiplicado por sí mismo da (\d+)\?$/)
      if (!match) return
      const square = Number(match[1])
      expect(ex.answer.kind).toBe('number')
      if (ex.answer.kind !== 'number') return
      expect(ex.answer.value * ex.answer.value).toBe(square)
    })
  })

  it('both forward and reverse kinds appear across many seeds', () => {
    let forward = 0
    let reverse = 0
    propertyTestWithDeterminism(cuadradosGenerator, { difficulties: [4], seeds: 200 }, (ex) => {
      if (/al cuadrado/.test(ex.prompt.text)) forward++
      else reverse++
    })
    expect(forward).toBeGreaterThan(0)
    expect(reverse).toBeGreaterThan(0)
  })
})
