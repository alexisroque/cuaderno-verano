/** An n×n square array of dots — the "square number" / perfect-square picture. */
export function DotGrid({ n }: { n: number }) {
  return (
    <div
      className="inline-grid gap-1 rounded-2xl p-2"
      style={{ gridTemplateColumns: `repeat(${n}, 1fr)`, background: 'var(--bg)' }}
      aria-label={`Cuadrado de ${n} por ${n}`}
    >
      {Array.from({ length: n * n }, (_, i) => (
        <span key={i} className="h-3.5 w-3.5 rounded-full" style={{ background: 'var(--peach)' }} />
      ))}
    </div>
  )
}
