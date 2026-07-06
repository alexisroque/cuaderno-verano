import { useProgressStore } from '../../state/progressStore'
import { todayISO } from '../../lib/clock'
import type { ProfileId } from '../../state/profileStore'
import type { QuizItem } from './quizItems'

/**
 * Records one answered quiz item as an Attempt against its item's subskill.
 * Reflexiva items always count as correct/engaged (thinking, not one truth) —
 * mirrors ReadingPlayer's rule. Kept as a plain function (not a hook) so both
 * the QuizPlayer route and the free-training loop can call it per answer.
 */
export function recordQuizAttempt(profile: ProfileId, item: QuizItem, correct: boolean, startedAtMs: number): void {
  const reflexiva = item.question.kind === 'reflexiva'
  useProgressStore.getState().recordAttempt(profile, {
    dateISO: todayISO(),
    cardType: 'quiz',
    subskill: item.subskill,
    correct: reflexiva ? true : correct,
    hintsUsed: 0,
    ms: Date.now() - startedAtMs,
    difficulty: 2,
  })
}
