/**
 * An area/array model: `rows` bands, each split into `colsSplit` segments
 * (e.g. colsSplit [10, 2] shows a 12-wide row broken into a 10-block and a
 * 2-block — the classic "partition to multiply" picture). Alternating segment
 * tints make the split legible.
 */
export function RectangleModel({ rows, colsSplit }: { rows: number; colsSplit: number[] }) {
  const totalCols = colsSplit.reduce((a, b) => a + b, 0)
  const tints = ['var(--peach-soft)', 'var(--mint)', 'var(--sky)', 'var(--sun)']
  return (
    <div
      className="inline-grid gap-1 rounded-2xl p-2"
      style={{ background: 'var(--bg)', gridTemplateRows: `repeat(${rows}, 1fr)` }}
      aria-label={`Rectángulo de ${rows} filas por ${totalCols} columnas`}
    >
      {Array.from({ length: rows }, (_, r) => (
        <div key={r} className="flex gap-1">
          {colsSplit.map((seg, si) => (
            <div key={si} className="flex gap-0.5">
              {Array.from({ length: seg }, (_, c) => (
                <span
                  key={c}
                  className="h-4 w-4 rounded-[4px]"
                  style={{ background: tints[si % tints.length] }}
                />
              ))}
            </div>
          ))}
        </div>
      ))}
    </div>
  )
}
