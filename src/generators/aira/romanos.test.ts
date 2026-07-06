import { describe, expect, it } from 'vitest'
import { romanosGenerator, toRoman, fromRoman } from './romanos'
import { createRng } from '../../lib/rng'
import { DEFAULT_TEST_FLAVOR, propertyTestWithDeterminism } from '../testUtils'
import type { Exercise } from '../../types/exercise'

const DIFFICULTIES = [1, 2, 3]

/** Rejects 4-in-a-row repeated numeral characters (e.g. "IIII", "XXXX", "CCCC") or any run of >3 consecutive identical chars. */
function hasInvalidRepeats(roman: string): boolean {
  return /(.)\1{3,}/.test(roman)
}

describe('toRoman / fromRoman round-trip', () => {
  it('round-trips every integer 1-3999', () => {
    for (let n = 1; n <= 3999; n++) {
      const roman = toRoman(n)
      expect(fromRoman(roman)).toBe(n)
      expect(hasInvalidRepeats(roman), `"${roman}" (${n}) has an invalid repeat run`).toBe(false)
    }
  })

  it('produces known canonical forms', () => {
    expect(toRoman(4)).toBe('IV')
    expect(toRoman(9)).toBe('IX')
    expect(toRoman(40)).toBe('XL')
    expect(toRoman(90)).toBe('XC')
    expect(toRoman(400)).toBe('CD')
    expect(toRoman(900)).toBe('CM')
    expect(toRoman(1994)).toBe('MCMXCIV')
    expect(toRoman(58)).toBe('LVIII')
  })
})

describe('romanosGenerator', () => {
  it('produces a valid exercise shape and round-trips the roman numeral involved (200 seeds x each difficulty)', () => {
    propertyTestWithDeterminism(romanosGenerator, { difficulties: DIFFICULTIES }, (exercise, ctx) => {
      expect(exercise.subskill).toBe('romanos')
      expect(exercise.difficulty).toBe(ctx.difficulty)
      expect(exercise.microlesson).toBe(
        'Los romanos no tenían el cero: por eso su sistema era mucho más difícil que el nuestro.',
      )
      expect(exercise.strategies.length).toBeGreaterThanOrEqual(1)

      // Extract every roman numeral appearing anywhere in the exercise (prompt, answer, choices) and round-trip it.
      const romanCandidates: string[] = []
      const romanInPrompt = exercise.prompt.text.match(/\b[MDCLXVI]+\b/g)
      if (romanInPrompt) romanCandidates.push(...romanInPrompt)
      if (exercise.answer.kind === 'text') romanCandidates.push(exercise.answer.value)
      if (exercise.choices) romanCandidates.push(...exercise.choices.map((c) => c.label))

      for (const roman of romanCandidates) {
        if (!/^[MDCLXVI]+$/.test(roman)) continue
        const decoded = fromRoman(roman)
        expect(decoded).toBeGreaterThan(0)
        expect(toRoman(decoded), `"${roman}" does not round-trip to itself`).toBe(roman)
        expect(hasInvalidRepeats(roman), `"${roman}" has an invalid repeat run (e.g. IIII/XXXX/CCCC)`).toBe(false)
      }
    })
  })

  it('presents the strategy rule/legend step BEFORE the worked result step (so Aira learns the rule before seeing the answer)', () => {
    propertyTestWithDeterminism(romanosGenerator, { difficulties: DIFFICULTIES }, (exercise) => {
      const strategy = exercise.strategies.find((s) => s.id === 'valores-romanos')
      expect(strategy, 'valores-romanos strategy always present').toBeDefined()
      if (!strategy) return
      expect(strategy.steps.length).toBe(2)
      expect(strategy.steps[0].text, `first step should be the rule/legend: "${strategy.steps[0].text}"`).toMatch(
        /^Recuerda: M=1000/,
      )
      expect(
        strategy.steps[1].text,
        `second step should be the worked result "roman = n": "${strategy.steps[1].text}"`,
      ).toMatch(/^[MDCLXVI]+ = \d+$/)
    })
  })

  it('roman-to-decimal: answer.value matches the decoded roman numeral shown in the prompt', () => {
    propertyTestWithDeterminism(romanosGenerator, { difficulties: DIFFICULTIES }, (exercise) => {
      const match = exercise.prompt.text.match(/^¿Qué número decimal es ([MDCLXVI]+)\?$/)
      if (!match) return
      expect(exercise.answer.kind).toBe('number')
      if (exercise.answer.kind !== 'number') return
      expect(exercise.answer.value).toBe(fromRoman(match[1]))
    })
  })

  it('decimal-to-roman: answer.value is the canonical roman string for the decimal shown in the prompt', () => {
    propertyTestWithDeterminism(romanosGenerator, { difficulties: DIFFICULTIES }, (exercise) => {
      const match = exercise.prompt.text.match(/^Escribe (\d+) en números romanos\.$/)
      if (!match) return
      const n = Number(match[1])
      expect(exercise.answer.kind).toBe('text')
      if (exercise.answer.kind !== 'text') return
      expect(exercise.answer.value).toBe(toRoman(n))
      expect(hasInvalidRepeats(exercise.answer.value)).toBe(false)
    })
  })

  it('pick-the-correct-roman: correct choice decodes to the decimal in the prompt, with plausible distractors', () => {
    propertyTestWithDeterminism(romanosGenerator, { difficulties: DIFFICULTIES }, (exercise) => {
      const match = exercise.prompt.text.match(/representa el (\d+)\?$/)
      if (!match) return
      const n = Number(match[1])
      const answer = exercise.answer
      expect(answer.kind).toBe('choice')
      if (answer.kind !== 'choice') return
      expect(exercise.choices).toBeDefined()

      const correctChoice = exercise.choices!.find((c) => c.id === answer.correctId)
      expect(correctChoice).toBeDefined()
      expect(fromRoman(correctChoice!.label)).toBe(n)

      const labels = exercise.choices!.map((c) => c.label)
      expect(new Set(labels).size).toBe(labels.length)
      for (const choice of exercise.choices!) {
        expect(hasInvalidRepeats(choice.label)).toBe(false)
      }
    })
  })

  it('hits all three kinds across many seeds', () => {
    let romanToDecimal = 0
    let decimalToRoman = 0
    let pickCorrect = 0
    propertyTestWithDeterminism(romanosGenerator, { difficulties: DIFFICULTIES, seeds: 200 }, (exercise) => {
      if (/^¿Qué número decimal es/.test(exercise.prompt.text)) romanToDecimal++
      else if (/^Escribe/.test(exercise.prompt.text)) decimalToRoman++
      else if (/representa el/.test(exercise.prompt.text)) pickCorrect++
    })
    expect(romanToDecimal).toBeGreaterThan(0)
    expect(decimalToRoman).toBeGreaterThan(0)
    expect(pickCorrect).toBeGreaterThan(0)
  })

  it('does not throw for NaN/Infinity/undefined difficulty and clamps to range-min (1)', () => {
    for (const bogusDifficulty of [NaN, Infinity, -Infinity, undefined]) {
      const rng = createRng('nan-guard-seed')
      let exercise: Exercise | undefined
      expect(() => {
        exercise = romanosGenerator.generate(rng, bogusDifficulty as unknown as number, DEFAULT_TEST_FLAVOR)
      }).not.toThrow()
      expect(exercise).toBeDefined()
      expect(exercise!.difficulty).toBe(1)
      expect(Number.isFinite(exercise!.difficulty)).toBe(true)
    }
  })
})
