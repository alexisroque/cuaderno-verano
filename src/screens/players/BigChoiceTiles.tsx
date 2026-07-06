import type { Choice } from '../../types/exercise'

/**
 * Big tappable answer tiles for Leo (≥60px touch targets). The wrong pick is
 * briefly tinted so a non-reading child sees "not that one" without any text.
 * Labels are shown as-is (a number, a symbol, or a single emoji) — the caller
 * is responsible for never passing an answer-leaking label (see espejo, which
 * renders drawn glyphs instead of using this component).
 */
export function BigChoiceTiles({
  choices,
  wrongId,
  onPick,
  columns,
}: {
  choices: Choice[]
  wrongId?: string | null
  onPick: (id: string) => void
  /** Force a column count; defaults to 2 for ≤4 tiles, 3 for more. */
  columns?: number
}) {
  const cols = columns ?? (choices.length > 4 ? 3 : 2)
  // Emoji-only labels render bigger than number/word labels.
  const isEmoji = (label: string) => /\p{Extended_Pictographic}/u.test(label)

  return (
    <div className="grid gap-3" style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}>
      {choices.map((c) => {
        const wrong = wrongId === c.id
        return (
          <button
            key={c.id}
            type="button"
            onClick={() => onPick(c.id)}
            className={[
              'flex min-h-[76px] items-center justify-center rounded-3xl px-3 py-4 font-black',
              'transition-transform duration-100 ease-out active:translate-y-[2px]',
              isEmoji(c.label) ? 'text-5xl' : 'text-3xl',
            ].join(' ')}
            style={{
              background: wrong ? '#fde2d6' : 'var(--peach-soft)',
              color: wrong ? '#c26a4c' : 'var(--ink)',
              boxShadow: wrong ? 'inset 0 0 0 3px #f4a988' : '0 3px 0 #f2cdb4',
            }}
          >
            {c.label}
          </button>
        )
      })}
    </div>
  )
}
