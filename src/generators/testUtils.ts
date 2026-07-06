import { expect } from 'vitest'
import { createRng } from '../lib/rng'
import type { ChapterFlavorLite, Exercise, Generator } from '../types/exercise'
import { validateChapters } from '../content/schemas'
import chaptersData from '../../content/chapters.json'
import { flavorFromChapter } from './framework'

/**
 * Default flavor used by property tests when the caller doesn't need to
 * vary it. Mirrors the REAL schema shape (see `ChapterFlavorLite` /
 * `ChapterSchema.flavor`): `currency` is the old free-text descriptive
 * field, no longer read by generators (superseded by `currencySymbol`);
 * `priceItems` are realistic multi-word, singular, lowercase noun phrases
 * (not single words like "churros", which is plural and breaks the
 * "cada churros cuesta" grammar the old flavor contract produced).
 */
export const DEFAULT_TEST_FLAVOR: ChapterFlavorLite = {
  placeName: 'Villamar',
  currency: 'euro (EUR)',
  currencySymbol: '€',
  placePhrase: 'en Villamar',
  priceItems: ['helado de churro', 'bocadillo de tortilla', 'granizado de limón', 'plato de paella'],
  landmarks: ['El Faro', 'La Muralla'],
  animals: ['delfín', 'gaviota', 'tortuga'],
  foods: ['paella', 'helado', 'churros'],
}

/** Every real chapter from `content/chapters.json`, projected to `ChapterFlavorLite` via `flavorFromChapter`. */
export const REAL_CHAPTER_FLAVORS: ChapterFlavorLite[] = validateChapters(chaptersData).map(flavorFromChapter)

export interface PropertyTestOptions {
  /** Number of distinct seeds to try per difficulty. Defaults to 200 per the task's TDD convention. */
  seeds?: number
  /** Difficulties to test; typically the subskill's full difficultyRange. */
  difficulties: number[]
  /** Flavor to pass to `generator.generate`; defaults to `DEFAULT_TEST_FLAVOR`. */
  flavor?: ChapterFlavorLite
  /** Seed prefix, so different call sites in the same file don't collide on the same seed strings. */
  seedPrefix?: string
}

/**
 * Runs `invariantFn` against `generator.generate(rng, difficulty, flavor)`
 * for every (seed, difficulty) pair — `options.seeds` (default 200)
 * distinct deterministic seeds crossed with every difficulty in
 * `options.difficulties`. Any thrown assertion inside `invariantFn`
 * surfaces with the failing seed/difficulty in the error message, so a
 * property failure is easy to reproduce standalone.
 */
export function propertyTest(
  generator: Generator,
  options: PropertyTestOptions,
  invariantFn: (exercise: Exercise, ctx: { seed: string; difficulty: number }) => void,
): void {
  const seedCount = options.seeds ?? 200
  const flavor = options.flavor ?? DEFAULT_TEST_FLAVOR
  const prefix = options.seedPrefix ?? generator.subskill

  for (const difficulty of options.difficulties) {
    for (let i = 0; i < seedCount; i++) {
      const seed = `${prefix}:${difficulty}:${i}`
      const rng = createRng(seed)
      const exercise = generator.generate(rng, difficulty, flavor)
      try {
        invariantFn(exercise, { seed, difficulty })
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err)
        throw new Error(`propertyTest failed for seed="${seed}" difficulty=${difficulty}: ${message}`)
      }
    }
  }
}

/**
 * Convenience wrapper around `propertyTest` that also asserts the
 * determinism invariant (same seed -> deep-equal exercise) for every
 * (seed, difficulty) pair it exercises, in addition to running
 * `invariantFn`. Prefer this in generator test suites unless determinism is
 * already covered elsewhere.
 */
export function propertyTestWithDeterminism(
  generator: Generator,
  options: PropertyTestOptions,
  invariantFn: (exercise: Exercise, ctx: { seed: string; difficulty: number }) => void,
): void {
  const flavor = options.flavor ?? DEFAULT_TEST_FLAVOR

  propertyTest(generator, options, (exercise, ctx) => {
    const replay = generator.generate(createRng(ctx.seed), ctx.difficulty, flavor)
    expect(replay).toEqual(exercise)
    invariantFn(exercise, ctx)
  })
}
