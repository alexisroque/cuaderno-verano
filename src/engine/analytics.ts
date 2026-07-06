import type { Attempt } from '../types/progress'
import type { ProfileId } from '../state/profileStore'
import type { SkillId, SubskillId } from './skills'
import { skillOfSubskill } from './skills'
import { addDays } from '../lib/dates'

/**
 * Pure, UI-free analytics over a profile's `Attempt[]` (and its
 * `completedCards`), for the parent panel. Nothing here reads the clock:
 * callers pass `todayISO` / windows explicitly so the functions stay
 * deterministic and testable.
 *
 * Accuracy everywhere is the same hint-aware rule the mastery engine uses:
 * a correct answer with no hints is worth 1, correct-but-hinted is worth
 * 0.5 (it didn't demonstrate independent mastery), wrong is 0.
 */

/** Hint-aware score for one attempt: 1 clean, 0.5 hinted-correct, 0 wrong. */
function scoreAttempt(attempt: Attempt): number {
  if (!attempt.correct) return 0
  return attempt.hintsUsed > 0 ? 0.5 : 1
}

/** Per-subskill rollup shown in the heatmap and weakness list. */
export interface SubskillStat {
  subskillId: SubskillId
  skill: SkillId
  /** Hint-aware accuracy 0-1 over the window (or all time). */
  accuracy: number
  /** Number of attempts counted. */
  volume: number
  /** Most recent attempt date (YYYY-MM-DD) counted, or '' if none. */
  lastSeen: string
}

export interface StatsWindow {
  /** End of the inclusive window (defaults to no window: all time). */
  todayISO?: string
  /** Window length in days back from `todayISO`. Omit for all-time. */
  days?: number
}

/**
 * Keeps only attempts on or after `todayISO - (days - 1)` (an inclusive
 * `days`-long window ending today). With no window, returns the input.
 */
function withinWindow(attempts: Attempt[], window: StatsWindow): Attempt[] {
  if (window.todayISO === undefined || window.days === undefined) return attempts
  const from = addDays(window.todayISO, -(window.days - 1))
  return attempts.filter((a) => a.dateISO >= from && a.dateISO <= window.todayISO!)
}

/**
 * Accuracy and volume per subskill for `profile`, over an optional trailing
 * window (all-time when omitted). Subskills with no attempts in range are
 * omitted; attempts whose subskill isn't in the profile catalog are dropped.
 * Sorted by accuracy ascending (weakest first), then volume descending.
 */
export function subskillStats(
  attempts: Attempt[],
  profile: ProfileId,
  window: StatsWindow = {},
): SubskillStat[] {
  const scoped = withinWindow(attempts, window)

  interface Acc {
    skill: SkillId
    scoreSum: number
    volume: number
    lastSeen: string
  }
  const byId = new Map<SubskillId, Acc>()

  for (const a of scoped) {
    const skill = skillOfSubskill(profile, a.subskill)
    if (!skill) continue // stale/foreign subskill: ignore
    const acc = byId.get(a.subskill) ?? { skill, scoreSum: 0, volume: 0, lastSeen: '' }
    acc.scoreSum += scoreAttempt(a)
    acc.volume += 1
    if (a.dateISO > acc.lastSeen) acc.lastSeen = a.dateISO
    byId.set(a.subskill, acc)
  }

  const stats: SubskillStat[] = [...byId.entries()].map(([subskillId, acc]) => ({
    subskillId,
    skill: acc.skill,
    accuracy: acc.volume === 0 ? 0 : acc.scoreSum / acc.volume,
    volume: acc.volume,
    lastSeen: acc.lastSeen,
  }))

  stats.sort((a, b) => a.accuracy - b.accuracy || b.volume - a.volume)
  return stats
}

/** One day's rollup for the activity sparkline/bars. */
export interface DailyActivity {
  dateISO: string
  /** Cards finished that day (from completedCards, includes non-graded). */
  cardsDone: number
  /** Estimated active minutes that day (attempt ms summed, per-attempt clamped). */
  minutes: number
  /** Hint-aware accuracy of graded attempts that day, or null if none. */
  accuracy: number | null
}

/**
 * Per-attempt time cap: a single answer never counts as more than 5 minutes
 * of active time, so an attempt left open in a backgrounded tab (huge ms)
 * doesn't inflate the daily minutes total.
 */
const MAX_ATTEMPT_MS = 5 * 60 * 1000

/**
 * Day-by-day activity for the last `days` days ending on `todayISO`
 * (chronological, oldest first, one row per calendar day even when empty).
 * `minutes` sums each attempt's clamped `ms`; `accuracy` is hint-aware over
 * that day's graded attempts (null when there were none); `cardsDone` reads
 * `completedCards[dateISO].length`.
 */
export function dailyActivity(
  attempts: Attempt[],
  completedCards: Record<string, string[]>,
  days: number,
  todayISO: string,
): DailyActivity[] {
  interface DayAcc {
    ms: number
    scoreSum: number
    graded: number
  }
  const byDay = new Map<string, DayAcc>()
  for (const a of attempts) {
    const acc = byDay.get(a.dateISO) ?? { ms: 0, scoreSum: 0, graded: 0 }
    acc.ms += Math.min(a.ms, MAX_ATTEMPT_MS)
    acc.scoreSum += scoreAttempt(a)
    acc.graded += 1
    byDay.set(a.dateISO, acc)
  }

  const rows: DailyActivity[] = []
  for (let i = days - 1; i >= 0; i--) {
    const dateISO = addDays(todayISO, -i)
    const acc = byDay.get(dateISO)
    rows.push({
      dateISO,
      cardsDone: completedCards[dateISO]?.length ?? 0,
      minutes: acc ? Math.round(acc.ms / 60000) : 0,
      accuracy: acc && acc.graded > 0 ? acc.scoreSum / acc.graded : null,
    })
  }
  return rows
}

/**
 * The `n` weakest subskills for `profile` (lowest accuracy first, ties broken
 * by higher volume so a broadly-sampled weakness outranks a one-off), over an
 * optional window. Only subskills with data are considered, so the result may
 * be shorter than `n`.
 */
export function weakestSubskills(
  attempts: Attempt[],
  profile: ProfileId,
  n: number,
  window: StatsWindow = {},
): SubskillStat[] {
  // subskillStats already sorts weakest-first with the same tiebreak.
  return subskillStats(attempts, profile, window).slice(0, n)
}
