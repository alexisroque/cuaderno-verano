import * as z from 'zod'

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
