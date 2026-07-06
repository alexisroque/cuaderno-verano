import type { Rng } from '../../lib/rng'
import type { GeographyItem, MundoItem, EnglishReading } from '../../content/schemas'
import type { QuestionLike } from './QuestionTiles'

/** The skills a quiz round records attempts against. */
export type QuizSkill = 'geografia' | 'mundo' | 'english' | 'lectura'

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
}

/**
 * Spanish topic labels for geography tags, used to build a "¿sobre qué trata
 * este dato?" question whose choices are honest and distinct (the fact text
 * itself names the concept, so the mapping is verifiable, not invented).
 */
const GEO_TAG_LABELS: Record<string, string> = {
  'capital-of': 'la capital de un país',
  'where-is': 'dónde está un lugar',
  'flag-pick': 'una bandera',
}

/** Spanish topic labels for mundo tags. */
const MUNDO_TAG_LABELS: Record<string, string> = {
  'sistema-solar': 'el espacio y el sistema solar',
  'como-funciona': 'cómo funcionan las cosas',
  'curiosidad-ciencia': 'una curiosidad de ciencia',
}

/**
 * Builds a 4-choice "topic recognition" question from a fact whose `tag` maps
 * to a label. The correct choice is the fact's own topic label; distractors
 * are the other labels for that pool plus, if fewer than 3, a generic filler.
 * Deterministic over `rng`. Returns null when the tag isn't mappable.
 */
function topicQuestion(
  rng: Rng,
  tag: string | undefined,
  labels: Record<string, string>,
  fillers: string[],
): QuestionLike | null {
  if (!tag) return null
  const correct = labels[tag]
  if (!correct) return null

  const others = Object.values(labels).filter((l) => l !== correct)
  const pool = [...others, ...fillers.filter((f) => f !== correct)]
  const distractors = rng.shuffle(pool).slice(0, 3)
  const choices = rng.shuffle([correct, ...distractors])
  return {
    q: '¿Sobre qué trata este dato?',
    choices,
    correctIdx: choices.indexOf(correct),
    kind: 'literal',
  }
}

const GEO_FILLERS = ['un animal salvaje', 'una comida típica', 'un río muy largo', 'una montaña alta']
const MUNDO_FILLERS = ['la historia antigua', 'los deportes', 'la música', 'los inventos famosos']

/** Maps a geography tag to the geografia subskill it feeds (capitales/banderas/donde-esta). */
function geoSubskillFor(tag: string | undefined): string {
  if (tag === 'capital-of') return 'capitales'
  if (tag === 'flag-pick') return 'banderas'
  return 'donde-esta'
}

/** Builds a quiz item from a geography fact, or null if it isn't quizzable. */
export function geographyQuizItem(rng: Rng, item: GeographyItem): QuizItem | null {
  const question = topicQuestion(rng, item.tag, GEO_TAG_LABELS, GEO_FILLERS)
  if (!question) return null
  return { id: item.id, passage: item.text.es, question, skill: 'geografia', subskill: geoSubskillFor(item.tag) }
}

/** Builds a quiz item from a mundo fact, or null if it isn't quizzable. */
export function mundoQuizItem(rng: Rng, item: MundoItem): QuizItem | null {
  const question = topicQuestion(rng, item.tag, MUNDO_TAG_LABELS, MUNDO_FILLERS)
  if (!question) return null
  const subskill = item.tag === 'sistema-solar' ? 'espacio' : 'como-funciona'
  return { id: item.id, passage: item.text.es, question, skill: 'mundo', subskill }
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
