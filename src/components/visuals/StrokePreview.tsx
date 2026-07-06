import type { Stroke } from '../../types/exercise'

/** Renders normalized (0..1) strokes as an SVG polyline glyph, sized `size`px. */
export function StrokePreview({ strokes, size = 72 }: { strokes: Stroke[]; size?: number }) {
  return (
    <svg viewBox="0 0 1 1" width={size} height={size} role="img" aria-label="Trazo" style={{ overflow: 'visible' }}>
      {strokes.map((stroke, i) => (
        <polyline
          key={i}
          points={stroke.map((p) => `${p.x},${p.y}`).join(' ')}
          fill="none"
          stroke="var(--ink)"
          strokeWidth={0.06}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      ))}
    </svg>
  )
}
