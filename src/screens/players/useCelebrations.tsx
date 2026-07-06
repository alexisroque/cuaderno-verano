import { useCallback, useState } from 'react'
import type { ProfileId } from '../../state/profileStore'
import { MangaBurst } from '../../components/celebrations/MangaBurst'
import { GemLevelUp } from '../../components/celebrations/GemLevelUp'
import { SKILL_META } from '../../engine/skills'
import { refreshGemsAndDetectLevelUp } from './rewards'

/** Probability a correct answer triggers a manga burst (not every time — §5.8). */
const BURST_CHANCE = 1 / 3

/**
 * Shared celebration seam for every player (§5.8). Returns:
 * - `overlays`: the MangaBurst / GemLevelUp elements to render once in the tree.
 * - `celebrateCorrect()`: call on a correct answer — sometimes pops a manga burst.
 * - `settleAttempt(profile)`: call AFTER an attempt is recorded — refreshes gems
 *   and, if a gem leveled up, shows the full-screen GemLevelUp takeover.
 *
 * Keeping this in one hook means the manga-at-reward-moments behavior is
 * consistent across ProblemPlayer, Counting, Reading, Quiz, etc.
 */
export function useCelebrations() {
  const [burstKey, setBurstKey] = useState<number | null>(null)
  const [levelUp, setLevelUp] = useState<{ from: number; to: number; skill: string } | null>(null)

  const celebrateCorrect = useCallback(() => {
    if (Math.random() < BURST_CHANCE) setBurstKey(Date.now())
  }, [])

  const settleAttempt = useCallback((profile: ProfileId) => {
    const event = refreshGemsAndDetectLevelUp(profile)
    if (event) {
      const meta = (SKILL_META[profile] as Record<string, { name: string }>)[event.skillId]
      setLevelUp({ from: event.fromLevel, to: event.newLevel, skill: meta?.name ?? event.skillId })
    }
  }, [])

  const overlays = (
    <>
      {burstKey !== null && <MangaBurst key={burstKey} />}
      {levelUp && (
        <GemLevelUp
          fromLevel={levelUp.from}
          toLevel={levelUp.to}
          skillName={levelUp.skill}
          onDismiss={() => setLevelUp(null)}
        />
      )}
    </>
  )

  return { overlays, celebrateCorrect, settleAttempt }
}
