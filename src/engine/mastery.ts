import type { Attempt } from '../types/progress'
import type { SubskillDef, SubskillId } from './skills'

const WINDOW_SIZE = 20
const JUDGE_WINDOW_SIZE = 10
const RISE_THRESHOLD = 0.85
const DROP_THRESHOLD = 0.6
const MIN_JUDGE_SAMPLES = 3

/**
 * Scores one attempt for mastery purposes: a correct attempt with no hints
 * is worth 1, a correct attempt that used hints is worth 0.5 (it didn't
 * demonstrate independent mastery), and a wrong attempt is worth 0.
 */
function scoreAttempt(attempt: Attempt): number {
  if (!attempt.correct) return 0
  return attempt.hintsUsed > 0 ? 0.5 : 1
}

function average(scores: number[]): number {
  return scores.reduce((sum, s) => sum + s, 0) / scores.length
}

/** Attempts for `subskillId`, in original (chronological) array order. */
function attemptsForSubskill(attempts: Attempt[], subskillId: SubskillId): Attempt[] {
  return attempts.filter((a) => a.subskill === subskillId)
}

/**
 * Mastery accuracy for a subskill, over the most recent 20 attempts (fewer
 * is fine). A correct attempt with hints counts as 0.5; wrong counts as 0.
 * "Most recent" follows array order — attempts are expected to be appended
 * chronologically, so this is a trailing window, not a sort by dateISO.
 * Returns undefined ("no data") when there are zero attempts for the subskill.
 */
export function masteryFor(attempts: Attempt[], subskillId: SubskillId): number | undefined {
  const relevant = attemptsForSubskill(attempts, subskillId)
  if (relevant.length === 0) return undefined

  const window = relevant.slice(-WINDOW_SIZE)
  return average(window.map(scoreAttempt))
}

function clamp(value: number, [min, max]: [number, number]): number {
  return Math.min(max, Math.max(min, value))
}

/**
 * Suggests the next difficulty level (within `subskillDef.difficultyRange`)
 * to serve for this subskill, given the attempt history.
 *
 * Semantics (documented since the calibration is open to interpretation):
 * - With no attempts for the subskill, start at `difficultyRange[0]`.
 * - Otherwise, the "current level" is the difficulty of the most recent
 *   attempt for this subskill, clamped into `difficultyRange` (in case
 *   stale/out-of-range data was recorded before the range changed).
 * - The "judge window" is the last `JUDGE_WINDOW_SIZE` attempts for this
 *   subskill whose `difficulty` equals the current level (in array/
 *   chronological order, ignoring attempts recorded at other levels).
 * - Accuracy over the judge window (same 1 / 0.5 / 0 scoring as
 *   `masteryFor`) >= 85% rises one level (capped at the range max);
 *   < 60% drops one level (floored at the range min); otherwise the level
 *   is unchanged.
 * - Minimum-samples guard: if the judge window has fewer than
 *   `MIN_JUDGE_SAMPLES` attempts, there isn't enough signal to move the
 *   level either way, so the level stays put. This covers the empty-window
 *   case (which can only happen with zero attempts, handled above) and
 *   also low-sample windows (1-2 attempts) that would otherwise let a
 *   single lucky/unlucky answer swing the difficulty.
 */
export function suggestedDifficulty(attempts: Attempt[], subskillDef: SubskillDef): number {
  const { difficultyRange } = subskillDef
  const relevant = attemptsForSubskill(attempts, subskillDef.id)

  if (relevant.length === 0) {
    return difficultyRange[0]
  }

  const currentLevel = clamp(relevant[relevant.length - 1].difficulty, difficultyRange)

  const atCurrentLevel = relevant.filter((a) => a.difficulty === currentLevel)
  const judgeWindow = atCurrentLevel.slice(-JUDGE_WINDOW_SIZE)

  if (judgeWindow.length < MIN_JUDGE_SAMPLES) {
    return currentLevel
  }

  const accuracy = average(judgeWindow.map(scoreAttempt))

  if (accuracy >= RISE_THRESHOLD) {
    return clamp(currentLevel + 1, difficultyRange)
  }
  if (accuracy < DROP_THRESHOLD) {
    return clamp(currentLevel - 1, difficultyRange)
  }
  return currentLevel
}
