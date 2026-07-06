import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const memoryStore = new Map<string, unknown>()

vi.mock('idb-keyval', () => ({
  get: vi.fn((key: string) => Promise.resolve(memoryStore.get(key))),
  set: vi.fn((key: string, value: unknown) => {
    memoryStore.set(key, value)
    return Promise.resolve()
  }),
}))

import { createDebouncedPersist, loadState } from './storage'

describe('createDebouncedPersist', () => {
  beforeEach(() => {
    memoryStore.clear()
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('does not persist immediately after schedule()', () => {
    const persist = createDebouncedPersist('my-key', () => ({ value: 1 }))
    persist.schedule()

    expect(memoryStore.has('my-key')).toBe(false)
  })

  it('persists the latest value once the debounce delay elapses', async () => {
    let value = { count: 1 }
    const persist = createDebouncedPersist('my-key', () => value, 500)

    persist.schedule()
    value = { count: 2 }
    persist.schedule()

    await vi.advanceTimersByTimeAsync(500)

    const loaded = await loadState<{ count: number }>('my-key')
    expect(loaded).toEqual({ count: 2 })
  })

  it('flush() persists synchronously on demand and cancels the pending timer', async () => {
    const persist = createDebouncedPersist('my-key', () => ({ count: 42 }))
    persist.schedule()

    await persist.flush()

    const loaded = await loadState<{ count: number }>('my-key')
    expect(loaded).toEqual({ count: 42 })
  })

  it('flush() with nothing scheduled is a no-op', async () => {
    const persist = createDebouncedPersist('my-key', () => ({ count: 1 }))

    await expect(persist.flush()).resolves.toBeUndefined()
    expect(memoryStore.has('my-key')).toBe(false)
  })

  it('supports a key factory function, evaluated at flush time', async () => {
    let currentKey = 'profile:aira'
    const persist = createDebouncedPersist(() => currentKey, () => ({ value: 'a' }))

    persist.schedule()
    currentKey = 'profile:leo'
    await persist.flush()

    expect(await loadState('profile:aira')).toBeUndefined()
    expect(await loadState('profile:leo')).toEqual({ value: 'a' })
  })

  it('schedule() resets the debounce timer on repeated calls', async () => {
    const persist = createDebouncedPersist('my-key', () => ({ count: 1 }), 500)

    persist.schedule()
    await vi.advanceTimersByTimeAsync(300)
    persist.schedule()
    await vi.advanceTimersByTimeAsync(300)

    expect(memoryStore.has('my-key')).toBe(false)

    await vi.advanceTimersByTimeAsync(200)
    expect(memoryStore.has('my-key')).toBe(true)
  })
})
