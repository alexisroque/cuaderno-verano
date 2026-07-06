import { useEffect, type ReactNode } from 'react'

interface ModalProps {
  open: boolean
  onClose: () => void
  children: ReactNode
  title?: string
  /** Hide the default close button (e.g. for celebration overlays). */
  hideClose?: boolean
}

/**
 * A centered kawaii-calm dialog on a soft peach scrim. Closes on backdrop tap
 * and Escape. Kept deliberately simple — reserved for genuine interruptions
 * (parent gate, celebration) rather than routine flows.
 */
export function Modal({ open, onClose, children, title, hideClose = false }: ModalProps) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={title}
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center p-6"
      style={{ background: 'rgba(91,74,67,.35)' }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: 'var(--card)',
          borderRadius: 'var(--r-card)',
          boxShadow: '0 20px 50px rgba(91,74,67,.28)',
        }}
        className="w-full max-w-md p-6"
      >
        {(title || !hideClose) && (
          <div className="mb-3 flex items-center justify-between gap-3">
            {title ? (
              <h2 className="text-xl font-extrabold" style={{ color: 'var(--ink)' }}>
                {title}
              </h2>
            ) : (
              <span />
            )}
            {!hideClose && (
              <button
                type="button"
                aria-label="Cerrar"
                onClick={onClose}
                className="flex h-9 w-9 items-center justify-center rounded-full text-lg font-bold focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--peach)]"
                style={{ background: 'var(--peach-soft)', color: '#c26a4c' }}
              >
                ✕
              </button>
            )}
          </div>
        )}
        {children}
      </div>
    </div>
  )
}
