import type { Chapter } from './schemas'
import { ChaptersSchema } from './schemas'
import { chapterForDate } from '../engine/dayComposer'
import { todayISO } from '../lib/clock'
import chaptersJson from '../../content/chapters.json'

/** All trip chapters, validated once at module load. */
export const CHAPTERS: Chapter[] = ChaptersSchema.parse(chaptersJson)

/** The chapter covering `dateISO` (defaults to today). Never returns undefined. */
export function currentChapter(dateISO: string = todayISO()): Chapter {
  return chapterForDate(CHAPTERS, dateISO)
}
