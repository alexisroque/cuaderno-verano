import { useProfileStore } from '../state/profileStore'
import { TodayAira } from './TodayAira'
import { TodayLeo } from './TodayLeo'

/**
 * "La página de hoy" — routes to the profile-specific daily page: Aira's 2×2
 * card grid + gem cabinet, or Leo's big audio cards + mural.
 */
export function Today() {
  const profile = useProfileStore((s) => s.activeProfile)
  return profile === 'leo' ? <TodayLeo /> : <TodayAira />
}
