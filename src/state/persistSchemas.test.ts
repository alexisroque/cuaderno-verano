import { describe, expect, it } from 'vitest'
import { PersistedSettingsSchema, ProfileProgressSchema } from './persistSchemas'

function validProgress() {
  return {
    attempts: [
      { dateISO: '2026-07-16', cardType: 'mc', subskill: 'tablas', correct: true, hintsUsed: 0, ms: 1200, difficulty: 2 },
    ],
    gems: { calculo: { skillId: 'calculo', level: 2, progress: 0.5 } },
    streak: { count: 3, lastDayISO: '2026-07-16', graceUsed: 0 },
    stickers: [{ stickerId: 'sticker-1', x: 10, y: 20, chapterId: 'preparativos' }],
    passportStamps: ['preparativos'],
    diaryEntries: [{ dateISO: '2026-07-16', promptId: 'p1', text: 'Hoy...' }],
    coins: 12,
    consumedContent: { calculo: ['card-1'] },
    unlockedTreasures: ['treasure-1'],
  }
}

function validSettings() {
  return {
    pin: null,
    children: {
      aira: {
        missionSize: 5,
        challengeFrequency: 0.2,
        moduleToggles: { math: true },
        subskillAdjustments: {},
        weeklyFocus: [],
      },
      leo: {
        missionSize: 5,
        challengeFrequency: 0.2,
        moduleToggles: { math: true },
        subskillAdjustments: {
          contar: { difficultyOffset: 0, boostUntil: '2026-07-20' },
        },
        weeklyFocus: ['contar-6'],
      },
    },
  }
}

describe('ProfileProgressSchema', () => {
  it('accepts a well-formed profile progress blob', () => {
    const result = ProfileProgressSchema.safeParse(validProgress())
    expect(result.success).toBe(true)
  })

  it('rejects a corrupted blob (wrong types)', () => {
    const corrupted = { ...validProgress(), coins: 'lots' }
    const result = ProfileProgressSchema.safeParse(corrupted)
    expect(result.success).toBe(false)
  })

  it('rejects a blob missing required fields', () => {
    const corrupted = { coins: 5 }
    const result = ProfileProgressSchema.safeParse(corrupted)
    expect(result.success).toBe(false)
  })

  it('rejects null and arbitrary junk', () => {
    expect(ProfileProgressSchema.safeParse(null).success).toBe(false)
    expect(ProfileProgressSchema.safeParse('garbage').success).toBe(false)
    expect(ProfileProgressSchema.safeParse(42).success).toBe(false)
  })
})

describe('PersistedSettingsSchema', () => {
  it('accepts a well-formed settings blob', () => {
    const result = PersistedSettingsSchema.safeParse(validSettings())
    expect(result.success).toBe(true)
  })

  it('accepts a null pin', () => {
    const result = PersistedSettingsSchema.safeParse({ ...validSettings(), pin: null })
    expect(result.success).toBe(true)
  })

  it('accepts a string pin', () => {
    const result = PersistedSettingsSchema.safeParse({ ...validSettings(), pin: '1234' })
    expect(result.success).toBe(true)
  })

  it('rejects a corrupted blob', () => {
    const corrupted = { pin: null, children: { aira: { missionSize: 'five' } } }
    const result = PersistedSettingsSchema.safeParse(corrupted)
    expect(result.success).toBe(false)
  })

  it('defaults voicePrefs to {} for blobs saved before the field existed', () => {
    const result = PersistedSettingsSchema.safeParse(validSettings())
    expect(result.success).toBe(true)
    if (result.success) expect(result.data.voicePrefs).toEqual({})
  })

  it('defaults leoAutoNarration to false for blobs saved before the field existed', () => {
    const result = PersistedSettingsSchema.safeParse(validSettings())
    expect(result.success).toBe(true)
    if (result.success) expect(result.data.leoAutoNarration).toBe(false)
  })

  it('accepts an explicit leoAutoNarration=true', () => {
    const result = PersistedSettingsSchema.safeParse({ ...validSettings(), leoAutoNarration: true })
    expect(result.success).toBe(true)
    if (result.success) expect(result.data.leoAutoNarration).toBe(true)
  })

  it('accepts a voicePrefs map of chosen voiceURIs', () => {
    const result = PersistedSettingsSchema.safeParse({
      ...validSettings(),
      voicePrefs: { ca: 'ca-enhanced', es: 'es-siri' },
    })
    expect(result.success).toBe(true)
    if (result.success) expect(result.data.voicePrefs).toEqual({ ca: 'ca-enhanced', es: 'es-siri' })
  })
})
