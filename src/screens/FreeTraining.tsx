import { useMemo, useState } from 'react'
import { Shell } from '../components/Shell'
import { SpeakButton } from '../components/ui/SpeakButton'
import { useProfileStore } from '../state/profileStore'
import { useProgressStore } from '../state/progressStore'
import { useSettingsStore } from '../state/settingsStore'
import { SKILL_META, isSkillEnabled, type SkillId } from '../engine/skills'
import { composeDay } from '../engine/dayComposer'
import { getContentBundle } from '../content/loader'
import { currentChapter } from '../content/chapters'
import { todayISO } from '../lib/clock'
import { TrainingSession, hasUnlockedChallenge } from './TrainingSession'
import { LightningRound } from './players/LightningRound'
import { recordLightning } from './players/recordLightning'
import { MapTraining } from './players/MapTraining'

/**
 * "¿Quieres más?" free-training hub. Pick a gem (skill) → an endless training
 * session (TrainingSession) with a "ya está" exit. Leo sees his 4 big audio
 * tiles; Aira sees the full skill grid. When today's `relámpago` surprise is
 * active, a 60-second timed mental-calc mode is offered (Aira only).
 */
export function FreeTraining() {
  const profile = useProfileStore((s) => s.activeProfile) ?? 'aira'
  const leo = profile === 'leo'
  const chapter = currentChapter()

  const airaProgress = useProgressStore((s) => s.profiles.aira)
  const settings = useSettingsStore((s) => s.children[profile])
  const [skill, setSkill] = useState<SkillId | null>(null)
  const [lightning, setLightning] = useState(false)

  // Detect today's relámpago surprise (Aira only — mental arithmetic is 5º).
  const relampagoActive = useMemo(() => {
    if (leo) return false
    const day = composeDay(todayISO(), 'aira', airaProgress, getContentBundle(), settings, airaProgress.gems)
    return day.surprise?.kind === 'relampago'
  }, [leo, airaProgress, settings])

  const skillMeta = SKILL_META[profile] as Record<string, { name: string; emoji: string }>
  // Hide skills the parent turned off in "Módulos activos" so free training
  // matches the daily page. If every skill is disabled, show them all rather
  // than an empty grid (mirrors enabledSkillIds' all-off fallback).
  const allSkills = Object.entries(skillMeta) as [SkillId, { name: string; emoji: string }][]
  const enabled = allSkills.filter(([id]) => isSkillEnabled(settings.moduleToggles, id))
  const skills = enabled.length > 0 ? enabled : allSkills

  if (lightning) {
    return (
      <Shell>
        <div className="mx-auto max-w-md pt-2">
          <LightningRound
            chapter={chapter}
            onAnswer={(sub, ok, diff) => recordLightning(profile, sub, ok, diff)}
            onDone={() => setLightning(false)}
          />
          <button type="button" onClick={() => setLightning(false)} className="mt-4 w-full text-center text-sm font-bold" style={{ color: 'var(--ink-soft)' }}>
            ← Salir
          </button>
        </div>
      </Shell>
    )
  }

  if (skill) {
    return (
      <Shell>
        <div className={`mx-auto pt-2 ${skill === 'geografia' ? 'max-w-3xl' : 'max-w-md'}`}>
          <div className="mb-3 flex items-center gap-2">
            <span className="text-2xl" aria-hidden>
              {skillMeta[skill].emoji}
            </span>
            <h2 className="text-lg font-extrabold">{skillMeta[skill].name}</h2>
          </div>
          {skill === 'geografia' ? (
            <MapTraining profile={profile} onExit={() => setSkill(null)} />
          ) : (
            <TrainingSession profile={profile} skill={skill} chapter={chapter} leo={leo} onExit={() => setSkill(null)} />
          )}
        </div>
      </Shell>
    )
  }

  return (
    <Shell>
      <div className="mx-auto max-w-2xl pt-2">
        <h2 className="mb-1 text-lg font-extrabold">{leo ? '¿Quieres jugar más?' : 'Entrena la gema que tú elijas'}</h2>
        <p className="mb-4 text-sm" style={{ color: 'var(--ink-soft)' }}>
          {leo ? 'Toca una tarjeta.' : 'Sesión sin fin: para cuando quieras con «Ya está».'}
        </p>

        {relampagoActive && (
          <button
            type="button"
            onClick={() => setLightning(true)}
            className="mb-4 flex w-full items-center justify-between rounded-2xl px-4 py-3 text-left"
            style={{ background: 'var(--sun)', color: '#7a5c00' }}
          >
            <span className="text-sm font-black">⚡ ¡Ronda relámpago! 60 segundos de cálculo mental</span>
            <span aria-hidden>→</span>
          </button>
        )}

        <div className={leo ? 'grid grid-cols-2 gap-3' : 'grid grid-cols-2 gap-3 sm:grid-cols-4'}>
          {skills.map(([id, meta]) => {
            const challenge = hasUnlockedChallenge(profile, id)
            return (
              <div
                key={id}
                role="button"
                tabIndex={0}
                onClick={() => setSkill(id)}
                onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && setSkill(id)}
                className="relative flex cursor-pointer flex-col items-center rounded-3xl p-4 text-center transition-transform active:translate-y-[2px]"
                style={{ background: 'var(--card)', boxShadow: '0 2px 6px rgba(184,140,120,.16)', minHeight: leo ? 130 : 96 }}
              >
                {challenge && (
                  <span className="absolute right-2 top-2 rounded-lg px-1.5 py-0.5 text-[10px] font-black" style={{ background: 'var(--sky)', color: '#2f6690' }}>
                    🚀
                  </span>
                )}
                <span className={leo ? 'text-5xl' : 'text-3xl'} aria-hidden>
                  {meta.emoji}
                </span>
                <span className={leo ? 'mt-2 text-base font-black' : 'mt-1 text-sm font-black'}>{meta.name}</span>
                {leo && (
                  <span className="mt-1" onClick={(e) => e.stopPropagation()}>
                    <SpeakButton text={meta.name} size="md" tone="sky" />
                  </span>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </Shell>
  )
}
