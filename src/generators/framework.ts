import type { Chapter } from '../content/schemas'
import type { ChapterFlavorLite, Generator } from '../types/exercise'
import type { SubskillId } from '../engine/skills'
import type { Rng } from '../lib/rng'

/** Registry of generators, keyed by subskill id. Populated by side-effecting `index.ts` modules on import. */
const registry = new Map<SubskillId, Generator>()

/** Registers `gen` under its own `subskill` id, overwriting any previous registration for that id. */
export function registerGenerator(gen: Generator): void {
  registry.set(gen.subskill, gen)
}

/** Looks up the generator registered for `subskill`, or undefined if none is registered. */
export function getGenerator(subskill: SubskillId): Generator | undefined {
  return registry.get(subskill)
}

/** All currently-registered subskill ids. */
export function listRegistered(): SubskillId[] {
  return [...registry.keys()]
}

/** Test-only: clears the registry so each test file/suite starts from a clean slate. */
export function __resetRegistryForTests(): void {
  registry.clear()
}

/** Projects a full content `Chapter` down to the lightweight flavor shape generators consume. */
export function flavorFromChapter(chapter: Chapter): ChapterFlavorLite {
  return {
    placeName: chapter.place,
    currency: chapter.flavor.currency,
    currencySymbol: chapter.flavor.currencySymbol,
    placePhrase: chapter.flavor.placePhrase,
    priceItems: chapter.flavor.priceItems,
    landmarks: chapter.flavor.landmarks,
    animals: chapter.flavor.animals,
    foods: chapter.flavor.foods,
  }
}

/**
 * Derives a deterministic `Exercise.id` for a generator run, without any
 * external counter or clock: `${subskill}-d${difficulty}-${hex}`, where
 * `hex` comes from a draw off `rng` (a large int rendered in base 16).
 * Generators call this FIRST, before making any other draws from `rng`, so
 * the id is reproducible: the same seed always yields the same first draw,
 * and thus the same id, satisfying the "same seed -> deep-equal exercise"
 * invariant tested in framework.test.ts and testUtils.ts's propertyTest.
 */
export function exerciseId(rng: Rng, subskill: SubskillId, difficulty: number): string {
  const hex = rng.int(0, 0xffffffff).toString(16)
  return `${subskill}-d${difficulty}-${hex}`
}

/**
 * Clamps a requested difficulty to the inclusive `[min, max]` range, rounding
 * to the nearest integer. Guards against non-finite input (`NaN`, `Infinity`,
 * `-Infinity`, or anything that coerced to a non-finite number, e.g. an `any`
 * carrying `undefined`) by falling back to `min` instead of propagating NaN
 * through `Math.round`/`Math.min`/`Math.max` (which would otherwise return
 * NaN and corrupt every downstream operand roll and the exercise's
 * `difficulty` field). This is the single shared implementation generators
 * must use instead of keeping their own local copies.
 */
export function clampDifficulty(difficulty: number, min: number, max: number): number {
  if (!Number.isFinite(difficulty)) {
    return min
  }
  return Math.min(max, Math.max(min, Math.round(difficulty)))
}
