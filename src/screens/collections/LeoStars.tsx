import { useProgressStore } from '../../state/progressStore'
import { SKILL_META, type LeoSkillId } from '../../engine/skills'
import { MAX_LEVEL } from '../../engine/gems'
import { SpeakButton } from '../../components/ui/SpeakButton'

/**
 * Leo's simplified gem view for the collection screen: each skill as a big
 * star meter (gem level → 1-5 stars), audio-labelled so a non-reader can hear
 * which gem is which. Mirrors the TodayLeo strip but larger/standalone.
 */
export function LeoStars() {
  const gems = useProgressStore((s) => s.profiles.leo.gems)
  const skills = Object.entries(SKILL_META.leo) as [LeoSkillId, { name: string; emoji: string }][]

  return (
    <div className="grid grid-cols-2 gap-3">
      {skills.map(([id, meta]) => {
        const level = gems[id]?.level ?? 0
        const stars = Math.max(1, Math.round((level / MAX_LEVEL) * 5))
        return (
          <div
            key={id}
            className="flex flex-col items-center rounded-3xl p-4 text-center"
            style={{ background: 'var(--card)', boxShadow: '0 2px 6px rgba(0,0,0,.08)' }}
          >
            <div className="text-5xl" aria-hidden>
              {meta.emoji}
            </div>
            <div className="mt-1 text-base font-black">{meta.name}</div>
            <div className="mt-1 text-lg" aria-label={`${meta.name}: ${stars} de 5 estrellas`}>
              {'⭐'.repeat(stars)}
              <span style={{ opacity: 0.25 }}>{'⭐'.repeat(5 - stars)}</span>
            </div>
            <span className="mt-2">
              <SpeakButton text={`${meta.name}. ${stars} estrellas.`} size="md" tone="sky" />
            </span>
          </div>
        )
      })}
    </div>
  )
}
