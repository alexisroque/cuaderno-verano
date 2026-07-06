import { beforeEach, describe, expect, it, vi } from 'vitest'

const memoryStore = new Map<string, unknown>()

vi.mock('idb-keyval', () => ({
  get: vi.fn((key: string) => Promise.resolve(memoryStore.get(key))),
  set: vi.fn((key: string, value: unknown) => {
    memoryStore.set(key, value)
    return Promise.resolve()
  }),
}))

import { registerFlushOnHide } from './flush'
import { useProgressStore } from './progressStore'
import { useSettingsStore } from './settingsStore'

describe('registerFlushOnHide', () => {
  beforeEach(() => {
    memoryStore.clear()
    useProgressStore.setState(useProgressStore.getInitialState())
    useSettingsStore.setState(useSettingsStore.getInitialState())
  })

  it('flushes pending progress and settings writes on pagehide', async () => {
    registerFlushOnHide()

    useProgressStore.getState().addCoins('aira', 15)
    useSettingsStore.getState().setPin('7777')

    window.dispatchEvent(new Event('pagehide'))
    await Promise.resolve()
    await Promise.resolve()

    expect(memoryStore.get('profile:aira')).toMatchObject({ coins: 15 })
    expect(memoryStore.get('settings')).toMatchObject({ pin: '7777' })
  })

  it('flushes pending writes when the document becomes hidden', async () => {
    registerFlushOnHide()

    useProgressStore.getState().addCoins('leo', 3)
    Object.defineProperty(document, 'visibilityState', { value: 'hidden', configurable: true })
    document.dispatchEvent(new Event('visibilitychange'))
    await Promise.resolve()
    await Promise.resolve()

    expect(memoryStore.get('profile:leo')).toMatchObject({ coins: 3 })
  })

  it('does not flush when visibility changes to visible', async () => {
    registerFlushOnHide()

    useProgressStore.getState().addCoins('aira', 9)
    Object.defineProperty(document, 'visibilityState', { value: 'visible', configurable: true })
    document.dispatchEvent(new Event('visibilitychange'))
    await Promise.resolve()

    expect(memoryStore.has('profile:aira')).toBe(false)
  })

  it('registering twice does not double-register listeners (idempotent)', async () => {
    registerFlushOnHide()
    registerFlushOnHide()

    const addEventListenerSpy = vi.spyOn(window, 'addEventListener')

    useProgressStore.getState().addCoins('aira', 1)
    window.dispatchEvent(new Event('pagehide'))
    await Promise.resolve()
    await Promise.resolve()

    // A third call after listeners are already registered should not attach
    // new listeners at all.
    registerFlushOnHide()
    expect(addEventListenerSpy).not.toHaveBeenCalledWith('pagehide', expect.anything())

    addEventListenerSpy.mockRestore()
  })
})
