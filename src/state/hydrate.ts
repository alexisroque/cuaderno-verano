import { hydrateProgress } from './progressStore'
import { hydrateSettings } from './settingsStore'

/**
 * Loads all persisted state (profile:aira, profile:leo, settings) from
 * IndexedDB into the zustand stores. Call once before rendering the app.
 */
export async function hydrateAll(): Promise<void> {
  await Promise.all([hydrateProgress(), hydrateSettings()])
}
