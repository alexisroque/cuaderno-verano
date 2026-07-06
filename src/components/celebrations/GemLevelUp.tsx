import { useEffect, useState } from 'react'
import { gemVisual } from '../../engine/gems'

/** Auto-dismiss ceiling: the big moment stays special but never blocks for long. */
const AUTO_DISMISS_MS = 2500

/**
 * Full-screen takeover shown when a skill's gem levels up (checkLevelUp fired).
 * The gem morphs from the old level's visual to the new one, the mascot cheers,
 * and "¡Has subido a {nivel}!" celebrates it. THE big reward moment: felt but
 * brief (auto-dismisses after AUTO_DISMISS_MS, and tappable to dismiss sooner).
 * Respects prefers-reduced-motion (no spin, a plain fade instead).
 */
export function GemLevelUp({
  fromLevel,
  toLevel,
  skillName,
  onDismiss,
}: {
  fromLevel: number
  toLevel: number
  skillName: string
  onDismiss: () => void
}) {
  const [morphed, setMorphed] = useState(false)
  const reduced =
    typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

  const from = gemVisual(fromLevel)
  const to = gemVisual(toLevel)

  useEffect(() => {
    const morph = setTimeout(() => setMorphed(true), reduced ? 0 : 700)
    const close = setTimeout(onDismiss, AUTO_DISMISS_MS)
    return () => {
      clearTimeout(morph)
      clearTimeout(close)
    }
  }, [onDismiss, reduced])

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onDismiss}
      onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && onDismiss()}
      className="fixed inset-0 z-[60] flex flex-col items-center justify-center px-6 text-center"
      style={{ background: 'rgba(30,58,95,.92)', color: '#fff', animation: 'fadeIn .25s ease-out both' }}
      aria-label={`Has subido a ${to.name} en ${skillName}`}
    >
      {/* radiating glow */}
      {!reduced &&
        Array.from({ length: 10 }, (_, i) => (
          <span
            key={i}
            className="absolute left-1/2 top-1/2 h-40 w-3 origin-top rounded-full opacity-70"
            style={{
              background: 'var(--sun)',
              ['--rot' as string]: `${(360 / 10) * i}deg`,
              transform: `rotate(${(360 / 10) * i}deg)`,
              animation: 'levelup-shine 2s ease-out both',
            }}
          />
        ))}

      <div className="relative flex items-center gap-3">
        <span
          className="text-6xl transition-all duration-500"
          style={{ opacity: morphed ? 0.25 : 1, transform: morphed ? 'scale(.7)' : 'scale(1)' }}
          aria-hidden
        >
          {from.emoji}
        </span>
        <span className="text-3xl opacity-70" aria-hidden>
          →
        </span>
        <span
          className="text-7xl"
          style={{ animation: morphed ? (reduced ? 'fadeIn .3s both' : 'pop-in .55s ease-out both') : undefined, opacity: morphed ? 1 : 0.15 }}
          aria-hidden
        >
          {to.emoji}
        </span>
      </div>

      <p className="mt-6 text-sm font-bold uppercase tracking-widest opacity-80">{skillName}</p>
      <h2 className="mt-1 text-2xl font-black">¡Has subido a {to.name}!</h2>
      <p className="mt-3 text-2xl" aria-hidden>
        🎉 ¡Sugoi! 🎉
      </p>
      <p className="mt-6 text-xs opacity-70">Toca para continuar</p>
    </div>
  )
}
