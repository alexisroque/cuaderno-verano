import { useProgressStore } from '../../state/progressStore'
import { diaryPromptById } from '../../content/loader'

/** Formats an ISO date as a short day/month label. */
function shortDate(dateISO: string): string {
  const [, m, d] = dateISO.split('-')
  return `${d}/${m}`
}

/**
 * "El diario de Aira": a read-only list of her saved DiaryEntry entries, newest
 * first, each showing the prompt it answered and her text. Never editable here
 * — writing happens in the DiaryPlayer; this is the keepsake view (§5.8).
 */
export function DiaryList() {
  const entries = useProgressStore((s) => s.profiles.aira.diaryEntries)
  const sorted = [...entries].sort((a, b) => (a.dateISO < b.dateISO ? 1 : -1))

  return (
    <div>
      <h3 className="mb-3 text-base font-black">📔 El diario de Aira</h3>
      {sorted.length === 0 ? (
        <p className="rounded-2xl p-4 text-sm" style={{ background: 'var(--card)', color: 'var(--ink-soft)' }}>
          Aún no has escrito nada. Abre «Mi diario» en tu página de hoy. ✍️
        </p>
      ) : (
        <div className="space-y-3">
          {sorted.map((e) => {
            const prompt = diaryPromptById(e.promptId)
            return (
              <article key={`${e.dateISO}-${e.promptId}`} className="rounded-2xl p-4" style={{ background: 'var(--card)', boxShadow: '0 1px 4px rgba(184,140,120,.14)' }}>
                <div className="mb-1 flex items-center justify-between">
                  <span className="text-xs font-bold" style={{ color: '#8b5cf6' }}>
                    {shortDate(e.dateISO)}
                  </span>
                </div>
                {prompt && (
                  <p className="mb-1 text-xs italic" style={{ color: 'var(--ink-soft)' }}>
                    {prompt.text.es}
                  </p>
                )}
                <p className="whitespace-pre-wrap text-sm leading-relaxed">{e.text}</p>
              </article>
            )
          })}
        </div>
      )}
    </div>
  )
}
