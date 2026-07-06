import { describe, expect, it } from 'vitest'
import type { Stroke, StrokePoint } from '../types/exercise'
import { traceScore, starsFromCoverage } from './traceScore'

/** Densely samples a polyline (0..1) into many points, as a "perfect" child trace would. */
function densify(stroke: Stroke, perSegment = 40): StrokePoint[] {
  const out: StrokePoint[] = []
  for (let i = 0; i < stroke.length - 1; i++) {
    const a = stroke[i]
    const b = stroke[i + 1]
    for (let t = 0; t < perSegment; t++) {
      const f = t / perSegment
      out.push({ x: a.x + (b.x - a.x) * f, y: a.y + (b.y - a.y) * f })
    }
  }
  out.push(stroke[stroke.length - 1])
  return out
}

// A simple diagonal guide and an L-shaped multi-stroke guide.
const diagonal: Stroke[] = [[{ x: 0.1, y: 0.1 }, { x: 0.9, y: 0.9 }]]
const lShape: Stroke[] = [[{ x: 0.25, y: 0.1 }, { x: 0.25, y: 0.9 }, { x: 0.8, y: 0.9 }]]

describe('starsFromCoverage', () => {
  it('maps coverage to stars with generous thresholds', () => {
    expect(starsFromCoverage(0)).toBe(0)
    expect(starsFromCoverage(0.3)).toBe(0)
    expect(starsFromCoverage(0.5)).toBe(1)
    expect(starsFromCoverage(0.69)).toBe(1)
    expect(starsFromCoverage(0.7)).toBe(2)
    expect(starsFromCoverage(0.84)).toBe(2)
    expect(starsFromCoverage(0.85)).toBe(3)
    expect(starsFromCoverage(1)).toBe(3)
  })
})

describe('traceScore', () => {
  it('gives 3 stars for a dense trace that follows the guide', () => {
    const child = densify(diagonal[0])
    const result = traceScore(diagonal, child)
    expect(result.stars).toBe(3)
    expect(result.coverage).toBeGreaterThanOrEqual(0.85)
  })

  it('gives 3 stars for a perfect multi-stroke trace', () => {
    const child = [...densify(lShape[0])]
    const result = traceScore(lShape, child)
    expect(result.stars).toBe(3)
  })

  it('scores 0 for an empty child path', () => {
    const result = traceScore(diagonal, [])
    expect(result.stars).toBe(0)
    expect(result.coverage).toBe(0)
  })

  it('scores 0 stars for far-away scribble that never touches the guide', () => {
    // A tiny scribble parked in a corner far from the diagonal.
    const scribble: StrokePoint[] = Array.from({ length: 30 }, (_, i) => ({
      x: 0.02 + (i % 3) * 0.005,
      y: 0.98 - (i % 3) * 0.005,
    }))
    const result = traceScore(diagonal, scribble)
    expect(result.stars).toBe(0)
    expect(result.coverage).toBeLessThan(0.5)
  })

  it('awards partial coverage for tracing only half the guide', () => {
    const full = diagonal[0]
    const half: Stroke = [full[0], { x: 0.5, y: 0.5 }]
    const child = densify(half)
    const result = traceScore(diagonal, child)
    // Roughly half the guide covered → 1 star (generous), not 3.
    expect(result.coverage).toBeGreaterThan(0.35)
    expect(result.coverage).toBeLessThan(0.75)
    expect(result.stars).toBeLessThan(3)
  })

  it('gives a direction bonus when the child moves the same way as the guide', () => {
    const forward = densify(diagonal[0])
    const backward = [...forward].reverse()
    const fwd = traceScore(diagonal, forward)
    const bwd = traceScore(diagonal, backward)
    // Same points, opposite order: forward should score at least as high.
    expect(fwd.direction).toBeGreaterThan(bwd.direction)
    expect(fwd.score).toBeGreaterThanOrEqual(bwd.score)
  })

  it('returns 0 stars when there is no guide to trace', () => {
    const result = traceScore([], densify(diagonal[0]))
    expect(result.stars).toBe(0)
  })

  it('is tolerant of a slightly wobbly trace (still 2-3 stars)', () => {
    const wobbly = densify(diagonal[0]).map((p, i) => ({
      x: p.x + Math.sin(i) * 0.02,
      y: p.y + Math.cos(i) * 0.02,
    }))
    const result = traceScore(diagonal, wobbly)
    expect(result.stars).toBeGreaterThanOrEqual(2)
  })
})
