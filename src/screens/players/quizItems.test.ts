import { describe, expect, it } from 'vitest'
import { createRng } from '../../lib/rng'
import { mundoQuizItem, englishReadingQuizItems } from './quizItems'
import type { MundoItem, EnglishReading } from '../../content/schemas'

describe('mundoQuizItem', () => {
  const item: MundoItem = {
    id: 'mundo-1',
    subskill: 'espacio',
    question: { es: '¿Cuál es el planeta más grande?' },
    choices: [{ es: 'Júpiter' }, { es: 'Saturno' }, { es: 'la Tierra' }, { es: 'Marte' }],
    correctIdx: 0,
    emoji: '🪐',
    explanation: { es: 'Júpiter es enorme.' },
  }

  it('records against the item subskill (espacio / como-funciona)', () => {
    expect(mundoQuizItem(createRng('s'), item)!.subskill).toBe('espacio')
    expect(mundoQuizItem(createRng('s'), { ...item, subskill: 'como-funciona' })!.subskill).toBe('como-funciona')
  })

  it('builds a literal 4-choice question with the authored correct answer', () => {
    const q = mundoQuizItem(createRng('q'), item)!
    expect(q.question.choices).toEqual(['Júpiter', 'Saturno', 'la Tierra', 'Marte'])
    expect(q.question.correctIdx).toBe(0)
    expect(q.question.kind).toBe('literal')
    expect(q.skill).toBe('mundo')
  })

  it('carries the emoji visual and explanation for the learning moment', () => {
    const q = mundoQuizItem(createRng('e'), item)!
    expect(q.emoji).toBe('🪐')
    expect(q.explanation).toBe('Júpiter es enorme.')
    expect(q.speakQuestionLang).toBe('es-ES')
  })

  it('never repeats a choice', () => {
    const q = mundoQuizItem(createRng('dedupe'), item)!
    expect(new Set(q.question.choices).size).toBe(q.question.choices.length)
  })
})

describe('englishReadingQuizItems', () => {
  const reading: EnglishReading = {
    id: 'read-1',
    title: 'My Family',
    sentences: ['This is my family.', 'My brother is four.'],
    questions: [
      { q: 'How old is the brother?', choices: ['2', '3', '4', '9'], correctIdx: 2, kind: 'literal' },
      { q: 'Why play together?', choices: ['fun', 'no', 'never', 'sad'], correctIdx: 0, kind: 'reflexiva' },
    ],
  }

  it('expands one item per question, routing literal→english and reflexiva→lectura', () => {
    const items = englishReadingQuizItems(reading)
    expect(items).toHaveLength(2)
    expect(items[0].skill).toBe('english')
    expect(items[0].subskill).toBe('reading')
    expect(items[1].skill).toBe('lectura')
    expect(items[1].subskill).toBe('reflexion')
    expect(items[0].passage).toContain('This is my family.')
    expect(items[0].speakLang).toBe('en-GB')
  })
})
