/**
 * `count` copies of `emoji` laid out in `rows` rows (default: a single row that
 * wraps). Leo's core counting picture — big, tappable-looking, no numerals.
 */
export function EmojiCount({ emoji, count, rows }: { emoji: string; count: number; rows?: number }) {
  const perRow = rows ? Math.ceil(count / rows) : count
  return (
    <div
      className="inline-grid justify-items-center gap-1"
      style={{ gridTemplateColumns: `repeat(${Math.min(perRow, 10)}, 1fr)` }}
      aria-label={`${count} ${emoji}`}
    >
      {Array.from({ length: count }, (_, i) => (
        <span key={i} className="text-3xl" aria-hidden>
          {emoji}
        </span>
      ))}
    </div>
  )
}

/** Two labeled emoji groups side by side — the compare-quantities picture. */
export function CompareGroups({
  left,
  right,
}: {
  left: { emoji: string; count: number }
  right: { emoji: string; count: number }
}) {
  const group = (g: { emoji: string; count: number }) => (
    <div className="flex flex-wrap justify-center gap-0.5 rounded-2xl p-2" style={{ background: 'var(--bg)', maxWidth: 140 }}>
      {Array.from({ length: g.count }, (_, i) => (
        <span key={i} className="text-2xl" aria-hidden>
          {g.emoji}
        </span>
      ))}
    </div>
  )
  return (
    <div className="flex items-center gap-3" aria-label={`Comparar ${left.count} y ${right.count}`}>
      {group(left)}
      <span className="text-2xl font-black" style={{ color: 'var(--ink-soft)' }} aria-hidden>
        vs
      </span>
      {group(right)}
    </div>
  )
}
