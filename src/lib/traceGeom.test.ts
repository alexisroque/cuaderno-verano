import { describe, expect, it } from 'vitest'
import type { Stroke } from '../types/exercise'
import { guideSamples, pointerToNorm } from './traceGeom'

describe('pointerToNorm', () => {
  it('maps a pointer to 0..1 for a 1:1 (unscaled) canvas', () => {
    const rect = { left: 100, top: 50, width: 300, height: 300 }
    expect(pointerToNorm(100, 50, rect)).toEqual({ x: 0, y: 0 })
    expect(pointerToNorm(400, 350, rect)).toEqual({ x: 1, y: 1 })
    expect(pointerToNorm(250, 200, rect)).toEqual({ x: 0.5, y: 0.5 })
  })

  it('stays correct when the canvas is CSS-scaled down (maxWidth:100%)', () => {
    // Backing store is 360px but it renders at 180px on a narrow screen. The
    // rect reflects the *rendered* box, so the center still maps to (0.5,0.5).
    const rendered = { left: 0, top: 0, width: 180, height: 180 }
    expect(pointerToNorm(90, 90, rendered)).toEqual({ x: 0.5, y: 0.5 })
    expect(pointerToNorm(180, 180, rendered)).toEqual({ x: 1, y: 1 })
  })

  it('handles a non-zero scroll offset via rect.left/top', () => {
    const rect = { left: 40, top: 120, width: 200, height: 200 }
    expect(pointerToNorm(140, 220, rect)).toEqual({ x: 0.5, y: 0.5 })
  })
})

describe('guideSamples', () => {
  const diagonal: Stroke[] = [[{ x: 0, y: 0 }, { x: 1, y: 1 }]]
  const lShape: Stroke[] = [[{ x: 0.25, y: 0.1 }, { x: 0.25, y: 0.9 }, { x: 0.8, y: 0.9 }]]

  it('samples a stroke into an ordered path that starts and ends at the endpoints', () => {
    const pts = guideSamples(diagonal)
    expect(pts.length).toBeGreaterThan(5)
    expect(pts[0]).toEqual({ x: 0, y: 0 })
    expect(pts[pts.length - 1]).toEqual({ x: 1, y: 1 })
  })

  it('monotonically advances along a diagonal (each point past the last)', () => {
    const pts = guideSamples(diagonal)
    for (let i = 1; i < pts.length; i++) {
      expect(pts[i].x).toBeGreaterThanOrEqual(pts[i - 1].x - 1e-9)
    }
  })

  it('concatenates multi-segment strokes in order', () => {
    const pts = guideSamples(lShape)
    expect(pts[0]).toEqual({ x: 0.25, y: 0.1 })
    expect(pts[pts.length - 1]).toEqual({ x: 0.8, y: 0.9 })
  })

  it('skips empty strokes without throwing', () => {
    expect(guideSamples([[], diagonal[0]])[0]).toEqual({ x: 0, y: 0 })
    expect(guideSamples([])).toEqual([])
  })
})
