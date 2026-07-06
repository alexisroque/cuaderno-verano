import { beforeEach, describe, expect, it, vi } from 'vitest'

const memoryStore = new Map<string, unknown>()

vi.mock('idb-keyval', () => ({
  get: vi.fn((key: string) => Promise.resolve(memoryStore.get(key))),
  set: vi.fn((key: string, value: unknown) => {
    memoryStore.set(key, value)
    return Promise.resolve()
  }),
}))

import { useProgressStore, hydrateProgress, flushProgress } from './progressStore'
import { loadState, saveState } from '../lib/storage'

function attempt(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    dateISO: '2026-07-16',
    cardType: 'multiple-choice',
    subskill: 'addition',
    correct: true,
    hintsUsed: 0,
    ms: 1200,
    difficulty: 2,
    ...overrides,
  }
}

describe('progressStore', () => {
  beforeEach(() => {
    memoryStore.clear()
    useProgressStore.setState(useProgressStore.getInitialState())
  })

  it('recordAttempt appends an attempt for the given profile', () => {
    useProgressStore.getState().recordAttempt('aira', attempt())

    const progress = useProgressStore.getState().profiles.aira
    expect(progress.attempts).toHaveLength(1)
    expect(progress.attempts[0]).toMatchObject({ subskill: 'addition', correct: true })
  })

  it('attempts are retrievable filtered by subskill', () => {
    useProgressStore.getState().recordAttempt('aira', attempt({ subskill: 'addition' }))
    useProgressStore.getState().recordAttempt('aira', attempt({ subskill: 'reading' }))
    useProgressStore.getState().recordAttempt('aira', attempt({ subskill: 'addition' }))

    const filtered = useProgressStore.getState().getAttemptsBySubskill('aira', 'addition')
    expect(filtered).toHaveLength(2)
    expect(filtered.every((a) => a.subskill === 'addition')).toBe(true)
  })

  it('keeps separate progress per profile', () => {
    useProgressStore.getState().recordAttempt('aira', attempt())
    useProgressStore.getState().recordAttempt('leo', attempt({ subskill: 'reading' }))

    expect(useProgressStore.getState().profiles.aira.attempts).toHaveLength(1)
    expect(useProgressStore.getState().profiles.leo.attempts).toHaveLength(1)
    expect(useProgressStore.getState().profiles.aira.attempts[0].subskill).toBe('addition')
  })

  it('addCoins increments the coin balance for a profile', () => {
    useProgressStore.getState().addCoins('aira', 5)
    useProgressStore.getState().addCoins('aira', 3)

    expect(useProgressStore.getState().profiles.aira.coins).toBe(8)
  })

  it('round-trips profile state through mocked idb-keyval storage', async () => {
    await saveState('profile:aira', { ...useProgressStore.getInitialState().profiles.aira, coins: 42 })

    const loaded = await loadState<{ coins: number }>('profile:aira')
    expect(loaded?.coins).toBe(42)
  })

  it('flushProgress persists pending changes immediately without waiting for the debounce timer', async () => {
    useProgressStore.getState().addCoins('aira', 7)
    await flushProgress()

    const loaded = await loadState<{ coins: number }>('profile:aira')
    expect(loaded?.coins).toBe(7)
  })

  it('hydrateProgress loads a well-formed persisted blob into the store', async () => {
    const saved = { ...useProgressStore.getInitialState().profiles.aira, coins: 99 }
    await saveState('profile:aira', saved)

    await hydrateProgress()

    expect(useProgressStore.getState().profiles.aira.coins).toBe(99)
  })

  it('hydrateProgress falls back to defaults when the persisted blob is corrupted', async () => {
    await saveState('profile:aira', { coins: 'not-a-number' })

    const before = useProgressStore.getState().profiles.aira
    await hydrateProgress()

    expect(useProgressStore.getState().profiles.aira).toEqual(before)
  })
})
