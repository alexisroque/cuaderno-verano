import { create } from 'zustand'
import type { Attempt, DiaryEntry, ProfileProgress } from '../types/progress'
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
    completedCards: {},
  }
}

interface ProgressStoreState {
  profiles: Record<ProfileId, ProfileProgress>
  recordAttempt: (profile: ProfileId, attempt: Attempt) => void
  getAttemptsBySubskill: (profile: ProfileId, subskill: string) => Attempt[]
  addCoins: (profile: ProfileId, amount: number) => void
  /** The cardTypes completed by `profile` on `dateISO` (empty array if none). */
  completedCardsFor: (profile: ProfileId, dateISO: string) => string[]
  /** Marks `cardType` complete for `profile` on `dateISO` (idempotent). */
  markCardComplete: (profile: ProfileId, dateISO: string, cardType: string) => void
  /**
   * Records a diary entry (upserts by dateISO+promptId so re-saving the same
   * day's prompt overwrites rather than duplicating). Powers the diary
   * collection screen and drives the escritura/diario gem by consistency.
   */
  addDiaryEntry: (profile: ProfileId, entry: DiaryEntry) => void
  /**
   * Marks a content id consumed for `poolKey` so the day composer stops
   * re-serving it (episodes, curiosities, diaryPrompts…). Idempotent.
   */
  markConsumed: (profile: ProfileId, poolKey: string, id: string) => void
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
  completedCardsFor: (profile, dateISO) => {
    return get().profiles[profile].completedCards[dateISO] ?? []
  },
  markCardComplete: (profile, dateISO, cardType) => {
    set((state) => {
      const current = state.profiles[profile]
      const forDay = current.completedCards[dateISO] ?? []
      if (forDay.includes(cardType)) return state
      const updated = {
        ...current,
        completedCards: { ...current.completedCards, [dateISO]: [...forDay, cardType] },
      }
      return { profiles: { ...state.profiles, [profile]: updated } }
    })
    persisters[profile].schedule()
  },
  addDiaryEntry: (profile, entry) => {
    set((state) => {
      const current = state.profiles[profile]
      const rest = current.diaryEntries.filter(
        (e) => !(e.dateISO === entry.dateISO && e.promptId === entry.promptId),
      )
      const updated = { ...current, diaryEntries: [...rest, entry] }
      return { profiles: { ...state.profiles, [profile]: updated } }
    })
    persisters[profile].schedule()
  },
  markConsumed: (profile, poolKey, id) => {
    set((state) => {
      const current = state.profiles[profile]
      const forPool = current.consumedContent[poolKey] ?? []
      if (forPool.includes(id)) return state
      const updated = {
        ...current,
        consumedContent: { ...current.consumedContent, [poolKey]: [...forPool, id] },
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
