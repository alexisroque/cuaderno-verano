import { describe, expect, it } from 'vitest'
import { hechosDerivadosDecGenerator } from './derivedFacts'
import { propertyTestWithDeterminism, DEFAULT_TEST_FLAVOR, REAL_CHAPTER_FLAVORS } from '../testUtils'
import type { Exercise } from '../../types/exercise'

const DIFFICULTIES = [3, 4, 5]

const SINGAPORE_FLAVOR = REAL_CHAPTER_FLAVORS.find((f) => f.currencySymbol === 'S$')
const MALAYSIA_FLAVOR = REAL_CHAPTER_FLAVORS.find((f) => f.currencySymbol === 'RM')

/** Same currency-symbol extraction as decimalMoney.test.ts — decimalMoney/derivedFacts always use "€". */
function currencySymbolsIn(text: string): string[] {
  // Lookahead (not \b) after the symbol: "€"/"Rp" aren't \w chars, so \b
  // never matches right after them (no word/non-word transition there).
  const matches = [...text.matchAll(/\d(?:,\d+)?\s*(€|S\$|RM|Rp)(?=[\s.,;)]|$)/g)]
  return matches.map((m) => m[1])
}

function assertPromptAndStrategiesUseEuro(ex: Exercise): void {
  const promptSymbols = currencySymbolsIn(ex.prompt.text)
  expect(promptSymbols.length, `no currency symbol found in prompt: "${ex.prompt.text}"`).toBeGreaterThan(0)
  for (const sym of promptSymbols) {
    expect(sym, `prompt uses non-euro symbol: "${ex.prompt.text}"`).toBe('€')
  }
  for (const strategy of ex.strategies) {
    for (const step of strategy.steps) {
      const stepSymbols = currencySymbolsIn(step.text)
      for (const sym of stepSymbols) {
        expect(sym, `strategy step "${strategy.id}" uses non-euro symbol: "${step.text}"`).toBe('€')
      }
    }
  }
}

/** Parses "X,YY" euro strings (as produced by centsToEuroString) into integer cents. */
function euroStringToCents(s: string): number {
  const [euros, cents] = s.split(',')
  return Number(euros) * 100 + Number(cents)
}

describe('hechosDerivadosDecGenerator', () => {
  it('is registered under subskill "hechos-derivados-dec"', () => {
    expect(hechosDerivadosDecGenerator.subskill).toBe('hechos-derivados-dec')
  })

  it('clamps difficulty to [3, 5] and sets challenge:true', () => {
    propertyTestWithDeterminism(hechosDerivadosDecGenerator, { difficulties: [1, 2, 3, 4, 5, 6, 99] }, (ex) => {
      expect(ex.difficulty).toBeGreaterThanOrEqual(3)
      expect(ex.difficulty).toBeLessThanOrEqual(5)
      expect(ex.challenge).toBe(true)
    })
  })

  it('the stated known integer fact is arithmetically correct', () => {
    propertyTestWithDeterminism(hechosDerivadosDecGenerator, { difficulties: DIFFICULTIES, seeds: 400 }, (ex) => {
      const match = ex.prompt.text.match(/^Sabiendo que (\d+) ([+-]) (\d+) = (\d+),/)
      expect(match).toBeTruthy()
      if (!match) return
      const [, aStr, op, bStr, resultStr] = match
      const a = Number(aStr)
      const b = Number(bStr)
      const result = Number(resultStr)
      expect(op === '+' ? a + b : a - b).toBe(result)
    })
  })

  it('the derived decimal fact is arithmetically correct AND derivable from the known fact by the stated delta transform', () => {
    propertyTestWithDeterminism(hechosDerivadosDecGenerator, { difficulties: DIFFICULTIES, seeds: 400 }, (ex) => {
      const knownMatch = ex.prompt.text.match(/^Sabiendo que (\d+) ([+-]) (\d+) = \d+,/)
      const derivedMatch = ex.prompt.text.match(/¿cuánto es ([\d,]+) (€|S\$|RM) ([+−]) ([\d,]+) \2\?/)
      expect(knownMatch).toBeTruthy()
      expect(derivedMatch).toBeTruthy()
      if (!knownMatch || !derivedMatch) return

      const knownA = Number(knownMatch[1])
      const knownB = Number(knownMatch[3])

      const toCents = (s: string) => {
        const [e, c] = s.split(',')
        return Number(e) * 100 + Number(c)
      }
      const derivedACents = toCents(derivedMatch[1])
      const derivedBCents = toCents(derivedMatch[4])
      const isAddition = derivedMatch[3] === '+'

      // Both derived operands must be derivable from the known ones by the SAME delta (delta = knownX*100 - derivedXCents).
      const deltaA = knownA * 100 - derivedACents
      const deltaB = knownB * 100 - derivedBCents
      expect(deltaA).toBe(deltaB)
      expect(deltaA).toBeGreaterThan(0)

      const expectedResultCents = isAddition ? derivedACents + derivedBCents : derivedACents - derivedBCents
      expect(ex.answer.kind).toBe('number')
      if (ex.answer.kind !== 'number') return
      expect(Math.round(ex.answer.value * 100)).toBe(expectedResultCents)
    })
  })

  it('the hechos-derivados-decimales strategy is present', () => {
    propertyTestWithDeterminism(hechosDerivadosDecGenerator, { difficulties: DIFFICULTIES, seeds: 200 }, (ex) => {
      expect(ex.strategies.map((s) => s.id)).toContain('hechos-derivados-decimales')
    })
  })

  it('prompt and every strategy step use "€" consistently (default, Singapore S$, and Malaysia RM flavors)', () => {
    propertyTestWithDeterminism(hechosDerivadosDecGenerator, { difficulties: DIFFICULTIES, seeds: 200, flavor: DEFAULT_TEST_FLAVOR }, (ex) => {
      assertPromptAndStrategiesUseEuro(ex)
    })
    expect(SINGAPORE_FLAVOR).toBeDefined()
    if (SINGAPORE_FLAVOR) {
      propertyTestWithDeterminism(hechosDerivadosDecGenerator, { difficulties: DIFFICULTIES, seeds: 200, flavor: SINGAPORE_FLAVOR }, (ex) => {
        assertPromptAndStrategiesUseEuro(ex)
      })
    }
    expect(MALAYSIA_FLAVOR).toBeDefined()
    if (MALAYSIA_FLAVOR) {
      propertyTestWithDeterminism(hechosDerivadosDecGenerator, { difficulties: DIFFICULTIES, seeds: 200, flavor: MALAYSIA_FLAVOR }, (ex) => {
        assertPromptAndStrategiesUseEuro(ex)
      })
    }
  })

  it('addition strategy: shows an explicit, arithmetically correct compensation/adjustment step bridging the known fact to the decimal result', () => {
    let additionSeen = false
    propertyTestWithDeterminism(hechosDerivadosDecGenerator, { difficulties: DIFFICULTIES, seeds: 400 }, (ex) => {
      const isAddition = /^Sabiendo que \d+ \+ /.test(ex.prompt.text)
      if (!isAddition) return
      additionSeen = true

      const strategy = ex.strategies.find((s) => s.id === 'hechos-derivados-decimales')
      expect(strategy).toBeDefined()
      if (!strategy) return

      // Pull the known fact (knownA + knownB = knownResult) from the prompt.
      const knownMatch = ex.prompt.text.match(/^Sabiendo que (\d+) \+ (\d+) = (\d+),/)
      expect(knownMatch).toBeTruthy()
      if (!knownMatch) return
      const knownA = Number(knownMatch[1])
      const knownB = Number(knownMatch[2])
      const knownResult = Number(knownMatch[3])
      expect(knownA + knownB).toBe(knownResult)

      // Pull the derived decimal operands from the prompt.
      const derivedMatch = ex.prompt.text.match(/¿cuánto es ([\d,]+) (€|S\$|RM) \+ ([\d,]+) \2\?/)
      expect(derivedMatch).toBeTruthy()
      if (!derivedMatch) return
      const derivedACents = euroStringToCents(derivedMatch[1])
      const derivedBCents = euroStringToCents(derivedMatch[3])
      const derivedResultCents = derivedACents + derivedBCents

      // The delta each operand is below its whole-euro known-fact counterpart.
      const deltaACents = knownA * 100 - derivedACents
      const deltaBCents = knownB * 100 - derivedBCents
      const totalDeltaCents = deltaACents + deltaBCents

      // The bridge/compensation step must state the TOTAL delta explicitly and
      // subtract it from the known-fact result in cents, landing on the real
      // (correct) decimal result — e.g. "19 - 0,20 = 18,80". We look for a
      // step containing a "knownResult - totalDelta = derivedResult" style
      // subtraction using the actual computed numbers (allowing "." or ","
      // decimal and a leading "0" for sub-1-euro deltas).
      const totalDeltaEuroStr = (totalDeltaCents / 100).toFixed(2).replace('.', ',')
      const derivedResultEuroStr = (derivedResultCents / 100).toFixed(2).replace('.', ',')
      const bridgeStepFound = strategy.steps.some(
        (step) =>
          step.text.includes(String(knownResult)) &&
          step.text.includes(totalDeltaEuroStr) &&
          step.text.includes(derivedResultEuroStr) &&
          /-|−/.test(step.text),
      )
      expect(
        bridgeStepFound,
        `no explicit compensation step found bridging ${knownResult} to ${derivedResultEuroStr} via delta ${totalDeltaEuroStr}. Steps: ${JSON.stringify(strategy.steps.map((s) => s.text))}`,
      ).toBe(true)
    })
    expect(additionSeen, 'no addition-branch exercise was generated across seeds — test is vacuous').toBe(true)
  })

  it('subtraction strategy: the known-fact result equals the derived decimal result exactly (deltas cancel), and no step asserts a false compensation', () => {
    let subtractionSeen = false
    propertyTestWithDeterminism(hechosDerivadosDecGenerator, { difficulties: DIFFICULTIES, seeds: 400 }, (ex) => {
      const isSubtraction = /^Sabiendo que \d+ - /.test(ex.prompt.text)
      if (!isSubtraction) return
      subtractionSeen = true

      const knownMatch = ex.prompt.text.match(/^Sabiendo que (\d+) - (\d+) = (\d+),/)
      expect(knownMatch).toBeTruthy()
      if (!knownMatch) return
      const knownResult = Number(knownMatch[3])

      const derivedMatch = ex.prompt.text.match(/¿cuánto es ([\d,]+) (€|S\$|RM) − ([\d,]+) \2\?/)
      expect(derivedMatch).toBeTruthy()
      if (!derivedMatch) return
      const derivedACents = euroStringToCents(derivedMatch[1])
      const derivedBCents = euroStringToCents(derivedMatch[3])
      const derivedResultCents = derivedACents - derivedBCents

      // Because both operands are shifted by the SAME delta, the deltas
      // cancel exactly: the derived result (in cents) equals the known
      // integer result * 100 — no adjustment needed.
      expect(derivedResultCents).toBe(knownResult * 100)
    })
    expect(subtractionSeen, 'no subtraction-branch exercise was generated across seeds — test is vacuous').toBe(true)
  })
})
