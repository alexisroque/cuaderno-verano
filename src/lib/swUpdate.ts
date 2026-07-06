/**
 * Service-worker update wiring for the offline-first PWA.
 *
 * The build registers the SW with `registerType: 'prompt'`, so a new version
 * installs but *waits* instead of taking over mid-session (kids shouldn't have
 * the app reload under them). This module registers the SW and lets the UI
 * subscribe to "an update is waiting" so it can show a gentle toast that, when
 * tapped, activates the new SW and reloads.
 *
 * Everything degrades to a no-op when the SW/virtual module is unavailable
 * (tests, unsupported browsers), so importing it is always safe.
 */
import { registerSW } from 'virtual:pwa-register'

type Listener = (needRefresh: boolean) => void

let updateSW: ((reloadPage?: boolean) => Promise<void>) | undefined
let needRefresh = false
const listeners = new Set<Listener>()

function emit(): void {
  for (const l of listeners) l(needRefresh)
}

/**
 * Registers the service worker and starts tracking update state. Safe to call
 * once on boot; a second call is a no-op. No-op in environments without SW
 * support (e.g. jsdom tests) — `registerSW` handles that gracefully.
 */
export function initServiceWorker(): void {
  if (updateSW) return
  try {
    updateSW = registerSW({
      immediate: true,
      onNeedRefresh() {
        needRefresh = true
        emit()
      },
      onRegisterError(error) {
        console.warn('Service worker registration failed', error)
      },
    })
  } catch (error) {
    console.warn('Service worker unavailable', error)
  }
}

/** Whether a new version is installed and waiting to activate. */
export function isUpdateWaiting(): boolean {
  return needRefresh
}

/**
 * Subscribes to update-availability changes. Fires immediately with the
 * current state, then on every change. Returns an unsubscribe function.
 */
export function subscribeUpdate(listener: Listener): () => void {
  listeners.add(listener)
  listener(needRefresh)
  return () => listeners.delete(listener)
}

/**
 * Activates the waiting service worker and reloads the page onto the new
 * version. No-op if nothing is waiting.
 */
export async function applyUpdate(): Promise<void> {
  if (!updateSW) return
  await updateSW(true)
}
