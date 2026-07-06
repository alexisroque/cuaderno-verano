import type { HTMLAttributes, ReactNode } from 'react'
import type { UiSize } from './Button'

export type PillTone = 'plain' | 'peach' | 'mint' | 'sky' | 'navy'

interface PillProps extends HTMLAttributes<HTMLSpanElement> {
  children: ReactNode
  tone?: PillTone
  size?: UiSize
}

const TONES: Record<PillTone, { bg: string; fg: string }> = {
  plain: { bg: 'var(--card)', fg: 'var(--ink)' },
  peach: { bg: 'var(--peach-soft)', fg: '#c26a4c' },
  mint: { bg: 'var(--mint)', fg: '#3f7d55' },
  sky: { bg: 'var(--sky)', fg: '#2f6690' },
  navy: { bg: 'var(--navy)', fg: '#ffffff' },
}

/** Small rounded status chip: chapter, streak, coins, level labels. */
export function Pill({ children, tone = 'plain', size = 'md', className = '', ...rest }: PillProps) {
  const t = TONES[tone]
  const sizing = size === 'lg' ? 'px-4 py-2 text-base gap-2' : 'px-3 py-1.5 text-sm gap-1.5'
  return (
    <span
      style={{
        background: t.bg,
        color: t.fg,
        borderRadius: 'var(--r-pill)',
        boxShadow: tone === 'navy' ? undefined : '0 1px 3px rgba(0,0,0,.06)',
      }}
      className={[
        'inline-flex select-none items-center font-bold whitespace-nowrap',
        sizing,
        className,
      ].join(' ')}
      {...rest}
    >
      {children}
    </span>
  )
}
