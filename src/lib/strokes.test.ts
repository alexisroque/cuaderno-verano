import { describe, expect, it } from 'vitest'
import { strokesFor, isMirrorProne, allTracedGlyphs } from './strokes'

const UPPER = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('')
const LOWER = 'abcdefghijklmnopqrstuvwxyz'.split('')
const DIGITS = '0123456789'.split('')
const REQUIRED_GLYPHS = [...UPPER, 'Ñ', ...LOWER, 'ñ', ...DIGITS]

describe('strokesFor', () => {
  it('every required glyph (A-Z, Ñ, a-z, ñ, 0-9) has at least one stroke', () => {
    for (const glyph of REQUIRED_GLYPHS) {
      const strokes = strokesFor(glyph)
      expect(strokes.length, `glyph "${glyph}" has no strokes`).toBeGreaterThanOrEqual(1)
    }
  })

  it('every stroke has at least 2 points (a real path, not a dot)', () => {
    for (const glyph of REQUIRED_GLYPHS) {
      for (const stroke of strokesFor(glyph)) {
        expect(stroke.length, `glyph "${glyph}" has a degenerate stroke`).toBeGreaterThanOrEqual(2)
      }
    }
  })

  it('every point of every stroke of every required glyph is normalized to [0,1]', () => {
    for (const glyph of REQUIRED_GLYPHS) {
      for (const stroke of strokesFor(glyph)) {
        for (const point of stroke) {
          expect(point.x, `glyph "${glyph}" has x=${point.x} out of [0,1]`).toBeGreaterThanOrEqual(0)
          expect(point.x).toBeLessThanOrEqual(1)
          expect(point.y, `glyph "${glyph}" has y=${point.y} out of [0,1]`).toBeGreaterThanOrEqual(0)
          expect(point.y).toBeLessThanOrEqual(1)
        }
      }
    }
  })

  it('returns an empty array (not a throw) for an unknown glyph', () => {
    expect(strokesFor('#')).toEqual([])
    expect(strokesFor('')).toEqual([])
    expect(strokesFor('AB')).toEqual([])
  })

  it('is deterministic: repeated calls for the same glyph return equal data', () => {
    for (const glyph of REQUIRED_GLYPHS) {
      expect(strokesFor(glyph)).toEqual(strokesFor(glyph))
    }
  })
})

describe('isMirrorProne', () => {
  it('flags the known mirror-prone digits and letters', () => {
    for (const glyph of ['3', '5', '7', '9', 'S', 'Z', 'J']) {
      expect(isMirrorProne(glyph), `expected "${glyph}" to be mirror-prone`).toBe(true)
    }
  })

  it('does not flag an unambiguous glyph like "1", "A", or "O"', () => {
    for (const glyph of ['1', 'A', 'O']) {
      expect(isMirrorProne(glyph)).toBe(false)
    }
  })
})

describe('allTracedGlyphs', () => {
  it('includes every required glyph and nothing extra', () => {
    const all = allTracedGlyphs()
    expect(new Set(all)).toEqual(new Set(REQUIRED_GLYPHS))
  })
})
