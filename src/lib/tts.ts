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

/** The two-letter language families the app speaks in. */
export type VoiceLangFamily = 'es' | 'ca' | 'en'

/** Persisted per-family voice preference: a chosen `voiceURI`, or absent. */
export interface VoicePrefs {
  es?: string
  ca?: string
  en?: string
}

/** Which broad language families have at least one usable local voice. */
export interface VoicesAvailable {
  es: boolean
  ca: boolean
  en: boolean
}

/** Slightly slower than default so young children can follow along. */
const KID_RATE = 0.9

/**
 * Substrings (case-insensitive) that mark a voice as high quality: Apple's
 * Siri/enhanced/premium voices and neural/natural web voices. Checked against
 * both `name` and `voiceURI` since platforms expose the tier differently.
 */
const QUALITY_HINTS = ['siri', 'premium', 'enhanced', 'neural', 'natural']

/** Substrings that mark a voice as low quality (robotic / formant synths). */
const LOW_QUALITY_HINTS = ['compact', 'eloquence', 'espeak']

function synth(): SpeechSynthesis | undefined {
  if (typeof globalThis === 'undefined') return undefined
  const s = (globalThis as { speechSynthesis?: SpeechSynthesis }).speechSynthesis
  return s ?? undefined
}

/** The two-letter primary subtag, lowercased (e.g. 'es-ES' -> 'es'). */
function primary(lang: string): string {
  return lang.toLowerCase().split('-')[0]
}

/** True when `name`/`voiceURI` contains any of `hints` (case-insensitive). */
function matchesHint(voice: SpeechSynthesisVoice, hints: string[]): boolean {
  const haystack = `${voice.name} ${voice.voiceURI}`.toLowerCase()
  return hints.some((h) => haystack.includes(h))
}

/**
 * Scores a candidate voice for `lang` (higher = better). Weights are spread so
 * quality tier dominates (Siri/enhanced beats robotic even at worse region),
 * then exact region, then locality (offline). `-Infinity` = wrong family.
 */
function scoreVoice(voice: SpeechSynthesisVoice, lang: TtsLang): number {
  if (primary(voice.lang) !== primary(lang)) return -Infinity
  let score = 0
  if (matchesHint(voice, QUALITY_HINTS)) score += 1000
  if (matchesHint(voice, LOW_QUALITY_HINTS)) score -= 1000
  if (voice.lang.toLowerCase() === lang.toLowerCase()) score += 100 // exact region
  if (voice.localService) score += 10 // offline preferred
  return score
}

/**
 * Picks the best installed voice for `lang`: highest `scoreVoice`, i.e. quality
 * tier > exact region > offline. Ties break deterministically by `voiceURI` so
 * the same voice is chosen across reloads. Pure. `undefined` = no family match.
 */
export function pickVoice(
  voices: SpeechSynthesisVoice[],
  lang: TtsLang,
): SpeechSynthesisVoice | undefined {
  let best: SpeechSynthesisVoice | undefined
  let bestScore = -Infinity
  for (const v of voices) {
    const score = scoreVoice(v, lang)
    if (score === -Infinity) continue
    if (
      score > bestScore ||
      (score === bestScore && best !== undefined && v.voiceURI < best.voiceURI)
    ) {
      best = v
      bestScore = score
    }
  }
  return best
}

/**
 * All installed voices whose language family matches `family` (e.g. 'es'
 * matches es-ES and es-MX), sorted best-first by the same scoring as
 * `pickVoice`. Used to populate the parent's per-language voice picker.
 */
export function voicesForLang(
  voices: SpeechSynthesisVoice[],
  family: VoiceLangFamily,
): SpeechSynthesisVoice[] {
  const exemplar: Record<VoiceLangFamily, TtsLang> = {
    es: 'es-ES',
    ca: 'ca-ES',
    en: 'en-US',
  }
  const lang = exemplar[family]
  return voices
    .filter((v) => primary(v.lang) === family)
    .sort((a, b) => {
      const diff = scoreVoice(b, lang) - scoreVoice(a, lang)
      return diff !== 0 ? diff : a.voiceURI < b.voiceURI ? -1 : 1
    })
}

/**
 * Resolves the voice to use for `lang`: the parent's persisted choice for that
 * family when it is still installed, otherwise the best auto-pick from
 * `pickVoice`. Pure: depends only on its arguments. Returns `undefined` when
 * no voice shares the language family.
 */
export function getPreferredVoice(
  voices: SpeechSynthesisVoice[],
  lang: TtsLang,
  prefs: VoicePrefs,
): SpeechSynthesisVoice | undefined {
  const family = primary(lang) as VoiceLangFamily
  const preferredUri = prefs[family]
  if (preferredUri) {
    const match = voices.find((v) => v.voiceURI === preferredUri)
    if (match) return match
  }
  return pickVoice(voices, lang)
}

/**
 * Where `speak` reads the parent's saved voice preferences. Defaults to none so
 * the lib stays pure; the app registers a store-backed getter at boot (avoids a
 * store import here, and any circular dependency).
 */
let voicePrefsSource: () => VoicePrefs = () => ({})

/** Registers where `speak` reads persisted voice preferences from. */
export function setVoicePrefsSource(source: () => VoicePrefs): void {
  voicePrefsSource = source
}

/**
 * Speaks `text` in `lang` at a gentle rate for kids, using the parent's saved
 * voice for that language when it is installed, else the best auto-picked
 * local voice. An explicit `prefs` argument overrides the registered source
 * (used by the parent picker's preview). Cancels any in-flight utterance first
 * so taps never overlap. No-op when synthesis is unavailable or `text` blank.
 */
export function speak(text: string, lang: TtsLang, prefs?: VoicePrefs): void {
  const s = synth()
  if (!s) return
  const trimmed = text.trim()
  if (trimmed.length === 0) return

  s.cancel()

  const utterance = new SpeechSynthesisUtterance(trimmed)
  utterance.lang = lang
  utterance.rate = KID_RATE
  const voice = getPreferredVoice(s.getVoices(), lang, prefs ?? voicePrefsSource())
  if (voice) utterance.voice = voice

  s.speak(utterance)
}

/** Stops any current speech. No-op when synthesis is unavailable. */
export function stopSpeaking(): void {
  synth()?.cancel()
}

/**
 * Resolves once the browser's voice list is populated (or immediately if it
 * already is). On iOS/Safari `getVoices()` is empty until a `voiceschanged`
 * event fires shortly after load, so callers that need an accurate voice
 * inventory (e.g. the Catalan-voice nudge) should await this first. Resolves
 * after `timeoutMs` regardless, so a browser that never fires the event can't
 * hang the caller. No-op-resolves when synthesis is unavailable.
 */
export function waitForVoices(timeoutMs = 2000): Promise<void> {
  const s = synth()
  if (!s) return Promise.resolve()
  if (s.getVoices().length > 0) return Promise.resolve()

  return new Promise((resolve) => {
    let done = false
    const finish = () => {
      if (done) return
      done = true
      s.removeEventListener?.('voiceschanged', finish)
      resolve()
    }
    s.addEventListener?.('voiceschanged', finish)
    setTimeout(finish, timeoutMs)
  })
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

/** Coarse quality tier of a single voice, from its name/voiceURI hints. */
export type VoiceQuality = 'high' | 'neutral' | 'low'

/** Classifies a voice's quality tier (high = Siri/enhanced, low = robotic). */
export function voiceQuality(voice: SpeechSynthesisVoice): VoiceQuality {
  if (matchesHint(voice, QUALITY_HINTS)) return 'high'
  if (matchesHint(voice, LOW_QUALITY_HINTS)) return 'low'
  return 'neutral'
}

/**
 * Whether the best installed voice for `family` looks robotic or is missing,
 * i.e. worth nudging the parent to download an enhanced/Siri voice. Pure over
 * its `voices` argument. Returns true when there is no voice at all, or when
 * the best-scored candidate is classified `low`.
 */
export function needsBetterVoice(
  voices: SpeechSynthesisVoice[],
  family: VoiceLangFamily,
): boolean {
  const best = voicesForLang(voices, family)[0]
  if (!best) return true
  return voiceQuality(best) === 'low'
}

/** The device's current voice list, or `[]` when synthesis is unavailable. */
export function getLiveVoices(): SpeechSynthesisVoice[] {
  return synth()?.getVoices() ?? []
}
