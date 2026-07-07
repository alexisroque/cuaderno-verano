import type { Stroke, StrokePoint } from '../../types/exercise'

/** Child's ink — high-contrast royal blue (var --trace-ink); literals here so the
 * canvas 2D context, which can't read CSS vars, stays in sync with tokens.css. */
export const INK = '#2563eb'
export const INK_GLOW = '#60a5fa'

/** Redraws the whole canvas: ghost, guide, start dot + arrow, demo tracer, ink. */
export function redraw(
  canvas: HTMLCanvasElement | null,
  guide: Stroke[],
  ghost: Stroke[] | undefined,
  ink: StrokePoint[],
  size: number,
  demoPath: StrokePoint[] | null,
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

  // 2. Guide strokes: fat, light peach outline (stays faint under the ink).
  ctx.strokeStyle = 'rgba(244,169,136,.45)'
  ctx.lineWidth = size * 0.11
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  for (const stroke of guide) drawPolyline(ctx, stroke, px)

  // 3. Start dot + direction arrow on the first stroke.
  const first = guide[0]
  if (first && first.length >= 2) {
    const s0 = first[0]
    const next = first[1]
    const t = (Date.now() % 1000) / 1000
    const pulse = 1 + Math.sin(t * Math.PI * 2) * 0.15
    ctx.fillStyle = '#10b981'
    ctx.beginPath()
    ctx.arc(px(s0.x), px(s0.y), size * 0.035 * pulse, 0, Math.PI * 2)
    ctx.fill()
    drawArrowhead(ctx, px(s0.x), px(s0.y), px(next.x), px(next.y), size * 0.05)
  }

  // 4. Wordless demo: a glowing "fingertip" sweeps the guide on a loop so a
  //    child who can't read sees "follow this line".
  if (demoPath && demoPath.length > 1) drawDemoTracer(ctx, demoPath, size, px)

  // 5. The child's live ink — thick, fully opaque BLUE so every finger stroke is
  //    obviously visible over the peach guide (fixes the invisible-ink bug).
  if (ink.length > 0) {
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.strokeStyle = INK_GLOW // soft glow halo for extra pop
    ctx.globalAlpha = 0.35
    ctx.lineWidth = size * 0.085
    strokeInk(ctx, ink, px)
    ctx.globalAlpha = 1
    ctx.strokeStyle = INK // the solid line on top
    ctx.lineWidth = size * 0.055
    strokeInk(ctx, ink, px)
  }
}

function strokeInk(ctx: CanvasRenderingContext2D, ink: StrokePoint[], px: (v: number) => number) {
  ctx.beginPath()
  ctx.moveTo(px(ink[0].x), px(ink[0].y))
  for (const p of ink) ctx.lineTo(px(p.x), px(p.y))
  ctx.stroke()
}

/** A glowing dot that sweeps the guide path on a loop (the wordless "do this" cue). */
function drawDemoTracer(
  ctx: CanvasRenderingContext2D,
  path: StrokePoint[],
  size: number,
  px: (v: number) => number,
) {
  const PERIOD = 2600 // ms per full sweep
  const HOLD = 0.18 // fraction of the loop paused at the end
  const raw = (Date.now() % PERIOD) / PERIOD
  const active = Math.min(1, raw / (1 - HOLD)) // 0..1 travel, then hold
  const idx = Math.min(path.length - 1, Math.floor(active * (path.length - 1)))
  const p = path[idx]
  // Fading comet trail behind the tip.
  const tail = 14
  for (let i = tail; i >= 1; i--) {
    const q = path[Math.max(0, idx - i * 2)]
    ctx.globalAlpha = 0.25 * (1 - i / tail)
    ctx.fillStyle = INK_GLOW
    ctx.beginPath()
    ctx.arc(px(q.x), px(q.y), size * 0.03, 0, Math.PI * 2)
    ctx.fill()
  }
  ctx.globalAlpha = 0.4 // outer glow
  ctx.fillStyle = INK_GLOW
  ctx.beginPath()
  ctx.arc(px(p.x), px(p.y), size * 0.06, 0, Math.PI * 2)
  ctx.fill()
  ctx.globalAlpha = 1 // solid fingertip
  ctx.fillStyle = INK
  ctx.beginPath()
  ctx.arc(px(p.x), px(p.y), size * 0.038, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = '#fff' // highlight
  ctx.beginPath()
  ctx.arc(px(p.x), px(p.y), size * 0.016, 0, Math.PI * 2)
  ctx.fill()
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
