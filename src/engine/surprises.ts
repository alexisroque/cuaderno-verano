import type { Rng } from '../lib/rng'
import type { ProfileId } from '../state/profileStore'
import { CATALOG, CHALLENGE_GATE_LEVEL } from './skills'

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

/**
 * The `challengeFrequency` value at which `desafio` keeps its base weight of 1
 * (i.e. equal footing with the other kinds). This is the default a fresh
 * profile starts at (see settingsStore DEFAULTS), so an unconfigured child
 * sees the original equal-weight behavior. Higher settings raise desafio's
 * share, lower settings shrink it, and 0 removes it entirely.
 */
const CHALLENGE_FREQ_BASELINE = 0.2

/**
 * Maps a parent's `challengeFrequency` (0..~0.5, see Settings.tsx) to a
 * relative weight for the `desafio` surprise kind. Linear around the baseline:
 * `baseline → 1`, `0 → 0` (desafio never fires, its mass redistributes to the
 * other kinds so overall event rate is unchanged), `2*baseline → 2`, etc.
 * `undefined` (older settings blobs) falls back to the baseline weight of 1.
 */
function desafioWeight(challengeFrequency: number | undefined): number {
  if (challengeFrequency === undefined) return 1
  return Math.max(0, challengeFrequency / CHALLENGE_FREQ_BASELINE)
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
 *   - `desafio`'s weight also scales with the parent's `challengeFrequency`
 *     (see `desafioWeight`): higher frequency makes desafio days more likely
 *     among surprises, 0 removes them, and its mass redistributes to the
 *     other kinds so the overall ~30% fire rate is unaffected.
 *   - `gema-doble` is excluded from the pick when `gems` is empty (nothing
 *     to target), redistributing the same way.
 * - `gema-doble` targets the weakest gem in `gems`: lowest level first,
 *   ties broken by lowest progress.
 *
 * `challengeFrequency` is optional so the surprise-only tests and older
 * callers stay valid; omitted keeps the original equal-weight behavior.
 */
export function rollSurprise(
  rng: Rng,
  gems: GemWithProgress[],
  profile: ProfileId,
  challengeFrequency?: number,
): Surprise | null {
  if (!rng.chance(DAILY_EVENT_RATE)) return null

  const desafioAllowed = hasUnlockedChallengeSkill(gems, profile)
  const gemaDobleAllowed = gems.length > 0
  const weightFor = (kind: SurpriseKind): number =>
    kind === 'desafio' ? desafioWeight(challengeFrequency) : BASE_WEIGHTS[kind]

  const availableKinds = (Object.keys(BASE_WEIGHTS) as SurpriseKind[]).filter((kind) => {
    if (kind === 'desafio' && (!desafioAllowed || weightFor('desafio') <= 0)) return false
    if (kind === 'gema-doble' && !gemaDobleAllowed) return false
    return true
  })

  const totalWeight = availableKinds.reduce((sum, kind) => sum + weightFor(kind), 0)
  const roll = rng.next() * totalWeight
  let cursor = 0
  let chosen: SurpriseKind = availableKinds[availableKinds.length - 1]
  for (const kind of availableKinds) {
    cursor += weightFor(kind)
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
