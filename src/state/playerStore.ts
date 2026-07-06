import { create } from 'zustand'
import type { CardDescriptor } from '../engine/dayComposer'

/**
 * The card a player screen is currently working on, plus where to return
 * afterwards. Set by a Today/FreeTraining card tap right before navigating to
 * a player route; cleared when the player is done. Kept in memory only (never
 * persisted) — a reload legitimately drops the in-flight card and sends the
 * child back to the day page.
 */
interface PlayerStoreState {
  card: CardDescriptor | null
  returnTo: string
  /** Chapter id the card was composed against, so the player uses the same flavor. */
  chapterId: string | null
  setActiveCard: (card: CardDescriptor, chapterId: string, returnTo: string) => void
  clearActiveCard: () => void
}

export const usePlayerStore = create<PlayerStoreState>((set) => ({
  card: null,
  returnTo: '/hoy',
  chapterId: null,
  setActiveCard: (card, chapterId, returnTo) => set({ card, chapterId, returnTo }),
  clearActiveCard: () => set({ card: null, chapterId: null }),
}))
