import { useProgressStore } from '../../state/progressStore'
import { todayISO } from '../../lib/clock'
import type { ProfileId } from '../../state/profileStore'
import { refreshGemsAndDetectLevelUp } from './rewards'

/**
 * Records one lightning-round mental-calc answer as a `calculo` attempt and
 * refreshes gems. Kept as a plain function so LightningRound (which renders
 * its own timer/score UI) can call it per answer without a level-up overlay
 * mid-timer — the level-up will simply reflect on the gem cabinet afterwards.
 */
export function recordLightning(profile: ProfileId, subskill: string, correct: boolean, difficulty: number): void {
  useProgressStore.getState().recordAttempt(profile, {
    dateISO: todayISO(),
    cardType: 'entrenamiento',
    subskill,
    correct,
    hintsUsed: 0,
    ms: 0,
    difficulty,
  })
  refreshGemsAndDetectLevelUp(profile)
}
