import { useProgressStore } from '../../state/progressStore'
import { todayISO } from '../../lib/clock'
import type { ProfileId } from '../../state/profileStore'
import type { MapItem } from './mapItems'

/**
 * Records one answered map exercise as an Attempt against its geografia subskill
 * (donde-esta / capitales / banderas). Kept a plain function (not a hook) so the
 * daily MapPlayer route and the free-training loop can both call it per answer.
 */
export function recordMapAttempt(profile: ProfileId, item: MapItem, correct: boolean, startedAtMs: number): void {
  useProgressStore.getState().recordAttempt(profile, {
    dateISO: todayISO(),
    cardType: 'quiz',
    subskill: item.subskill,
    correct,
    hintsUsed: 0,
    ms: Date.now() - startedAtMs,
    difficulty: 2,
  })
}
