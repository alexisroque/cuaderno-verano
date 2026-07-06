import { Button } from './Button'

/**
 * A big kawaii on-screen numeric keypad — the ONLY way to enter a number
 * answer (the device keyboard is never summoned, per spec). Supports an
 * optional leading minus and a delete key.
 */
export function NumberPad({
  value,
  onChange,
  onSubmit,
  allowNegative = false,
}: {
  value: string
  /** Functional updater so rapid taps compose correctly (no stale-closure loss). */
  onChange: (update: (prev: string) => string) => void
  onSubmit: () => void
  allowNegative?: boolean
}) {
  const press = (d: string) => onChange((prev) => prev + d)
  const del = () => onChange((prev) => prev.slice(0, -1))
  const toggleSign = () => onChange((prev) => (prev.startsWith('-') ? prev.slice(1) : '-' + prev))

  const keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9']

  return (
    <div>
      <div
        className="mb-3 flex min-h-[56px] items-center justify-center rounded-2xl px-4 text-3xl font-black"
        style={{ background: 'var(--bg)', color: 'var(--ink)' }}
        aria-live="polite"
      >
        {value || <span style={{ color: 'var(--ink-soft)' }}>—</span>}
      </div>
      <div className="grid grid-cols-3 gap-2">
        {keys.map((k) => (
          <button
            key={k}
            type="button"
            onClick={() => press(k)}
            className="min-h-[56px] rounded-2xl text-2xl font-black transition-transform active:translate-y-[2px]"
            style={{ background: 'var(--peach-soft)', color: 'var(--ink)' }}
          >
            {k}
          </button>
        ))}
        <button
          type="button"
          onClick={allowNegative ? toggleSign : del}
          aria-label={allowNegative ? 'Cambiar signo' : 'Borrar'}
          className="min-h-[56px] rounded-2xl text-2xl font-black transition-transform active:translate-y-[2px]"
          style={{ background: 'var(--sky)', color: 'var(--ink)' }}
        >
          {allowNegative ? '±' : '⌫'}
        </button>
        <button
          type="button"
          onClick={() => press('0')}
          className="min-h-[56px] rounded-2xl text-2xl font-black transition-transform active:translate-y-[2px]"
          style={{ background: 'var(--peach-soft)', color: 'var(--ink)' }}
        >
          0
        </button>
        {allowNegative ? (
          <button
            type="button"
            onClick={del}
            aria-label="Borrar"
            className="min-h-[56px] rounded-2xl text-2xl font-black transition-transform active:translate-y-[2px]"
            style={{ background: 'var(--sky)', color: 'var(--ink)' }}
          >
            ⌫
          </button>
        ) : (
          <span />
        )}
      </div>
      <div className="mt-3">
        <Button variant="primary" onClick={onSubmit} disabled={value === '' || value === '-'} className="w-full">
          Comprobar ✓
        </Button>
      </div>
    </div>
  )
}
