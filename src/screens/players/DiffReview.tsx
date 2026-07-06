import type { TextDiff, WordStatus } from '../../lib/textDiff'

/** Per-status chip styling: green ok, orange accent, red misspelled/missing/extra. */
const STYLE: Record<WordStatus, { bg: string; fg: string; strike?: boolean }> = {
  ok: { bg: 'var(--mint)', fg: '#3f7d55' },
  accent: { bg: '#ffe1c7', fg: '#b45309' },
  misspelled: { bg: '#fde2df', fg: '#c0392b' },
  missing: { bg: '#fde2df', fg: '#c0392b' },
  extra: { bg: '#efe4ef', fg: '#8b5cf6', strike: true },
}

/**
 * Renders a word-level self-correction: each word as a soft chip tinted by
 * status. Accent slips show the child's word with the correct one beneath so
 * she sees exactly which accent to add; misspellings/missing show the
 * reference word to copy; extra words are struck through.
 */
export function DiffReview({ diff }: { diff: TextDiff }) {
  return (
    <div className="flex flex-wrap gap-1.5 rounded-2xl p-3 leading-loose" style={{ background: 'var(--bg)' }}>
      {diff.words.map((w, i) => {
        const s = STYLE[w.status]
        const shown = w.typed ?? w.reference ?? ''
        return (
          <span
            key={i}
            className="inline-flex flex-col items-center rounded-xl px-2 py-0.5 text-base font-bold"
            style={{ background: s.bg, color: s.fg, textDecoration: s.strike ? 'line-through' : undefined }}
          >
            <span>{w.status === 'missing' ? '⌷' : shown}</span>
            {(w.status === 'accent' || w.status === 'misspelled' || w.status === 'missing') && w.reference && (
              <span className="text-[11px] font-black">→ {w.reference}</span>
            )}
          </span>
        )
      })}
    </div>
  )
}
