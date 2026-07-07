import { describe, expect, it } from 'vitest'
import {
  ChapterSchema,
  validateChapters,
  EpisodeSchema,
  SeriesSchema,
  validateSeries,
  CuriositySchema,
  JokeSchema,
  DiaryPromptSchema,
  GeographyItemSchema,
  EnglishUnitSchema,
  EnglishReadingSchema,
  MundoItemSchema,
  MundoItemsSchema,
  CuentoLeoSchema,
} from './schemas'
import realChapters from '../../content/chapters.json'
import realMundo from '../../content/mundo.json'

function makeChapter(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: 'preparativos',
    title: 'Preparativos',
    emoji: '🧳',
    dateStart: '2026-06-29',
    dateEnd: '2026-07-12',
    place: 'Barcelona',
    mascot: { id: 'kiko', name: 'Kiko el gato explorador', emoji: '🐱' },
    flavor: {
      currencySymbol: '€',
      placePhrase: 'en Barcelona',
      priceItems: ['bocadillo de tortilla', 'granizado', 'helado', 'plato de paella'],
      landmarks: ['Aeropuerto', 'Casa', 'Maleta', 'Mapa'],
      animals: ['Gato'],
      foods: ['Bocadillo'],
    },
    stickers: Array.from({ length: 10 }, (_, i) => ({
      id: `sticker-${i}`,
      emoji: '⭐',
      name: `Pegatina ${i}`,
    })),
    ...overrides,
  }
}

describe('ChapterSchema', () => {
  it('accepts a well-formed chapter', () => {
    expect(() => ChapterSchema.parse(makeChapter())).not.toThrow()
  })

  it('rejects a chapter missing required flavor fields', () => {
    const bad = makeChapter({ flavor: { landmarks: [] } })
    expect(() => ChapterSchema.parse(bad)).toThrow()
  })

  it('rejects malformed dates', () => {
    const bad = makeChapter({ dateStart: '29-06-2026' })
    expect(() => ChapterSchema.parse(bad)).toThrow()
  })
})

describe('validateChapters', () => {
  it('accepts the real chapter list with full coverage and no gaps/overlaps', () => {
    expect(() => validateChapters(realChapters)).not.toThrow()
  })

  it('rejects overlapping date ranges', () => {
    const a = makeChapter({ id: 'a', dateStart: '2026-06-29', dateEnd: '2026-07-13' })
    const b = makeChapter({ id: 'b', dateStart: '2026-07-12', dateEnd: '2026-07-20' })
    expect(() => validateChapters([a, b])).toThrow(/overlap/i)
  })

  it('rejects gaps between consecutive chapters', () => {
    const a = makeChapter({ id: 'a', dateStart: '2026-06-29', dateEnd: '2026-07-10' })
    const b = makeChapter({ id: 'b', dateStart: '2026-07-12', dateEnd: '2026-07-20' })
    expect(() => validateChapters([a, b])).toThrow(/gap/i)
  })

  it('rejects a list not covering the full summer range', () => {
    const a = makeChapter({ id: 'a', dateStart: '2026-06-29', dateEnd: '2026-07-12' })
    expect(() => validateChapters([a])).toThrow(/coverage|2026-09-13/i)
  })

  it('rejects a list not sorted by dateStart', () => {
    const a = makeChapter({ id: 'a', dateStart: '2026-07-12', dateEnd: '2026-09-13' })
    const b = makeChapter({ id: 'b', dateStart: '2026-06-29', dateEnd: '2026-07-12' })
    expect(() => validateChapters([a, b])).toThrow(/sorted|order/i)
  })
})

function makeEpisode(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: 'ep-1',
    order: 1,
    title: 'Episodi 1',
    dictation: {
      ca: "L'home prehistòric va aprendre a fer foc fa milers d'anys, molt abans de saber escriure cap paraula. Amb el foc es cuinava la carn, s'escalfava el campament i s'espantaven els animals perillosos de la nit.",
      es: 'El hombre prehistórico aprendió a hacer fuego hace miles de años, mucho antes de saber escribir ninguna palabra. Con el fuego se cocinaba la carne, se calentaba el campamento y se asustaba a los animales peligrosos de la noche.',
    },
    factExtra: {
      ca: 'Sabies que el foc es va fer servir fa més de 400.000 anys?',
      es: '¿Sabías que el fuego se usó hace más de 400.000 años?',
    },
    hook: 'Demà descobrirem com vivien en coves.',
    questions: [
      { q: 'Per a què servia el foc?', choices: ['Cuinar', 'Volar', 'Nedar', 'Res'], correctIdx: 0, kind: 'literal' },
      {
        q: 'Si no tinguessis foc a l\'hivern, què faries?',
        choices: ['Buscaria abric', 'Res', 'Ploraria', 'Fugiria'],
        correctIdx: 0,
        kind: 'reflexiva',
      },
    ],
    ...overrides,
  }
}

describe('EpisodeSchema', () => {
  it('accepts a well-formed episode', () => {
    expect(() => EpisodeSchema.parse(makeEpisode())).not.toThrow()
  })

  it('rejects an episode with no reflexiva question', () => {
    const bad = makeEpisode({
      questions: [{ q: 'Q?', choices: ['a', 'b', 'c', 'd'], correctIdx: 0, kind: 'literal' }],
    })
    expect(() => EpisodeSchema.parse(bad)).toThrow(/reflexiva/i)
  })

  it('rejects a dictation that is too short', () => {
    const bad = makeEpisode({ dictation: { ca: 'Text curt.', es: 'Texto corto.' } })
    expect(() => EpisodeSchema.parse(bad)).toThrow(/words/i)
  })

  it('rejects a dictation with fewer than 2 sentences', () => {
    const longSingleSentence = makeEpisode({
      dictation: {
        ca: 'Aquesta és una sola frase molt llarga que continua i continua sense punt final fins arribar al límit de paraules necessari per la validació',
        es: 'Esta es una sola frase muy larga que continúa y continúa sin punto final hasta llegar al límite de palabras necesario para la validación',
      },
    })
    expect(() => EpisodeSchema.parse(longSingleSentence)).toThrow(/sentences/i)
  })

  it('rejects choices arrays that are not length 4', () => {
    const bad = makeEpisode({
      questions: [{ q: 'Q?', choices: ['a', 'b'], correctIdx: 0, kind: 'reflexiva' }],
    })
    expect(() => EpisodeSchema.parse(bad)).toThrow()
  })

  it('accepts an untagged (cultural) episode with no focus', () => {
    const parsed = EpisodeSchema.parse(makeEpisode())
    expect(parsed.focus).toBeUndefined()
  })

  it('accepts a focus-tagged episode with a valid rule id + matching lang', () => {
    expect(() => EpisodeSchema.parse(makeEpisode({ focus: 'ca-b-v', lang: 'ca' }))).not.toThrow()
  })

  it('accepts a focus-tagged episode with focus but no explicit lang', () => {
    expect(() => EpisodeSchema.parse(makeEpisode({ focus: 'es-tildes' }))).not.toThrow()
  })

  it('rejects an unknown focus rule id', () => {
    expect(() => EpisodeSchema.parse(makeEpisode({ focus: 'ca-nope' }))).toThrow()
  })

  it('rejects a focus/lang mismatch (ca rule tagged es)', () => {
    expect(() => EpisodeSchema.parse(makeEpisode({ focus: 'ca-b-v', lang: 'es' }))).toThrow(/disagrees/i)
  })
})

describe('SeriesSchema / validateSeries', () => {
  function makeSeries(episodeOrders: number[]) {
    return {
      id: 'serie-a',
      title: 'Sèrie A',
      emoji: '📖',
      episodes: episodeOrders.map((order, i) => makeEpisode({ id: `ep-${i + 1}`, order })),
    }
  }

  it('accepts a well-formed series with sequential order', () => {
    expect(() => validateSeries(makeSeries([1, 2, 3]))).not.toThrow()
  })

  it('rejects non-sequential episode order', () => {
    expect(() => validateSeries(makeSeries([1, 3, 4]))).toThrow(/sequential/i)
  })

  it('rejects an empty episodes array', () => {
    expect(() => SeriesSchema.parse({ id: 's', title: 'S', emoji: '📖', episodes: [] })).toThrow()
  })
})

describe('CuriositySchema', () => {
  it('accepts a minimal curiosity', () => {
    expect(() =>
      CuriositySchema.parse({ id: 'c1', text: { es: 'Un dato curioso.' }, tag: 'geo' }),
    ).not.toThrow()
  })

  it('accepts optional chapterId and premium', () => {
    expect(() =>
      CuriositySchema.parse({
        id: 'c1',
        text: { es: 'Un dato curioso.' },
        tag: 'geo',
        chapterId: 'singapur',
        premium: true,
      }),
    ).not.toThrow()
  })

  it('rejects a missing tag', () => {
    expect(() => CuriositySchema.parse({ id: 'c1', text: { es: 'Dato' } })).toThrow()
  })
})

describe('JokeSchema', () => {
  it('accepts a joke with only es', () => {
    expect(() => JokeSchema.parse({ id: 'j1', text: { es: 'Un chiste' }, kind: 'chiste' })).not.toThrow()
  })

  it('accepts a joke with only ca', () => {
    expect(() => JokeSchema.parse({ id: 'j1', text: { ca: 'Un acudit' }, kind: 'chiste' })).not.toThrow()
  })

  it('rejects a joke with neither es nor ca', () => {
    expect(() => JokeSchema.parse({ id: 'j1', text: {}, kind: 'chiste' })).toThrow()
  })
})

describe('DiaryPromptSchema', () => {
  it('accepts a minimal diary prompt', () => {
    expect(() => DiaryPromptSchema.parse({ id: 'd1', text: { es: '¿Qué hiciste hoy?' } })).not.toThrow()
  })
})

describe('GeographyItemSchema', () => {
  const base = {
    id: 'g1',
    name: 'Malasia',
    capital: 'Kuala Lumpur',
    flag: '🇲🇾',
    continent: 'Asia',
    mapId: 'sudeste-asiatico',
    regionId: 'malasia',
  }

  it('accepts a structured country entry', () => {
    expect(() => GeographyItemSchema.parse(base)).not.toThrow()
    expect(() => GeographyItemSchema.parse({ ...base, chapterId: 'kuala-lumpur' })).not.toThrow()
  })

  it('rejects an unknown continent and missing map fields', () => {
    expect(() => GeographyItemSchema.parse({ ...base, continent: 'Marte' })).toThrow()
    expect(() => GeographyItemSchema.parse({ ...base, regionId: undefined })).toThrow()
  })
})

describe('EnglishUnitSchema', () => {
  it('accepts a vocab unit', () => {
    expect(() =>
      EnglishUnitSchema.parse({ id: 'e1', word: 'elephant', emoji: '🐘', audioText: 'This is an elephant.' }),
    ).not.toThrow()
  })
})

describe('EnglishReadingSchema', () => {
  it('accepts a mini-reading with a literal and a reflexiva question', () => {
    expect(() =>
      EnglishReadingSchema.parse({
        id: 'r1',
        title: 'The trip',
        sentences: ['We are going to Singapore.', 'It is very hot there.'],
        questions: [
          {
            q: 'Where are they going?',
            choices: ['Singapore', 'Paris', 'Rome', 'Tokyo'],
            correctIdx: 0,
            kind: 'literal',
          },
          {
            q: 'Why do you think they are excited?',
            choices: ['It is a new place', 'They are bored', 'They are sad', 'They are tired'],
            correctIdx: 0,
            kind: 'reflexiva',
          },
        ],
      }),
    ).not.toThrow()
  })

  it('rejects a reading with no reflexiva question', () => {
    expect(() =>
      EnglishReadingSchema.parse({
        id: 'r1',
        title: 'The trip',
        sentences: ['We are going to Singapore.'],
        questions: [
          { q: 'Where?', choices: ['Singapore', 'Paris', 'Rome', 'Tokyo'], correctIdx: 0, kind: 'literal' },
          { q: 'When?', choices: ['Today', 'Tomorrow', 'Never', 'Yesterday'], correctIdx: 0, kind: 'literal' },
        ],
      }),
    ).toThrow(/reflexiva/i)
  })

  it('rejects a reading with fewer than 2 questions', () => {
    expect(() =>
      EnglishReadingSchema.parse({
        id: 'r1',
        title: 'The trip',
        sentences: ['We are going to Singapore.'],
        questions: [{ q: 'Where?', choices: ['Singapore', 'Paris', 'Rome', 'Tokyo'], correctIdx: 0, kind: 'reflexiva' }],
      }),
    ).toThrow()
  })
})

describe('MundoItemSchema', () => {
  const base = {
    id: 'm1',
    subskill: 'espacio',
    question: { es: '¿Cuál es el planeta más grande?' },
    choices: [{ es: 'Júpiter' }, { es: 'Saturno' }, { es: 'la Tierra' }, { es: 'Marte' }],
    correctIdx: 0,
    emoji: '🪐',
    explanation: { es: 'Júpiter es enorme.' },
  }

  it('accepts a well-formed mundo quiz item', () => {
    expect(() => MundoItemSchema.parse(base)).not.toThrow()
  })

  it('rejects a subskill outside the two Mundo gems', () => {
    expect(() => MundoItemSchema.parse({ ...base, subskill: 'historia' })).toThrow()
  })

  it('rejects a choices array that is not length 4', () => {
    expect(() => MundoItemSchema.parse({ ...base, choices: [{ es: 'a' }, { es: 'b' }, { es: 'c' }] })).toThrow()
  })

  it('rejects a correctIdx out of range', () => {
    expect(() => MundoItemSchema.parse({ ...base, correctIdx: 4 })).toThrow()
  })

  it('rejects duplicate choices', () => {
    expect(() =>
      MundoItemSchema.parse({ ...base, choices: [{ es: 'Júpiter' }, { es: 'Júpiter' }, { es: 'la Tierra' }, { es: 'Marte' }] }),
    ).toThrow(/distinct/i)
  })

  it('accepts the real mundo pool: every item has 4 choices and a valid correctIdx', () => {
    const items = MundoItemsSchema.parse(realMundo)
    expect(items.length).toBeGreaterThan(0)
    for (const item of items) {
      expect(item.choices).toHaveLength(4)
      expect(item.correctIdx).toBeGreaterThanOrEqual(0)
      expect(item.correctIdx).toBeLessThanOrEqual(3)
      expect(item.choices[item.correctIdx]).toBeDefined()
    }
  })
})

describe('CuentoLeoSchema', () => {
  it('accepts a minimal cuento', () => {
    expect(() =>
      CuentoLeoSchema.parse({
        id: 'cu1',
        title: 'El gato Kiko',
        sentences: ['Kiko es un gato.', 'Le gusta viajar.'],
        question: { q: '¿Quién es Kiko?', choices: ['Un gato', 'Un perro', 'Un pez', 'Un pájaro'], correctIdx: 0 },
      }),
    ).not.toThrow()
  })
})
