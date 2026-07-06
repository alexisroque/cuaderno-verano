import { describe, expect, it } from 'vitest'
import { createRng } from '../../lib/rng'
import { geographyQuizItem, mundoQuizItem, englishReadingQuizItems } from './quizItems'
import type { GeographyItem, MundoItem, EnglishReading } from '../../content/schemas'

describe('geographyQuizItem', () => {
  const item: GeographyItem = {
    id: 'geo-1',
    text: { es: 'La capital de Malasia es Kuala Lumpur.' },
    tag: 'capital-of',
    chapterId: 'kuala-lumpur',
  }

  it('builds a 4-choice question whose correct choice is the tag topic label', () => {
    const q = geographyQuizItem(createRng('seed'), item)
    expect(q).not.toBeNull()
    expect(q!.question.choices).toHaveLength(4)
    expect(q!.question.choices[q!.question.correctIdx]).toBe('la capital de un país')
    expect(q!.skill).toBe('geografia')
    expect(q!.subskill).toBe('capitales')
  })

  it('is deterministic for the same seed', () => {
    const a = geographyQuizItem(createRng('same'), item)
    const b = geographyQuizItem(createRng('same'), item)
    expect(a).toEqual(b)
  })

  it('returns null for an unmappable tag', () => {
    expect(geographyQuizItem(createRng('s'), { ...item, tag: 'weird' })).toBeNull()
    expect(geographyQuizItem(createRng('s'), { ...item, tag: undefined })).toBeNull()
  })

  it('maps flag-pick and where-is tags to the right subskill', () => {
    expect(geographyQuizItem(createRng('s'), { ...item, tag: 'flag-pick' })!.subskill).toBe('banderas')
    expect(geographyQuizItem(createRng('s'), { ...item, tag: 'where-is' })!.subskill).toBe('donde-esta')
  })
})

describe('mundoQuizItem', () => {
  const item: MundoItem = { id: 'mundo-1', text: { es: 'El Sol es una estrella.' }, tag: 'sistema-solar' }

  it('maps sistema-solar to the espacio subskill and como-funciona otherwise', () => {
    expect(mundoQuizItem(createRng('s'), item)!.subskill).toBe('espacio')
    expect(mundoQuizItem(createRng('s'), { ...item, tag: 'como-funciona' })!.subskill).toBe('como-funciona')
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
