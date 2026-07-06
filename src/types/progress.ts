/** A single answer to a learning card, used for adaptive difficulty and stats. */
export interface Attempt {
  dateISO: string
  cardType: string
  subskill: string
  correct: boolean
  hintsUsed: number
  ms: number
  difficulty: number
}

/** Mastery state for one skill "gem". Level ranges 0 (unseen) to 6 (mastered). */
export interface GemState {
  skillId: string
  level: number
  progress: number
}

/**
 * Daily-use streak tracking. `graceUsed` counts how many "grace" days
 * (missed days forgiven without resetting the streak) have been spent
 * since the last time the streak extended 7 consecutive real (non-grace)
 * days — see `src/engine/streak.ts` for the full semantics.
 */
export interface Streak {
  count: number
  lastDayISO: string
  graceUsed: number
}

/** A sticker the child has placed on the summer mural/map. */
export interface PlacedSticker {
  stickerId: string
  x: number
  y: number
  chapterId: string
}

/** One diary/journal entry written by the child. */
export interface DiaryEntry {
  dateISO: string
  promptId: string
  text: string
}

/** Full persisted progress state for a single child profile. */
export interface ProfileProgress {
  attempts: Attempt[]
  gems: Record<string, GemState>
  streak: Streak
  stickers: PlacedSticker[]
  passportStamps: string[]
  diaryEntries: DiaryEntry[]
  coins: number
  consumedContent: Record<string, string[]>
  unlockedTreasures: string[]
  /**
   * Which of a given day's cards the child has finished, keyed by dateISO to
   * the completed cardTypes for that day. Drives the daily-page check marks
   * and "day complete" logic; independent of `attempts` because non-graded
   * cards (diario, cuento, sabías-que) still count as done.
   */
  completedCards: Record<string, string[]>
}
