import { hydrateProgress } from './progressStore'
import { hydrateSettings } from './settingsStore'
import { hydrateActiveProfile } from './profileStore'

/**
 * Loads all persisted state (profile:aira, profile:leo, settings, and the last
 * active profile) from IndexedDB into the zustand stores. Call once before
 * rendering the app.
 */
export async function hydrateAll(): Promise<void> {
  await Promise.all([hydrateProgress(), hydrateSettings(), hydrateActiveProfile()])
}
