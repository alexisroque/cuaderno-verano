import { useMemo, useState } from 'react'
import type { ProfileId } from '../../state/profileStore'
import { useProgressStore } from '../../state/progressStore'
import { subskillStats, type SubskillStat } from '../../engine/analytics'
import {
  CATALOG,
  SKILL_META,
  subskillLabel,
  type SkillId,
  type SubskillDef,
} from '../../engine/skills'
import { SubskillDetail } from './SubskillDetail'

/** Accuracy → traffic-light color + dot. Untouched subskills read "sin datos". */
function accuracyColor(accuracy: number): { bg: string; fg: string; dot: string } {
  if (accuracy >= 0.8) return { bg: '#e4f3e7', fg: '#2f6d42', dot: '🟢' }
  if (accuracy >= 0.6) return { bg: '#fbeed6', fg: '#9a6a1c', dot: '🟠' }
  return { bg: '#fbe3dd', fg: '#a5402c', dot: '🔴' }
}

interface Cell {
  def: SubskillDef
  stat: SubskillStat | undefined
}

/**
 * Per-skill grid of subskill tiles colored by accuracy (🔴 <60% / 🟠 60-80% /
 * 🟢 ≥80%) with the sample volume, or "sin datos" when untouched. Tapping a
 * tile opens its control detail (reinforce / difficulty), which writes to the
 * settings store. Stats use an all-time window here so a rarely-practised
 * weakness still shows; the dashboard covers the recent trend.
 */
export function Heatmap({ profile }: { profile: ProfileId }) {
  const attempts = useProgressStore((s) => s.profiles[profile].attempts)
  const [selected, setSelected] = useState<SubskillDef | null>(null)

  const statById = useMemo(() => {
    const map = new Map<string, SubskillStat>()
    for (const s of subskillStats(attempts, profile)) map.set(s.subskillId, s)
    return map
  }, [attempts, profile])

  const skillIds = Object.keys(CATALOG[profile].skills) as SkillId[]
  const meta = SKILL_META[profile] as Record<string, { name: string; emoji: string }>

  return (
    <div className="flex flex-col gap-5">
      <p className="text-sm" style={{ color: 'var(--ink-soft)' }}>
        Cada casilla es un subtema. El color muestra el acierto; el número, cuántas
        veces se ha practicado. Toca una casilla para reforzarla o ajustar su dificultad.
      </p>

      {skillIds.map((skillId) => {
        const defs = Object.values(CATALOG[profile].skills[skillId as keyof (typeof CATALOG)[typeof profile]['skills']].subskills) as SubskillDef[]
        const cells: Cell[] = defs.map((def) => ({ def, stat: statById.get(def.id) }))
        return (
          <section
            key={skillId}
            className="p-5"
            style={{
              background: 'var(--card)',
              borderRadius: 'var(--r-card)',
              boxShadow: '0 6px 18px rgba(184,140,120,.12)',
            }}
          >
            <h3 className="mb-3 flex items-center gap-2 text-base font-extrabold" style={{ color: 'var(--ink)' }}>
              <span aria-hidden>{meta[skillId]?.emoji}</span>
              {meta[skillId]?.name ?? skillId}
            </h3>
            <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
              {cells.map(({ def, stat }) => {
                const hasData = !!stat && stat.volume > 0
                const color = hasData ? accuracyColor(stat!.accuracy) : null
                return (
                  <button
                    key={def.id}
                    type="button"
                    onClick={() => setSelected(def)}
                    className="flex min-h-[64px] flex-col items-start justify-between rounded-2xl px-3 py-2.5 text-left transition-transform active:translate-y-[1px] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[var(--navy)]"
                    style={{
                      background: color ? color.bg : 'var(--bg)',
                      color: color ? color.fg : 'var(--ink-soft)',
                    }}
                  >
                    <span className="flex w-full items-center justify-between gap-1 text-sm font-bold leading-tight">
                      <span className="line-clamp-2">
                        {subskillLabel(def.id)}
                        {def.challenge ? ' 🚀' : ''}
                      </span>
                    </span>
                    <span className="mt-1 text-xs font-semibold">
                      {hasData ? (
                        <>
                          {color!.dot} {Math.round(stat!.accuracy * 100)}%{' '}
                          <span style={{ opacity: 0.75 }}>· {stat!.volume}×</span>
                        </>
                      ) : (
                        'sin datos'
                      )}
                    </span>
                  </button>
                )
              })}
            </div>
          </section>
        )
      })}

      <SubskillDetail
        profile={profile}
        def={selected}
        stat={selected ? statById.get(selected.id) : undefined}
        onClose={() => setSelected(null)}
      />
    </div>
  )
}
