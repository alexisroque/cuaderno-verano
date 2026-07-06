import { flushProgress } from './progressStore'
import { flushSettings } from './settingsStore'

/** Synchronously (from the browser's point of view) flushes all pending debounced writes. */
function flushAll(): void {
  void flushProgress()
  void flushSettings()
}

/**
 * Registers listeners so pending debounced persistence writes are flushed
 * before the page is torn down or backgrounded. `pagehide` covers
 * navigation/close/reload; `visibilitychange` (hidden) covers tab-switch and
 * mobile app-backgrounding, which on many mobile browsers is the last
 * reliable signal before the process can be suspended without `pagehide`
 * firing. Call once, after `hydrateAll()`, from `main.tsx`.
 */
export function registerFlushOnHide(): void {
  window.addEventListener('pagehide', flushAll)
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') {
      flushAll()
    }
  })
}
