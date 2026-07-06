import type { Rng } from '../lib/rng'
import type { ProfileId } from '../state/profileStore'
import { CATALOG } from './skills'

/** Gem level (Ámbar) at/above which a skill's challenge subskills unlock. Mirrors scheduler.ts's CHALLENGE_GATE_LEVEL. */
const CHALLENGE_GATE_LEVEL = 2

/** Probability that any surprise event fires on a given day. */
const DAILY_EVENT_RATE = 0.3

/** A gem's level and progress, keyed by skillId, as needed to pick the weakest one for `gema-doble`. */
export interface GemWithProgress {
  skillId: string
  level: number
  progress: number
}

export type Surprise =
  | { kind: 'desafio' }
  | { kind: 'relampago' }
  | { kind: 'gema-doble'; skillId: string }
  | { kind: 'invitado' }
  | { kind: 'cofre-mejorado' }

type SurpriseKind = Surprise['kind']

/** Base relative weights for each event kind, before any gating/redistribution. Equal weight across all 5. */
const BASE_WEIGHTS: Record<SurpriseKind, number> = {
  desafio: 1,
  relampago: 1,
  'gema-doble': 1,
  invitado: 1,
  'cofre-mejorado': 1,
}

/** True if `profile`'s catalog has at least one skill containing a challenge subskill whose gem level is >= CHALLENGE_GATE_LEVEL. */
function hasUnlockedChallengeSkill(gems: GemWithProgress[], profile: ProfileId): boolean {
  const skills = CATALOG[profile].skills as Record<string, { subskills: Record<string, { challenge?: boolean }> }>
  const gemLevelBySkill = new Map(gems.map((g) => [g.skillId, g.level]))

  for (const [skillId, def] of Object.entries(skills)) {
    const hasChallengeSubskill = Object.values(def.subskills).some((s) => s.challenge)
    if (!hasChallengeSubskill) continue
    const level = gemLevelBySkill.get(skillId) ?? 0
    if (level >= CHALLENGE_GATE_LEVEL) return true
  }
  return false
}

/** The weakest gem (lowest level, tie-broken by lowest progress), or undefined if `gems` is empty. */
function weakestGem(gems: GemWithProgress[]): GemWithProgress | undefined {
  if (gems.length === 0) return undefined
  return gems.reduce((weakest, g) => {
    if (g.level < weakest.level) return g
    if (g.level === weakest.level && g.progress < weakest.progress) return g
    return weakest
  }, gems[0])
}

/**
 * Rolls for a surprise event on the day represented by `rng` (callers seed
 * one rng per day, conventionally `${dateISO}:${profile}:surprise`).
 *
 * - Fires on ~30% of days (`DAILY_EVENT_RATE`), otherwise returns null.
 * - When it fires, picks one of 5 event kinds, weighted equally, EXCEPT:
 *   - `desafio` is excluded from the weighted pick unless at least one
 *     skill with challenge subskills has an unlocked (>= Ámbar) gem, in
 *     which case its weight mass is redistributed proportionally across
 *     the other 4 kinds (so the overall ~30% daily fire rate is unaffected
 *     by the gate).
 *   - `gema-doble` is excluded from the pick when `gems` is empty (nothing
 *     to target), redistributing the same way.
 * - `gema-doble` targets the weakest gem in `gems`: lowest level first,
 *   ties broken by lowest progress.
 */
export function rollSurprise(rng: Rng, gems: GemWithProgress[], profile: ProfileId): Surprise | null {
  if (!rng.chance(DAILY_EVENT_RATE)) return null

  const desafioAllowed = hasUnlockedChallengeSkill(gems, profile)
  const gemaDobleAllowed = gems.length > 0

  const availableKinds = (Object.keys(BASE_WEIGHTS) as SurpriseKind[]).filter((kind) => {
    if (kind === 'desafio' && !desafioAllowed) return false
    if (kind === 'gema-doble' && !gemaDobleAllowed) return false
    return true
  })

  const totalWeight = availableKinds.reduce((sum, kind) => sum + BASE_WEIGHTS[kind], 0)
  const roll = rng.next() * totalWeight
  let cursor = 0
  let chosen: SurpriseKind = availableKinds[availableKinds.length - 1]
  for (const kind of availableKinds) {
    cursor += BASE_WEIGHTS[kind]
    if (roll < cursor) {
      chosen = kind
      break
    }
  }

  if (chosen === 'gema-doble') {
    // gemaDobleAllowed guarantees `gems` is non-empty, so weakestGem always returns a value here.
    const target = weakestGem(gems)
    if (target !== undefined) {
      return { kind: 'gema-doble', skillId: target.skillId }
    }
  }

  return chosen === 'gema-doble' ? null : { kind: chosen }
}
