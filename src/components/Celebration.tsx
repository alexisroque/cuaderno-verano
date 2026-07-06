/**
 * A light "correct answer" burst: a pop-in emoji on a radial ray flourish.
 * Deliberately small and self-contained — this is the SEAM Task 5.8 will
 * replace with the full manga celebration (rays, onomatopeia, mascot "¡SUGOI!").
 * Kept here so the ProblemPlayer's `onCorrect` moment already has a hook and a
 * placeholder that reads as a real reward, not a plain checkmark.
 */
export function Celebration({ emoji = '🎉', line = '¡Correcto!' }: { emoji?: string; line?: string }) {
  const rays = 8
  return (
    <div className="relative flex flex-col items-center justify-center py-4" aria-live="polite">
      <div className="relative flex h-24 w-24 items-center justify-center">
        {Array.from({ length: rays }, (_, i) => (
          <span
            key={i}
            className="absolute h-10 w-1.5 rounded-full"
            style={{
              background: i % 2 ? 'var(--sun)' : 'var(--pow)',
              transform: `rotate(${(360 / rays) * i}deg) translateY(-26px)`,
              transformOrigin: 'center',
              animation: 'burst-ray .6s ease-out both',
              animationDelay: `${i * 0.03}s`,
            }}
          />
        ))}
        <span className="animate-[pop-in_.45s_ease-out] text-6xl" aria-hidden>
          {emoji}
        </span>
      </div>
      <div className="mt-2 animate-[pop-in_.45s_ease-out] text-2xl font-black" style={{ color: '#c26a4c' }}>
        {line}
      </div>
    </div>
  )
}
