import type { Stroke } from '../types/exercise'
import { GLYPH_STROKES, MIRROR_PRONE_GLYPHS } from './strokeData'

export type { Stroke, StrokePoint } from '../types/exercise'

/**
 * Looks up the coarse hand-authored stroke polylines for `glyph` (a single
 * uppercase/lowercase letter, Ñ/ñ, or digit — see `strokeData.ts` for the
 * full authored table). Returns an empty array for any glyph not in the
 * table, rather than throwing, so a caller passing unexpected input (stray
 * punctuation, multi-character string) degrades to "nothing to trace"
 * instead of crashing a generator mid-run.
 */
export function strokesFor(glyph: string): Stroke[] {
  return GLYPH_STROKES[glyph] ?? []
}

/** True if `glyph` is prone to mirror-reversal in early writers (3, 5, 7, 9, S, Z, J, b/d, s/z/j). */
export function isMirrorProne(glyph: string): boolean {
  return MIRROR_PRONE_GLYPHS.has(glyph)
}

/** Every glyph with authored stroke data, in table order — used by generators to pick a "glyph of the day". */
export function allTracedGlyphs(): string[] {
  return Object.keys(GLYPH_STROKES)
}
