import type { Stroke, StrokePoint } from '../types/exercise'

/**
 * Scoring a 4-5yo's finger trace against the glyph's guide strokes.
 *
 * The whole design goal here is GENEROSITY: a small child must feel success.
 * We measure two things and blend them:
 *
 *  - `coverage`: what fraction of the guide path the child's finger passed
 *    near (within a fat tolerance). This is the dominant signal — a child who
 *    dragged their finger roughly along the whole letter should get 3 stars
 *    even if they wobbled.
 *  - `direction`: whether the child moved along the guide in the taught
 *    direction (start → end) rather than backwards. A gentle bonus only, so a
 *    good-shape/wrong-direction trace still scores well.
 *
 * Everything is a pure function over normalized (0..1) points, so it's trivial
 * to unit-test with synthetic paths and carries no DOM/canvas dependency.
 */

export interface TraceResult {
  /** 0..1 fraction of guide sample points the child passed near. */
  coverage: number
  /** 0..1 agreement between child travel direction and the guide direction. */
  direction: number
  /** Blended 0..1 score (coverage-dominant, small direction bonus). */
  score: number
  /** 0..3 stars, mapped generously from coverage. */
  stars: number
}

/** How close (in normalized units) the child's finger must pass a guide point to "cover" it. Deliberately fat for small fingers. */
const HIT_TOLERANCE = 0.14

/** Resamples every guide stroke into evenly-spaced checkpoints so long and short strokes weigh fairly. */
function guideCheckpoints(strokes: Stroke[]): StrokePoint[] {
  const points: StrokePoint[] = []
  for (const stroke of strokes) {
    if (stroke.length === 0) continue
    // Sample each segment at a fixed spatial resolution.
    for (let i = 0; i < stroke.length - 1; i++) {
      const a = stroke[i]
      const b = stroke[i + 1]
      const dist = Math.hypot(b.x - a.x, b.y - a.y)
      const steps = Math.max(1, Math.round(dist / 0.03))
      for (let s = 0; s < steps; s++) {
        const f = s / steps
        points.push({ x: a.x + (b.x - a.x) * f, y: a.y + (b.y - a.y) * f })
      }
    }
    points.push(stroke[stroke.length - 1])
  }
  return points
}

/** Nearest squared distance from `p` to any point in `cloud` (0 if cloud empty is guarded by caller). */
function nearestDist(p: StrokePoint, cloud: StrokePoint[]): number {
  let best = Infinity
  for (const q of cloud) {
    const d = Math.hypot(p.x - q.x, p.y - q.y)
    if (d < best) best = d
  }
  return best
}

/**
 * Fraction of guide checkpoints that have at least one child point within
 * HIT_TOLERANCE — i.e. how much of the letter the child actually traced.
 */
function coverageOf(checkpoints: StrokePoint[], child: StrokePoint[]): number {
  if (checkpoints.length === 0 || child.length === 0) return 0
  let hit = 0
  for (const cp of checkpoints) {
    if (nearestDist(cp, child) <= HIT_TOLERANCE) hit++
  }
  return hit / checkpoints.length
}

/**
 * Direction agreement in 0..1. We walk the child's path in order and, for each
 * step, find which guide checkpoint it's nearest to; if that index tends to
 * increase (child moving start→end along the guide) we score high. A backwards
 * trace tends to decrease the index and scores low. Returns 0.5 (neutral) when
 * there isn't enough signal.
 */
function directionOf(checkpoints: StrokePoint[], child: StrokePoint[]): number {
  if (checkpoints.length < 2 || child.length < 2) return 0.5
  let forward = 0
  let backward = 0
  let prevIdx = -1
  for (const p of child) {
    // Only consider child points that are actually near the guide.
    let bestIdx = -1
    let bestDist = Infinity
    for (let i = 0; i < checkpoints.length; i++) {
      const d = Math.hypot(p.x - checkpoints[i].x, p.y - checkpoints[i].y)
      if (d < bestDist) {
        bestDist = d
        bestIdx = i
      }
    }
    if (bestDist > HIT_TOLERANCE) continue
    if (prevIdx >= 0) {
      if (bestIdx > prevIdx) forward++
      else if (bestIdx < prevIdx) backward++
    }
    prevIdx = bestIdx
  }
  const total = forward + backward
  if (total === 0) return 0.5
  return forward / total
}

/**
 * Generous coverage → stars mapping (see task spec):
 *   >= 0.85 → 3, >= 0.70 → 2, >= 0.50 → 1, else 0.
 */
export function starsFromCoverage(coverage: number): 0 | 1 | 2 | 3 {
  if (coverage >= 0.85) return 3
  if (coverage >= 0.7) return 2
  if (coverage >= 0.5) return 1
  return 0
}

/**
 * Scores `child` (the sampled finger path) against `guide` (the glyph's guide
 * strokes). Stars come from coverage (the dominant, child-friendly signal); a
 * small direction bonus nudges the blended `score` so a same-direction trace
 * edges out an identical backwards one without ever demoting a well-covered
 * trace below its coverage stars.
 */
export function traceScore(guide: Stroke[], child: StrokePoint[]): TraceResult {
  const checkpoints = guideCheckpoints(guide)
  if (checkpoints.length === 0 || child.length === 0) {
    return { coverage: 0, direction: 0, score: 0, stars: 0 }
  }
  const coverage = coverageOf(checkpoints, child)
  const direction = directionOf(checkpoints, child)
  // Coverage dominates (85%); direction is a gentle 15% nudge.
  const score = coverage * 0.85 + direction * 0.15
  return { coverage, direction, score, stars: starsFromCoverage(coverage) }
}
