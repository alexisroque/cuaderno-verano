import type { UiSize } from './Button'

interface ProgressBarProps {
  /** Fraction filled, 0..1 (clamped). */
  value: number
  size?: UiSize
  /** Fill color; defaults to peach. */
  color?: string
  label?: string
  className?: string
}

/** A rounded, soft-track progress meter for gem/mission progress. */
export function ProgressBar({
  value,
  size = 'md',
  color = 'var(--peach)',
  label,
  className = '',
}: ProgressBarProps) {
  const pct = Math.round(Math.min(1, Math.max(0, value)) * 100)
  const height = size === 'lg' ? 'h-5' : 'h-3'
  return (
    <div className={className}>
      {label && (
        <div className="mb-1 flex justify-between text-sm font-bold" style={{ color: 'var(--ink)' }}>
          <span>{label}</span>
          <span style={{ color: 'var(--ink-soft)' }}>{pct}%</span>
        </div>
      )}
      <div
        role="progressbar"
        aria-valuenow={pct}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={label}
        className={`${height} w-full overflow-hidden rounded-full`}
        style={{ background: 'var(--peach-soft)' }}
      >
        <div
          className="h-full rounded-full transition-[width] duration-500 ease-out"
          style={{ width: `${pct}%`, background: color }}
        />
      </div>
    </div>
  )
}
