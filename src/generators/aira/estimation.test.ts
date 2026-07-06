import { describe, expect, it } from 'vitest'
import { estimacionGenerator } from './estimation'
import { createRng } from '../../lib/rng'
import { DEFAULT_TEST_FLAVOR, propertyTestWithDeterminism } from '../testUtils'
import type { Exercise } from '../../types/exercise'

const DIFFICULTIES = [2, 3, 4, 5]

describe('estimacionGenerator', () => {
  it('produces a valid exercise shape across 200 seeds x each difficulty', () => {
    propertyTestWithDeterminism(estimacionGenerator, { difficulties: DIFFICULTIES }, (exercise, ctx) => {
      expect(exercise.subskill).toBe('estimacion')
      expect(exercise.difficulty).toBe(ctx.difficulty)
      expect(exercise.answer.kind).toBe('choice')
      expect(exercise.choices, 'choices must be populated').toBeDefined()
      expect(exercise.choices!.length).toBeGreaterThanOrEqual(2)
      expect(exercise.strategies.length).toBeGreaterThanOrEqual(1)
      for (const strategy of exercise.strategies) {
        expect(strategy.steps.length).toBeGreaterThanOrEqual(1)
      }

      if (exercise.answer.kind === 'choice') {
        const ids = exercise.choices!.map((c) => c.id)
        expect(ids).toContain(exercise.answer.correctId)
        // no duplicate choice values
        const labels = exercise.choices!.map((c) => c.label)
        expect(new Set(labels).size).toBe(labels.length)
      }
    })
  })

  it('hits all three kinds (pick-plausible, budget-check, spot-the-error) across 800 draws', () => {
    let pickPlausible = 0
    let budgetCheck = 0
    let spotTheError = 0
    propertyTestWithDeterminism(estimacionGenerator, { difficulties: DIFFICULTIES, seeds: 200 }, (exercise) => {
      const text = exercise.prompt.text
      if (text.startsWith('Sin calcular: ¿cuál puede ser el resultado')) pickPlausible++
      else if (text.startsWith('Tienes')) budgetCheck++
      else if (text.startsWith('Alguien resolvió')) spotTheError++
    })
    expect(pickPlausible).toBeGreaterThan(0)
    expect(budgetCheck).toBeGreaterThan(0)
    expect(spotTheError).toBeGreaterThan(0)
  })

  describe('pick-plausible', () => {
    it('correct choice is the true product, distractors are all >= 50% off and non-colliding', () => {
      propertyTestWithDeterminism(estimacionGenerator, { difficulties: DIFFICULTIES }, (exercise) => {
        if (!exercise.prompt.text.startsWith('Sin calcular: ¿cuál puede ser el resultado')) return
        const match = exercise.prompt.text.match(/resultado de (\d+) × (\d+)\?/)
        if (!match) return
        const [a, b] = [Number(match[1]), Number(match[2])]
        const trueValue = a * b

        const answer = exercise.answer
        expect(answer.kind).toBe('choice')
        if (answer.kind !== 'choice') return
        const correctId = answer.correctId
        const correctChoice = exercise.choices!.find((c) => c.id === correctId)
        expect(Number(correctChoice!.label)).toBe(trueValue)

        for (const choice of exercise.choices!) {
          const value = Number(choice.label)
          if (choice.id === correctId) continue
          expect(Math.abs(value - trueValue) / trueValue, `distractor ${value} too close to true value ${trueValue}`).toBeGreaterThanOrEqual(0.5)
        }
      })
    })
  })

  describe('budget-check', () => {
    it('margin >= 15% of budget, and correct choice matches whether sum <= budget', () => {
      propertyTestWithDeterminism(estimacionGenerator, { difficulties: DIFFICULTIES }, (exercise) => {
        const match = exercise.prompt.text.match(
          /Tienes (\d+) .+\. Quieres comprar .+ de (\d+) .+ y .+ de (\d+) .+\./,
        )
        if (!match) return
        const budget = Number(match[1])
        const a = Number(match[2])
        const b = Number(match[3])
        const sum = a + b

        expect(Math.abs(budget - sum) / budget).toBeGreaterThanOrEqual(0.15 - 1e-9)

        const answer = exercise.answer
        expect(answer.kind).toBe('choice')
        if (answer.kind !== 'choice') return
        const correctChoice = exercise.choices!.find((c) => c.id === answer.correctId)
        const expectedLabel = sum <= budget ? 'Sí' : 'No'
        expect(correctChoice!.label).toBe(expectedLabel)
      })
    })

    it('strategy rounds each price UP to the next 10 and its conclusion never contradicts the answer', () => {
      propertyTestWithDeterminism(estimacionGenerator, { difficulties: DIFFICULTIES }, (exercise) => {
        const match = exercise.prompt.text.match(
          /Tienes (\d+) .+\. Quieres comprar .+ de (\d+) .+ y .+ de (\d+) .+\./,
        )
        if (!match) return
        const budget = Number(match[1])
        const a = Number(match[2])
        const b = Number(match[3])

        const strategy = exercise.strategies.find((s) => s.id === 'presupuesto-redondeo')
        expect(strategy, 'budget-check strategy present').toBeDefined()

        // First step must round each price UP to the next 10 (ceiling).
        const roundStep = strategy!.steps[0].text
        expect(roundStep).toContain('hacia arriba')
        const roundedA = Math.ceil(a / 10) * 10
        const roundedB = Math.ceil(b / 10) * 10
        expect(roundStep, `round step should mention ${roundedA}`).toContain(String(roundedA))
        expect(roundStep, `round step should mention ${roundedB}`).toContain(String(roundedB))

        // The rounded sum step is a real, correct addition.
        const sumStep = strategy!.steps[1].text.match(/(\d+)\s*\+\s*(\d+)\s*=\s*(\d+)/)
        expect(sumStep, `sum step malformed: "${strategy!.steps[1].text}"`).toBeTruthy()
        const roundedSum = Number(sumStep![1]) + Number(sumStep![2])
        expect(roundedSum).toBe(Number(sumStep![3]))
        expect(roundedSum).toBe(roundedA + roundedB)

        // Conclusion drawn from the rounded-up sum must match the true answer.
        const answer = exercise.answer
        if (answer.kind !== 'choice') return
        const answeredYes = exercise.choices!.find((c) => c.id === answer.correctId)!.label === 'Sí'
        const strategyConcludesFits = roundedSum <= budget
        expect(
          strategyConcludesFits,
          `round-up strategy conclusion (fits=${strategyConcludesFits}) contradicts answer (fits=${answeredYes}) for a=${a} b=${b} budget=${budget}`,
        ).toBe(answeredYes)
      })
    })
  })

  describe('spot-the-error', () => {
    it('exactly one step is wrong when recomputed, matching answer.correctId', () => {
      propertyTestWithDeterminism(estimacionGenerator, { difficulties: DIFFICULTIES }, (exercise) => {
        if (!exercise.prompt.text.startsWith('Alguien resolvió')) return

        const strategy = exercise.strategies.find((s) => s.id === 'busca-el-error')
        expect(strategy).toBeDefined()

        const wrongIndices: number[] = []
        strategy!.steps.forEach((step, i) => {
          // Addition step: "Paso N: prev + n = claimed" or "Paso N: n = claimed" (first step).
          const addMatch = step.text.match(/Paso \d+:\s*(?:(\d+)\s*\+\s*)?(\d+)\s*=\s*(\d+)/)
          const mulMatch = step.text.match(/Paso \d+:\s*(\d+)\s*×\s*(\d+)\s*=\s*(\d+)/)
          const sumMatch = step.text.match(/Paso \d+:\s*(\d+(?:\s*\+\s*\d+)+)\s*=\s*(\d+)/)

          if (mulMatch) {
            const [n, m, claimed] = [Number(mulMatch[1]), Number(mulMatch[2]), Number(mulMatch[3])]
            if (n * m !== claimed) wrongIndices.push(i)
          } else if (sumMatch) {
            const addends = sumMatch[1].split('+').map((s) => Number(s.trim()))
            const claimed = Number(sumMatch[2])
            const actual = addends.reduce((acc, n) => acc + n, 0)
            if (actual !== claimed) wrongIndices.push(i)
          } else if (addMatch) {
            const prev = addMatch[1] !== undefined ? Number(addMatch[1]) : 0
            const n = Number(addMatch[2])
            const claimed = Number(addMatch[3])
            const isFirstStep = addMatch[1] === undefined
            const expected = isFirstStep ? n : prev + n
            if (expected !== claimed) wrongIndices.push(i)
          }
        })

        expect(wrongIndices.length, `expected exactly 1 wrong step, found ${wrongIndices.length} in: ${JSON.stringify(strategy!.steps.map((s) => s.text))}`).toBe(1)
        const answer = exercise.answer
        expect(answer.kind).toBe('choice')
        if (answer.kind !== 'choice') return
        const correctChoiceIndex = exercise.choices!.findIndex((c) => c.id === answer.correctId)
        expect(correctChoiceIndex).toBe(wrongIndices[0])
      })
    })
  })

  it('does not throw for NaN/Infinity/undefined difficulty and clamps to range-min (2)', () => {
    for (const bogusDifficulty of [NaN, Infinity, -Infinity, undefined]) {
      const rng = createRng('nan-guard-seed')
      let exercise: Exercise | undefined
      expect(() => {
        exercise = estimacionGenerator.generate(rng, bogusDifficulty as unknown as number, DEFAULT_TEST_FLAVOR)
      }).not.toThrow()
      expect(exercise).toBeDefined()
      expect(exercise!.difficulty).toBe(2)
      expect(Number.isFinite(exercise!.difficulty)).toBe(true)
    }
  })
})
