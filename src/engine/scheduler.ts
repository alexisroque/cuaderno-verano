import type { Attempt, GemState } from '../types/progress'
import type { Rng } from '../lib/rng'
import type { ChildSettings } from '../state/settingsStore'
import type { ProfileId } from '../state/profileStore'
import { CATALOG, type SkillId, type SubskillDef, type SubskillId } from './skills'
import { masteryFor } from './mastery'
import { daysBetween } from '../lib/dates'

/** Days-ago offsets, relative to `todayISO`, that re-queue a failed subskill (spaced repetition). */
const SPACED_REPETITION_OFFSETS = [1, 3, 7]

/** Mastery below this threshold puts a subskill in the weak/due pool even without a scheduled failure. */
const WEAK_MASTERY_THRESHOLD = 0.7

/** Gem level (Ámbar) at/above which challenge subskills for that skill are allowed. */
const CHALLENGE_GATE_LEVEL = 2

const POOL_WEIGHTS = {
  due: 0.6,
  consolidation: 0.25,
  novelty: 0.15,
} as const

const BOOST_MULTIPLIER = 2
const LOW_WEIGHT_MULTIPLIER = 0.3

/**
 * Subskill ids that are "due" today via spaced repetition: a FAILED attempt
 * recorded exactly 1, 3, or 7 days before `todayISO`. Passed attempts never
 * make a subskill due, and a failure at any other offset (e.g. 2 days ago)
 * doesn't count. A subskill with multiple qualifying failures appears once.
 */
export function dueSubskills(attempts: Attempt[], todayISO: string): SubskillId[] {
  const due = new Set<SubskillId>()
  for (const a of attempts) {
    if (a.correct) continue
    const offset = daysBetween(a.dateISO, todayISO)
    if (SPACED_REPETITION_OFFSETS.includes(offset)) {
      due.add(a.subskill)
    }
  }
  return [...due]
}

/** All subskill defs for `profile`, flattened across every skill. */
function allSubskills(profile: ProfileId): SubskillDef[] {
  const skills = CATALOG[profile].skills as Record<string, { subskills: Record<string, SubskillDef> }>
  return Object.values(skills).flatMap((s) => Object.values(s.subskills))
}

/** True if `def` is a challenge subskill that isn't yet unlocked by its skill's gem level. */
function isLockedChallenge(def: SubskillDef, gems: Record<string, GemState>): boolean {
  if (!def.challenge) return false
  const level = gems[def.skill]?.level ?? 0
  return level < CHALLENGE_GATE_LEVEL
}

type PoolName = 'due' | 'consolidation' | 'novelty'

/**
 * Groups attempts by subskill id, once, so callers needing per-subskill
 * slices (mastery lookups, etc.) don't each re-filter the full attempts
 * array. Without this, bucketing N subskills over M attempts costs O(N*M)
 * (each `masteryFor` call re-scans every attempt); precomputing the map
 * makes it O(M + N).
 */
function groupAttemptsBySubskill(attempts: Attempt[]): Map<SubskillId, Attempt[]> {
  const map = new Map<SubskillId, Attempt[]>()
  for (const a of attempts) {
    const list = map.get(a.subskill)
    if (list) {
      list.push(a)
    } else {
      map.set(a.subskill, [a])
    }
  }
  return map
}

/**
 * Buckets every unlocked subskill into exactly one pool:
 * - `due`: spaced-repetition due today, OR mastery < 0.7 (includes never-attempted-but-not-novelty
 *   is impossible since no attempts means mastery is undefined, which is handled by `novelty` first).
 * - `novelty`: no attempts at all yet.
 * - `consolidation`: everything else (mastery >= 0.7, not due).
 *
 * `attemptsBySubskill` is a precomputed `groupAttemptsBySubskill` map so this
 * runs in O(subskills + attempts) rather than re-filtering the full attempts
 * array once per subskill.
 */
function bucketSubskills(
  defs: SubskillDef[],
  attemptsBySubskill: Map<SubskillId, Attempt[]>,
  dueIds: Set<SubskillId>,
): Record<PoolName, SubskillDef[]> {
  const pools: Record<PoolName, SubskillDef[]> = { due: [], consolidation: [], novelty: [] }

  for (const def of defs) {
    const relevant = attemptsBySubskill.get(def.id) ?? []
    const mastery = masteryFor(relevant, def.id)
    if (mastery === undefined) {
      pools.novelty.push(def)
    } else if (dueIds.has(def.id) || mastery < WEAK_MASTERY_THRESHOLD) {
      pools.due.push(def)
    } else {
      pools.consolidation.push(def)
    }
  }

  return pools
}

/** Per-subskill weight before pool-level normalization: lowWeight and boost multipliers. */
function subskillWeight(def: SubskillDef, settings: ChildSettings, todayISO: string): number {
  let weight = 1
  if (def.lowWeight) weight *= LOW_WEIGHT_MULTIPLIER

  const boostUntil = settings.subskillAdjustments[def.id]?.boostUntil
  if (boostUntil && boostUntil >= todayISO) {
    weight *= BOOST_MULTIPLIER
  }

  return weight
}

/** Restricts the novelty pool to `weeklyFocus` subskills, falling back to the full pool if empty/no intersection. */
function applyFocus(noveltyPool: SubskillDef[], weeklyFocus: string[]): SubskillDef[] {
  if (weeklyFocus.length === 0) return noveltyPool
  const focused = noveltyPool.filter((def) => weeklyFocus.includes(def.id))
  return focused.length > 0 ? focused : noveltyPool
}

export interface PickSubskillOptions {
  /**
   * Restricts the entire candidate set to subskills belonging to one of
   * these skill ids (e.g. `['problemas', 'calculo']` for the daily problema
   * card). Applied before pool bucketing, so pool proportions (due/
   * consolidation/novelty) are computed only over the filtered set.
   * Undefined/omitted means no restriction (the original full-catalog
   * behavior), keeping this option backward compatible.
   */
  skillFilter?: SkillId[]
}

/**
 * Picks one subskill to serve next, using weighted pools:
 * - due/weak 60%, consolidation 25%, novelty 15% (weights redistribute
 *   proportionally to remaining pools when one is empty).
 * - Within a pool, each subskill's relative weight is 1, x0.3 if
 *   `lowWeight`, and x2 if parent-boosted (`boostUntil >= todayISO`).
 * - Challenge subskills are excluded entirely unless their skill's gem
 *   level is >= 2 (Ámbar).
 * - The novelty pool is restricted to `settings.weeklyFocus` subskills when
 *   set, falling back to the unrestricted novelty pool if the intersection
 *   is empty.
 * - `options.skillFilter`, when provided, restricts candidates to those
 *   skills before anything else runs (see `PickSubskillOptions`).
 */
export function pickSubskill(
  rng: Rng,
  attempts: Attempt[],
  profile: ProfileId,
  settings: ChildSettings,
  todayISO: string,
  gems: Record<string, GemState>,
  options: PickSubskillOptions = {},
): SubskillId {
  const { skillFilter } = options
  const baseline = allSubskills(profile).filter((def) => !isLockedChallenge(def, gems))
  const unlocked = skillFilter ? baseline.filter((def) => skillFilter.includes(def.skill)) : baseline

  const attemptsBySubskill = groupAttemptsBySubskill(attempts)
  const dueIds = new Set(dueSubskills(attempts, todayISO))
  const pools = bucketSubskills(unlocked, attemptsBySubskill, dueIds)
  pools.novelty = applyFocus(pools.novelty, settings.weeklyFocus)

  const activePools = (Object.keys(POOL_WEIGHTS) as PoolName[]).filter((name) => pools[name].length > 0)
  const totalActiveWeight = activePools.reduce((sum, name) => sum + POOL_WEIGHTS[name], 0)

  const roll = rng.next() * totalActiveWeight
  let cursor = 0
  let chosenPool: PoolName = activePools[activePools.length - 1]
  for (const name of activePools) {
    cursor += POOL_WEIGHTS[name]
    if (roll < cursor) {
      chosenPool = name
      break
    }
  }

  const candidates = pools[chosenPool]
  const weights = candidates.map((def) => subskillWeight(def, settings, todayISO))
  const totalWeight = weights.reduce((sum, w) => sum + w, 0)

  const pick = rng.next() * totalWeight
  let weightCursor = 0
  for (let i = 0; i < candidates.length; i++) {
    weightCursor += weights[i]
    if (pick < weightCursor) {
      return candidates[i].id
    }
  }
  return candidates[candidates.length - 1].id
}
