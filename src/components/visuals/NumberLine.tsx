interface Jump {
  from: number
  to: number
  label: string
}

/**
 * A number line from `from` to `to` with labeled arc "jumps" above it — the
 * canonical Innovamat picture for counting on, skip-counting, and open number
 * lines. Endpoints and each jump's landing point are ticked and labeled.
 */
export function NumberLine({ from, to, jumps }: { from: number; to: number; jumps: Jump[] }) {
  const span = to - from || 1
  const W = 320
  const H = 90
  const padX = 16
  const baseY = 64
  const x = (v: number) => padX + ((v - from) / span) * (W - padX * 2)

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ maxWidth: 360 }} role="img" aria-label={`Recta numérica de ${from} a ${to}`}>
      <line x1={padX} y1={baseY} x2={W - padX} y2={baseY} stroke="var(--ink-soft)" strokeWidth={2} />
      {/* endpoint ticks */}
      {[from, to].map((v) => (
        <g key={v}>
          <line x1={x(v)} y1={baseY - 5} x2={x(v)} y2={baseY + 5} stroke="var(--ink-soft)" strokeWidth={2} />
          <text x={x(v)} y={baseY + 20} textAnchor="middle" fontSize={11} fill="var(--ink)" fontWeight={700}>
            {v}
          </text>
        </g>
      ))}
      {jumps.map((j, i) => {
        const x1 = x(j.from)
        const x2 = x(j.to)
        const mid = (x1 + x2) / 2
        return (
          <g key={i}>
            <path
              d={`M ${x1} ${baseY} Q ${mid} ${baseY - 34} ${x2} ${baseY}`}
              fill="none"
              stroke="var(--peach)"
              strokeWidth={2.5}
            />
            <text x={mid} y={baseY - 34} textAnchor="middle" fontSize={11} fill="#c26a4c" fontWeight={800}>
              {j.label}
            </text>
            <circle cx={x2} cy={baseY} r={3} fill="var(--peach)" />
          </g>
        )
      })}
    </svg>
  )
}
