import { useProgressStore } from '../../state/progressStore'
import type { ProfileId } from '../../state/profileStore'
import type { GemState } from '../../types/progress'
import { CATALOG, type SkillId } from '../../engine/skills'
import { checkLevelUp, gemProgress, type LevelUpEvent } from '../../engine/gems'

/**
 * Coin economy (spec §5.8 consolidation).
 * Every completed daily card awards a flat CARD_COINS (5). A completed
 * CHALLENGE card (the 🚀 desafío variant) awards a small bonus so harder work
 * pays a bit more. This is the single source of truth — all players call
 * `awardCardCoins` instead of hardcoding `addCoins(profile, 5)`, so the economy
 * stays consistent (previously ProblemPlayer awarded nothing while others gave 5).
 */
export const CARD_COINS = 5
export const CHALLENGE_BONUS_COINS = 3

/** Coins for finishing one daily card, with a bonus for challenge cards. */
export function coinsForCard(challenge?: boolean): number {
  return CARD_COINS + (challenge ? CHALLENGE_BONUS_COINS : 0)
}

/** Awards coins for a completed daily card (challenge cards pay a small bonus). */
export function awardCardCoins(profile: ProfileId, challenge?: boolean): void {
  useProgressStore.getState().addCoins(profile, coinsForCard(challenge))
}

/** The skill ids owned by `profile`, from the catalog. */
function skillIdsFor(profile: ProfileId): SkillId[] {
  return Object.keys(CATALOG[profile].skills) as SkillId[]
}

/**
 * Recomputes every gem for `profile` from its attempt history: refreshes each
 * gem's `progress` fraction and, if a gem qualifies to level up, steps it up
 * (persisting via setGem). Returns the FIRST level-up event detected (so the
 * caller can show one GemLevelUp takeover), or null. Idempotent given the same
 * attempts: once a gem is at the qualified level, `checkLevelUp` returns null.
 *
 * Called by every player right after it records an attempt, so gems actually
 * move (nothing else in the app writes gem levels).
 */
export function refreshGemsAndDetectLevelUp(profile: ProfileId): (LevelUpEvent & { fromLevel: number }) | null {
  const store = useProgressStore.getState()
  const { attempts, gems } = store.profiles[profile]
  let firstEvent: (LevelUpEvent & { fromLevel: number }) | null = null

  for (const skillId of skillIdsFor(profile)) {
    const current: GemState = gems[skillId] ?? { skillId, level: 0, progress: 0 }
    const event = checkLevelUp(current, attempts, skillId, profile)
    if (event && !firstEvent) {
      firstEvent = { ...event, fromLevel: current.level }
      const progress = gemProgress({ ...current, level: event.newLevel }, attempts, skillId, profile)
      store.setGem(profile, skillId, event.newLevel, progress)
    } else {
      const progress = gemProgress(current, attempts, skillId, profile)
      if (progress !== current.progress || !gems[skillId]) {
        store.setGem(profile, skillId, current.level, progress)
      }
    }
  }

  return firstEvent
}
