import type { Rng } from '../../lib/rng'
import type { MundoItem, EnglishReading } from '../../content/schemas'
import type { QuestionLike } from './QuestionTiles'

/**
 * The skills a quiz round records attempts against. `geografia` is handled by
 * the dedicated tap-on-map flow (MapRound / mapItems), not by these quiz items.
 */
export type QuizSkill = 'mundo' | 'english' | 'lectura'

export interface QuizItem {
  /** Stable id for React keys and seeding. */
  id: string
  /** Optional passage/fact shown above the question. */
  passage?: string
  /** When set, the passage is spoken in this language on demand. */
  speakLang?: 'en-GB' | 'es-ES'
  question: QuestionLike
  /** Which gem/skill this item feeds. */
  skill: QuizSkill
  /** Subskill id recorded in the attempt. */
  subskill: string
  /** Optional supporting emoji shown as a visual next to the question. */
  emoji?: string
  /** Optional one-line "why" shown after answering (the learning moment). */
  explanation?: string
  /** When set, the question itself is spoken on demand (es voice). */
  speakQuestionLang?: 'es-ES'
}

/**
 * Builds a real 4-choice quiz item from a mundo item. The item already carries
 * the question, four choices, the correct index, an emoji visual and an
 * explanation — this just shapes it into the shared QuizItem contract, keeping
 * the choice order authored (distractors are already plausible-but-wrong).
 * The question is `literal` (one defensible answer) and the emoji + explanation
 * turn each item into a mini-learning moment after answering.
 */
export function mundoQuizItem(_rng: Rng, item: MundoItem): QuizItem | null {
  const question: QuestionLike = {
    q: item.question.es,
    choices: item.choices.map((c) => c.es),
    correctIdx: item.correctIdx,
    kind: 'literal',
  }
  return {
    id: item.id,
    question,
    skill: 'mundo',
    subskill: item.subskill,
    emoji: item.emoji,
    explanation: item.explanation.es,
    speakQuestionLang: 'es-ES',
  }
}

/**
 * Expands an english-reading into one quiz item per question. The reading's
 * sentences become the (English) passage; literal questions record against
 * `english.reading`, reflexiva ones against `lectura.reflexion`. These
 * questions already ship as validated 4-choice items, so they pass through
 * unchanged.
 */
export function englishReadingQuizItems(reading: EnglishReading): QuizItem[] {
  const passage = reading.sentences.join(' ')
  return reading.questions.map((q, i) => ({
    id: `${reading.id}-q${i}`,
    passage,
    speakLang: 'en-GB' as const,
    question: q,
    skill: q.kind === 'reflexiva' ? ('lectura' as const) : ('english' as const),
    subskill: q.kind === 'reflexiva' ? 'reflexion' : 'reading',
  }))
}
