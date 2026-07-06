import { get, set } from 'idb-keyval'

/** Loads a value previously saved under `key`, or undefined if never saved. */
export async function loadState<T>(key: string): Promise<T | undefined> {
  return get<T>(key)
}

/** Persists `value` under `key`, overwriting any previous value. */
export async function saveState(key: string, value: unknown): Promise<void> {
  await set(key, value)
}

/**
 * Requests persistent storage from the browser so IndexedDB data survives
 * storage pressure eviction. Resolves false (instead of throwing) when the
 * API is unavailable or the request is denied.
 */
export async function requestPersistence(): Promise<boolean> {
  try {
    const granted = await navigator.storage?.persist?.()
    return granted ?? false
  } catch {
    return false
  }
}
