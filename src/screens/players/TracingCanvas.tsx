import { useEffect, useRef, useState } from 'react'
import type { Stroke, StrokePoint } from '../../types/exercise'
import { guideSamples, pointerToNorm } from '../../lib/traceGeom'
import { redraw } from './traceDraw'

/**
 * The finger-tracing surface: draws the glyph's guide strokes as a fat light
 * peach outline, an animated pulsing start dot + direction arrow, a WORDLESS
 * demo "fingertip" that travels the guide on a loop (so a non-reader sees what
 * to do), and captures the child's finger path as live BLUE ink that pops on
 * the peach guide. Pointer Events + `touch-action: none` so a resting palm or
 * a scroll gesture never fights the drawing. Reports points to the parent on
 * every pen-up via `onChange`; `onLiftCoverage` lets the parent auto-finish.
 */
export function TracingCanvas({
  guide,
  ghost,
  onChange,
  onStart,
  size = 340,
  demo = true,
}: {
  guide: Stroke[]
  /** Optional faint "wrong way" strokes drawn behind the guide (mirror-prone glyphs). */
  ghost?: Stroke[]
  onChange: (points: StrokePoint[]) => void
  /** Fired once when the child makes their first mark (parent stops the demo). */
  onStart?: () => void
  size?: number
  /** Whether to play the looping wordless demo tracer (off once the child draws). */
  demo?: boolean
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const drawingRef = useRef(false)
  const pointsRef = useRef<StrokePoint[]>([])
  const hasDrawnRef = useRef(false)
  const [, setTick] = useState(0)

  // Reset ink whenever the glyph changes.
  useEffect(() => {
    pointsRef.current = []
    hasDrawnRef.current = false
  }, [guide, ghost])

  // Animation loop: pulsing start dot, the demo tracer, and the child's ink.
  useEffect(() => {
    let raf = 0
    const path = demo ? guideSamples(guide) : []
    const loop = () => {
      redraw(canvasRef.current, guide, ghost, pointsRef.current, size, demo ? path : null)
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf)
  }, [guide, ghost, size, demo])

  // Pointer → normalized (0..1). getBoundingClientRect reflects the *rendered*
  // size, so this stays correct even when the canvas is CSS-scaled by
  // maxWidth:100% (rendered width < the backing `size` attribute).
  const toNorm = (e: React.PointerEvent): StrokePoint => {
    const rect = canvasRef.current!.getBoundingClientRect()
    return pointerToNorm(e.clientX, e.clientY, rect)
  }

  const start = (e: React.PointerEvent) => {
    e.preventDefault()
    // Guard setPointerCapture: not every environment/pointer supports it.
    try {
      canvasRef.current?.setPointerCapture(e.pointerId)
    } catch {
      /* ignore — drawing still works via document-level pointer routing */
    }
    drawingRef.current = true
    if (!hasDrawnRef.current) {
      hasDrawnRef.current = true
      onStart?.()
    }
    pointsRef.current.push(toNorm(e))
  }

  const move = (e: React.PointerEvent) => {
    if (!drawingRef.current) return
    e.preventDefault()
    pointsRef.current.push(toNorm(e))
  }

  const end = (e: React.PointerEvent) => {
    if (!drawingRef.current) return
    e.preventDefault()
    drawingRef.current = false
    onChange([...pointsRef.current])
    setTick((t) => t + 1)
  }

  return (
    <canvas
      ref={canvasRef}
      width={size}
      height={size}
      onPointerDown={start}
      onPointerMove={move}
      onPointerUp={end}
      onPointerCancel={end}
      className="rounded-3xl"
      style={{
        touchAction: 'none',
        background: 'var(--card)',
        boxShadow: 'inset 0 0 0 3px var(--peach-soft)',
        width: size,
        height: size,
        maxWidth: '100%',
        cursor: 'crosshair',
      }}
      role="img"
      aria-label="Zona para escribir con el dedo"
    />
  )
}

