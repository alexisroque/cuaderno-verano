/**
 * A figure drawn as filled cells on a small grid: `cells` are [row, col] pairs
 * that get colored, the rest stay empty. Grid size is inferred from the max
 * row/col present. Used by symmetry/shape figures.
 */
export function GridFigure({ cells }: { cells: [number, number][] }) {
  const maxRow = Math.max(0, ...cells.map(([r]) => r))
  const maxCol = Math.max(0, ...cells.map(([, c]) => c))
  const rows = maxRow + 1
  const cols = maxCol + 1
  const filled = new Set(cells.map(([r, c]) => `${r},${c}`))

  return (
    <div
      className="inline-grid gap-0.5 rounded-2xl p-2"
      style={{ gridTemplateColumns: `repeat(${cols}, 1fr)`, background: 'var(--bg)' }}
      aria-label="Figura en cuadrícula"
    >
      {Array.from({ length: rows * cols }, (_, i) => {
        const r = Math.floor(i / cols)
        const c = i % cols
        const on = filled.has(`${r},${c}`)
        return (
          <span
            key={i}
            className="h-5 w-5 rounded-[4px]"
            style={{ background: on ? 'var(--peach)' : 'var(--card)', boxShadow: on ? undefined : 'inset 0 0 0 1px var(--peach-soft)' }}
          />
        )
      })}
    </div>
  )
}

/** A small spatial scene: actors placed on an implicit grid (row 0 top, col 0 left). */
export function SceneVisual({ actors }: { actors: { emoji: string; row: number; col: number }[] }) {
  const maxRow = Math.max(0, ...actors.map((a) => a.row))
  const maxCol = Math.max(0, ...actors.map((a) => a.col))
  const at = new Map(actors.map((a) => [`${a.row},${a.col}`, a.emoji]))
  return (
    <div
      className="inline-grid gap-1 rounded-2xl p-2"
      style={{ gridTemplateColumns: `repeat(${maxCol + 1}, 1fr)`, background: 'var(--bg)' }}
      aria-label="Escena"
    >
      {Array.from({ length: (maxRow + 1) * (maxCol + 1) }, (_, i) => {
        const r = Math.floor(i / (maxCol + 1))
        const c = i % (maxCol + 1)
        const emoji = at.get(`${r},${c}`)
        return (
          <span key={i} className="flex h-9 w-9 items-center justify-center text-2xl" aria-hidden>
            {emoji ?? ''}
          </span>
        )
      })}
    </div>
  )
}
