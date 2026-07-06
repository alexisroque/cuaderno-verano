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

  it('flushSettings persists the current state immediately', async () => {
    useSettingsStore.getState().setPin('9999')
    await flushSettings()

    expect(memoryStore.get('settings')).toMatchObject({ pin: '9999' })
  })

  it('hydrateSettings loads a well-formed persisted blob into the store', async () => {
    memoryStore.set('settings', {
      pin: '4242',
      children: {
        aira: { missionSize: 7, challengeFrequency: 0.3, moduleToggles: {}, subskillAdjustments: {} },
        leo: { missionSize: 3, challengeFrequency: 0.1, moduleToggles: {}, subskillAdjustments: {} },
      },
    })

    await hydrateSettings()

    expect(useSettingsStore.getState().pin).toBe('4242')
    expect(useSettingsStore.getState().children.aira.missionSize).toBe(7)
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
