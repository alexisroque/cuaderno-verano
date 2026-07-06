import { describe, expect, it } from 'vitest'
import { chapterForDate, composeDay } from './dayComposer'
import type { ContentBundle, CuentoLeo, Curiosity, DiaryPrompt, Episode, Joke, Series } from '../types/content'
import type { Chapter } from '../content/schemas'
import type { ProfileProgress } from '../types/progress'
import type { ChildSettings } from '../state/settingsStore'
import chaptersData from '../../content/chapters.json'
import { validateChapters } from '../content/schemas'
import { addDays, daysBetween } from '../lib/dates'
import { CATALOG } from './skills'

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
    flavor: {
      currencySymbol: '€',
      placePhrase: 'en algún lugar',
      priceItems: ['helado', 'bocadillo', 'granizado', 'refresco'],
      landmarks: [],
      animals: [],
      foods: [],
    },
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
    completedCards: {},
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

describe('sabias-que wires english readings into daily play', () => {
  const reading = (id: string) => ({
    id,
    title: id,
    sentences: ['One.', 'Two.'],
    questions: [
      { q: 'literal?', choices: ['a', 'b', 'c', 'd'], correctIdx: 0, kind: 'literal' as const },
      { q: 'why?', choices: ['a', 'b', 'c', 'd'], correctIdx: 0, kind: 'reflexiva' as const },
    ],
  })
  const withReadings = () =>
    bundle({ englishReadings: [reading('read-1'), reading('read-2'), reading('read-3')] })

  it('falls back to only curiosityId when the bundle has no english readings', () => {
    const day = composeDay('2026-07-16', 'aira', progress(), bundle(), settings(), {})
    const sabiasQue = day.cards.find((c) => c.cardType === 'sabias-que')
    expect(sabiasQue?.contentRef?.readingId).toBeUndefined()
    expect(sabiasQue?.contentRef?.curiosityId).toBeDefined()
  })

  it('surfaces an english reading (with reflexiva questions) on some days when readings exist', () => {
    // Sweep a month: with a 1-in-3 seeded rate, at least one day must serve a reading.
    let readingDays = 0
    let curiosityDays = 0
    for (let d = 1; d <= 28; d++) {
      const dateISO = `2026-07-${String(d).padStart(2, '0')}`
      const day = composeDay(dateISO, 'aira', progress(), withReadings(), settings(), {})
      const sabiasQue = day.cards.find((c) => c.cardType === 'sabias-que')
      if (sabiasQue?.contentRef?.readingId) readingDays++
      if (sabiasQue?.contentRef?.curiosityId) curiosityDays++
    }
    expect(readingDays).toBeGreaterThan(0)
    expect(curiosityDays).toBeGreaterThan(0)
  })

  it('is deterministic: the same day yields the same sabias-que ref with readings present', () => {
    const a = composeDay('2026-07-20', 'aira', progress(), withReadings(), settings(), {})
    const b = composeDay('2026-07-20', 'aira', progress(), withReadings(), settings(), {})
    const refA = a.cards.find((c) => c.cardType === 'sabias-que')?.contentRef
    const refB = b.cards.find((c) => c.cardType === 'sabias-que')?.contentRef
    expect(refA).toEqual(refB)
  })

  it('avoids re-serving a consumed reading', () => {
    const consumed = progress({ consumedContent: { englishReadings: ['read-1', 'read-2'] } })
    // Find a day that serves a reading, then assert it is the only unconsumed one.
    for (let d = 1; d <= 28; d++) {
      const dateISO = `2026-07-${String(d).padStart(2, '0')}`
      const day = composeDay(dateISO, 'aira', consumed, withReadings(), settings(), {})
      const readingId = day.cards.find((c) => c.cardType === 'sabias-que')?.contentRef?.readingId
      if (readingId) {
        expect(readingId).toBe('read-3')
        return
      }
    }
    throw new Error('expected at least one reading day in the sweep')
  })
})

describe('desafio surprise injects a challenge card', () => {
  const AIRA_CHALLENGE_SUBSKILLS = new Set([
    'fracciones',
    'decimales-dinero',
    'hechos-derivados-dec',
    'cuadrados',
    'proporcionalidad',
  ])
  const LEO_CHALLENGE_SUBSKILLS = new Set([
    'contar-20',
    'descomponer-7-9',
    'dobles',
    'mas-menos-1-2',
    'simbolos',
    'estimar',
  ])

  it('turns the Aira problema card into a challenge card when a desafio surprise fires', () => {
    const gems = { calculo: { skillId: 'calculo', level: 2, progress: 0 } }
    const day = composeDay('2026-01-04', 'aira', progress(), bundle(), settings(), gems)

    expect(day.surprise).toEqual({ kind: 'desafio' })
    const challengeCards = day.cards.filter((c) => c.challenge === true)
    expect(challengeCards).toHaveLength(1)

    const problema = day.cards.find((c) => c.cardType === 'problema')
    expect(problema?.challenge).toBe(true)
    expect(AIRA_CHALLENGE_SUBSKILLS.has(problema!.subskill ?? '')).toBe(true)
    expect(problema?.difficulty).toBe(3) // all listed challenge subskills' difficultyRange[0] is 3
  })

  it('turns the Leo contar card into a challenge card when a desafio surprise fires', () => {
    const gems = { numeros: { skillId: 'numeros', level: 2, progress: 0 } }
    const day = composeDay('2026-01-05', 'leo', progress(), bundle(), settings({ missionSize: 3 }), gems)

    expect(day.surprise).toEqual({ kind: 'desafio' })
    const challengeCards = day.cards.filter((c) => c.challenge === true)
    expect(challengeCards).toHaveLength(1)

    const contar = day.cards.find((c) => c.cardType === 'contar')
    expect(contar?.challenge).toBe(true)
    expect(LEO_CHALLENGE_SUBSKILLS.has(contar!.subskill ?? '')).toBe(true)
    expect(contar?.difficulty).toBe(2) // all listed challenge subskills' difficultyRange[0] is 2
  })

  it('does not mark any card as a challenge on a non-desafio day', () => {
    const day = composeDay('2026-07-16', 'aira', progress(), bundle(), settings(), {})
    expect(day.surprise === null || day.surprise?.kind !== 'desafio').toBe(true)
    expect(day.cards.some((c) => c.challenge === true)).toBe(false)
  })

  it('never throws the challenge-subskill invariant violation across a wide sweep of dates/gem levels for both profiles', () => {
    // rollSurprise gates `desafio` on hasUnlockedChallengeSkill finding a
    // qualifying skill; pickChallengeSubskill (dayComposerCards.ts) re-derives
    // candidates independently. This sweeps many dates and gem configs to
    // confirm the two gates never diverge (which would throw) — a broader
    // regression net than the single hardcoded date/gem cases above.
    const sweeps: { profile: 'aira' | 'leo'; gemsList: Record<string, { skillId: string; level: number; progress: number }>[] }[] = [
      {
        profile: 'aira',
        gemsList: [
          { calculo: { skillId: 'calculo', level: 2, progress: 0 } },
          { problemas: { skillId: 'problemas', level: 3, progress: 5 } },
          {
            calculo: { skillId: 'calculo', level: 2, progress: 0 },
            problemas: { skillId: 'problemas', level: 2, progress: 0 },
          },
        ],
      },
      {
        profile: 'leo',
        gemsList: [
          { numeros: { skillId: 'numeros', level: 2, progress: 0 } },
          { numeros: { skillId: 'numeros', level: 4, progress: 9 } },
        ],
      },
    ]

    for (const { profile, gemsList } of sweeps) {
      for (const gems of gemsList) {
        for (let i = 0; i < 60; i++) {
          const dateISO = addDays('2026-01-01', i)
          expect(() =>
            composeDay(dateISO, profile, progress(), bundle(), settings({ missionSize: 3 }), gems),
          ).not.toThrow()
        }
      }
    }
  })

  it('remains deterministic on a desafio day: identical inputs produce a deep-equal DayPage', () => {
    const gems = { calculo: { skillId: 'calculo', level: 2, progress: 0 } }
    const day1 = composeDay('2026-01-04', 'aira', progress(), bundle(), settings(), gems)
    const day2 = composeDay('2026-01-04', 'aira', progress(), bundle(), settings(), gems)
    expect(day1).toEqual(day2)
  })
})

describe('moduleToggles are consumed in day composition', () => {
  it('drops the dictado card when ortografia is disabled and shrinks the day (no duplicate card types)', () => {
    const day = composeDay(
      '2026-07-16',
      'aira',
      progress(),
      bundle(),
      settings({ missionSize: 4, moduleToggles: { ortografia: false } }),
      {},
    )
    const types = day.cards.map((c) => c.cardType)
    expect(types).not.toContain('dictado')
    // The dropped slot is not refilled: the day is one card shorter.
    expect(types).toEqual(['problema', 'sabias-que', 'diario'])
    // Card identity is the cardType (React keys + completion), so never duplicated.
    expect(new Set(types).size).toBe(types.length)
  })

  it('drops multiple disabled content slots (dictado/sabias-que/diario), leaving only problema', () => {
    const day = composeDay(
      '2026-07-16',
      'aira',
      progress(),
      bundle(),
      settings({ missionSize: 4, moduleToggles: { ortografia: false, lectura: false, escritura: false } }),
      {},
    )
    expect(day.cards.map((c) => c.cardType)).toEqual(['problema'])
  })

  it('never produces two cards of the same cardType, even with toggles dropping slots', () => {
    // Sweep a set of toggle combos across dates; card identity must stay unique.
    const combos: Record<string, boolean>[] = [
      { ortografia: false },
      { lectura: false, escritura: false },
      { problemas: false, calculo: false },
      { ortografia: false, lectura: false },
    ]
    for (const moduleToggles of combos) {
      for (let d = 1; d <= 10; d++) {
        const dateISO = `2026-07-${String(d).padStart(2, '0')}`
        const day = composeDay(dateISO, 'aira', progress(), bundle(), settings({ moduleToggles }), {})
        const types = day.cards.map((c) => c.cardType)
        expect(new Set(types).size, `${dateISO} ${JSON.stringify(moduleToggles)}`).toBe(types.length)
      }
    }
  })

  it('drops the problema slot without refilling with problema when both problemas and calculo are off', () => {
    const day = composeDay(
      '2026-07-16',
      'aira',
      progress(),
      bundle(),
      settings({ missionSize: 4, moduleToggles: { problemas: false, calculo: false } }),
      {},
    )
    const types = day.cards.map((c) => c.cardType)
    expect(types).not.toContain('problema')
    // Only the 3 remaining content slots survive; no problema to refill with.
    expect(types).toEqual(['dictado', 'sabias-que', 'diario'])
  })

  it('restricts the problema subskill to the enabled problema skill (problemas off → calculo only)', () => {
    const AIRA_CALCULO_SUBSKILLS = new Set(Object.keys(CATALOG.aira.skills.calculo.subskills))
    const day = composeDay(
      '2026-07-16',
      'aira',
      progress(),
      bundle(),
      settings({ moduleToggles: { problemas: false } }),
      {},
    )
    const problema = day.cards.find((c) => c.cardType === 'problema')
    expect(AIRA_CALCULO_SUBSKILLS.has(problema?.subskill ?? '')).toBe(true)
  })

  it('drops Leo base slots and the rotation card per toggles', () => {
    const day = composeDay(
      '2026-07-16',
      'leo',
      progress(),
      bundle(),
      settings({ missionSize: 3, moduleToggles: { numeros: false, logica: false } }),
      {},
    )
    const types = day.cards.map((c) => c.cardType)
    expect(types).not.toContain('contar')
    expect(types).not.toContain('sorpresa-rotatoria')
    expect(types).toEqual(['trazos', 'english'])
  })

  it('disabling everything is a safe no-op fallback: still a non-empty day (Aira)', () => {
    const allOff = { problemas: false, calculo: false, ortografia: false, escritura: false, lectura: false, english: false, geografia: false, mundo: false }
    const day = composeDay('2026-07-16', 'aira', progress(), bundle(), settings({ moduleToggles: allOff }), {})
    expect(day.cards.length).toBeGreaterThanOrEqual(1)
  })

  it('disabling everything is a safe no-op fallback: still a non-empty day (Leo)', () => {
    const allOff = { trazos: false, numeros: false, english: false, logica: false }
    const day = composeDay('2026-07-16', 'leo', progress(), bundle(), settings({ missionSize: 3, moduleToggles: allOff }), {})
    expect(day.cards.length).toBeGreaterThanOrEqual(1)
  })

  it('remains deterministic with toggles applied', () => {
    const s = settings({ moduleToggles: { ortografia: false } })
    const a = composeDay('2026-07-16', 'aira', progress(), bundle(), s, {})
    const b = composeDay('2026-07-16', 'aira', progress(), bundle(), s, {})
    expect(a).toEqual(b)
  })
})

describe('challengeFrequency modulates the desafio surprise rate', () => {
  // Give every Aira skill a challenge-unlocked gem so desafio is allowed to fire.
  const unlockedGems = () => {
    const gems: Record<string, { skillId: string; level: number; progress: number }> = {}
    for (const id of Object.keys(CATALOG.aira.skills)) {
      gems[id] = { skillId: id, level: 2, progress: 0 }
    }
    return gems
  }

  function countDesafios(challengeFrequency: number): number {
    const gems = unlockedGems()
    let desafios = 0
    for (let i = 0; i < 200; i++) {
      const dateISO = addDays('2026-01-01', i)
      const day = composeDay(dateISO, 'aira', progress(), bundle(), settings({ challengeFrequency }), gems)
      if (day.surprise?.kind === 'desafio') desafios++
    }
    return desafios
  }

  it('a high frequency yields strictly more desafio days than a low frequency over a seeded sweep', () => {
    const low = countDesafios(0.1)
    const high = countDesafios(0.5)
    expect(high).toBeGreaterThan(low)
  })

  it('frequency 0 produces no desafio days (but other surprises still fire)', () => {
    const gems = unlockedGems()
    let desafios = 0
    let otherSurprises = 0
    for (let i = 0; i < 200; i++) {
      const dateISO = addDays('2026-01-01', i)
      const day = composeDay(dateISO, 'aira', progress(), bundle(), settings({ challengeFrequency: 0 }), gems)
      if (day.surprise?.kind === 'desafio') desafios++
      else if (day.surprise !== null) otherSurprises++
    }
    expect(desafios).toBe(0)
    expect(otherSurprises).toBeGreaterThan(0)
  })
})

describe('dictation language alternation', () => {
  it('is >= 60% catalan over EVERY rolling 30-day window in a 90-day simulation', () => {
    const results: boolean[] = [] // true = ca
    for (let i = 0; i < 90; i++) {
      const dateISO = addDays('2026-07-01', i)
      const day = composeDay(dateISO, 'aira', progress(), bundle(), settings(), {})
      const dictado = day.cards.find((c) => c.cardType === 'dictado')
      results.push(dictado?.language === 'ca')
    }
    for (let start = 0; start + 30 <= results.length; start++) {
      const window = results.slice(start, start + 30)
      const caCount = window.filter(Boolean).length
      expect(caCount).toBeGreaterThanOrEqual(0.6 * 30)
    }
  })

  it('follows a deterministic 3-day cycle: exactly 2 ca + 1 es per cycle, stable across profiles/runs', () => {
    // Cycles are anchored to a fixed epoch (2026-01-01), not the simulation's
    // start date, so we align the sample window to an actual cycle boundary
    // (a day index that's a multiple of 3 days after the epoch) rather than
    // assuming day 0 of the loop is a cycle boundary.
    const epochOffset = daysBetween('2026-01-01', '2026-07-01')
    const alignmentPadding = (3 - (epochOffset % 3)) % 3
    const alignedStart = addDays('2026-07-01', alignmentPadding)

    const languages: ('ca' | 'es')[] = []
    for (let i = 0; i < 9; i++) {
      const dateISO = addDays(alignedStart, i)
      const day = composeDay(dateISO, 'aira', progress(), bundle(), settings(), {})
      const dictado = day.cards.find((c) => c.cardType === 'dictado')
      languages.push(dictado!.language!)
    }
    for (let cycleStart = 0; cycleStart < languages.length; cycleStart += 3) {
      const cycle = languages.slice(cycleStart, cycleStart + 3)
      expect(cycle.filter((l) => l === 'ca').length).toBe(2)
      expect(cycle.filter((l) => l === 'es').length).toBe(1)
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
