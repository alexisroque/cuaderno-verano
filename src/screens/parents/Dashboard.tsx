import { useMemo } from 'react'
import type { ProfileId } from '../../state/profileStore'
import { useProgressStore } from '../../state/progressStore'
import { dailyActivity } from '../../engine/analytics'
import { todayISO } from '../../lib/clock'
import { CATALOG, SKILL_META, type SkillId } from '../../engine/skills'
import { gemVisual } from '../../engine/gems'

const ACTIVITY_DAYS = 14

function StatChip({ label, value, emoji }: { label: string; value: string; emoji: string }) {
  return (
    <div
      className="flex flex-1 flex-col items-start gap-0.5 rounded-2xl px-4 py-3"
      style={{ background: 'var(--bg)' }}
    >
      <span className="text-2xl font-black leading-none" style={{ color: 'var(--navy)' }}>
        <span aria-hidden className="mr-1 text-lg">
          {emoji}
        </span>
        {value}
      </span>
      <span className="text-xs font-semibold" style={{ color: 'var(--ink-soft)' }}>
        {label}
      </span>
    </div>
  )
}

/**
 * Fourteen-day activity, drawn as day columns: a bar sized by cardsDone,
 * tinted by that day's accuracy, with minutes on hover/title. Simple, dense,
 * no chart library — just divs.
 */
function ActivityBars({ profile }: { profile: ProfileId }) {
  const attempts = useProgressStore((s) => s.profiles[profile].attempts)
  const completedCards = useProgressStore((s) => s.profiles[profile].completedCards)

  const rows = useMemo(
    () => dailyActivity(attempts, completedCards, ACTIVITY_DAYS, todayISO()),
    [attempts, completedCards],
  )
  const maxCards = Math.max(1, ...rows.map((r) => r.cardsDone))

  const barColor = (accuracy: number | null): string => {
    if (accuracy === null) return 'rgba(30,58,95,.18)'
    if (accuracy >= 0.8) return '#4fae6d'
    if (accuracy >= 0.6) return '#e8a13c'
    return '#d76b57'
  }

  return (
    <div>
      <div className="flex items-end justify-between gap-1" style={{ height: 96 }}>
        {rows.map((r) => {
          const h = r.cardsDone === 0 ? 4 : Math.round((r.cardsDone / maxCards) * 88) + 8
          const day = Number(r.dateISO.slice(-2))
          return (
            <div key={r.dateISO} className="flex flex-1 flex-col items-center justify-end gap-1">
              <div
                className="w-full rounded-t-md"
                style={{ height: h, background: barColor(r.accuracy), minWidth: 6 }}
                title={`${r.dateISO} · ${r.cardsDone} tarjetas · ${r.minutes} min · ${
                  r.accuracy === null ? 'sin nota' : Math.round(r.accuracy * 100) + '%'
                }`}
              />
              <span className="text-[10px] font-semibold" style={{ color: 'var(--ink-soft)' }}>
                {day}
              </span>
            </div>
          )
        })}
      </div>
      <div className="mt-3 flex items-center gap-4 text-[11px] font-semibold" style={{ color: 'var(--ink-soft)' }}>
        <span className="flex items-center gap-1">
          <span className="h-2.5 w-2.5 rounded-sm" style={{ background: '#4fae6d' }} /> ≥80%
        </span>
        <span className="flex items-center gap-1">
          <span className="h-2.5 w-2.5 rounded-sm" style={{ background: '#e8a13c' }} /> 60-80%
        </span>
        <span className="flex items-center gap-1">
          <span className="h-2.5 w-2.5 rounded-sm" style={{ background: '#d76b57' }} /> &lt;60%
        </span>
        <span className="ml-auto">altura = tarjetas / día</span>
      </div>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section
      className="p-5"
      style={{ background: 'var(--card)', borderRadius: 'var(--r-card)', boxShadow: '0 6px 18px rgba(184,140,120,.12)' }}
    >
      <h3 className="mb-4 text-sm font-extrabold uppercase tracking-wide" style={{ color: 'var(--ink-soft)' }}>
        {title}
      </h3>
      {children}
    </section>
  )
}

export function Dashboard({ profile }: { profile: ProfileId }) {
  const progress = useProgressStore((s) => s.profiles[profile])
  const skillIds = Object.keys(CATALOG[profile].skills) as SkillId[]
  const meta = SKILL_META[profile] as Record<string, { name: string; emoji: string }>

  const totalExercises = progress.attempts.length

  return (
    <div className="flex flex-col gap-5">
      <Section title="Últimos 14 días">
        <ActivityBars profile={profile} />
      </Section>

      <div className="grid grid-cols-3 gap-3">
        <StatChip emoji="🔥" label="Racha" value={String(progress.streak.count)} />
        <StatChip emoji="💎" label="Gemas" value={String(progress.coins)} />
        <StatChip emoji="✅" label="Ejercicios" value={String(totalExercises)} />
      </div>

      <Section title="Gemas por habilidad">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {skillIds.map((skillId) => {
            const gem = progress.gems[skillId]
            const level = gem?.level ?? 0
            const visual = gemVisual(level)
            return (
              <div
                key={skillId}
                className="flex items-center gap-3 rounded-2xl px-3 py-2.5"
                style={{ background: 'var(--bg)' }}
              >
                <span aria-hidden className="text-2xl">
                  {visual.emoji}
                </span>
                <div className="min-w-0">
                  <div className="truncate text-sm font-bold" style={{ color: 'var(--ink)' }}>
                    {meta[skillId]?.name ?? skillId}
                  </div>
                  <div className="text-xs font-semibold" style={{ color: 'var(--ink-soft)' }}>
                    {visual.name}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </Section>
    </div>
  )
}
