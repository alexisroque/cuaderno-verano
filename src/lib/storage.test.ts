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

  it('overlapping writes: the last scheduled value wins even if an earlier save is still in flight', async () => {
    const idbKeyval = await import('idb-keyval')
    const setMock = idbKeyval.set as unknown as ReturnType<typeof vi.fn>

    // Make the underlying save "slow" for the first call only, so it resolves
    // after later schedule()/flush() calls have already fired their own writes.
    let releaseFirstWrite: (() => void) | undefined
    setMock.mockImplementationOnce((key: string, value: unknown) => {
      return new Promise<void>((resolve) => {
        releaseFirstWrite = () => {
          memoryStore.set(key, value)
          resolve()
        }
      })
    })

    let value: { count: number } = { count: 1 }
    const persist = createDebouncedPersist('my-key', () => value, 500)

    persist.schedule()
    await vi.advanceTimersByTimeAsync(500) // fires the slow write, but it hasn't resolved yet

    value = { count: 2 }
    persist.schedule()
    await vi.advanceTimersByTimeAsync(500) // fires a second, fast write that resolves immediately

    // Now let the slow first write finally resolve.
    releaseFirstWrite?.()
    await Promise.resolve()
    await Promise.resolve()
    await Promise.resolve()

    const loaded = await loadState<{ count: number }>('my-key')
    expect(loaded).toEqual({ count: 2 })
  })
})
