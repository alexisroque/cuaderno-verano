import type { Attempt, GemState } from '../types/progress'
import type { ProfileId } from '../state/profileStore'
import type { SkillId } from './skills'
import { subskillsForSkill } from './skills'

const WINDOW_SIZE = 20
const ACCURACY_THRESHOLD = 0.8
const MIN_QUALIFYING_VOLUME = 12
export const MAX_LEVEL = 6

/** Gem level names, indexed by level number (0 = unseen/Piedra, 6 = mastered/Ópalo). */
export const LEVELS = ['piedra', 'cuarzo', 'ambar', 'esmeralda', 'rubi', 'diamante', 'opalo'] as const

export type GemLevelName = (typeof LEVELS)[number]

interface GemVisual {
  emoji: string
  name: string
}

const VISUALS: Record<number, GemVisual> = {
  0: { emoji: '⚪', name: 'Piedra' },
  1: { emoji: '🔹', name: 'Cuarzo' },
  2: { emoji: '🟠', name: 'Ámbar' },
  3: { emoji: '🟢', name: 'Esmeralda' },
  4: { emoji: '🔴', name: 'Rubí' },
  5: { emoji: '💎', name: 'Diamante' },
  6: { emoji: '🌈', name: 'Ópalo' },
}

/** Emoji + Spanish display name for a gem level. */
export function gemVisual(level: number): GemVisual {
  return VISUALS[level]
}

/**
 * Minimum attempt difficulty required to count toward the volume
 * requirement for leveling up *into* `level`. Only defined for levels 1-6
 * (there's no floor "into" piedra, level 0, since every child starts there).
 */
const LEVEL_FLOORS: Record<number, number> = {
  1: 1, // cuarzo
  2: 1, // ambar
  3: 2, // esmeralda
  4: 3, // rubi
  5: 4, // diamante
  6: 5, // opalo
}

export function levelFloor(level: number): number {
  return LEVEL_FLOORS[level]
}

export interface LevelUpEvent {
  leveledUp: true
  newLevel: number
  skillId: SkillId
}

/**
 * Scores one attempt for level-up purposes: identical to the mastery
 * scoring rule (correct-no-hints = 1, correct-with-hints = 0.5, wrong = 0).
 * Skills with no correctness signal (escritura/diario) are not
 * special-cased here: their player records every attempt as `correct:
 * true` by construction, so they naturally score 1 per attempt and this
 * function needs no branch for them.
 */
function scoreAttempt(attempt: Attempt): number {
  if (!attempt.correct) return 0
  return attempt.hintsUsed > 0 ? 0.5 : 1
}

/** The most recent `WINDOW_SIZE` attempts across every subskill belonging to `skillId`, in array order. */
function skillPooledWindow(attempts: Attempt[], skillId: SkillId, profile: ProfileId): Attempt[] {
  const subskillIds = new Set(subskillsForSkill(profile, skillId).map((s) => s.id))
  const relevant = attempts.filter((a) => subskillIds.has(a.subskill))
  return relevant.slice(-WINDOW_SIZE)
}

function accuracy(window: Attempt[]): number {
  if (window.length === 0) return 0
  return window.reduce((sum, a) => sum + scoreAttempt(a), 0) / window.length
}

function qualifyingVolume(window: Attempt[], floor: number): number {
  return window.filter((a) => a.difficulty >= floor).length
}

/**
 * Checks whether `gem` should level up, given the attempt history pooled
 * across every subskill of `skillId`. Requires BOTH:
 * (a) >= 80% accuracy over the last 20 pooled attempts, AND
 * (b) >= 12 of those attempts recorded at difficulty >= levelFloor(level+1).
 *
 * Never levels down or skips levels: returns either a single-level-up event
 * or null (caller keeps the existing level on null). Already-max (Ópalo)
 * gems always return null.
 */
export function checkLevelUp(
  gem: GemState,
  attempts: Attempt[],
  skillId: SkillId,
  profile: ProfileId,
): LevelUpEvent | null {
  if (gem.level >= MAX_LEVEL) return null

  const window = skillPooledWindow(attempts, skillId, profile)
  const nextLevel = gem.level + 1
  const floor = levelFloor(nextLevel)

  const meetsAccuracy = accuracy(window) >= ACCURACY_THRESHOLD
  const meetsVolume = qualifyingVolume(window, floor) >= MIN_QUALIFYING_VOLUME

  if (meetsAccuracy && meetsVolume) {
    return { leveledUp: true, newLevel: nextLevel, skillId }
  }
  return null
}

/**
 * Fraction (0-1) of progress toward the next level, blending accuracy and
 * volume: `min(accuracyRatio, volumeRatio)` where `accuracyRatio` is
 * accuracy/0.8 (capped at 1) and `volumeRatio` is qualifying-attempts/12
 * (capped at 1). Ópalo (max level) always reports 1.
 */
export function gemProgress(gem: GemState, attempts: Attempt[], skillId: SkillId, profile: ProfileId): number {
  if (gem.level >= MAX_LEVEL) return 1

  const window = skillPooledWindow(attempts, skillId, profile)
  const nextLevel = gem.level + 1
  const floor = levelFloor(nextLevel)

  const accuracyRatio = Math.min(1, accuracy(window) / ACCURACY_THRESHOLD)
  const volumeRatio = Math.min(1, qualifyingVolume(window, floor) / MIN_QUALIFYING_VOLUME)

  return Math.min(accuracyRatio, volumeRatio)
}
