import * as z from 'zod'
import { ORTOGRAFIA_RULE_IDS, ruleLang } from '../engine/skills'

/** YYYY-MM-DD date string, validated by pattern only (no calendar checks). */
const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'expected YYYY-MM-DD')

const MascotSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  emoji: z.string().min(1),
})

const StickerSchema = z.object({
  id: z.string().min(1),
  emoji: z.string().min(1),
  name: z.string().min(1),
})

const FlavorSchema = z.object({
  currency: z.string().min(1).optional(),
  /** Short symbol for math prompts, e.g. "€", "S$", "RM", "Rp". */
  currencySymbol: z.string().min(1),
  /** Ready-to-insert locative phrase, lowercase start, e.g. "en Singapur", "durante el vuelo". */
  placePhrase: z.string().min(1),
  /** Singular, lowercase, interpolation-safe noun phrases natural after "cada" (>= 4 per chapter). */
  priceItems: z.array(z.string().min(1)).min(4),
  landmarks: z.array(z.string().min(1)),
  animals: z.array(z.string().min(1)),
  foods: z.array(z.string().min(1)),
})

/**
 * A chapter of the summer itinerary. Date ranges are start-INCLUSIVE,
 * end-EXCLUSIVE: a day belongs to the chapter where
 * `dateStart <= day < dateEnd`.
 */
export const ChapterSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  emoji: z.string().min(1),
  dateStart: isoDate,
  dateEnd: isoDate,
  place: z.string().min(1),
  mascot: MascotSchema,
  flavor: FlavorSchema,
  stickers: z.array(StickerSchema).min(1),
})

export type Chapter = z.infer<typeof ChapterSchema>

export const ChaptersSchema = z.array(ChapterSchema)

export const SUMMER_COVERAGE_START = '2026-06-29'
export const SUMMER_COVERAGE_END = '2026-09-13'

/** A bilingual dictation/comprehension question. `reflexiva` = open-ended reasoning ("what would you do / why do you think"); `literal` = fact recall from the text. */
const QuestionSchema = z.object({
  q: z.string().min(1),
  choices: z.array(z.string().min(1)).length(4),
  correctIdx: z.number().int().min(0).max(3),
  kind: z.enum(['reflexiva', 'literal']),
})

/** Word count helper: splits on whitespace, ignoring empty tokens. */
function wordCount(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length
}

/** Sentence count helper: counts terminal punctuation (. ! ?), treating an ellipsis as one boundary. */
function sentenceCount(text: string): number {
  const matches = text.trim().match(/[.!?]+(?:\s|$)/g)
  return matches ? matches.length : 0
}

const dictationRange = { minWords: 25, maxWords: 45, minSentences: 2, maxSentences: 4 }

/** Ortografia spelling-rule ids a dictation can focus on (from the skills catalog). */
const RuleFocusSchema = z.enum(ORTOGRAFIA_RULE_IDS as [string, ...string[]])

/**
 * One episode of a serialized story: dictation in both languages, a wow-fact,
 * a hook, and comprehension questions.
 *
 * `focus`/`lang` (both optional) tag an episode as a spelling-rule-focused
 * dictation: `focus` names the ortografia rule it trains (e.g. `ca-b-v`) and
 * `lang` says which language's dictation to serve. Episodes WITHOUT `focus`
 * are the cultural/story dictations (unchanged, still valid). When `focus` is
 * present but `lang` is omitted, `lang` is inferred from the rule's prefix
 * (see `ruleLang`); when both are present they must agree.
 */
export const EpisodeSchema = z
  .object({
    id: z.string().min(1),
    order: z.number().int().min(1),
    title: z.string().min(1),
    focus: RuleFocusSchema.optional(),
    lang: z.enum(['ca', 'es']).optional(),
    dictation: z.object({
      ca: z.string().min(1),
      es: z.string().min(1),
    }),
    factExtra: z.object({
      ca: z.string().min(1),
      es: z.string().min(1),
    }),
    hook: z.string().min(1),
    questions: z.array(QuestionSchema).min(1),
  })
  .superRefine((episode, ctx) => {
    if (episode.focus && episode.lang && ruleLang(episode.focus) !== episode.lang) {
      ctx.addIssue({
        code: 'custom',
        message: `episode "${episode.id}": lang "${episode.lang}" disagrees with focus "${episode.focus}" (a ${ruleLang(episode.focus)} rule)`,
        path: ['lang'],
      })
    }
    for (const lang of ['ca', 'es'] as const) {
      const text = episode.dictation[lang]
      const words = wordCount(text)
      const sentences = sentenceCount(text)
      if (words < dictationRange.minWords || words > dictationRange.maxWords) {
        ctx.addIssue({
          code: 'custom',
          message: `dictation.${lang} has ${words} words, expected ${dictationRange.minWords}-${dictationRange.maxWords}`,
          path: ['dictation', lang],
        })
      }
      if (sentences < dictationRange.minSentences || sentences > dictationRange.maxSentences) {
        ctx.addIssue({
          code: 'custom',
          message: `dictation.${lang} has ${sentences} sentences, expected ${dictationRange.minSentences}-${dictationRange.maxSentences}`,
          path: ['dictation', lang],
        })
      }
    }
    const hasReflexiva = episode.questions.some((q) => q.kind === 'reflexiva')
    if (!hasReflexiva) {
      ctx.addIssue({
        code: 'custom',
        message: 'episode must include at least one "reflexiva" question',
        path: ['questions'],
      })
    }
  })

export type Episode = z.infer<typeof EpisodeSchema>

/**
 * The language a focus-tagged dictation should be served in: the episode's
 * explicit `lang` if set, else inferred from the `focus` rule's prefix. Returns
 * undefined for untagged (cultural) episodes, whose language is chosen by the
 * day composer's rotation instead.
 */
export function episodeFocusLang(episode: Episode): 'ca' | 'es' | undefined {
  if (!episode.focus) return undefined
  return episode.lang ?? ruleLang(episode.focus)
}

/** A serialized story: an ordered sequence of episodes consumed one per day. */
export const SeriesSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  emoji: z.string().min(1),
  episodes: z.array(EpisodeSchema).min(1),
})

export type Series = z.infer<typeof SeriesSchema>

/**
 * Validates a parsed series beyond per-episode shape: episode `order` values
 * are sequential starting at 1 (1, 2, 3, ... with no gaps or duplicates).
 * Throws on the first violation found.
 */
export function validateSeries(series: unknown): Series {
  const parsed = SeriesSchema.parse(series)

  const orders = parsed.episodes.map((e) => e.order)
  for (let i = 0; i < orders.length; i++) {
    const expected = i + 1
    if (orders[i] !== expected) {
      throw new Error(
        `series "${parsed.id}": episode order is not sequential — expected order ${expected} at position ${i}, got ${orders[i]} (episode "${parsed.episodes[i].id}")`,
      )
    }
  }

  return parsed
}

/** A "did you know?" fact card, optionally tied to a chapter for geographic/thematic relevance. */
export const CuriositySchema = z.object({
  id: z.string().min(1),
  text: z.object({ es: z.string().min(1) }),
  tag: z.string().min(1),
  chapterId: z.string().min(1).optional(),
  premium: z.boolean().optional(),
})

export type Curiosity = z.infer<typeof CuriositySchema>
export const CuriositiesSchema = z.array(CuriositySchema)

/** A joke used to occasionally replace a dictation. At least one of ca/es must be present. */
export const JokeSchema = z
  .object({
    id: z.string().min(1),
    text: z.object({
      es: z.string().min(1).optional(),
      ca: z.string().min(1).optional(),
    }),
    kind: z.literal('chiste'),
  })
  .superRefine((joke, ctx) => {
    if (!joke.text.es && !joke.text.ca) {
      ctx.addIssue({
        code: 'custom',
        message: 'joke text must have at least one of "es" or "ca"',
        path: ['text'],
      })
    }
  })

export type Joke = z.infer<typeof JokeSchema>
export const JokesSchema = z.array(JokeSchema)

/** A journal-writing prompt, optionally tied to a chapter. */
export const DiaryPromptSchema = z.object({
  id: z.string().min(1),
  text: z.object({ es: z.string().min(1) }),
  chapterId: z.string().min(1).optional(),
})

export type DiaryPrompt = z.infer<typeof DiaryPromptSchema>
export const DiaryPromptsSchema = z.array(DiaryPromptSchema)

/** The five continent labels a country can belong to (Spanish, kid-facing). */
export const CONTINENTS = ['Europa', 'Asia', 'África', 'América', 'Oceanía'] as const

/**
 * One country on one of the three tap-on-map exercises (SE Asia, Europe,
 * World). It carries everything the map players need: its Spanish name and
 * capital, a flag emoji, its continent, which map it lives on (`mapId`) and the
 * id of its tappable region in that map's SVG (`regionId`, matching a path id
 * in `maps.generated.ts`). `chapterId` optionally ties it to a trip chapter.
 *
 * The same real country can appear on two maps (e.g. España on both `europa`
 * and `mundo`), so `id` is per-entry, not per-country: an entry id is unique,
 * but `(mapId, regionId)` is the key the map renderer taps against.
 */
export const GeographyItemSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  capital: z.string().min(1),
  flag: z.string().min(1),
  continent: z.enum(CONTINENTS),
  mapId: z.string().min(1),
  regionId: z.string().min(1),
  chapterId: z.string().min(1).optional(),
})

export type GeographyItem = z.infer<typeof GeographyItemSchema>
export const GeographyItemsSchema = z.array(GeographyItemSchema)

/** One vocabulary card for Leo's English mini-lessons: a word, an emoji, and read-aloud text. */
export const EnglishUnitSchema = z.object({
  id: z.string().min(1),
  word: z.string().min(1),
  emoji: z.string().min(1),
  audioText: z.string().min(1),
})

export type EnglishUnit = z.infer<typeof EnglishUnitSchema>
export const EnglishUnitsSchema = z.array(EnglishUnitSchema)

/** A short English mini-reading with comprehension questions, for Aira. */
export const EnglishReadingSchema = z
  .object({
    id: z.string().min(1),
    title: z.string().min(1),
    sentences: z.array(z.string().min(1)).min(1),
    questions: z.array(QuestionSchema).min(2),
  })
  .superRefine((reading, ctx) => {
    const hasReflexiva = reading.questions.some((q) => q.kind === 'reflexiva')
    if (!hasReflexiva) {
      ctx.addIssue({
        code: 'custom',
        message: 'reading must include at least one "reflexiva" question',
        path: ['questions'],
      })
    }
  })

export type EnglishReading = z.infer<typeof EnglishReadingSchema>
export const EnglishReadingsSchema = z.array(EnglishReadingSchema)

/** A "world facts" item (mundo) — general-knowledge card, e.g. flags, capitals, wildlife. */
export const MundoItemSchema = z.object({
  id: z.string().min(1),
  text: z.object({ es: z.string().min(1) }),
  tag: z.string().min(1).optional(),
  chapterId: z.string().min(1).optional(),
})

export type MundoItem = z.infer<typeof MundoItemSchema>
export const MundoItemsSchema = z.array(MundoItemSchema)

/** A short illustrated story with a comprehension question, for Leo. */
export const CuentoLeoSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  sentences: z.array(z.string().min(1)).min(1),
  question: z.object({
    q: z.string().min(1),
    choices: z.array(z.string().min(1)).length(4),
    correctIdx: z.number().int().min(0).max(3),
  }),
})

export type CuentoLeo = z.infer<typeof CuentoLeoSchema>
export const CuentosLeoSchema = z.array(CuentoLeoSchema)

/**
 * Validates a parsed chapter list beyond per-chapter shape:
 * - every chapter matches ChapterSchema
 * - sorted by dateStart ascending
 * - no gaps between consecutive chapters (each dateEnd === next dateStart)
 * - no overlaps between consecutive chapters
 * - full coverage from SUMMER_COVERAGE_START (inclusive) to
 *   SUMMER_COVERAGE_END (exclusive)
 *
 * Throws on the first violation found.
 */
export function validateChapters(chapters: unknown): Chapter[] {
  const parsed = ChaptersSchema.parse(chapters)

  if (parsed.length === 0) {
    throw new Error('chapters list is empty: no coverage')
  }

  for (let i = 1; i < parsed.length; i++) {
    const prev = parsed[i - 1]
    const curr = parsed[i]
    if (curr.dateStart < prev.dateStart) {
      throw new Error(
        `chapters are not sorted by dateStart: "${curr.id}" (${curr.dateStart}) comes after "${prev.id}" (${prev.dateStart}) out of order`,
      )
    }
  }

  for (let i = 1; i < parsed.length; i++) {
    const prev = parsed[i - 1]
    const curr = parsed[i]
    if (curr.dateStart < prev.dateEnd) {
      throw new Error(
        `chapters "${prev.id}" and "${curr.id}" overlap: ${prev.id} ends ${prev.dateEnd}, ${curr.id} starts ${curr.dateStart}`,
      )
    }
    if (curr.dateStart > prev.dateEnd) {
      throw new Error(
        `gap between chapters "${prev.id}" (ends ${prev.dateEnd}) and "${curr.id}" (starts ${curr.dateStart})`,
      )
    }
  }

  const first = parsed[0]
  const last = parsed[parsed.length - 1]
  if (first.dateStart !== SUMMER_COVERAGE_START || last.dateEnd !== SUMMER_COVERAGE_END) {
    throw new Error(
      `chapters must cover ${SUMMER_COVERAGE_START} to ${SUMMER_COVERAGE_END}, got ${first.dateStart} to ${last.dateEnd}`,
    )
  }

  return parsed
}
