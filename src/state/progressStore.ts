import { create } from 'zustand'
import type { Attempt, ProfileProgress } from '../types/progress'
import type { ProfileId } from './profileStore'
import { loadState, saveState } from '../lib/storage'

const PERSIST_DEBOUNCE_MS = 500

function emptyProgress(): ProfileProgress {
  return {
    attempts: [],
    gems: {},
    streak: { count: 0, lastDayISO: '', graceUsed: false },
    stickers: [],
    passportStamps: [],
    diaryEntries: [],
    coins: 0,
    consumedContent: {},
    unlockedTreasures: [],
  }
}

interface ProgressStoreState {
  profiles: Record<ProfileId, ProfileProgress>
  recordAttempt: (profile: ProfileId, attempt: Attempt) => void
  getAttemptsBySubskill: (profile: ProfileId, subskill: string) => Attempt[]
  addCoins: (profile: ProfileId, amount: number) => void
}

let persistTimers: Partial<Record<ProfileId, ReturnType<typeof setTimeout>>> = {}

function schedulePersist(profile: ProfileId, progress: ProfileProgress): void {
  const existing = persistTimers[profile]
  if (existing) clearTimeout(existing)
  persistTimers[profile] = setTimeout(() => {
    void saveState(`profile:${profile}`, progress)
  }, PERSIST_DEBOUNCE_MS)
}

export const useProgressStore = create<ProgressStoreState>((set, get) => ({
  profiles: {
    aira: emptyProgress(),
    leo: emptyProgress(),
  },
  recordAttempt: (profile, attempt) => {
    set((state) => {
      const updated = {
        ...state.profiles[profile],
        attempts: [...state.profiles[profile].attempts, attempt],
      }
      schedulePersist(profile, updated)
      return { profiles: { ...state.profiles, [profile]: updated } }
    })
  },
  getAttemptsBySubskill: (profile, subskill) => {
    return get().profiles[profile].attempts.filter((a) => a.subskill === subskill)
  },
  addCoins: (profile, amount) => {
    set((state) => {
      const updated = {
        ...state.profiles[profile],
        coins: state.profiles[profile].coins + amount,
      }
      schedulePersist(profile, updated)
      return { profiles: { ...state.profiles, [profile]: updated } }
    })
  },
}))

/** Loads persisted progress for both profiles from IndexedDB into the store. */
export async function hydrateProgress(): Promise<void> {
  const [aira, leo] = await Promise.all([
    loadState<ProfileProgress>('profile:aira'),
    loadState<ProfileProgress>('profile:leo'),
  ])

  useProgressStore.setState((state) => ({
    profiles: {
      aira: aira ?? state.profiles.aira,
      leo: leo ?? state.profiles.leo,
    },
  }))
}
