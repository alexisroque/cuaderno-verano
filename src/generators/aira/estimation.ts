import type { Rng } from '../../lib/rng'
import type { ChapterFlavorLite, Choice, Exercise, Generator, Strategy } from '../../types/exercise'
import { clampDifficulty, exerciseId } from '../framework'
import {
  buildBudgetCheckStrategy,
  buildCorruptedAdditionSteps,
  buildCorruptedMultiplicationSteps,
  buildPickPlausibleStrategy,
} from './estimationStrategies'

type Kind = 'pick-plausible' | 'budget-check' | 'spot-the-error'
const KINDS: Kind[] = ['pick-plausible', 'budget-check', 'spot-the-error']

/** Operand magnitude range per difficulty (catalog range [2, 5]) for pick-plausible/spot-the-error. */
const OPERAND_RANGES: Record<number, [number, number]> = {
  2: [3, 9],
  3: [10, 30],
  4: [10, 50],
  5: [20, 99],
}

interface Built {
  prompt: string
  choices: Choice[]
  correctId: string
  strategies: Strategy[]
}

/** Rolls N distinct plausible-looking distractors around `trueValue`, all at least 50% off so no ambiguity exists, deduped against each other and the true value. */
function rollDistractors(rng: Rng, trueValue: number): number[] {
  const candidates = new Set<number>()
  const tooBig = trueValue * 10
  const tooSmall = Math.max(1, Math.round(trueValue / 10))
  const wildOffCandidates = [trueValue + Math.round(trueValue * 0.7) + rng.int(5, 20), Math.max(1, trueValue - Math.round(trueValue * 0.6) - rng.int(5, 20))]

  for (const c of [tooBig, tooSmall, ...wildOffCandidates]) {
    if (c !== trueValue && Math.abs(c - trueValue) / trueValue >= 0.5) {
      candidates.add(c)
    }
  }

  // Ensure at least 3 distractors, rerolling wildly-off candidates if collisions ate one.
  let guard = 0
  while (candidates.size < 3 && guard < 50) {
    const delta = rng.int(Math.round(trueValue * 0.6), Math.round(trueValue * 1.5) + 5)
    const sign = rng.chance(0.5) ? 1 : -1
    const candidate = Math.max(1, trueValue + sign * delta)
    if (candidate !== trueValue && Math.abs(candidate - trueValue) / trueValue >= 0.5) {
      candidates.add(candidate)
    }
    guard++
  }

  return [...candidates].slice(0, 3)
}

function buildPickPlausible(rng: Rng, difficulty: number): Built {
  const [min, max] = OPERAND_RANGES[difficulty]
  const a = rng.int(min, max)
  const b = rng.int(2, 9)
  const trueValue = a * b

  const distractorValues = rollDistractors(rng, trueValue)
  const allValues = rng.shuffle([trueValue, ...distractorValues])
  const choices: Choice[] = allValues.map((v, i) => ({ id: `choice-${i}`, label: String(v) }))
  const correctId = choices[allValues.indexOf(trueValue)].id

  return {
    prompt: `Sin calcular: ¿cuál puede ser el resultado de ${a} × ${b}?`,
    choices,
    correctId,
    strategies: [buildPickPlausibleStrategy(a, b)],
  }
}

function buildBudgetCheck(rng: Rng, flavor: ChapterFlavorLite): Built {
  const items = flavor.priceItems.length >= 2 ? rng.shuffle(flavor.priceItems).slice(0, 2) : ['un helado', 'un bocadillo']
  const [item1, item2] = items
  const symbol = flavor.currencySymbol

  const a = rng.int(5, 40)
  const b = rng.int(5, 40)
  const trueSum = a + b

  // Roll budget c such that |c - (a+b)| / c >= 0.15 (clearly under or over budget).
  let budget: number
  if (rng.chance(0.5)) {
    // Budget clearly covers it: c well above the sum.
    budget = trueSum + Math.max(5, Math.round(trueSum * 0.3)) + rng.int(0, 10)
  } else {
    // Budget clearly falls short: c well below the sum.
    budget = Math.max(1, trueSum - Math.max(5, Math.round(trueSum * 0.3)) - rng.int(0, 10))
  }
  // Guard: ensure the margin rule holds even after rounding quirks.
  if (Math.abs(budget - trueSum) / budget < 0.15) {
    budget = trueSum > budget ? Math.max(1, Math.round(budget * 0.7)) : Math.round(budget * 1.3) + 5
  }

  // The budget-check strategy rounds each price UP to the next 10, so its
  // conclusion must stay consistent with the true answer. Rounding up only
  // increases the estimate, so a "no llega" case is always consistent; but a
  // "sí llega" case can flip if the rounded-up sum overshoots the budget.
  // Guarantee consistency by lifting the budget above the rounded-up sum
  // whenever the true sum fits, preserving the >= 15% margin.
  if (trueSum <= budget) {
    const roundedUpSum = Math.ceil(a / 10) * 10 + Math.ceil(b / 10) * 10
    if (roundedUpSum > budget) {
      budget = roundedUpSum + Math.max(5, Math.round(roundedUpSum * 0.15))
    }
  }

  const fits = trueSum <= budget
  const choices: Choice[] = rng.shuffle([
    { id: 'si', label: 'Sí' },
    { id: 'no', label: 'No' },
  ])
  const correctId = fits ? 'si' : 'no'

  return {
    prompt: `Tienes ${budget} ${symbol}. Quieres comprar ${item1} de ${a} ${symbol} y ${item2} de ${b} ${symbol}. Sin calcular exacto, ¿te llega?`,
    choices,
    correctId,
    strategies: [buildBudgetCheckStrategy(a, b, budget, symbol)],
  }
}

function buildSpotTheError(rng: Rng, difficulty: number): Built {
  const useAddition = rng.chance(0.5)
  const [min, max] = OPERAND_RANGES[difficulty]

  const { steps, promptOperation } = useAddition
    ? (() => {
        const count = rng.int(2, 4)
        const addends = Array.from({ length: count }, () => rng.int(min, max))
        const { steps: builtSteps } = buildCorruptedAdditionSteps(rng, addends)
        return { steps: builtSteps, promptOperation: `¿cuál es el resultado de ${addends.join(' + ')}?` }
      })()
    : (() => {
        const otherOperand = rng.int(2, 9)
        const splitOperand = rng.int(Math.max(min, 10), max)
        // Simple 2-chunk split: tens + units, so descomposición reads naturally.
        const tens = Math.floor(splitOperand / 10) * 10
        const units = splitOperand - tens
        const realChunks = units > 0 ? [tens, units] : [tens || splitOperand]
        const { steps: builtSteps } = buildCorruptedMultiplicationSteps(rng, splitOperand, otherOperand, realChunks)
        return { steps: builtSteps, promptOperation: `¿cuál es el resultado de ${splitOperand} × ${otherOperand}?` }
      })()

  const choices: Choice[] = steps.map((_, i) => ({ id: `paso-${i + 1}`, label: `Paso ${i + 1}` }))
  const corruptedIndex = steps.findIndex((s) => s.isCorrupted)
  const correctId = choices[corruptedIndex].id

  const strategy: Strategy = {
    id: 'busca-el-error',
    name: 'Busca el error',
    steps: steps.map((s, i) => ({ text: `Paso ${i + 1}: ${s.text}` })),
  }

  return {
    prompt: `Alguien resolvió esta cuenta y se equivocó en un paso. Sin calcular exacto, ${promptOperation} ¿En qué paso está el error?`,
    choices,
    correctId,
    strategies: [strategy],
  }
}

export const estimacionGenerator: Generator = {
  subskill: 'estimacion',
  generate(rng, requestedDifficulty, flavor: ChapterFlavorLite): Exercise {
    // exerciseId must be the FIRST draw off rng for determinism; clamping
    // first is safe since clampDifficulty never touches rng.
    const difficulty = clampDifficulty(requestedDifficulty, 2, 5)
    const id = exerciseId(rng, 'estimacion', difficulty)

    const kind = rng.pick(KINDS)
    const built =
      kind === 'pick-plausible'
        ? buildPickPlausible(rng, difficulty)
        : kind === 'budget-check'
          ? buildBudgetCheck(rng, flavor)
          : buildSpotTheError(rng, difficulty)

    return {
      id,
      subskill: 'estimacion',
      difficulty,
      prompt: { text: built.prompt },
      answer: { kind: 'choice', correctId: built.correctId },
      choices: built.choices,
      strategies: built.strategies,
      microlesson: 'Estimar te ayuda a saber si un resultado es razonable, sin hacer la cuenta exacta.',
    }
  },
}
