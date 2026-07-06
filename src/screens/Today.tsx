import { Shell } from '../components/Shell'
import { Card } from '../components/ui/Card'
import { Pill } from '../components/ui/Pill'
import { useProfileStore } from '../state/profileStore'
import { currentChapter } from '../content/chapters'

/**
 * "La página de hoy" — placeholder shell for Task 5.3. For now it confirms the
 * active profile and today's resolved chapter so routing/date wiring is
 * visible in the preview.
 */
export function Today() {
  const profile = useProfileStore((s) => s.activeProfile)
  const chapter = currentChapter()
  const isLeo = profile === 'leo'

  return (
    <Shell>
      <div className="mx-auto max-w-4xl pt-2">
        <div className="mb-4 flex items-center gap-2">
          <h2 className={isLeo ? 'text-2xl font-black' : 'text-lg font-extrabold'}>La página de hoy</h2>
          <Pill tone="mint">
            {chapter.emoji} {chapter.place}
          </Pill>
        </div>

        <Card accent="var(--peach)" size={isLeo ? 'lg' : 'md'}>
          <div className="flex items-center gap-4">
            <span className="text-5xl" aria-hidden>
              {chapter.mascot.emoji}
            </span>
            <div>
              <div className="text-base font-extrabold">
                Capítulo: {chapter.title}
              </div>
              <div className="text-sm" style={{ color: 'var(--ink-soft)' }}>
                Con {chapter.mascot.name} · {chapter.place}
              </div>
              <p className="mt-2 text-sm" style={{ color: 'var(--ink-soft)' }}>
                Aquí aparecerán las tarjetas del día (próximamente).
              </p>
            </div>
          </div>
        </Card>
      </div>
    </Shell>
  )
}
