import type { ReactNode } from 'react'
import type { UiSize } from './Button'

interface IconTileProps {
  emoji: string
  /** Background tint of the rounded tile. */
  tone?: 'peach' | 'mint' | 'sky' | 'sun'
  size?: UiSize
  /** Slight kawaii tilt like the mockups. */
  tilt?: boolean
  className?: string
  children?: ReactNode
}

const TONE_BG: Record<NonNullable<IconTileProps['tone']>, string> = {
  peach: 'var(--peach-soft)',
  mint: 'var(--mint)',
  sky: 'var(--sky)',
  sun: 'var(--sun)',
}

/**
 * A rounded emoji tile — the mascot / skill icon holder used on cards and
 * avatars. `size="lg"` is the big Leo variant.
 */
export function IconTile({
  emoji,
  tone = 'peach',
  size = 'md',
  tilt = false,
  className = '',
  children,
}: IconTileProps) {
  const dim = size === 'lg' ? 'h-20 w-20 text-5xl' : 'h-12 w-12 text-2xl'
  return (
    <span
      style={{
        background: TONE_BG[tone],
        borderRadius: '30%',
        transform: tilt ? 'rotate(-4deg)' : undefined,
      }}
      className={[
        'inline-flex shrink-0 items-center justify-center',
        dim,
        className,
      ].join(' ')}
    >
      <span aria-hidden>{emoji}</span>
      {children}
    </span>
  )
}
