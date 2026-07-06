/**
 * One-time app boot side effects, kept out of main.tsx so they can be reasoned
 * about (and tested) in isolation. All are best-effort and never throw: a
 * failure here must not stop the app from rendering.
 */
import { requestPersistence } from './storage'
import { initServiceWorker } from './swUpdate'
import { waitForVoices, voicesAvailable } from './tts'

const VOICE_BANNER_DISMISSED_KEY = 'cuaderno:ca-voice-banner-dismissed'

/**
 * Fire-and-forget boot tasks: ask iOS to keep our IndexedDB (so a plane-mode
 * session isn't evicted) and register the service worker for offline use.
 */
export function boot(): void {
  void requestPersistence()
  initServiceWorker()
}

/** Marks the Catalan-voice banner as dismissed so it never shows again. */
export function dismissCaVoiceBanner(): void {
  try {
    localStorage.setItem(VOICE_BANNER_DISMISSED_KEY, '1')
  } catch {
    // Private mode / storage disabled: nothing to persist, banner may reappear.
  }
}

function caVoiceBannerDismissed(): boolean {
  try {
    return localStorage.getItem(VOICE_BANNER_DISMISSED_KEY) === '1'
  } catch {
    return false
  }
}

/**
 * Decides whether to nudge the parent to install the Catalan voice. Returns
 * true only when: the banner was never dismissed, speech synthesis exists, and
 * no `ca` voice is installed. Waits for the async voice list to populate first
 * (voices arrive after a `voiceschanged` event on iOS/Safari), so we don't
 * false-positive on a not-yet-loaded list. Dictations have an adult-reader
 * fallback, so this is a nudge, not a blocker.
 */
export async function shouldShowCaVoiceBanner(): Promise<boolean> {
  if (caVoiceBannerDismissed()) return false
  await waitForVoices()
  return !voicesAvailable().ca
}
