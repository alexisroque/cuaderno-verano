import { create } from 'zustand'
import type { ProfileId } from './profileStore'
import { loadState, saveState } from '../lib/storage'

const PERSIST_DEBOUNCE_MS = 500

/** Per-subskill tuning: nudge how often a subskill appears and how hard it is. */
export interface SubskillAdjustment {
  boost: number
  difficultyOffset: number
  focus: boolean
}

export interface ChildSettings {
  missionSize: number
  challengeFrequency: number
  moduleToggles: Record<string, boolean>
  subskillAdjustments: Record<string, SubskillAdjustment>
}

interface SettingsState {
  pin: string | null
  children: Record<ProfileId, ChildSettings>
  setPin: (pin: string | null) => void
  updateChildSettings: (profile: ProfileId, patch: Partial<ChildSettings>) => void
}

function defaultChildSettings(): ChildSettings {
  return {
    missionSize: 5,
    challengeFrequency: 0.2,
    moduleToggles: {
      math: true,
      reading: true,
      geography: true,
    },
    subskillAdjustments: {},
  }
}

let persistTimer: ReturnType<typeof setTimeout> | undefined

function schedulePersist(state: { pin: string | null; children: Record<ProfileId, ChildSettings> }): void {
  if (persistTimer) clearTimeout(persistTimer)
  persistTimer = setTimeout(() => {
    void saveState('settings', { pin: state.pin, children: state.children })
  }, PERSIST_DEBOUNCE_MS)
}

export const useSettingsStore = create<SettingsState>((set) => ({
  pin: null,
  children: {
    aira: defaultChildSettings(),
    leo: defaultChildSettings(),
  },
  setPin: (pin) => {
    set((state) => {
      schedulePersist({ pin, children: state.children })
      return { pin }
    })
  },
  updateChildSettings: (profile, patch) => {
    set((state) => {
      const updatedChildren = {
        ...state.children,
        [profile]: { ...state.children[profile], ...patch },
      }
      schedulePersist({ pin: state.pin, children: updatedChildren })
      return { children: updatedChildren }
    })
  },
}))

interface PersistedSettings {
  pin: string | null
  children: Record<ProfileId, ChildSettings>
}

/** Loads persisted settings from IndexedDB into the store, if any were saved. */
export async function hydrateSettings(): Promise<void> {
  const saved = await loadState<PersistedSettings>('settings')
  if (!saved) return

  useSettingsStore.setState({ pin: saved.pin, children: saved.children })
}
