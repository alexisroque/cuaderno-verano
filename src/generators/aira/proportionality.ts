import type { Rng } from '../../lib/rng'
import type { ChapterFlavorLite, Exercise, Generator } from '../../types/exercise'
import { clampDifficulty, exerciseId } from '../framework'
import { buildRecipeScaleStrategy, buildUnitChangeStrategy } from './proportionalityStrategies'

/** Base recipe amount + factor ranges per difficulty (catalog range [3, 5]). */
const RECIPE_RANGES: Record<number, { amount: [number, number]; factor: number[] }> = {
  3: { amount: [1, 6], factor: [2, 3] },
  4: { amount: [2, 10], factor: [2, 3, 4] },
  5: { amount: [3, 15], factor: [2, 3, 4, 5] },
}

/** Rate + target ranges per difficulty for the unit-change kind. */
const UNIT_RANGES: Record<number, { rate: [number, number]; multiplier: number[] }> = {
  3: { rate: [2, 6], multiplier: [2, 3] },
  4: { rate: [3, 9], multiplier: [2, 3, 4] },
  5: { rate: [4, 12], multiplier: [2, 3, 4, 5] },
}

/**
 * Each ingredient pairs a measuring unit ("vasos", "tazas", ...) with the
 * food/ingredient name ("leche", "harina", ...), so the prompt can compose
 * them naturally as "6 vasos de leche" instead of gluing a parenthesized
 * unit onto the ingredient ("6 de leche (vasos)").  Ingredients with no
 * distinct measuring unit (e.g. "huevos") use unit: '' and are referred to
 * by name alone ("6 huevos").
 */
interface Ingredient {
  name: string
  unit: string
  /** Grammatical gender of `unit` (or of `name` when unit is ''), so "cuántos"/"cuántas" agrees. */
  fem: boolean
}
const INGREDIENTS: Ingredient[] = [
  { name: 'harina', unit: 'tazas', fem: true },
  { name: 'azúcar', unit: 'cucharadas', fem: true },
  { name: 'huevos', unit: '', fem: false },
  { name: 'leche', unit: 'vasos', fem: false },
  { name: 'mantequilla', unit: 'cucharadas', fem: true },
]

/** Renders "N vasos de leche" (with unit) or "N huevos" (no distinct unit). */
function formatQuantity(amount: number, ingredient: Ingredient): string {
  return ingredient.unit ? `${amount} ${ingredient.unit} de ${ingredient.name}` : `${amount} ${ingredient.name}`
}

/** The word the question re-asks for: the unit if there is one, else the ingredient name itself. */
function askWord(ingredient: Ingredient): string {
  return ingredient.unit || ingredient.name
}

/** "cuántos"/"cuántas" agreeing with the ingredient's unit (or name) gender. */
function cuantos(ingredient: Ingredient): string {
  return ingredient.fem ? 'cuántas' : 'cuántos'
}

function buildRecipeScaling(rng: Rng, difficulty: number): { prompt: string; answer: number; strategyArgs: [Ingredient, number, number, string] } {
  const { amount, factor } = RECIPE_RANGES[difficulty]
  const ingredient = rng.pick(INGREDIENTS)
  const baseAmount = rng.int(amount[0], amount[1])
  const scaleFactor = rng.pick(factor)
  const basePeople = rng.int(2, 4)
  const scaledPeople = basePeople * scaleFactor
  const servingsWord = `${basePeople} personas`
  const scaled = baseAmount * scaleFactor

  return {
    prompt: `Para ${basePeople} personas necesitas ${formatQuantity(baseAmount, ingredient)}. Para ${scaledPeople} personas, ¿${cuantos(ingredient)} ${askWord(ingredient)} necesitas?`,
    answer: scaled,
    strategyArgs: [ingredient, baseAmount, scaleFactor, servingsWord],
  }
}

function buildUnitChange(
  rng: Rng,
  difficulty: number,
): { prompt: string; answer: number; strategyArgs: [string, number, string, number, boolean, number] } {
  const { rate, multiplier } = UNIT_RANGES[difficulty]
  const rateValue = rng.int(rate[0], rate[1])
  const mult = rng.pick(multiplier)
  const isMultiply = rng.chance(0.5)

  // "rateValue km every 1 hour" style base rate; ask either for `mult` hours (multiply) or for the
  // number of hours needed to cover `rateValue * mult` km (divide) — both always exact by construction.
  if (isMultiply) {
    const targetValue = mult
    const result = rateValue * mult
    return {
      prompt: `Un coche recorre ${rateValue} km cada hora, a velocidad constante. ¿Cuántos km recorre en ${targetValue} horas?`,
      answer: result,
      strategyArgs: [`${rateValue} km cada hora`, rateValue, 'km recorridos', targetValue, true, result],
    }
  }

  const targetValue = rateValue * mult
  const result = mult
  return {
    prompt: `Un coche recorre ${rateValue} km cada hora, a velocidad constante. ¿Cuántas horas tarda en recorrer ${targetValue} km?`,
    answer: result,
    strategyArgs: [`${rateValue} km cada hora`, rateValue, 'horas necesarias', targetValue, false, result],
  }
}

export const proporcionalidadGenerator: Generator = {
  subskill: 'proporcionalidad',
  generate(rng: Rng, requestedDifficulty: number, _flavor: ChapterFlavorLite): Exercise {
    // exerciseId must be the FIRST draw off rng for determinism; clamping
    // first is safe since clampDifficulty never touches rng.
    const difficulty = clampDifficulty(requestedDifficulty, 3, 5)
    const id = exerciseId(rng, 'proporcionalidad', difficulty)

    const kind = rng.chance(0.5) ? 'recipe' : 'unit-change'

    if (kind === 'recipe') {
      const built = buildRecipeScaling(rng, difficulty)
      return {
        id,
        subskill: 'proporcionalidad',
        difficulty,
        prompt: { text: built.prompt },
        answer: { kind: 'number', value: built.answer },
        strategies: [buildRecipeScaleStrategy(...built.strategyArgs)],
        microlesson: 'En una receta, si cambias el número de personas, todos los ingredientes cambian en la misma proporción.',
        challenge: true,
      }
    }

    const built = buildUnitChange(rng, difficulty)
    return {
      id,
      subskill: 'proporcionalidad',
      difficulty,
      prompt: { text: built.prompt },
      answer: { kind: 'number', value: built.answer },
      strategies: [buildUnitChangeStrategy(...built.strategyArgs)],
      microlesson: 'Ante una proporción, piensa: si quiero más, ¿multiplico o divido? Fíjate en si el resultado debe crecer o encogerse.',
      challenge: true,
    }
  },
}
