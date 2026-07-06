import { describe, expect, it } from 'vitest'
import {
  TREASURES,
  treasureById,
  canAfford,
  equippedAccessory,
  stickerForDay,
  parseStickerId,
  stickerEmoji,
  milestones,
} from './collections'
import type { Chapter } from '../content/schemas'
import type { ProfileProgress } from '../types/progress'

function chapter(overrides: Partial<Chapter> = {}): Chapter {
  return {
    id: 'borneo',
    title: 'Borneo',
    emoji: '🌴',
    dateStart: '2026-07-15',
    dateEnd: '2026-07-20',
    place: 'Borneo',
    mascot: { id: 'm', name: 'Tang', emoji: '🦧' },
    flavor: { currencySymbol: 'RM', placePhrase: 'en Borneo', priceItems: ['a', 'b', 'c', 'd'], landmarks: [], animals: [], foods: [] },
    stickers: [
      { id: 'orangutan', emoji: '🦧', name: 'Orangután' },
      { id: 'selva', emoji: '🌴', name: 'Selva' },
      { id: 'lluvia', emoji: '🌧️', name: 'Lluvia' },
    ],
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

describe('treasure pricing', () => {
  it('every treasure costs a flat cheap 5-15 coins', () => {
    for (const t of TREASURES) {
      expect(t.cost).toBeGreaterThanOrEqual(5)
      expect(t.cost).toBeLessThanOrEqual(15)
    }
  })

  it('canAfford requires enough coins and not-already-owned', () => {
    const t = TREASURES[0]
    expect(canAfford(t.cost, [], t)).toBe(true)
    expect(canAfford(t.cost - 1, [], t)).toBe(false)
    expect(canAfford(t.cost, [t.id], t)).toBe(false)
  })

  it('treasureById round-trips', () => {
    expect(treasureById(TREASURES[0].id)).toBe(TREASURES[0])
    expect(treasureById('nope')).toBeUndefined()
  })

  it('equippedAccessory returns the last-unlocked accessory', () => {
    expect(equippedAccessory([])).toBeUndefined()
    expect(equippedAccessory(['joke-pack-1'])).toBeUndefined()
    expect(equippedAccessory(['hat-party', 'hat-crown'])?.id).toBe('hat-crown')
  })
})

describe('sticker grant', () => {
  it('is deterministic for the same day and chapter-scoped', () => {
    const a = stickerForDay(chapter(), '2026-07-16')
    const b = stickerForDay(chapter(), '2026-07-16')
    expect(a).toBe(b)
    expect(a.startsWith('borneo:')).toBe(true)
  })

  it('parseStickerId + stickerEmoji resolve back to the emoji', () => {
    const id = stickerForDay(chapter(), '2026-07-16')
    const { chapterId } = parseStickerId(id)
    expect(chapterId).toBe('borneo')
    expect(['🦧', '🌴', '🌧️']).toContain(stickerEmoji(id, [chapter()]))
  })
})

describe('milestones', () => {
  it('marks achieved based on active days, gem level and challenge success', () => {
    const p = progress({
      completedCards: { '2026-07-15': ['trazos'], '2026-07-16': ['trazos'] },
      gems: { calculo: { skillId: 'calculo', level: 2, progress: 0 } },
      attempts: [{ dateISO: '2026-07-16', cardType: 'problema', subskill: 'x', correct: true, hintsUsed: 0, ms: 0, difficulty: 3 }],
    })
    const m = milestones(p)
    expect(m.find((x) => x.id === 'primer-dia')?.achieved).toBe(true)
    expect(m.find((x) => x.id === 'primera-semana')?.achieved).toBe(false)
    expect(m.find((x) => x.id === 'gema-ambar')?.achieved).toBe(true)
    expect(m.find((x) => x.id === 'desafio-5')?.achieved).toBe(true)
  })
})
