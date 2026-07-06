import { useProgressStore } from '../../state/progressStore'
import type { ProfileId } from '../../state/profileStore'
import { SKILL_META, type SkillId } from '../../engine/skills'
import { gemVisual, gemProgress, MAX_LEVEL } from '../../engine/gems'
import type { GemState } from '../../types/progress'

/**
 * The gem cabinet (§5.8): every skill's current gem — emoji, level name and a
 * progress ring toward the next level (gemProgress). The single weakest gem
 * pulses gently with a "juégame" hint, nudging the child to balance skills
 * (the "Cálculo diamante, Ortografía cacahuete" story from the mockup).
 */
export function GemCabinet({ profile }: { profile: ProfileId }) {
  const progress = useProgressStore((s) => s.profiles[profile])
  const skills = Object.entries(SKILL_META[profile]) as [SkillId, { name: string; emoji: string }][]

  // Weakest gem = lowest level, tie-broken by lowest progress.
  const weakest = skills
    .map(([id]) => ({ id, gem: progress.gems[id] }))
    .sort((a, b) => (a.gem?.level ?? 0) - (b.gem?.level ?? 0) || (a.gem?.progress ?? 0) - (b.gem?.progress ?? 0))[0]?.id

  return (
    <div>
      <h3 className="mb-3 text-sm font-black uppercase tracking-wide" style={{ color: 'var(--ink-soft)' }}>
        Mi vitrina de gemas
      </h3>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {skills.map(([id, meta]) => {
          const gem: GemState = progress.gems[id] ?? { skillId: id, level: 0, progress: 0 }
          const visual = gemVisual(gem.level)
          const ring = gem.level >= MAX_LEVEL ? 1 : gemProgress(gem, progress.attempts, id, profile)
          const isWeakest = id === weakest
          return (
            <div
              key={id}
              className="relative rounded-3xl p-3 text-center"
              style={{
                background: 'var(--card)',
                boxShadow: isWeakest ? '0 0 0 2px var(--peach)' : '0 1px 4px rgba(184,140,120,.14)',
                animation: isWeakest ? 'gem-pulse 2.2s ease-in-out infinite' : undefined,
              }}
            >
              <GemRing progress={ring} emoji={visual.emoji} />
              <div className="mt-1.5 text-xs font-black" style={{ color: 'var(--ink)' }}>
                {meta.name}
              </div>
              <div className="text-[10px]" style={{ color: 'var(--ink-soft)' }}>
                {visual.name}
              </div>
              {isWeakest && (
                <div className="mt-1 text-[10px] font-bold" style={{ color: '#c26a4c' }}>
                  ¡juega conmigo!
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

/** A conic progress ring around the gem emoji. */
function GemRing({ progress, emoji }: { progress: number; emoji: string }) {
  const pct = Math.round(progress * 100)
  return (
    <div
      className="mx-auto flex h-16 w-16 items-center justify-center rounded-full"
      style={{ background: `conic-gradient(var(--peach) ${pct}%, var(--peach-soft) ${pct}%)` }}
      aria-label={`${pct}% hacia la siguiente gema`}
    >
      <span className="flex h-12 w-12 items-center justify-center rounded-full text-2xl" style={{ background: 'var(--card)' }} aria-hidden>
        {emoji}
      </span>
    </div>
  )
}
