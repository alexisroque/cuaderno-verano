import { describe, expect, it } from 'vitest'
import type { Answer } from '../../types/exercise'
import {
  checkAnswer,
  initFlow,
  submitAnswer,
  toggleDatum,
  confirmData,
  type ProblemFlowState,
} from './problemFlow'

const numberAnswer: Answer = { kind: 'number', value: 12 }
const choiceAnswer: Answer = { kind: 'choice', correctId: 'b' }

describe('checkAnswer', () => {
  it('grades a number answer by numeric equality', () => {
    expect(checkAnswer(numberAnswer, 12)).toBe(true)
    expect(checkAnswer(numberAnswer, 13)).toBe(false)
  })

  it('accepts a numeric string for a number answer', () => {
    expect(checkAnswer(numberAnswer, '12')).toBe(true)
    expect(checkAnswer(numberAnswer, ' 12 ')).toBe(true)
    expect(checkAnswer(numberAnswer, 'doce')).toBe(false)
  })

  it('grades a choice answer by id', () => {
    expect(checkAnswer(choiceAnswer, 'b')).toBe(true)
    expect(checkAnswer(choiceAnswer, 'a')).toBe(false)
  })

  it('grades a text answer case/space/accent-insensitively via accept list', () => {
    const answer: Answer = { kind: 'text', value: 'Barça', accept: ['barca'] }
    expect(checkAnswer(answer, 'barça')).toBe(true)
    expect(checkAnswer(answer, ' BARÇA ')).toBe(true)
    expect(checkAnswer(answer, 'barca')).toBe(true)
    expect(checkAnswer(answer, 'madrid')).toBe(false)
  })
})

describe('initFlow', () => {
  it('starts in the data-select step when a dataHighlight is present', () => {
    const state = initFlow(numberAnswer, { tokens: ['3', 'x', '4'], relevantIndices: [0, 2] })
    expect(state.step).toBe('select-data')
    expect(state.selectedIndices).toEqual([])
    expect(state.hintsUsed).toBe(0)
    expect(state.wrongCount).toBe(0)
  })

  it('starts directly in the answer step when no dataHighlight', () => {
    const state = initFlow(numberAnswer)
    expect(state.step).toBe('answer')
  })
})

describe('toggleDatum / confirmData', () => {
  const highlight = { tokens: ['3', 'grupos', '4', 'monos', '2', 'perros'], relevantIndices: [0, 2], trapIndex: 4 }

  it('toggles a datum in and out of the selection', () => {
    let state = initFlow(numberAnswer, highlight)
    state = toggleDatum(state, 0)
    expect(state.selectedIndices).toEqual([0])
    state = toggleDatum(state, 0)
    expect(state.selectedIndices).toEqual([])
  })

  it('flags a trap tap without blocking progress', () => {
    let state = initFlow(numberAnswer, highlight)
    state = toggleDatum(state, 4, highlight.trapIndex)
    expect(state.tappedTrap).toBe(true)
    expect(state.selectedIndices).toEqual([4])
  })

  it('does not flag a trap for a relevant datum', () => {
    let state = initFlow(numberAnswer, highlight)
    state = toggleDatum(state, 2, highlight.trapIndex)
    expect(state.tappedTrap).toBe(false)
  })

  it('confirmData always advances to the answer step (never blocks)', () => {
    let state = initFlow(numberAnswer, highlight)
    state = toggleDatum(state, 4, highlight.trapIndex) // trap only
    state = confirmData(state)
    expect(state.step).toBe('answer')
  })
})

describe('submitAnswer — correct path', () => {
  it('moves to solved with no hint penalty on a first-try correct answer', () => {
    let state: ProblemFlowState = initFlow(numberAnswer)
    state = submitAnswer(state, numberAnswer, 12)
    expect(state.step).toBe('solved')
    expect(state.lastCorrect).toBe(true)
    expect(state.hintsUsed).toBe(0)
    expect(state.wrongCount).toBe(0)
  })

  it('records hints used when solved after a scaffold', () => {
    let state = initFlow(numberAnswer)
    state = submitAnswer(state, numberAnswer, 99) // wrong -> scaffold
    state = submitAnswer(state, numberAnswer, 12) // correct
    expect(state.step).toBe('solved')
    expect(state.lastCorrect).toBe(true)
    expect(state.hintsUsed).toBe(1)
    expect(state.wrongCount).toBe(1)
  })
})

describe('submitAnswer — wrong path escalation', () => {
  it('first wrong answer enters the scaffold step and counts a hint', () => {
    let state = initFlow(numberAnswer)
    state = submitAnswer(state, numberAnswer, 99)
    expect(state.step).toBe('scaffold')
    expect(state.wrongCount).toBe(1)
    expect(state.hintsUsed).toBe(1)
    expect(state.lastCorrect).toBe(false)
  })

  it('second wrong answer reveals the full solution and marks done', () => {
    let state = initFlow(numberAnswer)
    state = submitAnswer(state, numberAnswer, 99) // 1st wrong
    state = submitAnswer(state, numberAnswer, 88) // 2nd wrong
    expect(state.step).toBe('revealed')
    expect(state.wrongCount).toBe(2)
    expect(state.hintsUsed).toBe(2)
    expect(state.lastCorrect).toBe(false)
  })

  it('does not exceed two hints even on a third stray submit', () => {
    let state = initFlow(numberAnswer)
    state = submitAnswer(state, numberAnswer, 99)
    state = submitAnswer(state, numberAnswer, 88)
    state = submitAnswer(state, numberAnswer, 77)
    expect(state.step).toBe('revealed')
    expect(state.wrongCount).toBe(2)
    expect(state.hintsUsed).toBe(2)
  })
})
