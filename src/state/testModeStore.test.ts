import { beforeEach, describe, expect, it, vi } from 'vitest'

const memoryStore = new Map<string, unknown>()
const setSpy = vi.fn((key: string, value: unknown) => {
  memoryStore.set(key, value)
  return Promise.resolve()
})

vi.mock('idb-keyval', () => ({
  get: vi.fn((key: string) => Promise.resolve(memoryStore.get(key))),
  set: (key: string, value: unknown) => setSpy(key, value),
}))

import { useProgressStore, flushProgress } from './progressStore'
import { useSettingsStore, flushSettings } from './settingsStore'
import { useTestModeStore } from './testModeStore'

describe('testModeStore', () => {
  beforeEach(() => {
    memoryStore.clear()
    setSpy.mockClear()
    useProgressStore.setState(useProgressStore.getInitialState())
    useSettingsStore.setState(useSettingsStore.getInitialState())
    useTestModeStore.setState(useTestModeStore.getInitialState())
  })

  it('enable() snapshots the current profiles', () => {
    useProgressStore.getState().addCoins('aira', 10)
    useTestModeStore.getState().enable()

    const snap = useTestModeStore.getState().snapshot
    expect(useTestModeStore.getState().active).toBe(true)
    expect(snap?.aira.coins).toBe(10)
  })

  it('while active, progress mutates in memory but no progress write reaches idb', async () => {
    useProgressStore.getState().addCoins('aira', 5)
    await flushProgress()
    setSpy.mockClear()

    useTestModeStore.getState().enable()
    useProgressStore.getState().addCoins('aira', 100)
    useProgressStore.getState().recordAttempt('aira', {
      dateISO: '2026-07-16',
      cardType: 'multiple-choice',
      subskill: 'addition',
      correct: true,
      hintsUsed: 0,
      ms: 1000,
      difficulty: 2,
    })
    await flushProgress()

    // In-memory state reflects the test-mode play…
    expect(useProgressStore.getState().profiles.aira.coins).toBe(105)
    expect(useProgressStore.getState().profiles.aira.attempts).toHaveLength(1)
    // …but nothing was persisted to the progress keys.
    const progressWrites = setSpy.mock.calls.filter(
      ([key]) => key === 'profile:aira' || key === 'profile:leo',
    )
    expect(progressWrites).toHaveLength(0)
  })

  it('disable() restores the exact pre-test profiles', () => {
    useProgressStore.getState().addCoins('aira', 5)
    useTestModeStore.getState().enable()

    useProgressStore.getState().addCoins('aira', 999)
    expect(useProgressStore.getState().profiles.aira.coins).toBe(1004)

    useTestModeStore.getState().disable()
    expect(useTestModeStore.getState().active).toBe(false)
    expect(useTestModeStore.getState().snapshot).toBeNull()
    expect(useProgressStore.getState().profiles.aira.coins).toBe(5)
  })

  it('flushProgress is a no-op while active', async () => {
    useTestModeStore.getState().enable()
    useProgressStore.getState().addCoins('leo', 42)
    await flushProgress()

    expect(memoryStore.has('profile:leo')).toBe(false)
  })

  it('settings persistence is unaffected by test mode', async () => {
    useTestModeStore.getState().enable()
    useSettingsStore.getState().setPin('1234')
    await flushSettings()

    expect(memoryStore.get('settings')).toMatchObject({ pin: '1234' })
  })

  it('the snapshot is a deep clone: test-mode mutations do not corrupt it', () => {
    useProgressStore.getState().recordAttempt('aira', {
      dateISO: '2026-07-16',
      cardType: 'multiple-choice',
      subskill: 'addition',
      correct: true,
      hintsUsed: 0,
      ms: 1000,
      difficulty: 2,
    })
    useTestModeStore.getState().enable()

    // Mutate deeply-nested state during the test.
    useProgressStore.getState().recordAttempt('aira', {
      dateISO: '2026-07-17',
      cardType: 'multiple-choice',
      subskill: 'reading',
      correct: false,
      hintsUsed: 1,
      ms: 2000,
      difficulty: 3,
    })
    useProgressStore.getState().setGem('aira', 'math', 3, 0.5)

    const snap = useTestModeStore.getState().snapshot
    expect(snap?.aira.attempts).toHaveLength(1)
    expect(snap?.aira.gems).toEqual({})

    // And disabling restores exactly the one-attempt, no-gem state.
    useTestModeStore.getState().disable()
    expect(useProgressStore.getState().profiles.aira.attempts).toHaveLength(1)
    expect(useProgressStore.getState().profiles.aira.gems).toEqual({})
  })
})
