import { describe, expect, it } from 'vitest'
import { proporcionalidadGenerator } from './proportionality'
import { propertyTestWithDeterminism } from '../testUtils'

const DIFFICULTIES = [3, 4, 5]

/**
 * Parses the FINAL "a op b = r" arithmetic line out of a strategy's step
 * texts (Spanish comma-decimals, ÷/× symbols) and asserts it is numerically
 * TRUE. Scans all steps and uses the LAST match found, since strategies may
 * have multiple numeric mentions but the actual "shown equation" step is
 * the one with an explicit `=` sign.
 */
function assertLastEquationIsTrue(steps: { text: string }[]): void {
  const EPS = 1e-6
  const toNumber = (s: string) => Number(s.replace(',', '.'))
  let lastMatch: RegExpMatchArray | null = null
  for (const step of steps) {
    const matches = [...step.text.matchAll(/(\d+(?:,\d+)?)\s*(\+|-|−|×|x|·|÷|:)\s*(\d+(?:,\d+)?)\s*=\s*(\d+(?:,\d+)?)/g)]
    if (matches.length > 0) lastMatch = matches[matches.length - 1]
  }
  expect(lastMatch, `no "a op b = r" equation found in steps: ${JSON.stringify(steps.map((s) => s.text))}`).toBeTruthy()
  if (!lastMatch) return
  const [, aStr, op, bStr, rStr] = lastMatch
  const a = toNumber(aStr)
  const b = toNumber(bStr)
  const r = toNumber(rStr)
  let computed: number
  switch (op) {
    case '+':
      computed = a + b
      break
    case '-':
    case '−':
      computed = a - b
      break
    case '×':
    case 'x':
    case '·':
      computed = a * b
      break
    case '÷':
    case ':':
      computed = a / b
      break
    default:
      throw new Error(`unrecognized operator "${op}"`)
  }
  expect(Math.abs(computed - r), `equation "${aStr} ${op} ${bStr} = ${rStr}" is FALSE (computed ${computed})`).toBeLessThan(EPS)
}

describe('proporcionalidadGenerator', () => {
  it('is registered under subskill "proporcionalidad"', () => {
    expect(proporcionalidadGenerator.subskill).toBe('proporcionalidad')
  })

  it('clamps difficulty to [3, 5] and sets challenge:true', () => {
    propertyTestWithDeterminism(proporcionalidadGenerator, { difficulties: [1, 2, 3, 4, 5, 6, 99] }, (ex) => {
      expect(ex.difficulty).toBeGreaterThanOrEqual(3)
      expect(ex.difficulty).toBeLessThanOrEqual(5)
      expect(ex.challenge).toBe(true)
    })
  })

  it('recipe scaling: scaled amount = baseAmount * (scaledPeople / basePeople), exact division', () => {
    let recipeSeen = false
    propertyTestWithDeterminism(proporcionalidadGenerator, { difficulties: DIFFICULTIES, seeds: 400 }, (ex) => {
      const match = ex.prompt.text.match(/^Para (\d+) personas necesitas (\d+) .+\. Para (\d+) personas, ¿(?:cuántos|cuántas) .+ necesitas\?$/)
      if (!match) return
      recipeSeen = true
      const basePeople = Number(match[1])
      const baseAmount = Number(match[2])
      const scaledPeople = Number(match[3])

      expect(scaledPeople % basePeople).toBe(0)
      const factor = scaledPeople / basePeople
      const expected = baseAmount * factor
      expect(ex.answer).toEqual({ kind: 'number', value: expected })
    })
    expect(recipeSeen, 'no recipe-branch exercise matched the expected prompt shape across seeds — test is vacuous').toBe(true)
  })

  it('unit-change (multiply direction): result = rate * hours', () => {
    propertyTestWithDeterminism(proporcionalidadGenerator, { difficulties: DIFFICULTIES, seeds: 400 }, (ex) => {
      const match = ex.prompt.text.match(/^Un coche recorre (\d+) km cada hora, a velocidad constante\. ¿Cuántos km recorre en (\d+) horas\?$/)
      if (!match) return
      const rate = Number(match[1])
      const hours = Number(match[2])
      expect(ex.answer).toEqual({ kind: 'number', value: rate * hours })
    })
  })

  it('unit-change (divide direction): result = km / rate, exact division', () => {
    propertyTestWithDeterminism(proporcionalidadGenerator, { difficulties: DIFFICULTIES, seeds: 400 }, (ex) => {
      const match = ex.prompt.text.match(/^Un coche recorre (\d+) km cada hora, a velocidad constante\. ¿Cuántas horas tarda en recorrer (\d+) km\?$/)
      if (!match) return
      const rate = Number(match[1])
      const km = Number(match[2])
      expect(km % rate).toBe(0)
      expect(ex.answer).toEqual({ kind: 'number', value: km / rate })
    })
  })

  it('both recipe and unit-change kinds appear across many seeds', () => {
    let recipe = 0
    let unitChange = 0
    propertyTestWithDeterminism(proporcionalidadGenerator, { difficulties: [4], seeds: 200 }, (ex) => {
      if (ex.strategies.some((s) => s.id === 'escalar-receta')) recipe++
      else unitChange++
    })
    expect(recipe).toBeGreaterThan(0)
    expect(unitChange).toBeGreaterThan(0)
  })

  it('escalar-receta strategy: the shown "a × b = r" equation is mathematically true', () => {
    propertyTestWithDeterminism(proporcionalidadGenerator, { difficulties: DIFFICULTIES, seeds: 400 }, (ex) => {
      const strategy = ex.strategies.find((s) => s.id === 'escalar-receta')
      if (!strategy) return
      assertLastEquationIsTrue(strategy.steps)
    })
  })

  it('cambio-unidad strategy: the shown equation is mathematically true (both multiply AND divide branches)', () => {
    let multiplyBranchSeen = false
    let divideBranchSeen = false
    propertyTestWithDeterminism(proporcionalidadGenerator, { difficulties: DIFFICULTIES, seeds: 400 }, (ex) => {
      const strategy = ex.strategies.find((s) => s.id === 'cambio-unidad')
      if (!strategy) return
      if (/¿Cuántos km recorre/.test(ex.prompt.text)) multiplyBranchSeen = true
      if (/¿Cuántas horas tarda/.test(ex.prompt.text)) divideBranchSeen = true
      assertLastEquationIsTrue(strategy.steps)
    })
    // Guard the guard: make sure this test actually exercised both branches,
    // otherwise a silent generator change could make this pass vacuously.
    expect(multiplyBranchSeen).toBe(true)
    expect(divideBranchSeen).toBe(true)
  })

  it('recipe prompt reads naturally: "N vasos de leche", not "N de leche (vasos)"', () => {
    let recipeSeen = false
    propertyTestWithDeterminism(proporcionalidadGenerator, { difficulties: DIFFICULTIES, seeds: 200 }, (ex) => {
      if (!ex.strategies.some((s) => s.id === 'escalar-receta')) return
      recipeSeen = true
      // No parenthesized unit leaking into the ingredient phrase.
      expect(ex.prompt.text).not.toMatch(/\(\w+\)/)
      // The quantity must be immediately followed by a unit-or-ingredient word
      // and "de <ingrediente>" (when there's a distinct unit), e.g.
      // "necesitas 7 vasos de leche" — never "7 de leche (vasos)".
      expect(ex.prompt.text).toMatch(/necesitas \d+ [a-záéíóúñ]+( de [a-záéíóúñ]+)?\./)
    })
    expect(recipeSeen, 'no recipe-branch exercise was generated across seeds — test is vacuous').toBe(true)
  })
})
