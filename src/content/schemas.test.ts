import { describe, expect, it } from 'vitest'
import { ChapterSchema, validateChapters } from './schemas'
import realChapters from '../../content/chapters.json'

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
