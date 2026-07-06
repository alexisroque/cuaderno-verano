import type { HTMLAttributes, MouseEvent, ReactNode } from 'react'
import type { UiSize } from './Button'

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode
  /** Optional colored top accent bar (matches the "página de hoy" cards). */
  accent?: string
  size?: UiSize
  /** Renders the whole card as an interactive surface (pointer + press lift). */
  interactive?: boolean
}

/**
 * The base surface of the app: white, very rounded (22px), soft peach-tinted
 * shadow, generous padding. `accent` paints a colored top border like the
 * day cards; `interactive` adds a gentle hover lift for tappable cards.
 */
export function Card({
  children,
  accent,
  size = 'md',
  interactive = false,
  className = '',
  style,
  onClick,
  onKeyDown,
  ...rest
}: CardProps) {
  const pad = size === 'lg' ? 'p-6' : 'p-4'
  // An interactive card that acts on click also needs to be keyboard/AT
  // reachable: expose it as a button and fire onClick on Enter/Space.
  const isButton = interactive && !!onClick
  return (
    <div
      role={isButton ? 'button' : undefined}
      tabIndex={isButton ? 0 : undefined}
      onClick={onClick}
      onKeyDown={(e) => {
        if (isButton && (e.key === 'Enter' || e.key === ' ')) {
          e.preventDefault()
          onClick?.(e as unknown as MouseEvent<HTMLDivElement>)
        }
        onKeyDown?.(e)
      }}
      style={{
        background: 'var(--card)',
        borderRadius: 'var(--r-card)',
        boxShadow: '0 6px 18px rgba(184,140,120,.14)',
        borderTop: accent ? `4px solid ${accent}` : undefined,
        ...style,
      }}
      className={[
        pad,
        interactive
          ? 'cursor-pointer transition-transform duration-150 ease-out hover:-translate-y-0.5 active:translate-y-0'
          : '',
        className,
      ].join(' ')}
      {...rest}
    >
      {children}
    </div>
  )
}
