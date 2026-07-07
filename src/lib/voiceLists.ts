/**
 * Curated voice-quality data for the TTS voice picker.
 *
 * iOS Web Speech does NOT expose a quality flag and gives enhanced and compact
 * variants the same `name`, so we cannot detect voice quality programmatically.
 * Instead we curate name-based allow/deny lists of the voices Apple ships, which
 * `tts.ts` combines with the substring quality hints to rank candidates.
 */

import type { VoiceLangFamily } from './tts'

/**
 * Substrings (case-insensitive) that mark a voice as high quality: Apple's
 * Siri/enhanced/premium voices and neural/natural web voices. Checked against
 * both `name` and `voiceURI` since platforms expose the tier differently.
 */
export const QUALITY_HINTS = ['siri', 'premium', 'enhanced', 'neural', 'natural']

/** Substrings that mark a voice as low quality (robotic / formant synths). */
export const LOW_QUALITY_HINTS = ['compact', 'eloquence', 'espeak']

/**
 * Curated allowlist of natural-sounding default voices per language family.
 * iOS/macOS ship these as the standard, pleasant reading voices. Matched
 * case-insensitively against `voice.name` (substring, so "Mónica" also matches
 * "Mónica (Enhanced)"). Boosts these above unknown/plain voices.
 */
export const GOOD_VOICE_NAMES: Record<VoiceLangFamily, readonly string[]> = {
  es: ['mónica', 'monica', 'paulina', 'jorge', 'marisol', 'angélica', 'angelica', 'juan', 'diego', 'carlos'],
  en: [
    'samantha', 'karen', 'daniel', 'moira', 'rishi', 'aaron', 'martha', 'arthur',
    'catherine', 'gordon', 'serena', 'kate', 'oliver', 'stephanie', 'ava',
    'allison', 'susan', 'tom', 'nicky',
  ],
  ca: ['montserrat', 'núria', 'nuria'],
}

/**
 * Denylist of macOS/iOS "novelty" voices (joke/character/musical synths) that
 * sound terrible reading to kids. They appear in both es and en variants on
 * iOS 17+. Matched case-insensitively against `voice.name`. Sunk below any
 * plain named voice. `alex` is here so it is only ever a last-resort fallback.
 */
export const NOVELTY_VOICE_NAMES: readonly string[] = [
  'eddy', 'flo', 'grandma', 'grandpa', 'reed', 'rocko', 'sandy', 'shelley',
  'bubbles', 'bells', 'boing', 'jester', 'organ', 'cellos', 'trinoids',
  'whisper', 'wobble', 'zarvox', 'albert', 'bad news', 'good news', 'bahh',
  'superstar', 'junior', 'kathy', 'ralph', 'fred', 'bruce', 'agnes', 'vicki',
  'victoria', 'alex',
]

/**
 * Hard quality tiers, spaced far wider than the secondary region/locality
 * bonuses in `scoreVoice` (max +110) so a tier can never be crossed by them.
 * Ordering: Siri > allowlisted-good > plain > compact-marked > novelty.
 */
export const TIER = {
  siri: 4000,
  good: 3000,
  plain: 2000,
  lowQuality: 1000,
  novelty: 0,
} as const
