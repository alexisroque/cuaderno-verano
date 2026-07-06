import type { Streak } from '../types/progress'
import { daysBetween } from '../lib/dates'

const MAX_GRACE_PER_WINDOW = 2
const GRACE_RESET_CONSECUTIVE_REAL_DAYS = 7

/** count -> bonus coins, checked in descending order so the highest crossed milestone wins. */
const MILESTONES: Array<{ count: number; coins: number }> = [
  { count: 30, coins: 50 },
  { count: 14, coins: 20 },
  { count: 7, coins: 10 },
  { count: 3, coins: 5 },
]

export interface AdvanceStreakResult {
  streak: Streak
  bonusCoins: number
}

function bonusForCrossing(previousCount: number, newCount: number): number {
  for (const { count, coins } of MILESTONES) {
    if (previousCount < count && newCount >= count) {
      return coins
    }
  }
  return 0
}

/**
 * Advances a daily-use streak given whether the child completed at least
 * one card today. Pure and side-effect free; returns numbers only (no
 * copy/messaging — that belongs to the UI layer).
 *
 * Semantics (documented since "tolerant streak" leaves some choices open):
 * - No completion today: the streak is untouched and no bonus is awarded.
 *   A lapse is only evaluated the next time the child *does* complete
 *   something (see below), not proactively on a day with no activity.
 * - First-ever completion (`lastDayISO === ''`): starts the streak at 1.
 * - Same-day re-completion (gap 0): no-op, returns the streak unchanged
 *   (calling this multiple times on the same day is safe/idempotent).
 * - Consecutive day (gap 1): streak continues, `count += 1`.
 * - Lapsed by `gap - 1` missed days (gap >= 2): if the missed days fit
 *   within the remaining grace budget (`MAX_GRACE_PER_WINDOW` minus
 *   `graceUsed`), the streak survives — `count += 1`, `graceUsed` grows by
 *   the missed days. Otherwise the streak resets: `count = 1`,
 *   `graceUsed = 0`.
 * - Grace budget reset: `graceUsed` resets to 0 as soon as the streak
 *   reaches a multiple of `GRACE_RESET_CONSECUTIVE_REAL_DAYS` (7) consecutive real
 *   (non-lapsed) days, i.e. on a gap-1 extension where the new count is a
 *   multiple of 7. This is the "rolling 7 days" window in effect: earning
 *   a full clean week of real streak days refills the grace budget.
 * - Coin milestones: crossing (previousCount < threshold <= newCount) any
 *   of 3/7/14/30 awards 5/10/20/50 coins respectively (highest one
 *   crossed wins; a reset never awards a bonus since newCount is always 1).
 */
export function advanceStreak(streak: Streak, dateISO: string, completedToday: boolean): AdvanceStreakResult {
  if (!completedToday) {
    return { streak, bonusCoins: 0 }
  }

  if (streak.lastDayISO === '') {
    return {
      streak: { count: 1, lastDayISO: dateISO, graceUsed: 0 },
      bonusCoins: 0,
    }
  }

  const gap = daysBetween(streak.lastDayISO, dateISO)

  if (gap === 0) {
    return { streak, bonusCoins: 0 }
  }

  if (gap === 1) {
    const newCount = streak.count + 1
    const graceUsed = newCount % GRACE_RESET_CONSECUTIVE_REAL_DAYS === 0 ? 0 : streak.graceUsed
    return {
      streak: { count: newCount, lastDayISO: dateISO, graceUsed },
      bonusCoins: bonusForCrossing(streak.count, newCount),
    }
  }

  const missedDays = gap - 1
  const graceRemaining = MAX_GRACE_PER_WINDOW - streak.graceUsed

  if (missedDays <= graceRemaining) {
    const newCount = streak.count + 1
    return {
      streak: { count: newCount, lastDayISO: dateISO, graceUsed: streak.graceUsed + missedDays },
      bonusCoins: bonusForCrossing(streak.count, newCount),
    }
  }

  return {
    streak: { count: 1, lastDayISO: dateISO, graceUsed: 0 },
    bonusCoins: 0,
  }
}
