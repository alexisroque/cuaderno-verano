import { flushProgress } from './progressStore'
import { flushSettings } from './settingsStore'

/** Synchronously (from the browser's point of view) flushes all pending debounced writes. */
function flushAll(): void {
  void flushProgress()
  void flushSettings()
}

// Module-level guard: `registerFlushOnHide` can be called multiple times
// (e.g. React StrictMode double-invoking effects, or hot-reload re-running
// main.tsx) but must only ever attach its listeners once. Without this,
// repeated calls would stack duplicate `pagehide`/`visibilitychange`
// listeners, each triggering its own redundant flush.
let registered = false

/**
 * Registers listeners so pending debounced persistence writes are flushed
 * before the page is torn down or backgrounded. `pagehide` covers
 * navigation/close/reload; `visibilitychange` (hidden) covers tab-switch and
 * mobile app-backgrounding, which on many mobile browsers is the last
 * reliable signal before the process can be suspended without `pagehide`
 * firing. Call once, after `hydrateAll()`, from `main.tsx`. Safe to call
 * more than once: only the first call attaches listeners.
 */
export function registerFlushOnHide(): void {
  if (registered) return
  registered = true

  window.addEventListener('pagehide', flushAll)
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') {
      flushAll()
    }
  })
}
