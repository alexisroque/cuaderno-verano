/**
 * `groups` boxes, each holding `perGroup` dots, plus an optional `remainder`
 * shown as loose dots outside the boxes — the division-with-remainder /
 * equal-grouping picture. Reads left-to-right like the operation it models.
 */
export function BoxesVisual({ groups, perGroup, remainder = 0 }: { groups: number; perGroup: number; remainder?: number }) {
  return (
    <div className="flex flex-wrap items-center gap-2" aria-label={`${groups} grupos de ${perGroup}${remainder ? ` y ${remainder} sueltos` : ''}`}>
      {Array.from({ length: groups }, (_, g) => (
        <div
          key={g}
          className="grid gap-0.5 rounded-xl p-1.5"
          style={{
            background: 'var(--mint)',
            gridTemplateColumns: `repeat(${Math.min(perGroup, 3)}, 1fr)`,
          }}
        >
          {Array.from({ length: perGroup }, (_, i) => (
            <span key={i} className="h-3 w-3 rounded-full" style={{ background: '#3f7d55' }} />
          ))}
        </div>
      ))}
      {remainder > 0 && (
        <div className="flex items-center gap-0.5">
          <span className="mr-1 text-sm font-black" style={{ color: 'var(--ink-soft)' }}>
            +
          </span>
          {Array.from({ length: remainder }, (_, i) => (
            <span key={i} className="h-3 w-3 rounded-full" style={{ background: 'var(--peach)' }} />
          ))}
        </div>
      )}
    </div>
  )
}
