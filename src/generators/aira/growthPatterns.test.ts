import { describe, expect, it } from 'vitest'
import { patronesCrecimientoGenerator } from './growthPatterns'
import { createRng } from '../../lib/rng'
import { DEFAULT_TEST_FLAVOR, propertyTestWithDeterminism } from '../testUtils'
import type { Exercise } from '../../types/exercise'

const DIFFICULTIES = [2, 3, 4, 5]

/** Recomputes the next term from the shown terms, independently of the generator, for each pattern kind actually observed. */
function recomputeNextTerm(terms: number[]): number[] {
  const candidates: number[] = []

  // Arithmetic (constant difference).
  const diffs = terms.slice(1).map((t, i) => t - terms[i])
  if (diffs.every((d) => d === diffs[0])) {
    candidates.push(terms[terms.length - 1] + diffs[0])
  }

  // Doubling (constant ratio of 2).
  const ratios = terms.slice(1).map((t, i) => (terms[i] === 0 ? NaN : t / terms[i]))
  if (ratios.every((r) => r === 2)) {
    candidates.push(terms[terms.length - 1] * 2)
  }

  // Growing-step / triangular family: the differences themselves form an
  // arithmetic sequence (constant second difference). Covers growing-step
  // (second difference 1), classic/offset triangular (second difference 1)
  // and scaled n(n+1) triangular (second difference 2).
  if (diffs.length >= 2) {
    const stepDiffs = diffs.slice(1).map((d, i) => d - diffs[i])
    if (stepDiffs.every((d) => d === stepDiffs[0])) {
      const nextDiff = diffs[diffs.length - 1] + stepDiffs[0]
      candidates.push(terms[terms.length - 1] + nextDiff)
    }
  }

  return candidates
}

describe('patronesCrecimientoGenerator', () => {
  it('next term is correct for the actually-generated pattern (200 seeds x each difficulty)', () => {
    propertyTestWithDeterminism(patronesCrecimientoGenerator, { difficulties: DIFFICULTIES }, (exercise, ctx) => {
      expect(exercise.subskill).toBe('patrones-crecimiento')
      expect(exercise.difficulty).toBe(ctx.difficulty)
      expect(exercise.answer.kind).toBe('number')
      if (exercise.answer.kind !== 'number') return

      const match = exercise.prompt.text.match(/secuencia: ([\d, ]+), \.\.\./)
      expect(match, `prompt malformed: "${exercise.prompt.text}"`).toBeTruthy()
      const terms = match![1].split(',').map((s) => Number(s.trim()))

      const candidates = recomputeNextTerm(terms)
      expect(candidates, `no known pattern matched terms ${terms.join(',')}`).not.toHaveLength(0)
      expect(candidates).toContain(exercise.answer.value)
    })
  })

  it('strategy step arithmetic is self-consistent (last step is a real addition/multiplication claim)', () => {
    propertyTestWithDeterminism(patronesCrecimientoGenerator, { difficulties: DIFFICULTIES }, (exercise) => {
      expect(exercise.answer.kind).toBe('number')
      if (exercise.answer.kind !== 'number') return
      const strategy = exercise.strategies[0]
      const lastStep = strategy.steps[strategy.steps.length - 1]

      const addMatch = lastStep.text.match(/(\d+)\s*\+\s*(\d+)\s*=\s*(\d+)/)
      const mulMatch = lastStep.text.match(/(\d+)\s*×\s*(\d+)\s*=\s*(\d+)/)
      if (addMatch) {
        expect(Number(addMatch[1]) + Number(addMatch[2])).toBe(Number(addMatch[3]))
        expect(Number(addMatch[3])).toBe(exercise.answer.value)
      } else if (mulMatch) {
        expect(Number(mulMatch[1]) * Number(mulMatch[2])).toBe(Number(mulMatch[3]))
        expect(Number(mulMatch[3])).toBe(exercise.answer.value)
      } else {
        throw new Error(`last step malformed: "${lastStep.text}"`)
      }
    })
  })

  it('difficulty-to-pattern mapping is exactly as documented: d2 arithmetic, d3 doubling, d4 triangular, d5 growing-step', () => {
    propertyTestWithDeterminism(patronesCrecimientoGenerator, { difficulties: DIFFICULTIES }, (exercise, ctx) => {
      const strategyId = exercise.strategies[0].id
      const expectedByDifficulty: Record<number, string> = {
        2: 'diferencias-constantes',
        3: 'duplicar',
        4: 'numeros-triangulares',
        5: 'salto-creciente',
      }
      expect(strategyId).toBe(expectedByDifficulty[ctx.difficulty])
    })
  })

  it('d4 triangular shows variety: classic (1,3,6,10,15), offset starts, and scaled n(n+1) all appear across seeds, and its strategy stays arithmetically correct', () => {
    let classic = 0
    let offset = 0
    let scaled = 0
    propertyTestWithDeterminism(patronesCrecimientoGenerator, { difficulties: [4], seeds: 200 }, (exercise) => {
      expect(exercise.strategies[0].id).toBe('numeros-triangulares')
      const match = exercise.prompt.text.match(/secuencia: ([\d, ]+), \.\.\./)
      const terms = match![1].split(',').map((s) => Number(s.trim()))

      // Differences must form an arithmetic sequence (constant second difference).
      const diffs = terms.slice(1).map((t, i) => t - terms[i])
      const stepDiffs = diffs.slice(1).map((d, i) => d - diffs[i])
      expect(stepDiffs.every((d) => d === stepDiffs[0])).toBe(true)

      if (terms.join(',') === '1,3,6,10,15') classic++
      else if (stepDiffs[0] === 2) scaled++
      else if (stepDiffs[0] === 1) offset++

      // Recomputed next term matches the generator's answer.
      const nextDiff = diffs[diffs.length - 1] + stepDiffs[0]
      expect(exercise.answer.kind === 'number' && exercise.answer.value).toBe(terms[terms.length - 1] + nextDiff)
    })
    expect(classic, 'classic triangular should appear').toBeGreaterThan(0)
    expect(offset, 'offset triangular should appear').toBeGreaterThan(0)
    expect(scaled, 'scaled n(n+1) triangular should appear').toBeGreaterThan(0)
  })

  it('does not throw for NaN/Infinity/undefined difficulty and clamps to range-min (2)', () => {
    for (const bogusDifficulty of [NaN, Infinity, -Infinity, undefined]) {
      const rng = createRng('nan-guard-seed')
      let exercise: Exercise | undefined
      expect(() => {
        exercise = patronesCrecimientoGenerator.generate(rng, bogusDifficulty as unknown as number, DEFAULT_TEST_FLAVOR)
      }).not.toThrow()
      expect(exercise).toBeDefined()
      expect(exercise!.difficulty).toBe(2)
      expect(Number.isFinite(exercise!.difficulty)).toBe(true)
    }
  })
})
