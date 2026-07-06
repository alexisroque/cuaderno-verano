import { useEffect, useRef, useState } from 'react'
import type { Stroke, StrokePoint } from '../../types/exercise'

/**
 * The finger-tracing surface: draws the glyph's guide strokes as a fat light
 * outline, an animated pulsing dot at the start of the first stroke plus a
 * direction arrow, and captures the child's finger path as live ink. Pointer
 * Events + `touch-action: none` so a resting palm or a scroll gesture never
 * fights the drawing. Reports the accumulated points to the parent on every
 * pen-up via `onChange` (the parent scores them).
 */
export function TracingCanvas({
  guide,
  ghost,
  onChange,
  size = 300,
}: {
  guide: Stroke[]
  /** Optional faint "wrong way" strokes drawn behind the guide (mirror-prone glyphs). */
  ghost?: Stroke[]
  onChange: (points: StrokePoint[]) => void
  size?: number
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const drawingRef = useRef(false)
  const pointsRef = useRef<StrokePoint[]>([])
  const [, setTick] = useState(0)

  // Reset ink whenever the glyph changes.
  useEffect(() => {
    pointsRef.current = []
  }, [guide, ghost])

  // Animation loop: keeps the pulsing start dot alive and repaints ink.
  useEffect(() => {
    let raf = 0
    const loop = () => {
      redraw(canvasRef.current, guide, ghost, pointsRef.current, size)
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf)
  }, [guide, ghost, size])

  const toNorm = (e: React.PointerEvent): StrokePoint => {
    const rect = canvasRef.current!.getBoundingClientRect()
    return {
      x: (e.clientX - rect.left) / rect.width,
      y: (e.clientY - rect.top) / rect.height,
    }
  }

  const start = (e: React.PointerEvent) => {
    e.preventDefault()
    canvasRef.current?.setPointerCapture(e.pointerId)
    drawingRef.current = true
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

/** Redraws the whole canvas: ghost, guide, start dot + arrow, and the child's ink. */
function redraw(
  canvas: HTMLCanvasElement | null,
  guide: Stroke[],
  ghost: Stroke[] | undefined,
  ink: StrokePoint[],
  size: number,
) {
  if (!canvas) return
  const ctx = canvas.getContext('2d')
  if (!ctx) return
  ctx.clearRect(0, 0, size, size)

  const px = (v: number) => v * size

  // 1. Ghost "wrong way" strokes, very faint (mirror-prone comparison aid).
  if (ghost) {
    ctx.strokeStyle = 'rgba(176,149,138,.18)'
    ctx.lineWidth = size * 0.05
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    for (const stroke of ghost) drawPolyline(ctx, stroke, px)
  }

  // 2. Guide strokes: fat, light peach outline.
  ctx.strokeStyle = 'rgba(244,169,136,.45)'
  ctx.lineWidth = size * 0.11
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  for (const stroke of guide) drawPolyline(ctx, stroke, px)

  // 3. Start dot + direction arrow on the first stroke.
  const first = guide[0]
  if (first && first.length >= 2) {
    const start = first[0]
    const next = first[1]
    // Pulsing green start dot.
    const t = (Date.now() % 1000) / 1000
    const pulse = 1 + Math.sin(t * Math.PI * 2) * 0.15
    ctx.fillStyle = '#10b981'
    ctx.beginPath()
    ctx.arc(px(start.x), px(start.y), size * 0.035 * pulse, 0, Math.PI * 2)
    ctx.fill()
    // Small arrowhead pointing toward the next point.
    drawArrowhead(ctx, px(start.x), px(start.y), px(next.x), px(next.y), size * 0.05)
  }

  // 4. The child's live ink.
  if (ink.length > 0) {
    ctx.strokeStyle = '#f4a988'
    ctx.lineWidth = size * 0.045
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.beginPath()
    ctx.moveTo(px(ink[0].x), px(ink[0].y))
    for (const p of ink) ctx.lineTo(px(p.x), px(p.y))
    ctx.stroke()
  }
}

function drawPolyline(ctx: CanvasRenderingContext2D, stroke: StrokePoint[], px: (v: number) => number) {
  if (stroke.length === 0) return
  ctx.beginPath()
  ctx.moveTo(px(stroke[0].x), px(stroke[0].y))
  for (const p of stroke) ctx.lineTo(px(p.x), px(p.y))
  ctx.stroke()
}

/** Draws a filled arrowhead at (fromX,fromY) aimed toward (toX,toY). */
function drawArrowhead(
  ctx: CanvasRenderingContext2D,
  fromX: number,
  fromY: number,
  toX: number,
  toY: number,
  len: number,
) {
  const angle = Math.atan2(toY - fromY, toX - fromX)
  const tipX = fromX + Math.cos(angle) * len * 1.6
  const tipY = fromY + Math.sin(angle) * len * 1.6
  ctx.fillStyle = '#059669'
  ctx.beginPath()
  ctx.moveTo(tipX, tipY)
  ctx.lineTo(tipX - Math.cos(angle - 0.5) * len, tipY - Math.sin(angle - 0.5) * len)
  ctx.lineTo(tipX - Math.cos(angle + 0.5) * len, tipY - Math.sin(angle + 0.5) * len)
  ctx.closePath()
  ctx.fill()
}
