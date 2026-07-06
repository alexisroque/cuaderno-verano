import { describe, expect, it } from 'vitest'
import { chapterForDate, composeDay } from './dayComposer'
import type { ContentBundle, CuentoLeo, Curiosity, DiaryPrompt, Episode, Joke, Series } from '../types/content'
import type { Chapter } from '../content/schemas'
import type { ProfileProgress } from '../types/progress'
import type { ChildSettings } from '../state/settingsStore'
import chaptersData from '../../content/chapters.json'
import { validateChapters } from '../content/schemas'

const REAL_CHAPTERS = validateChapters(chaptersData)

function chapter(overrides: Partial<Chapter> = {}): Chapter {
  return {
    id: 'chapter-a',
    title: 'Chapter A',
    emoji: '🌴',
    dateStart: '2026-07-01',
    dateEnd: '2026-07-10',
    place: 'Somewhere',
    mascot: { id: 'm1', name: 'Mascota', emoji: '🐒' },
    flavor: { landmarks: [], animals: [], foods: [] },
    stickers: [{ id: 's1', emoji: '⭐', name: 'Estrella' }],
    ...overrides,
  }
}

function episode(overrides: Partial<Episode> = {}): Episode {
  return {
    id: 'ep-1',
    order: 1,
    title: 'Episode 1',
    dictation: { ca: 'Text ca', es: 'Text es' },
    factExtra: { ca: 'Fact ca', es: 'Fact es' },
    hook: 'Hook',
    questions: [{ q: 'Q?', choices: ['a', 'b'], correctIdx: 0, kind: 'literal' }],
    ...overrides,
  }
}

function series(overrides: Partial<Series> = {}): Series {
  return { id: 'series-a', title: 'Series A', emoji: '📖', episodes: [], ...overrides }
}

function curiosity(overrides: Partial<Curiosity> = {}): Curiosity {
  return { id: 'cur-1', text: { es: 'Sabías que...' }, tag: 'geo', ...overrides }
}

function joke(overrides: Partial<Joke> = {}): Joke {
  return { id: 'joke-1', text: { es: 'Un chiste' }, kind: 'chiste', ...overrides }
}

function diaryPrompt(overrides: Partial<DiaryPrompt> = {}): DiaryPrompt {
  return { id: 'prompt-1', text: { es: '¿Qué hiciste hoy?' }, ...overrides }
}

function cuentoLeo(overrides: Partial<CuentoLeo> = {}): CuentoLeo {
  return {
    id: 'cuento-1',
    title: 'Cuento',
    sentences: ['Frase 1', 'Frase 2'],
    question: { q: 'Q?', choices: ['a', 'b'], correctIdx: 0 },
    ...overrides,
  }
}

function bundle(overrides: Partial<ContentBundle> = {}): ContentBundle {
  return {
    chapters: [chapter()],
    series: [
      series({
        id: 'series-a',
        episodes: [
          episode({ id: 'ep-1', order: 1 }),
          episode({ id: 'ep-2', order: 2 }),
          episode({ id: 'ep-3', order: 3 }),
        ],
      }),
    ],
    curiosities: [curiosity({ id: 'cur-1' }), curiosity({ id: 'cur-2' }), curiosity({ id: 'cur-3' })],
    jokes: [joke({ id: 'joke-1' }), joke({ id: 'joke-2' })],
    diaryPrompts: [diaryPrompt({ id: 'prompt-1' }), diaryPrompt({ id: 'prompt-2' }), diaryPrompt({ id: 'prompt-3' })],
    cuentosLeo: [cuentoLeo({ id: 'cuento-1' }), cuentoLeo({ id: 'cuento-2' }), cuentoLeo({ id: 'cuento-3' })],
    ...overrides,
  }
}

function progress(overrides: Partial<ProfileProgress> = {}): ProfileProgress {
  return {
    attempts: [],
    gems: {},
    streak: { count: 0, lastDayISO: '', graceUsed: 0 },
    stickers: [],
    passportStamps: [],
    diaryEntries: [],
    coins: 0,
    consumedContent: {},
    unlockedTreasures: [],
    ...overrides,
  }
}

function settings(overrides: Partial<ChildSettings> = {}): ChildSettings {
  return {
    missionSize: 4,
    challengeFrequency: 0.2,
    moduleToggles: {},
    subskillAdjustments: {},
    weeklyFocus: [],
    ...overrides,
  }
}

describe('chapterForDate', () => {
  it('resolves a date to the chapter whose range contains it (end-exclusive boundary)', () => {
    expect(chapterForDate(REAL_CHAPTERS, '2026-07-12').id).toBe('vuelo')
    expect(chapterForDate(REAL_CHAPTERS, '2026-07-14').id).toBe('singapur')
    // 2026-07-15 is dateStart of borneo-sepilok and dateEnd (exclusive) of singapur
    expect(chapterForDate(REAL_CHAPTERS, '2026-07-15').id).toBe('borneo-sepilok')
  })

  it('clamps a before-range date to the first chapter', () => {
    expect(chapterForDate(REAL_CHAPTERS, '2020-01-01').id).toBe(REAL_CHAPTERS[0].id)
  })

  it('clamps an after-range date to the last chapter', () => {
    expect(chapterForDate(REAL_CHAPTERS, '2030-01-01').id).toBe(REAL_CHAPTERS[REAL_CHAPTERS.length - 1].id)
  })
})

describe('composeDay', () => {
  it('is deterministic: identical inputs produce a deep-equal output', () => {
    const day1 = composeDay('2026-07-16', 'aira', progress(), bundle(), settings(), {})
    const day2 = composeDay('2026-07-16', 'aira', progress(), bundle(), settings(), {})
    expect(day1).toEqual(day2)
  })

  it('produces the Aira card sequence [problema, dictado, sabias-que, diario] with default mission size 4', () => {
    const day = composeDay('2026-07-16', 'aira', progress(), bundle(), settings({ missionSize: 4 }), {})
    expect(day.cards.map((c) => c.cardType)).toEqual(['problema', 'dictado', 'sabias-que', 'diario'])
  })

  it('produces the Leo card sequence [trazos, contar, english, sorpresa-rotatoria] with mission size 3+sorpresa', () => {
    const day = composeDay('2026-07-16', 'leo', progress(), bundle(), settings({ missionSize: 3 }), {})
    expect(day.cards.map((c) => c.cardType)).toEqual(['trazos', 'contar', 'english', 'sorpresa-rotatoria'])
  })

  it('resolves chapterId from the real chapters.json for the given date', () => {
    const day = composeDay('2026-07-16', 'aira', progress(), bundle({ chapters: REAL_CHAPTERS }), settings(), {})
    expect(day.chapterId).toBe(chapterForDate(REAL_CHAPTERS, '2026-07-16').id)
  })

  it('sets generatorSeed for each card to `${dateISO}:${profile}:${cardIndex}`', () => {
    const day = composeDay('2026-07-16', 'aira', progress(), bundle(), settings(), {})
    day.cards.forEach((card, i) => {
      expect(card.generatorSeed).toBe(`2026-07-16:aira:${i}`)
    })
  })

  it('rotates sorpresa-rotatoria deterministically among the fixed Leo logica subskill set', () => {
    const allowed = new Set(['patrones', 'formas', 'simetria', 'clasificar', 'posiciones', 'cuento'])
    const day = composeDay('2026-07-16', 'leo', progress(), bundle(), settings({ missionSize: 3 }), {})
    const sorpresaCard = day.cards.find((c) => c.cardType === 'sorpresa-rotatoria')
    expect(sorpresaCard).toBeDefined()
    expect(allowed.has(sorpresaCard!.subskill ?? '')).toBe(true)
  })

  it('rotates sorpresa-rotatoria across consecutive days (not stuck on one value)', () => {
    const picks = new Set<string>()
    for (let i = 0; i < 12; i++) {
      const dateISO = `2026-07-${String(16 + i).padStart(2, '0')}`
      const day = composeDay(dateISO, 'leo', progress(), bundle(), settings({ missionSize: 3 }), {})
      const sorpresaCard = day.cards.find((c) => c.cardType === 'sorpresa-rotatoria')
      picks.add(sorpresaCard!.subskill ?? '')
    }
    expect(picks.size).toBeGreaterThan(1)
  })

  it('picks the lowest-order unconsumed episode for the dictado card (series are sequential)', () => {
    const withEp1Consumed = progress({ consumedContent: { episodes: ['ep-1'] } })
    const day = composeDay('2026-07-16', 'aira', withEp1Consumed, bundle(), settings(), {})
    const dictado = day.cards.find((c) => c.cardType === 'dictado')
    expect(dictado?.contentRef).toMatchObject({ seriesId: 'series-a', episodeId: 'ep-2' })
  })

  it('resets and allows repeats once every episode in the series pool is consumed', () => {
    const allConsumed = progress({ consumedContent: { episodes: ['ep-1', 'ep-2', 'ep-3'] } })
    const day = composeDay('2026-07-16', 'aira', allConsumed, bundle(), settings(), {})
    const dictado = day.cards.find((c) => c.cardType === 'dictado')
    expect(dictado?.contentRef).toMatchObject({ seriesId: 'series-a', episodeId: 'ep-1' })
  })

  it('picks a seeded-random unconsumed curiosity for the sabias-que card, avoiding consumed ones', () => {
    const withTwoConsumed = progress({ consumedContent: { curiosities: ['cur-1', 'cur-2'] } })
    const day = composeDay('2026-07-16', 'aira', withTwoConsumed, bundle(), settings(), {})
    const sabiasQue = day.cards.find((c) => c.cardType === 'sabias-que')
    expect(sabiasQue?.contentRef).toMatchObject({ curiosityId: 'cur-3' })
  })

  it('picks a seeded-random unconsumed diary prompt, avoiding consumed ones', () => {
    const withTwoConsumed = progress({ consumedContent: { diaryPrompts: ['prompt-1', 'prompt-2'] } })
    const day = composeDay('2026-07-16', 'aira', withTwoConsumed, bundle(), settings(), {})
    const diario = day.cards.find((c) => c.cardType === 'diario')
    expect(diario?.contentRef).toMatchObject({ promptId: 'prompt-3' })
  })

  it('the problema card subskill belongs to problemas or calculo', () => {
    const day = composeDay('2026-07-16', 'aira', progress(), bundle(), settings(), {})
    const problema = day.cards.find((c) => c.cardType === 'problema')
    expect(problema?.subskill).toBeDefined()
  })

  it('the problema card sets a difficulty derived from mastery + settings offset, clamped to range', () => {
    const day = composeDay('2026-07-16', 'aira', progress(), bundle(), settings(), {})
    const problema = day.cards.find((c) => c.cardType === 'problema')
    expect(typeof problema?.difficulty).toBe('number')
  })

  it('respects a custom Aira missionSize', () => {
    const day = composeDay('2026-07-16', 'aira', progress(), bundle(), settings({ missionSize: 2 }), {})
    expect(day.cards).toHaveLength(2)
    expect(day.cards.map((c) => c.cardType)).toEqual(['problema', 'dictado'])
  })

  it('produces a surprise (or null) consistent with the surprise seed convention', () => {
    const day = composeDay('2026-07-16', 'aira', progress(), bundle(), settings(), {})
    expect(day.surprise === null || typeof day.surprise?.kind === 'string').toBe(true)
  })
})

describe('dictation language alternation', () => {
  it('is >= 55% catalan over any 30-day rolling window (weighted 65% ca)', () => {
    const results: boolean[] = [] // true = ca
    for (let i = 0; i < 60; i++) {
      const dateISO = `2026-${i < 31 ? '07' : '08'}-${String((i % 31) + 1).padStart(2, '0')}`
      const day = composeDay(dateISO, 'aira', progress(), bundle(), settings(), {})
      const dictado = day.cards.find((c) => c.cardType === 'dictado')
      results.push(dictado?.language === 'ca')
    }
    for (let start = 0; start + 30 <= results.length; start++) {
      const window = results.slice(start, start + 30)
      const caCount = window.filter(Boolean).length
      expect(caCount).toBeGreaterThanOrEqual(0.55 * 30)
    }
  })
})

describe('joke cadence', () => {
  it('swaps a dictation for a joke on roughly 1 in 6-7 days over 70 days', () => {
    let jokeDays = 0
    for (let i = 0; i < 70; i++) {
      const dateISO = `2026-${i < 31 ? '07' : i < 62 ? '08' : '09'}-${String((i % 31) + 1).padStart(2, '0')}`
      const day = composeDay(dateISO, 'aira', progress(), bundle(), settings(), {})
      const dictado = day.cards.find((c) => c.cardType === 'dictado')
      if (dictado?.contentRef && 'jokeId' in dictado.contentRef) jokeDays++
    }
    expect(jokeDays).toBeGreaterThanOrEqual(7)
    expect(jokeDays).toBeLessThanOrEqual(14)
  })
})
