import type { Chapter } from '../content/schemas'
import type { ContentBundle } from '../types/content'
import type { GemState, ProfileProgress } from '../types/progress'
import type { ChildSettings } from '../state/settingsStore'
import type { ProfileId } from '../state/profileStore'
import { createRng } from '../lib/rng'
import { rollSurprise, type Surprise } from './surprises'
import { buildAiraCards, buildLeoCards, type CardDescriptor } from './dayComposerCards'

export type { CardDescriptor, ContentRef, CardType } from './dayComposerCards'

export interface DayPage {
  dateISO: string
  chapterId: string
  cards: CardDescriptor[]
  surprise: Surprise | null
}

/**
 * Resolves the chapter covering `dateISO` (start-inclusive, end-exclusive
 * ranges, per ChapterSchema). Out-of-range dates clamp: before the first
 * chapter's start returns the first chapter, after the last chapter's end
 * returns the last chapter. `chapters` is assumed sorted by dateStart
 * ascending with no gaps/overlaps (see validateChapters).
 */
export function chapterForDate(chapters: Chapter[], dateISO: string): Chapter {
  if (chapters.length === 0) {
    throw new Error('chapterForDate: empty chapters list')
  }
  if (dateISO < chapters[0].dateStart) return chapters[0]
  const last = chapters[chapters.length - 1]
  if (dateISO >= last.dateEnd) return last

  for (const chapter of chapters) {
    if (dateISO >= chapter.dateStart && dateISO < chapter.dateEnd) {
      return chapter
    }
  }
  // Unreachable given a well-formed (gapless) chapters list, but keeps the
  // function total rather than possibly-undefined.
  return last
}

/**
 * Composes one day's page for `profile`: resolves the chapter, builds the
 * fixed card sequence (Aira: problema/dictado/sabias-que/diario; Leo:
 * trazos/contar/english/sorpresa-rotatoria), and rolls a surprise. Pure and
 * deterministic: every random choice is seeded from `dateISO`/`profile`/
 * card index, so identical inputs always produce a deep-equal `DayPage`.
 */
export function composeDay(
  dateISO: string,
  profile: ProfileId,
  progress: ProfileProgress,
  content: ContentBundle,
  settings: ChildSettings,
  gems: Record<string, GemState>,
): DayPage {
  const chapter = chapterForDate(content.chapters, dateISO)

  // Surprise is rolled BEFORE the card sequence is built so a `desafio` roll
  // can steer card construction (see buildAiraCards/buildLeoCards): a
  // desafio day swaps one base card for an actual challenge exercise.
  const gemsWithProgress = Object.values(gems).map((g) => ({ skillId: g.skillId, level: g.level, progress: g.progress }))
  const surpriseRng = createRng(`${dateISO}:${profile}:surprise`)
  const surprise = rollSurprise(surpriseRng, gemsWithProgress, profile, settings.challengeFrequency)

  const cards =
    profile === 'aira'
      ? buildAiraCards(dateISO, profile, progress, content, settings, gems, surprise)
      : buildLeoCards(dateISO, profile, progress, content, settings, gems, surprise)

  return { dateISO, chapterId: chapter.id, cards, surprise }
}
