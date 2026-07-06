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

export interface DebouncedPersist {
  /** (Re)starts the debounce timer; persists `getValue()` after `delayMs` of inactivity. */
  schedule(): void
  /** Persists the current `getValue()` immediately and cancels any pending timer. */
  flush(): Promise<void>
}

/**
 * Builds a debounced persistence helper: repeated `schedule()` calls collapse
 * into a single write `delayMs` after the last call, always persisting
 * whatever `getValue()` returns at that time. `flush()` writes immediately
 * (used e.g. on page hide, where a setTimeout would never fire).
 *
 * `key` can be a plain string or a factory, evaluated lazily at write time,
 * for callers whose storage key depends on state that may change between
 * `schedule()` and the eventual write (or flush).
 */
export function createDebouncedPersist(
  key: string | (() => string),
  getValue: () => unknown,
  delayMs = 500,
): DebouncedPersist {
  let timer: ReturnType<typeof setTimeout> | undefined

  const resolveKey = (): string => (typeof key === 'string' ? key : key())

  const writeNow = async (): Promise<void> => {
    await saveState(resolveKey(), getValue())
  }

  const schedule = (): void => {
    if (timer) clearTimeout(timer)
    timer = setTimeout(() => {
      timer = undefined
      void writeNow()
    }, delayMs)
  }

  const flush = async (): Promise<void> => {
    if (timer) {
      clearTimeout(timer)
      timer = undefined
      await writeNow()
    }
  }

  return { schedule, flush }
}
