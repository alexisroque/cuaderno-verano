import { useProgressStore } from '../../state/progressStore'
import { CHAPTERS } from '../../content/chapters'
import { chapterForDate } from '../../engine/dayComposer'
import { milestones } from '../../engine/collections'

/** A stamped day: its ISO date + the chapter emoji it belongs to. */
function stampedDays(completedCards: Record<string, string[]>): { dateISO: string; emoji: string; place: string }[] {
  return Object.keys(completedCards)
    .filter((d) => (completedCards[d] ?? []).length > 0)
    .sort()
    .map((dateISO) => {
      const chapter = chapterForDate(CHAPTERS, dateISO)
      return { dateISO, emoji: chapter.emoji, place: chapter.place }
    })
}

/** Formats an ISO date as a short day/month label. */
function shortDate(dateISO: string): string {
  const [, m, d] = dateISO.split('-')
  return `${d}/${m}`
}

/**
 * Aira's passport (§5.8): a hojeable page of daily stamps (one per completed
 * day, the chapter emoji) plus a milestones page (gem/streak/desafío hitos,
 * achieved and not-yet). Read-only keepsake, scrollable.
 */
export function Passport() {
  const progress = useProgressStore((s) => s.profiles.aira)
  const days = stampedDays(progress.completedCards)
  const hitos = milestones(progress)

  return (
    <div className="space-y-6">
      <section>
        <div className="mb-3 flex items-center gap-2">
          <span className="rounded-xl px-3 py-1 text-sm font-bold" style={{ background: 'var(--navy)', color: '#fff' }}>
            🛂 Pasaporte
          </span>
          <span className="text-sm" style={{ color: 'var(--ink-soft)' }}>
            {days.length} {days.length === 1 ? 'sello' : 'sellos'}
          </span>
        </div>

        {days.length === 0 ? (
          <p className="rounded-2xl p-4 text-sm" style={{ background: 'var(--card)', color: 'var(--ink-soft)' }}>
            Completa las tarjetas de un día para ganar tu primer sello. ✨
          </p>
        ) : (
          <div className="grid grid-cols-4 gap-2 sm:grid-cols-6">
            {days.map((s) => (
              <div
                key={s.dateISO}
                className="flex flex-col items-center rounded-2xl p-2"
                style={{ background: 'var(--card)', boxShadow: '0 1px 4px rgba(184,140,120,.14)' }}
                title={`${s.place} · ${s.dateISO}`}
              >
                <span className="text-2xl" aria-hidden>
                  {s.emoji}
                </span>
                <span className="text-[9px] font-bold" style={{ color: 'var(--ink-soft)' }}>
                  {shortDate(s.dateISO)}
                </span>
              </div>
            ))}
          </div>
        )}
      </section>

      <section>
        <h3 className="mb-3 text-sm font-black uppercase tracking-wide" style={{ color: 'var(--ink-soft)' }}>
          Hitos
        </h3>
        <div className="space-y-2">
          {hitos.map((m) => (
            <div
              key={m.id}
              className="flex items-center gap-3 rounded-2xl p-3"
              style={{ background: 'var(--card)', opacity: m.achieved ? 1 : 0.55 }}
            >
              <span className="text-2xl" aria-hidden>
                {m.achieved ? m.emoji : '🔒'}
              </span>
              <span className="flex-1 text-sm font-bold">{m.label}</span>
              {m.achieved && (
                <span className="text-sm font-black" style={{ color: '#3f7d55' }} aria-label="Conseguido">
                  ✓
                </span>
              )}
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
