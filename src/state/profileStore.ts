import { create } from 'zustand'
import { loadState, saveState } from '../lib/storage'

export type ProfileId = 'aira' | 'leo'

const STORAGE_KEY = 'activeProfile'

interface ProfileStoreState {
  activeProfile: ProfileId | null
  setActiveProfile: (profile: ProfileId | null) => void
}

export const useProfileStore = create<ProfileStoreState>((set) => ({
  activeProfile: null,
  setActiveProfile: (profile) => {
    set({ activeProfile: profile })
    // Persist immediately (single scalar, changes rarely) so an accidental
    // reload returns to the same child's day instead of the picker.
    void saveState(STORAGE_KEY, profile)
  },
}))

/**
 * Loads the last active profile from IndexedDB, so a reload lands back on the
 * same child's /hoy instead of the profile picker. A missing or invalid blob
 * leaves the store at its `null` default (the picker), never crashing.
 */
export async function hydrateActiveProfile(): Promise<void> {
  const saved = await loadState<unknown>(STORAGE_KEY)
  if (saved === 'aira' || saved === 'leo') {
    useProfileStore.setState({ activeProfile: saved })
  }
}
