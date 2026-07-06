import { describe, expect, it } from 'vitest'
import { decimalesDineroGenerator } from './decimalMoney'
import { propertyTestWithDeterminism, DEFAULT_TEST_FLAVOR, REAL_CHAPTER_FLAVORS } from '../testUtils'
import type { Exercise } from '../../types/exercise'

const DIFFICULTIES = [3, 4, 5]

/** Every real chapter flavor with an S$ (Singapore) currency symbol. */
const SINGAPORE_FLAVOR = REAL_CHAPTER_FLAVORS.find((f) => f.currencySymbol === 'S$')
/** Every real chapter flavor with an RM (Malaysia) currency symbol. */
const MALAYSIA_FLAVOR = REAL_CHAPTER_FLAVORS.find((f) => f.currencySymbol === 'RM')

/**
 * Extracts every currency-symbol-like token that appears immediately after a
 * number in the prompt/strategy text (€, S$, RM, Rp, etc.), so we can assert
 * the prompt and every strategy step agree on a single currency symbol.
 * decimalMoney/derivedFacts are specified to ALWAYS use "€", regardless of
 * chapter flavor, so this helper just needs to find whichever symbol(s) show
 * up and assert they're all "€".
 */
function currencySymbolsIn(text: string): string[] {
  // Lookahead (not \b) after the symbol: "€"/"Rp" aren't \w chars, so \b
  // never matches right after them (no word/non-word transition there).
  const matches = [...text.matchAll(/\d(?:,\d+)?\s*(€|S\$|RM|Rp)(?=[\s.,;)]|$)/g)]
  return matches.map((m) => m[1])
}

/** Asserts every currency symbol found in the prompt AND every strategy step is "€". */
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

/** Parses a "X,YY" euro string back into integer cents. */
function euroStringToCents(s: string): number {
  const negative = s.startsWith('-')
  const clean = negative ? s.slice(1) : s
  const [euros, cents] = clean.split(',')
  const total = Number(euros) * 100 + Number(cents)
  return negative ? -total : total
}

describe('decimalesDineroGenerator', () => {
  it('is registered under subskill "decimales-dinero"', () => {
    expect(decimalesDineroGenerator.subskill).toBe('decimales-dinero')
  })

  it('clamps difficulty to [3, 5] and sets challenge:true', () => {
    propertyTestWithDeterminism(decimalesDineroGenerator, { difficulties: [1, 2, 3, 4, 5, 6, 99] }, (ex) => {
      expect(ex.difficulty).toBeGreaterThanOrEqual(3)
      expect(ex.difficulty).toBeLessThanOrEqual(5)
      expect(ex.challenge).toBe(true)
    })
  })

  it('answer * 100 is always an integer — no float drift from cents-based arithmetic', () => {
    propertyTestWithDeterminism(decimalesDineroGenerator, { difficulties: DIFFICULTIES, seeds: 400 }, (ex) => {
      expect(ex.answer.kind).toBe('number')
      if (ex.answer.kind !== 'number') return
      const centsValue = Math.round(ex.answer.value * 100)
      expect(centsValue).toBeCloseTo(ex.answer.value * 100, 9)
      expect(Number.isInteger(centsValue)).toBe(true)
    })
  })

  it('recomputes the operation from the prompt in integer cents and matches the answer exactly', () => {
    propertyTestWithDeterminism(decimalesDineroGenerator, { difficulties: DIFFICULTIES, seeds: 400 }, (ex) => {
      const match = ex.prompt.text.match(/\(([\d,-]+) ([+−]) ([\d,-]+)\)$/)
      expect(match, `prompt did not match expected shape: "${ex.prompt.text}"`).toBeTruthy()
      if (!match) return
      const [, startStr, opChar, opStr] = match
      const startCents = euroStringToCents(startStr)
      const opCents = euroStringToCents(opStr)
      const expectedCents = opChar === '+' ? startCents + opCents : startCents - opCents

      expect(ex.answer.kind).toBe('number')
      if (ex.answer.kind !== 'number') return
      expect(Math.round(ex.answer.value * 100)).toBe(expectedCents)
    })
  })

  it('both strategies (saltos-linea and descomposicion-monedas) are present', () => {
    propertyTestWithDeterminism(decimalesDineroGenerator, { difficulties: DIFFICULTIES, seeds: 200 }, (ex) => {
      const ids = ex.strategies.map((s) => s.id)
      expect(ids).toContain('saltos-linea')
      expect(ids).toContain('descomposicion-monedas')
    })
  })

  it('saltos-linea: the number-line jumps sum to the operation performed', () => {
    propertyTestWithDeterminism(decimalesDineroGenerator, { difficulties: DIFFICULTIES, seeds: 300 }, (ex) => {
      const saltos = ex.strategies.find((s) => s.id === 'saltos-linea')
      expect(saltos).toBeDefined()
      const visualStep = saltos?.steps.find((s) => s.visual?.kind === 'number-line')
      expect(visualStep).toBeDefined()
      if (visualStep?.visual?.kind !== 'number-line') return

      const jumps = visualStep.visual.jumps
      expect(jumps.length).toBeGreaterThan(0)
      // Each jump's from/to must chain: jumps[i].to === jumps[i+1].from.
      for (let i = 0; i < jumps.length - 1; i++) {
        expect(jumps[i].to).toBe(jumps[i + 1].from)
      }
      // The total displacement across all jumps must match final - initial.
      const totalDelta = jumps[jumps.length - 1].to - jumps[0].from
      const netCents = visualStep.visual.to - visualStep.visual.from
      expect(Math.abs(totalDelta)).toBe(netCents)
    })
  })

  it('descomposicion-monedas: coin decomposition sums back to the original amount', () => {
    propertyTestWithDeterminism(decimalesDineroGenerator, { difficulties: DIFFICULTIES, seeds: 200 }, (ex) => {
      const monedas = ex.strategies.find((s) => s.id === 'descomposicion-monedas')
      expect(monedas).toBeDefined()
      expect(monedas?.steps.length).toBeGreaterThan(0)
    })
  })

  it('prompt and every strategy step use "€" consistently, regardless of chapter flavor (default)', () => {
    propertyTestWithDeterminism(decimalesDineroGenerator, { difficulties: DIFFICULTIES, seeds: 200, flavor: DEFAULT_TEST_FLAVOR }, (ex) => {
      assertPromptAndStrategiesUseEuro(ex)
    })
  })

  it('prompt and every strategy step use "€" consistently for a Singapore (S$) chapter flavor', () => {
    expect(SINGAPORE_FLAVOR, 'no S$ flavor found in REAL_CHAPTER_FLAVORS').toBeDefined()
    if (!SINGAPORE_FLAVOR) return
    propertyTestWithDeterminism(decimalesDineroGenerator, { difficulties: DIFFICULTIES, seeds: 200, flavor: SINGAPORE_FLAVOR }, (ex) => {
      assertPromptAndStrategiesUseEuro(ex)
    })
  })

  it('prompt and every strategy step use "€" consistently for a Malaysia (RM) chapter flavor', () => {
    expect(MALAYSIA_FLAVOR, 'no RM flavor found in REAL_CHAPTER_FLAVORS').toBeDefined()
    if (!MALAYSIA_FLAVOR) return
    propertyTestWithDeterminism(decimalesDineroGenerator, { difficulties: DIFFICULTIES, seeds: 200, flavor: MALAYSIA_FLAVOR }, (ex) => {
      assertPromptAndStrategiesUseEuro(ex)
    })
  })
})
