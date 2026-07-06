import { useEffect, useState } from 'react'

/** Spanish onomatopoeia shown at the center of the burst, picked at random. */
const WORDS = ['¡ZAS!', '¡GENIAL!', '¡BIEN!', '¡PUM!', '¡YEAH!']

/** Roughly how long the burst stays on screen before unmounting itself. */
const LIFETIME_MS = 550

/**
 * A ~500ms CSS-only manga speed-line + star-pop celebration with a Spanish
 * onomatopoeia, the "manga energy at reward moments" from the A+C aesthetic.
 * Overlaid (fixed, pointer-events:none) so it never blocks the UI, and it
 * removes itself after LIFETIME_MS. Respects prefers-reduced-motion by
 * falling back to a gentle centered fade (no spinning rays).
 *
 * Mount it with a changing `key` (e.g. Date.now()) to retrigger — remounting
 * restarts the animation cleanly.
 */
export function MangaBurst({ word }: { word?: string }) {
  const [gone, setGone] = useState(false)
  const [label] = useState(() => word ?? WORDS[Math.floor(Math.random() * WORDS.length)])
  const reduced =
    typeof window !== 'undefined' &&
    window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

  useEffect(() => {
    const t = setTimeout(() => setGone(true), LIFETIME_MS)
    return () => clearTimeout(t)
  }, [])

  if (gone) return null

  const rays = 12
  return (
    <div
      className="pointer-events-none fixed inset-0 z-50 flex items-center justify-center"
      aria-live="polite"
      aria-label={label}
    >
      {!reduced && (
        <div className="relative h-56 w-56">
          {Array.from({ length: rays }, (_, i) => (
            <span
              key={i}
              className="absolute left-1/2 top-1/2 h-24 w-2 origin-top rounded-full"
              style={{
                background: i % 2 ? 'var(--sun)' : 'var(--pow)',
                ['--rot' as string]: `${(360 / rays) * i}deg`,
                transform: `rotate(${(360 / rays) * i}deg)`,
                animation: 'manga-ray .5s ease-out both',
              }}
            />
          ))}
          {['⭐', '✨', '💫', '⭐'].map((s, i) => (
            <span
              key={i}
              className="absolute text-2xl"
              style={{
                left: `${[12, 78, 20, 70][i]}%`,
                top: `${[20, 15, 74, 70][i]}%`,
                animation: 'pop-in .45s ease-out both',
                animationDelay: `${i * 0.05}s`,
              }}
              aria-hidden
            >
              {s}
            </span>
          ))}
        </div>
      )}
      <span
        className="absolute text-4xl font-black tracking-tight"
        style={{
          color: 'var(--pow)',
          WebkitTextStroke: '2px #fff',
          textShadow: '0 3px 0 rgba(0,0,0,.12)',
          animation: reduced ? 'fadeIn .3s ease-out both' : 'manga-word .5s cubic-bezier(.2,.9,.3,1) both',
        }}
      >
        {label}
      </span>
    </div>
  )
}
