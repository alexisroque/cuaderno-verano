/**
 * Thin, kid-friendly wrapper around the Web Speech Synthesis API.
 *
 * The whole app is offline-first, so this module only ever uses the voices the
 * device already has installed. It never falls back to a network TTS service.
 * If `speechSynthesis` is missing (old browser, SSR, tests without a shim),
 * every function degrades to a safe no-op instead of throwing.
 */

/** BCP-47 language tags the app speaks in. */
export type TtsLang = 'es-ES' | 'ca-ES' | 'en-US' | 'en-GB'

/** Which broad language families have at least one usable local voice. */
export interface VoicesAvailable {
  es: boolean
  ca: boolean
  en: boolean
}

/** Slightly slower than default so young children can follow along. */
const KID_RATE = 0.9

function synth(): SpeechSynthesis | undefined {
  if (typeof globalThis === 'undefined') return undefined
  const s = (globalThis as { speechSynthesis?: SpeechSynthesis }).speechSynthesis
  return s ?? undefined
}

/** The two-letter primary subtag, lowercased (e.g. 'es-ES' -> 'es'). */
function primary(lang: string): string {
  return lang.toLowerCase().split('-')[0]
}

/**
 * Picks the best installed voice for `lang`, preferring, in order:
 *   1. an exact region match that is `localService` (offline),
 *   2. any exact region match,
 *   3. a same-language match that is `localService`,
 *   4. any same-language match.
 * Returns `undefined` when no voice shares the language family.
 */
export function pickVoice(
  voices: SpeechSynthesisVoice[],
  lang: TtsLang,
): SpeechSynthesisVoice | undefined {
  const wanted = lang.toLowerCase()
  const wantedPrimary = primary(lang)

  const exact = voices.filter((v) => v.lang.toLowerCase() === wanted)
  const exactLocal = exact.find((v) => v.localService)
  if (exactLocal) return exactLocal
  if (exact.length > 0) return exact[0]

  const family = voices.filter((v) => primary(v.lang) === wantedPrimary)
  const familyLocal = family.find((v) => v.localService)
  if (familyLocal) return familyLocal
  return family[0]
}

/**
 * Speaks `text` in `lang` using the best available local voice, at a gentle
 * rate for kids. Cancels any in-flight utterance first so taps never overlap.
 * No-op when speech synthesis is unavailable or `text` is blank.
 */
export function speak(text: string, lang: TtsLang): void {
  const s = synth()
  if (!s) return
  const trimmed = text.trim()
  if (trimmed.length === 0) return

  s.cancel()

  const utterance = new SpeechSynthesisUtterance(trimmed)
  utterance.lang = lang
  utterance.rate = KID_RATE
  const voice = pickVoice(s.getVoices(), lang)
  if (voice) utterance.voice = voice

  s.speak(utterance)
}

/** Stops any current speech. No-op when synthesis is unavailable. */
export function stopSpeaking(): void {
  synth()?.cancel()
}

/**
 * Reports which language families have a usable local voice right now. Useful
 * for hiding 🔊 affordances when the device can't speak a given language.
 */
export function voicesAvailable(): VoicesAvailable {
  const s = synth()
  if (!s) return { es: false, ca: false, en: false }

  const voices = s.getVoices()
  const has = (p: string) => voices.some((v) => primary(v.lang) === p)
  return { es: has('es'), ca: has('ca'), en: has('en') }
}
