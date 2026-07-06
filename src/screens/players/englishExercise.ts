import type { Rng } from '../../lib/rng'
import type { EnglishUnit } from '../../content/schemas'
import { getContentBundle } from '../../content/loader'

/** Maps a Leo `english` subskill to the english-unit id category prefix. */
const CATEGORY_PREFIX: Record<string, string> = {
  animales: 'eng-animals',
  colores: 'eng-colors',
  comida: 'eng-food',
  huerto: 'eng-garden',
}

export interface EnglishTapExercise {
  /** The word to find (spoken in English). */
  target: EnglishUnit
  /** 4 options (the target + 3 distractors), already shuffled. */
  options: EnglishUnit[]
}

/**
 * Builds a "tap the image you hear" English exercise deterministically from a
 * card seed: picks a target word from the subskill's category (falling back to
 * the whole vocab pool if the category is thin) plus 3 distractors, then
 * shuffles. Pure over `rng`, so the same card seed always yields the same round.
 */
export function buildEnglishExercise(rng: Rng, subskill: string | undefined): EnglishTapExercise | null {
  const all = getContentBundle().englishUnits ?? []
  if (all.length < 2) return null

  const prefix = subskill ? CATEGORY_PREFIX[subskill] : undefined
  const inCategory = prefix ? all.filter((u) => u.id.startsWith(prefix)) : []
  const pool = inCategory.length >= 4 ? inCategory : all

  const target = rng.pick(pool)
  const distractorPool = all.filter((u) => u.id !== target.id && u.emoji !== target.emoji)
  const distractors = rng.shuffle(distractorPool).slice(0, 3)
  const options = rng.shuffle([target, ...distractors])
  return { target, options }
}
