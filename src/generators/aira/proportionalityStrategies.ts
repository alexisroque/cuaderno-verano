import type { Strategy } from '../../types/exercise'

/**
 * Mirrors the `Ingredient` shape in `proportionality.ts`: a measuring unit
 * ("vasos", "tazas", ...) paired with the ingredient name ("leche",
 * "harina", ...), so unit and name compose naturally ("7 vasos de leche")
 * instead of the old glued-on-parenthetical phrasing ("7 de leche (vasos)").
 */
export interface RecipeIngredient {
  name: string
  unit: string
}

/** Renders "N vasos de leche" (with unit) or "N huevos" (no distinct unit) — kept in sync with proportionality.ts's formatQuantity. */
function formatQuantity(amount: number, ingredient: RecipeIngredient): string {
  return ingredient.unit ? `${amount} ${ingredient.unit} de ${ingredient.name}` : `${amount} ${ingredient.name}`
}

/**
 * "Escalar la receta": scales a recipe ingredient quantity by `factor`
 * (double/triple/etc.) — the classic proportionality reasoning where every
 * ingredient scales by the SAME factor.
 */
export function buildRecipeScaleStrategy(ingredient: RecipeIngredient, baseAmount: number, factor: number, servingsWord: string): Strategy {
  const scaled = baseAmount * factor

  return {
    id: 'escalar-receta',
    name: 'Escalar la receta',
    steps: [
      { text: `La receta original usa ${formatQuantity(baseAmount, ingredient)} para ${servingsWord}.` },
      { text: `Como queremos ${factor} veces más, multiplicamos todos los ingredientes por ${factor}.` },
      { text: `${baseAmount} × ${factor} = ${scaled}` },
    ],
  }
}

/**
 * "Cambio de unidad, deducir la operación": given a known rate (per unitA ->
 * perUnit amount of unitB), decides whether reaching a target requires
 * multiplying or dividing, then computes it. `isMultiply` tells the strategy
 * which direction the reasoning goes.
 */
export function buildUnitChangeStrategy(
  perUnitLabel: string,
  rate: number,
  targetLabel: string,
  targetValue: number,
  isMultiply: boolean,
  result: number,
): Strategy {
  const opSymbol = isMultiply ? '×' : '÷'
  const reasoning = isMultiply
    ? `Como queremos más ${targetLabel} que en la proporción base, multiplicamos.`
    : `Como queremos saber cuántas veces cabe la proporción base en ${targetValue}, dividimos.`
  // Multiply: rate × targetValue = result (e.g. 8 × 5 = 40) — operand order
  // matches the actual multiplication being done, so it's already true.
  // Divide: the true equation is targetValue ÷ rate = result (e.g. 40 ÷ 8 =
  // 5), NOT rate ÷ targetValue (which would be false, e.g. 8 ÷ 40 = 0.2).
  const equation = isMultiply ? `${rate} ${opSymbol} ${targetValue} = ${result}` : `${targetValue} ${opSymbol} ${rate} = ${result}`

  return {
    id: 'cambio-unidad',
    name: 'Deducir si multiplicar o dividir',
    steps: [
      { text: `Sabemos que ${perUnitLabel} corresponde a ${rate}.` },
      { text: reasoning },
      { text: equation },
    ],
  }
}
