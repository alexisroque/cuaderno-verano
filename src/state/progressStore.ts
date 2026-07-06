import { create } from 'zustand'
import type { Attempt, ProfileProgress } from '../types/progress'
import type { ProfileId } from './profileStore'
import { createDebouncedPersist, loadState } from '../lib/storage'
import { ProfileProgressSchema } from './persistSchemas'

function emptyProgress(): ProfileProgress {
  return {
    attempts: [],
    gems: {},
    streak: { count: 0, lastDayISO: '', graceUsed: 0 },
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

const persisters: Record<ProfileId, ReturnType<typeof createDebouncedPersist>> = {
  aira: createDebouncedPersist('profile:aira', () => useProgressStore.getState().profiles.aira),
  leo: createDebouncedPersist('profile:leo', () => useProgressStore.getState().profiles.leo),
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
      return { profiles: { ...state.profiles, [profile]: updated } }
    })
    persisters[profile].schedule()
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
      return { profiles: { ...state.profiles, [profile]: updated } }
    })
    persisters[profile].schedule()
  },
}))

/** Flushes any pending debounced writes for both profiles immediately. */
export async function flushProgress(): Promise<void> {
  await Promise.all([persisters.aira.flush(), persisters.leo.flush()])
}

/**
 * Loads persisted progress for both profiles from IndexedDB into the store.
 * Corrupted or malformed blobs fail validation and are skipped (the store
 * keeps its in-memory default) rather than crashing hydration.
 */
export async function hydrateProgress(): Promise<void> {
  const [aira, leo] = await Promise.all([
    loadState<unknown>('profile:aira'),
    loadState<unknown>('profile:leo'),
  ])

  useProgressStore.setState((state) => {
    const airaResult = aira === undefined ? undefined : ProfileProgressSchema.safeParse(aira)
    const leoResult = leo === undefined ? undefined : ProfileProgressSchema.safeParse(leo)

    if (airaResult && !airaResult.success) {
      console.warn('hydrateProgress: discarding corrupted profile:aira blob', airaResult.error)
    }
    if (leoResult && !leoResult.success) {
      console.warn('hydrateProgress: discarding corrupted profile:leo blob', leoResult.error)
    }

    return {
      profiles: {
        aira: airaResult?.success ? airaResult.data : state.profiles.aira,
        leo: leoResult?.success ? leoResult.data : state.profiles.leo,
      },
    }
  })
}
