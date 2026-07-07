import { beforeEach, describe, expect, it, vi } from 'vitest'

const memoryStore = new Map<string, unknown>()

vi.mock('idb-keyval', () => ({
  get: vi.fn((key: string) => Promise.resolve(memoryStore.get(key))),
  set: vi.fn((key: string, value: unknown) => {
    memoryStore.set(key, value)
    return Promise.resolve()
  }),
}))

import { useSettingsStore, hydrateSettings, flushSettings } from './settingsStore'

describe('settingsStore', () => {
  beforeEach(() => {
    memoryStore.clear()
    useSettingsStore.setState(useSettingsStore.getInitialState())
  })

  it('setPin updates the pin', () => {
    useSettingsStore.getState().setPin('1234')
    expect(useSettingsStore.getState().pin).toBe('1234')
  })

  it('updateChildSettings merges a patch into the given profile only', () => {
    useSettingsStore.getState().updateChildSettings('aira', { missionSize: 8 })

    expect(useSettingsStore.getState().children.aira.missionSize).toBe(8)
    expect(useSettingsStore.getState().children.leo.missionSize).toBe(5)
  })

  it('leoAutoNarration defaults OFF (silent by default)', () => {
    expect(useSettingsStore.getState().leoAutoNarration).toBe(false)
  })

  it('setLeoAutoNarration toggles the once-per-screen auto-speak flag', () => {
    useSettingsStore.getState().setLeoAutoNarration(true)
    expect(useSettingsStore.getState().leoAutoNarration).toBe(true)
    useSettingsStore.getState().setLeoAutoNarration(false)
    expect(useSettingsStore.getState().leoAutoNarration).toBe(false)
  })

  it('setVoicePref stores and clears a per-language voice choice', () => {
    useSettingsStore.getState().setVoicePref('ca', 'com.apple.voice.enhanced.ca-ES.Nuria')
    expect(useSettingsStore.getState().voicePrefs.ca).toBe('com.apple.voice.enhanced.ca-ES.Nuria')

    useSettingsStore.getState().setVoicePref('ca', undefined)
    expect(useSettingsStore.getState().voicePrefs.ca).toBeUndefined()
  })

  it('flushSettings persists the current state immediately', async () => {
    useSettingsStore.getState().setPin('9999')
    await flushSettings()

    expect(memoryStore.get('settings')).toMatchObject({ pin: '9999' })
  })

  it('hydrateSettings loads a well-formed persisted blob into the store', async () => {
    memoryStore.set('settings', {
      pin: '4242',
      children: {
        aira: {
          missionSize: 7,
          challengeFrequency: 0.3,
          moduleToggles: {},
          subskillAdjustments: {},
          weeklyFocus: [],
        },
        leo: {
          missionSize: 3,
          challengeFrequency: 0.1,
          moduleToggles: {},
          subskillAdjustments: {},
          weeklyFocus: [],
        },
      },
    })

    await hydrateSettings()

    expect(useSettingsStore.getState().pin).toBe('4242')
    expect(useSettingsStore.getState().children.aira.missionSize).toBe(7)
    // Blob predates leoAutoNarration → normalized to the silent-by-default false.
    expect(useSettingsStore.getState().leoAutoNarration).toBe(false)
  })

  it('hydrateSettings restores a persisted leoAutoNarration=true', async () => {
    useSettingsStore.getState().setLeoAutoNarration(true)
    await flushSettings()
    useSettingsStore.setState({ leoAutoNarration: false })

    await hydrateSettings()
    expect(useSettingsStore.getState().leoAutoNarration).toBe(true)
  })

  it('hydrateSettings falls back to defaults when the persisted blob is corrupted', async () => {
    memoryStore.set('settings', { pin: null, children: { aira: { missionSize: 'not-a-number' } } })

    const before = useSettingsStore.getState()
    await hydrateSettings()

    expect(useSettingsStore.getState()).toEqual(before)
    expect(useSettingsStore.getState().children.aira.missionSize).toBe(5)
  })

  it('hydrateSettings is a no-op when nothing was persisted', async () => {
    const before = useSettingsStore.getState()
    await hydrateSettings()

    expect(useSettingsStore.getState()).toEqual(before)
  })
})
