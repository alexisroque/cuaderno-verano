import { create } from 'zustand'
import type { ProfileProgress } from '../types/progress'
import type { ProfileId } from './profileStore'
import { useProgressStore } from './progressStore'

/**
 * "Modo prueba" (no-trace test mode). While active, ALL progress writes still
 * happen in memory (so the app behaves exactly as usual — coins, gems,
 * celebrations…), but the progress store suppresses every persistence write to
 * IndexedDB (see the `active` guard in progressStore/flush). Turning it off (or
 * simply reloading the page) leaves the real saved progress untouched.
 *
 * This store is intentionally NOT persisted — it lives only for the session,
 * and a reload naturally lands the parent back in normal mode with the real
 * data (since nothing was written while testing).
 */

/** Deep-clones the two profiles so the snapshot can't be mutated by later, in-memory test writes. */
function cloneProfiles(
  profiles: Record<ProfileId, ProfileProgress>,
): Record<ProfileId, ProfileProgress> {
  return structuredClone(profiles)
}

interface TestModeState {
  active: boolean
  /** The real progress captured when test mode was enabled, restored on disable. */
  snapshot: Record<ProfileId, ProfileProgress> | null
  /** Snapshots the current real progress, then activates no-trace mode. */
  enable: () => void
  /** Restores the pre-test progress into the store and deactivates the mode. */
  disable: () => void
}

export const useTestModeStore = create<TestModeState>((set, get) => ({
  active: false,
  snapshot: null,
  enable: () => {
    if (get().active) return
    const snapshot = cloneProfiles(useProgressStore.getState().profiles)
    set({ active: true, snapshot })
  },
  disable: () => {
    const { active, snapshot } = get()
    if (!active) return
    // Restore the real, pre-test progress so the UI immediately reflects it
    // again. We deep-clone once more so the restored state is independent of
    // the retained snapshot object.
    if (snapshot) {
      useProgressStore.setState({ profiles: cloneProfiles(snapshot) })
    }
    set({ active: false, snapshot: null })
  },
}))

/** True while no-trace test mode is on. Read outside React (e.g. persistence guards). */
export function isTestModeActive(): boolean {
  return useTestModeStore.getState().active
}
