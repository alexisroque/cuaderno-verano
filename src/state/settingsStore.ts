import { create } from 'zustand'
import type { ProfileId } from './profileStore'
import type { VoiceLangFamily, VoicePrefs } from '../lib/tts'
import { createDebouncedPersist, loadState } from '../lib/storage'
import { PersistedSettingsSchema } from './persistSchemas'

/**
 * Per-subskill tuning: nudge how often a subskill appears and how hard it is.
 *
 * `boostUntil`: a dateISO (YYYY-MM-DD) up to and including which a parent's
 * "boost" on this subskill is active (the scheduler doubles its within-pool
 * weight while `boostUntil >= todayISO`). `null` means no active boost.
 */
export interface SubskillAdjustment {
  difficultyOffset: number
  boostUntil: string | null
}

export interface ChildSettings {
  missionSize: number
  challengeFrequency: number
  moduleToggles: Record<string, boolean>
  subskillAdjustments: Record<string, SubskillAdjustment>
  /** Weekly parent-set focus: subskill ids the novelty pool should prefer. Empty = unrestricted. */
  weeklyFocus: string[]
}

interface SettingsState {
  pin: string | null
  children: Record<ProfileId, ChildSettings>
  /** dateISO of the last successful backup export, or null if never exported. */
  lastExport: string | null
  /** Parent-chosen TTS voice (a `voiceURI`) per language family. */
  voicePrefs: VoicePrefs
  /**
   * Whether Leo's screens auto-speak their instruction once on open. Default
   * OFF: nothing speaks on its own — the child taps a 🔊 button to hear audio.
   * When ON, each Leo player gently auto-speaks its instruction once per screen
   * (never the greeting, never repeated) for families with a pre-reader.
   */
  leoAutoNarration: boolean
  setPin: (pin: string | null) => void
  updateChildSettings: (profile: ProfileId, patch: Partial<ChildSettings>) => void
  /** Records a backup export having happened on `dateISO` (drives the backup nudge). */
  setLastExport: (dateISO: string) => void
  /** Persists (or clears, with `undefined`) the chosen voice for a language. */
  setVoicePref: (family: VoiceLangFamily, voiceURI: string | undefined) => void
  /** Toggles Leo's once-per-screen instruction auto-speak (default OFF). */
  setLeoAutoNarration: (on: boolean) => void
}

function defaultChildSettings(): ChildSettings {
  return {
    missionSize: 5,
    challengeFrequency: 0.2,
    // Empty means "all modules on": an absent skill key is treated as enabled,
    // an explicit `false` disables that skill. This stays correct as the
    // catalog grows (no stale per-skill defaults to keep in sync) — see
    // `isSkillEnabled` in engine/skills.ts.
    moduleToggles: {},
    subskillAdjustments: {},
    weeklyFocus: [],
  }
}

const persister = createDebouncedPersist('settings', () => {
  const { pin, children, lastExport, voicePrefs, leoAutoNarration } = useSettingsStore.getState()
  return { pin, children, lastExport, voicePrefs, leoAutoNarration }
})

export const useSettingsStore = create<SettingsState>((set) => ({
  pin: null,
  children: {
    aira: defaultChildSettings(),
    leo: defaultChildSettings(),
  },
  lastExport: null,
  voicePrefs: {},
  leoAutoNarration: false,
  setPin: (pin) => {
    set({ pin })
    persister.schedule()
  },
  updateChildSettings: (profile, patch) => {
    set((state) => ({
      children: {
        ...state.children,
        [profile]: { ...state.children[profile], ...patch },
      },
    }))
    persister.schedule()
  },
  setLastExport: (dateISO) => {
    set({ lastExport: dateISO })
    persister.schedule()
  },
  setVoicePref: (family, voiceURI) => {
    set((state) => {
      const next = { ...state.voicePrefs }
      if (voiceURI === undefined) delete next[family]
      else next[family] = voiceURI
      return { voicePrefs: next }
    })
    persister.schedule()
  },
  setLeoAutoNarration: (on) => {
    set({ leoAutoNarration: on })
    persister.schedule()
  },
}))

/** Flushes any pending debounced settings write immediately. */
export async function flushSettings(): Promise<void> {
  await persister.flush()
}

/**
 * Loads persisted settings from IndexedDB into the store, if any were saved.
 * A corrupted or malformed blob fails validation and is discarded (the
 * store keeps its in-memory defaults) rather than crashing hydration.
 */
export async function hydrateSettings(): Promise<void> {
  const saved = await loadState<unknown>('settings')
  if (saved === undefined) return

  const result = PersistedSettingsSchema.safeParse(saved)
  if (!result.success) {
    console.warn('hydrateSettings: discarding corrupted settings blob', result.error)
    return
  }

  useSettingsStore.setState({
    pin: result.data.pin,
    children: result.data.children,
    lastExport: result.data.lastExport,
    voicePrefs: result.data.voicePrefs,
    leoAutoNarration: result.data.leoAutoNarration,
  })
}
