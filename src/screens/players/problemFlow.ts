import type { Answer } from '../../types/exercise'

/**
 * The steps a math problem attempt passes through (spec §5.2):
 *   select-data → answer → (scaffold → answer)* → solved | revealed
 * - `select-data`: word problems only; tap the relevant numbers first.
 * - `answer`: enter/pick the answer.
 * - `scaffold`: shown after the FIRST wrong answer (Innovamat re-read prompts),
 *   then back to `answer` to retry.
 * - `solved`: answered correctly.
 * - `revealed`: answered wrong TWICE; the full guided solution is shown.
 */
export type ProblemStep = 'select-data' | 'answer' | 'scaffold' | 'solved' | 'revealed'

/** dataHighlight shape a word problem carries (mirrors Exercise.dataHighlight). */
export interface DataHighlight {
  tokens: string[]
  relevantIndices: number[]
  trapIndex?: number
}

export interface ProblemFlowState {
  step: ProblemStep
  /** Indices of the statement tokens the child has tapped as "the data I need". */
  selectedIndices: number[]
  /** True once the child has tapped the trap datum at least once (for a gentle nudge). */
  tappedTrap: boolean
  /** How many times a wrong answer has been submitted (caps the escalation at 2). */
  wrongCount: number
  /** Hints "spent" — one per wrong answer, capped at 2. Feeds recordAttempt. */
  hintsUsed: number
  /** Result of the most recent submit (used to drive celebration vs retry UI). */
  lastCorrect: boolean
}

/** Max wrong answers before the full solution is revealed and the attempt ends. */
const MAX_WRONG = 2

/** Normalizes a free-text answer for comparison: trim, lowercase, strip accents. */
function normalizeText(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
}

/**
 * Grades `given` against the exercise's canonical `answer`. Number answers
 * accept a numeric string; text answers match the value or any `accept`
 * variant, case/space/accent-insensitively; choice/multi match by id(s).
 */
export function checkAnswer(answer: Answer, given: string | number | string[]): boolean {
  switch (answer.kind) {
    case 'number': {
      const n = typeof given === 'number' ? given : Number(String(given).trim())
      return Number.isFinite(n) && n === answer.value
    }
    case 'text': {
      const g = normalizeText(String(given))
      const candidates = [answer.value, ...(answer.accept ?? [])].map(normalizeText)
      return candidates.includes(g)
    }
    case 'choice':
      return String(given) === answer.correctId
    case 'multi': {
      const picked = Array.isArray(given) ? given : [String(given)]
      const want = [...answer.correctIds].sort()
      const got = [...new Set(picked)].sort()
      return want.length === got.length && want.every((id, i) => id === got[i])
    }
  }
}

/** Creates the initial flow state. Starts in `select-data` iff a dataHighlight is given. */
export function initFlow(_answer: Answer, dataHighlight?: DataHighlight): ProblemFlowState {
  return {
    step: dataHighlight ? 'select-data' : 'answer',
    selectedIndices: [],
    tappedTrap: false,
    wrongCount: 0,
    hintsUsed: 0,
    lastCorrect: false,
  }
}

/** Toggles a statement token in/out of the selection, flagging a trap tap. */
export function toggleDatum(state: ProblemFlowState, index: number, trapIndex?: number): ProblemFlowState {
  const has = state.selectedIndices.includes(index)
  const selectedIndices = has
    ? state.selectedIndices.filter((i) => i !== index)
    : [...state.selectedIndices, index]
  const tappedTrap = state.tappedTrap || (!has && trapIndex !== undefined && index === trapIndex)
  return { ...state, selectedIndices, tappedTrap }
}

/**
 * Leaves the data-select step for the answer step. Deliberately never blocks:
 * even a wrong/empty data selection advances (the nudge about the trap is
 * gentle and non-gating — a 9-year-old shouldn't be stuck on a warm-up step).
 */
export function confirmData(state: ProblemFlowState): ProblemFlowState {
  return { ...state, step: 'answer' }
}

/**
 * Grades a submitted answer and advances the flow:
 * - correct → `solved` (keeps whatever hints were already spent).
 * - 1st wrong → `scaffold`, +1 wrong, +1 hint.
 * - 2nd (or later) wrong → `revealed`, wrong/hints capped at MAX_WRONG.
 * Submits after `solved`/`revealed` are no-ops (the attempt is over).
 */
export function submitAnswer(
  state: ProblemFlowState,
  answer: Answer,
  given: string | number | string[],
): ProblemFlowState {
  if (state.step === 'solved' || state.step === 'revealed') return state

  if (checkAnswer(answer, given)) {
    return { ...state, step: 'solved', lastCorrect: true }
  }

  const wrongCount = Math.min(MAX_WRONG, state.wrongCount + 1)
  const hintsUsed = Math.min(MAX_WRONG, state.hintsUsed + 1)
  const step: ProblemStep = wrongCount >= MAX_WRONG ? 'revealed' : 'scaffold'
  return { ...state, step, wrongCount, hintsUsed, lastCorrect: false }
}

/** Returns to the answer step after reading the scaffold (retry). */
export function retryFromScaffold(state: ProblemFlowState): ProblemFlowState {
  if (state.step !== 'scaffold') return state
  return { ...state, step: 'answer' }
}
