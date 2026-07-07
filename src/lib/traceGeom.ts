import type { Stroke, StrokePoint } from '../types/exercise'

/**
 * Pure geometry helpers for the tracing canvas, factored out of the React
 * component so the load-bearing math (pointer→normalized mapping under CSS
 * scaling, and demo-path sampling) is unit-testable without a DOM/canvas.
 */

/** The subset of DOMRect the mapping needs (so tests don't need a real DOMRect). */
export interface RectLike {
  left: number
  top: number
  width: number
  height: number
}

/**
 * Maps a pointer client position to normalized (0..1) canvas coordinates.
 *
 * The rect comes from getBoundingClientRect(), which reports the *rendered*
 * (on-screen) box — so dividing by rect.width/height yields correct 0..1 values
 * even when the canvas backing store (its `width`/`height` attributes) is a
 * different size because CSS `maxWidth:100%` scaled it down on a narrow screen.
 */
export function pointerToNorm(clientX: number, clientY: number, rect: RectLike): StrokePoint {
  return {
    x: (clientX - rect.left) / rect.width,
    y: (clientY - rect.top) / rect.height,
  }
}

/**
 * Flattens the guide strokes into one ordered, evenly-sampled point list used
 * to drive the wordless demo "fingertip" tracer along the whole glyph.
 */
export function guideSamples(guide: Stroke[], resolution = 0.02): StrokePoint[] {
  const out: StrokePoint[] = []
  for (const stroke of guide) {
    if (stroke.length === 0) continue
    for (let i = 0; i < stroke.length - 1; i++) {
      const a = stroke[i]
      const b = stroke[i + 1]
      const dist = Math.hypot(b.x - a.x, b.y - a.y)
      const steps = Math.max(1, Math.round(dist / resolution))
      for (let s = 0; s < steps; s++) {
        const f = s / steps
        out.push({ x: a.x + (b.x - a.x) * f, y: a.y + (b.y - a.y) * f })
      }
    }
    out.push(stroke[stroke.length - 1])
  }
  return out
}
