import { describe, expect, it } from 'vitest'
import {
  BACKUP_VERSION,
  serializeBackup,
  parseBackup,
  exportDiaryText,
  type BackupPayload,
} from './backup'
import type { ProfileProgress } from '../types/progress'
import type { ChildSettings } from '../state/settingsStore'

function emptyProgress(): ProfileProgress {
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
  }
}

function childSettings(): ChildSettings {
  return {
    missionSize: 5,
    challengeFrequency: 0.2,
    moduleToggles: { math: true },
    subskillAdjustments: {},
    weeklyFocus: [],
  }
}

function samplePayload(): BackupPayload {
  return {
    version: BACKUP_VERSION,
    exportedAt: '2026-07-16',
    profiles: { aira: emptyProgress(), leo: emptyProgress() },
    settings: {
      pin: '1234hash',
      children: { aira: childSettings(), leo: childSettings() },
      lastExport: null,
      voicePrefs: {},
      leoAutoNarration: false,
    },
  }
}

describe('serializeBackup / parseBackup round-trip', () => {
  it('round-trips a valid payload', () => {
    const payload = samplePayload()
    const json = serializeBackup(payload)
    const parsed = parseBackup(json)
    expect(parsed.version).toBe(BACKUP_VERSION)
    expect(parsed.profiles.aira.coins).toBe(0)
    expect(parsed.settings.children.leo.missionSize).toBe(5)
  })

  it('preserves attempts and diary entries through a round-trip', () => {
    const payload = samplePayload()
    payload.profiles.aira.coins = 42
    payload.profiles.aira.attempts.push({
      dateISO: '2026-07-15',
      cardType: 'mc',
      subskill: 'tablas',
      correct: true,
      hintsUsed: 0,
      ms: 3000,
      difficulty: 2,
    })
    payload.profiles.aira.diaryEntries.push({
      dateISO: '2026-07-15',
      promptId: 'p1',
      text: 'Hoy vimos orangutanes.',
    })
    const parsed = parseBackup(serializeBackup(payload))
    expect(parsed.profiles.aira.coins).toBe(42)
    expect(parsed.profiles.aira.attempts).toHaveLength(1)
    expect(parsed.profiles.aira.diaryEntries[0].text).toBe('Hoy vimos orangutanes.')
  })

  it('rejects a completely malformed json string', () => {
    expect(() => parseBackup('not json at all')).toThrow()
  })

  it('rejects a payload with the wrong version', () => {
    const bad = { ...samplePayload(), version: 999 }
    expect(() => parseBackup(JSON.stringify(bad))).toThrow(/versión|version/i)
  })

  it('rejects a payload missing required fields', () => {
    const bad = { version: BACKUP_VERSION, exportedAt: '2026-07-16' }
    expect(() => parseBackup(JSON.stringify(bad))).toThrow()
  })
})

describe('exportDiaryText', () => {
  it('produces a titled, human-readable diary', () => {
    const progress = emptyProgress()
    progress.diaryEntries = [
      { dateISO: '2026-07-15', promptId: 'p1', text: 'Vimos orangutanes.' },
      { dateISO: '2026-07-14', promptId: 'p2', text: 'Volamos a Singapur.' },
    ]
    const text = exportDiaryText('aira', progress)
    expect(text).toContain('El diario de Aira')
    expect(text).toContain('verano 2026')
    expect(text).toContain('Vimos orangutanes.')
    expect(text).toContain('Volamos a Singapur.')
  })

  it('orders entries chronologically, oldest first', () => {
    const progress = emptyProgress()
    progress.diaryEntries = [
      { dateISO: '2026-07-15', promptId: 'p1', text: 'segundo' },
      { dateISO: '2026-07-14', promptId: 'p2', text: 'primero' },
    ]
    const text = exportDiaryText('aira', progress)
    expect(text.indexOf('primero')).toBeLessThan(text.indexOf('segundo'))
  })

  it('handles an empty diary gracefully', () => {
    const text = exportDiaryText('leo', emptyProgress())
    expect(text).toContain('El diario de Leo')
    expect(text.length).toBeGreaterThan(0)
  })
})
