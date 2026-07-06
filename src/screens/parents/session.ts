import { create } from 'zustand'

/**
 * Session-only unlock flag for the parent panel. Deliberately NOT persisted:
 * closing the tab re-locks the panel so a kid can't wander back in. Lives in
 * its own tiny store so the gate and the panel share one truth.
 */
interface ParentSessionState {
  unlocked: boolean
  unlock: () => void
  lock: () => void
}

export const useParentSession = create<ParentSessionState>((set) => ({
  unlocked: false,
  unlock: () => set({ unlocked: true }),
  lock: () => set({ unlocked: false }),
}))
