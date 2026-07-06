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
 *
 * Overlapping-writes guard: `schedule()`/`flush()` can, in principle, kick
 * off a new write while a previous one is still in flight (e.g. a slow
 * IndexedDB write racing a later, faster one). Each write is tagged with a
 * monotonically increasing generation number when it starts. If a write
 * resolves and finds that a *newer* generation has already completed, its
 * own completion is stale — the newer write already persisted a more
 * recent value, so this one must not be treated as having landed. Instead
 * it re-persists whatever `getValue()` returns right now, healing IndexedDB
 * back to the latest value instead of leaving it clobbered by the
 * slow/stale write that just landed after the newer one.
 */
export function createDebouncedPersist(
  key: string | (() => string),
  getValue: () => unknown,
  delayMs = 500,
): DebouncedPersist {
  let timer: ReturnType<typeof setTimeout> | undefined
  let generation = 0
  let latestCompletedGeneration = 0

  const resolveKey = (): string => (typeof key === 'string' ? key : key())

  const writeNow = async (): Promise<void> => {
    // Persistence must never throw: a failed write should degrade quietly
    // (the in-memory state stays correct and the next write will retry),
    // never surface as an unhandled rejection that could crash the app or
    // fail the test runner when a debounced timer fires after teardown.
    try {
      const thisGeneration = ++generation
      await saveState(resolveKey(), getValue())

      if (thisGeneration >= latestCompletedGeneration) {
        latestCompletedGeneration = thisGeneration
        return
      }

      // A newer write already completed while this one was in flight: this
      // write may have just overwritten IndexedDB with a stale value. Heal it
      // by re-persisting the current value.
      await saveState(resolveKey(), getValue())
    } catch {
      // swallow — persistence is best-effort
    }
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
