import type { ButtonHTMLAttributes, ReactNode } from 'react'

export type ButtonVariant = 'primary' | 'soft' | 'ghost'
export type UiSize = 'md' | 'lg'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode
  variant?: ButtonVariant
  size?: UiSize
}

/**
 * Primary action button. Kawaii-calm by default (peach pill, soft shadow) with
 * a subtle press "peso": a colored under-edge (box-shadow offset) that the
 * button sinks into on :active. `size="lg"` is the ≥60px Leo target.
 */
export function Button({
  children,
  variant = 'primary',
  size = 'md',
  className = '',
  disabled,
  ...rest
}: ButtonProps) {
  const sizing =
    size === 'lg'
      ? 'min-h-[64px] px-9 text-2xl gap-3'
      : 'min-h-[48px] px-6 text-lg gap-2'

  const palette: Record<ButtonVariant, string> = {
    primary: 'text-white',
    soft: 'text-[var(--ink)]',
    ghost: 'bg-transparent text-[var(--ink)] shadow-none active:translate-y-0',
  }

  const style =
    variant === 'primary'
      ? { background: 'var(--peach)', boxShadow: '0 4px 0 #d98363' }
      : variant === 'soft'
        ? { background: 'var(--peach-soft)', boxShadow: '0 3px 0 #f2cdb4' }
        : undefined

  return (
    <button
      type="button"
      disabled={disabled}
      style={style}
      className={[
        'inline-flex select-none items-center justify-center rounded-full font-extrabold',
        'transition-[transform,box-shadow] duration-100 ease-out',
        'active:translate-y-[3px] active:shadow-none',
        'disabled:cursor-not-allowed disabled:opacity-50 disabled:active:translate-y-0',
        'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--peach)]',
        sizing,
        palette[variant],
        className,
      ].join(' ')}
      {...rest}
    >
      {children}
    </button>
  )
}
