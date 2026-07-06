import { create } from 'zustand'

export type ProfileId = 'aira' | 'leo'

interface ProfileStoreState {
  activeProfile: ProfileId | null
  setActiveProfile: (profile: ProfileId | null) => void
}

export const useProfileStore = create<ProfileStoreState>((set) => ({
  activeProfile: null,
  setActiveProfile: (profile) => set({ activeProfile: profile }),
}))
