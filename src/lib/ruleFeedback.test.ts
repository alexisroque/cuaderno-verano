import { describe, expect, it } from 'vitest'
import { subskillForDictation, ruleFeedbackLine, focusBannerText } from './ruleFeedback'
import { diffText } from './textDiff'
import { ORTOGRAFIA_RULE_IDS, subskillLabel } from '../engine/skills'

describe('subskillForDictation', () => {
  it('records a focus-tagged dictation under its own rule', () => {
    const diff = diffText('la vaca', 'la baca')
    expect(subskillForDictation('ca-b-v', diff, 'ca')).toBe('ca-b-v')
    expect(subskillForDictation('es-tildes', diff, 'es')).toBe('es-tildes')
  })

  it('buckets an untagged catalan dictation under ca-accents', () => {
    const diff = diffText('el gos corre', 'el gos core')
    expect(subskillForDictation(undefined, diff, 'ca')).toBe('ca-accents')
  })

  it('buckets an untagged spanish dictation under es-tildes', () => {
    const diff = diffText('el perro corre', 'el pero core')
    expect(subskillForDictation(undefined, diff, 'es')).toBe('es-tildes')
  })
})

describe('ruleFeedbackLine', () => {
  it('returns a rule-specific line for a focus dictation', () => {
    const clean = diffText('la vaca beu aigua', 'la vaca beu aigua')
    const line = ruleFeedbackLine('ca-b-v', clean)
    expect(line).toBeDefined()
    expect(line).toMatch(/b i la v/i)
  })

  it('gives a retry line when there are spelling errors', () => {
    const bad = diffText('la vaca beu aigua', 'la baca veu aiga')
    const line = ruleFeedbackLine('ca-b-v', bad)
    expect(line).toMatch(/[Rr]epassa/)
  })

  it('returns undefined for an untagged (cultural) dictation', () => {
    const diff = diffText('hola mundo', 'hola mundo')
    expect(ruleFeedbackLine(undefined, diff)).toBeUndefined()
  })

  it('has a line for every catalog rule', () => {
    const clean = diffText('a', 'a')
    for (const rule of ORTOGRAFIA_RULE_IDS) {
      expect(ruleFeedbackLine(rule, clean), `missing feedback line for ${rule}`).toBeDefined()
    }
  })
})

describe('focusBannerText', () => {
  it('uses Catalan for ca rules', () => {
    expect(focusBannerText('ca-b-v', subskillLabel('ca-b-v'))).toBe('Avui treballem: La b i la v')
  })

  it('uses Spanish for es rules', () => {
    expect(focusBannerText('es-tildes', subskillLabel('es-tildes'))).toBe('Hoy trabajamos: Las tildes')
  })
})
