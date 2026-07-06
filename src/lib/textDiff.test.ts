import { describe, it, expect } from 'vitest'
import { diffText, isCorrectEnough } from './textDiff'

describe('diffText — exact matches', () => {
  it('marks every word ok when the text is identical', () => {
    const r = diffText('el gat menja peix', 'el gat menja peix')
    expect(r.words.map((w) => w.status)).toEqual(['ok', 'ok', 'ok', 'ok'])
    expect(r.errorCount).toBe(0)
  })

  it('is case-insensitive by default (El == el)', () => {
    const r = diffText('El Gat', 'el gat')
    expect(r.words.every((w) => w.status === 'ok')).toBe(true)
  })

  it('is punctuation-tolerant by default (gat, == gat)', () => {
    const r = diffText('el gat, menja.', 'el gat menja')
    expect(r.words.map((w) => w.status)).toEqual(['ok', 'ok', 'ok'])
  })
})

describe('diffText — accent flagging (the Catalan point)', () => {
  it('flags a word that matches ignoring accents but differs with accents as "accent"', () => {
    // història (reference) vs historia (typed) — same letters, missing accent
    const r = diffText('la història', 'la historia')
    expect(r.words[1].status).toBe('accent')
    expect(r.words[1].reference).toBe('història')
    expect(r.words[1].typed).toBe('historia')
  })

  it('treats a correctly-accented word as ok', () => {
    const r = diffText('la història', 'la història')
    expect(r.words[1].status).toBe('ok')
  })

  it('flags an extra/wrong accent too (cafe vs café both directions)', () => {
    expect(diffText('cafè', 'cafe').words[0].status).toBe('accent')
    expect(diffText('cafe', 'cafè').words[0].status).toBe('accent')
  })
})

describe('diffText — spelling errors distinct from accents', () => {
  it('flags l·l vs ll as misspelled (not accent)', () => {
    // col·legi (reference) vs collegi (typed) — geminate l lost
    const r = diffText('col·legi nou', 'collegi nou')
    expect(r.words[0].status).toBe('misspelled')
  })

  it('flags an apostrophe error as misspelled', () => {
    // l'amic (reference) vs lamic (typed)
    const r = diffText("l'amic", 'lamic')
    expect(r.words[0].status).toBe('misspelled')
  })

  it('flags a plainly different word as misspelled', () => {
    const r = diffText('el gos', 'el got')
    expect(r.words[1].status).toBe('misspelled')
  })
})

describe('diffText — missing and extra words', () => {
  it('marks a dropped word as missing', () => {
    const r = diffText('el gat negre', 'el gat')
    const statuses = r.words.map((w) => w.status)
    expect(statuses).toContain('missing')
    expect(r.words.find((w) => w.status === 'missing')?.reference).toBe('negre')
  })

  it('marks an added word as extra', () => {
    const r = diffText('el gat', 'el gat gran')
    const extra = r.words.find((w) => w.status === 'extra')
    expect(extra?.typed).toBe('gran')
  })

  it('aligns around an inserted word without cascading errors', () => {
    const r = diffText('un dia clar', 'un bon dia clar')
    expect(r.words.filter((w) => w.status === 'ok').map((w) => w.reference)).toEqual(['un', 'dia', 'clar'])
    expect(r.words.find((w) => w.status === 'extra')?.typed).toBe('bon')
  })
})

describe('diffText — options', () => {
  it('caseSensitive: true makes El != el a misspelling', () => {
    const r = diffText('El', 'el', { caseSensitive: true })
    expect(r.words[0].status).toBe('misspelled')
  })

  it('punctuationTolerant: false keeps punctuation significant', () => {
    const r = diffText('gat.', 'gat', { punctuationTolerant: false })
    expect(r.words[0].status).toBe('misspelled')
  })
})

describe('isCorrectEnough', () => {
  it('is true with no errors', () => {
    expect(isCorrectEnough(diffText('el gat menja', 'el gat menja'))).toBe(true)
  })

  it('tolerates a single accent slip on a short dictation', () => {
    expect(isCorrectEnough(diffText('la història del gat', 'la historia del gat'))).toBe(true)
  })

  it('is false when there are several spelling errors', () => {
    expect(isCorrectEnough(diffText('el gos corre pel camp', 'el got core pol camp'))).toBe(false)
  })
})
