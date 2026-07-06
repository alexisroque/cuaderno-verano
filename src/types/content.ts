import type { Chapter } from '../content/schemas'

export type { Chapter }

/** One episode of a serialized story, delivered as a daily dictation + comprehension mini-lesson. */
export interface Episode {
  id: string
  order: number
  title: string
  dictation: { ca: string; es: string }
  factExtra: { ca: string; es: string }
  hook: string
  questions: { q: string; choices: string[]; correctIdx: number; kind: 'reflexiva' | 'literal' }[]
}

/** A serialized story: an ordered sequence of episodes consumed one per day. */
export interface Series {
  id: string
  title: string
  emoji: string
  episodes: Episode[]
}

/** A "did you know?" fact card, optionally tied to a chapter for geographic/thematic relevance. */
export interface Curiosity {
  id: string
  text: { es: string }
  tag: string
  chapterId?: string
  premium?: boolean
}

/** A joke used to occasionally replace a dictation. */
export interface Joke {
  id: string
  text: { es?: string; ca?: string }
  kind: 'chiste'
}

/** A journal-writing prompt, optionally tied to a chapter. */
export interface DiaryPrompt {
  id: string
  text: { es: string }
  chapterId?: string
}

/** A short illustrated story with a comprehension question, for Leo. */
export interface CuentoLeo {
  id: string
  title: string
  sentences: string[]
  question: { q: string; choices: string[]; correctIdx: number }
}

/** The full static content package Phase 4 will produce; the composer only ever reads from this. */
export interface ContentBundle {
  chapters: Chapter[]
  series: Series[]
  curiosities: Curiosity[]
  jokes: Joke[]
  diaryPrompts: DiaryPrompt[]
  cuentosLeo: CuentoLeo[]
}
