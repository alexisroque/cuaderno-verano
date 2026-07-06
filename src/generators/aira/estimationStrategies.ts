import type { Rng } from '../../lib/rng'
import type { Strategy } from '../../types/exercise'

/** Rounds `n` to the nearest 10 (ties round up, matching everyday rounding conventions). */
export function roundToNearestTen(n: number): number {
  return Math.round(n / 10) * 10
}

/** Builds the "pick-plausible" reasoning strategy: round both factors, multiply the rounded values, and compare against the true product. */
export function buildPickPlausibleStrategy(a: number, b: number): Strategy {
  const roundedA = roundToNearestTen(a)
  const roundedB = roundToNearestTen(b)
  const estimate = roundedA * roundedB
  const total = a * b

  return {
    id: 'estimacion-redondeo',
    name: 'Redondear y estimar',
    steps: [
      { text: `Redondeamos: ${a} se acerca a ${roundedA}, y ${b} se acerca a ${roundedB}.` },
      { text: `${roundedA} × ${roundedB} = ${estimate}` },
      { text: `${estimate} está cerca del resultado real: ${a} × ${b} = ${total}.` },
    ],
  }
}

/** Builds the "budget-check" reasoning strategy: round each price to the nearest 10, sum the rounded prices, and compare against the budget. */
export function buildBudgetCheckStrategy(a: number, b: number, budget: number, symbol: string): Strategy {
  const roundedA = roundToNearestTen(a)
  const roundedB = roundToNearestTen(b)
  const roundedSum = roundedA + roundedB
  const fits = roundedSum <= budget

  return {
    id: 'presupuesto-redondeo',
    name: 'Redondear y comparar con el presupuesto',
    steps: [
      { text: `Redondeamos los precios: ${a} ${symbol} se acerca a ${roundedA} ${symbol}, y ${b} ${symbol} se acerca a ${roundedB} ${symbol}.` },
      { text: `${roundedA} + ${roundedB} = ${roundedSum}` },
      {
        text: fits
          ? `${roundedSum} ${symbol} es menos que ${budget} ${symbol}, así que sí te llega.`
          : `${roundedSum} ${symbol} es más que ${budget} ${symbol}, así que no te llega.`,
      },
    ],
  }
}

export interface ComputationStep {
  text: string
  isCorrupted: boolean
}

/** Builds a correct N-step worked addition (2-4 addends), then corrupts exactly one step by changing one digit. */
export function buildCorruptedAdditionSteps(rng: Rng, addends: number[]): { steps: ComputationStep[]; total: number } {
  const runningTotals: number[] = []
  let running = 0
  for (const n of addends) {
    running += n
    runningTotals.push(running)
  }
  const total = running

  const stepTexts = addends.map((n, i) => {
    const prev = i === 0 ? 0 : runningTotals[i - 1]
    return i === 0 ? `${n} = ${n}` : `${prev} + ${n} = ${runningTotals[i]}`
  })

  return corruptOneStep(rng, stepTexts, runningTotals, total)
}

/** Builds a correct 2-step worked multiplication via place-value split, then corrupts exactly one step. */
export function buildCorruptedMultiplicationSteps(
  rng: Rng,
  splitOperand: number,
  otherOperand: number,
  chunks: number[],
): { steps: ComputationStep[]; total: number } {
  const parts = chunks.map((c) => c * otherOperand)
  const total = splitOperand * otherOperand

  const stepTexts = [...chunks.map((chunk, i) => `${chunk} × ${otherOperand} = ${parts[i]}`), `${parts.join(' + ')} = ${total}`]
  const correctValues = [...parts, total]

  return corruptOneStep(rng, stepTexts, correctValues, total)
}

/**
 * Given correct step texts (each ending in "= N" for a known correct N) and
 * the true final total, corrupts exactly one step by changing one digit of
 * its trailing number by a nonzero delta, re-deriving the corrupted text.
 * Guarantees the corrupted value differs from the original (no accidental
 * no-op), and returns which step index got corrupted.
 */
function corruptOneStep(
  rng: Rng,
  stepTexts: string[],
  correctValues: number[],
  trueTotal: number,
): { steps: ComputationStep[]; total: number } {
  const corruptIndex = rng.int(0, stepTexts.length - 1)
  const original = correctValues[corruptIndex]
  const delta = rng.pick([1, -1, 2, -2, 10, -10])
  let corruptedValue = original + delta
  if (corruptedValue === original || corruptedValue < 0) {
    corruptedValue = original + Math.abs(delta) + 1
  }

  const steps: ComputationStep[] = stepTexts.map((text, i) => {
    if (i !== corruptIndex) return { text, isCorrupted: false }
    const corruptedText = text.replace(new RegExp(`${original}$`), String(corruptedValue))
    return { text: corruptedText, isCorrupted: true }
  })

  return { steps, total: trueTotal }
}
