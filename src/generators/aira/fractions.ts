import type { Rng } from '../../lib/rng'
import type { Exercise, Generator, Strategy, VisualSpec } from '../../types/exercise'
import { clampDifficulty, exerciseId } from '../framework'
import {
  buildComparisonStrategy,
  buildEquivalentStrategy,
  buildPartOfCollectionStrategy,
  buildPartOfUnitStrategy,
} from './fractionsStrategies'

type Kind = 'part-of-unit' | 'part-of-collection' | 'comparison' | 'equivalent'
const KINDS: Kind[] = ['part-of-unit', 'part-of-collection', 'comparison', 'equivalent']

/** Denominator pool per difficulty (catalog range [3, 5]): simple fractions first, then finer splits. */
const DENOMINATOR_RANGES: Record<number, number[]> = {
  3: [2, 3, 4],
  4: [3, 4, 5, 6],
  5: [4, 5, 6, 8, 10],
}

/** Multiples of `den` in a plausible "collection size" range, so the division is always exact. */
function rollWholeDivisibleBy(rng: Rng, den: number, difficulty: number): number {
  const maxMultiplier = difficulty <= 3 ? 8 : 12
  const multiplier = rng.int(2, maxMultiplier)
  return den * multiplier
}

/** "Parte de una unidad" (pizza/pastel slices): rolls num < den, builds a grid-figure visual of shaded cells. */
function buildPartOfUnit(rng: Rng, difficulty: number): { prompt: string; answerText: string; strategies: Strategy[]; visual: VisualSpec } {
  const den = rng.pick(DENOMINATOR_RANGES[difficulty])
  const num = rng.int(1, den - 1)

  // Lay slices out as a 1×den row of cells; shade the first `num`.
  const cells: [number, number][] = Array.from({ length: num }, (_, i) => [0, i] as [number, number])

  return {
    prompt: `Un pastel se corta en ${den} trozos iguales. Aira se come ${num} trozos. ¿Qué fracción del pastel se ha comido?`,
    answerText: `${num}/${den}`,
    strategies: [buildPartOfUnitStrategy(num, den)],
    visual: { kind: 'grid-figure', cells },
  }
}

/** "Parte de una colección" (e.g. 3/4 de 36 = 27): whole is always exactly divisible by den by construction. */
function buildPartOfCollection(rng: Rng, difficulty: number): { prompt: string; answerText: string; strategies: Strategy[]; answerValue: number } {
  const den = rng.pick(DENOMINATOR_RANGES[difficulty])
  const num = rng.int(1, den - 1)
  const whole = rollWholeDivisibleBy(rng, den, difficulty)
  const result = (whole / den) * num

  return {
    prompt: `¿Cuánto es ${num}/${den} de ${whole}?`,
    answerText: String(result),
    strategies: [buildPartOfCollectionStrategy(whole, num, den)],
    answerValue: result,
  }
}

/**
 * "Comparar fracciones": two fractions, one is strictly bigger (never
 * equal, so the choice is unambiguous). Guarantees distinctness
 * deterministically: builds the full list of valid num2 candidates for
 * den2 ([1, den2-1]), removes the one value (if any) that would make
 * num2/den2 exactly equal num1/den1, and picks from what remains. When
 * removing that one value leaves the candidate list empty (only possible
 * when den2 <= 2, so [1, den2-1] has a single element), falls back to
 * comparing against a same-denominator sibling instead (den2 := den1,
 * num2 forced different from num1 — always possible since den1 >= 2 means
 * [1, den1-1] has room whenever den1 >= 3, and for den1 === 2 the only two
 * fractions possible are 1/2 vs 1/2, so we instead double the denominator
 * to 2*den1 and pick a numerator that is not the exact-equal one).
 */
function buildComparison(
  rng: Rng,
  difficulty: number,
): { prompt: string; frac1Label: string; frac2Label: string; firstIsBigger: boolean; strategies: Strategy[] } {
  const den1 = rng.pick(DENOMINATOR_RANGES[difficulty])
  const den2 = rng.pick(DENOMINATOR_RANGES[difficulty])
  const num1 = rng.int(1, den1 - 1)

  const equalNum2 = (num1 * den2) / den1
  const candidates = Array.from({ length: den2 - 1 }, (_, i) => i + 1).filter((n) => n !== equalNum2)

  if (candidates.length > 0) {
    return finishComparison(num1, den1, rng.pick(candidates), den2)
  }

  // Fallback: den2's only possible numerator is the exact-equal one (only
  // happens when den2 <= 2). Compare against a doubled denominator instead,
  // where an exact-equal numerator (equalNum2 * 2) leaves other candidates.
  const widerDen2 = den2 * 2
  const widerEqualNum2 = (num1 * widerDen2) / den1
  const widerCandidates = Array.from({ length: widerDen2 - 1 }, (_, i) => i + 1).filter((n) => n !== widerEqualNum2)
  return finishComparison(num1, den1, rng.pick(widerCandidates), widerDen2)
}

function finishComparison(
  num1: number,
  den1: number,
  num2: number,
  den2: number,
): { prompt: string; frac1Label: string; frac2Label: string; firstIsBigger: boolean; strategies: Strategy[] } {
  const frac1Label = `${num1}/${den1}`
  const frac2Label = `${num2}/${den2}`
  const firstIsBigger = num1 * den2 > num2 * den1

  return {
    prompt: `¿Cuál es mayor: ${frac1Label} o ${frac2Label}?`,
    frac1Label,
    frac2Label,
    firstIsBigger,
    strategies: [buildComparisonStrategy(num1, den1, num2, den2)],
  }
}

/** "Fracciones equivalentes": scales num/den by k (2-4), asks for the missing numerator or denominator. */
function buildEquivalent(rng: Rng, difficulty: number): { prompt: string; answerValue: number; strategies: Strategy[] } {
  const den = rng.pick(DENOMINATOR_RANGES[difficulty])
  const num = rng.int(1, den - 1)
  const k = rng.int(2, 4)
  const equivNum = num * k
  const equivDen = den * k

  const askNumerator = rng.chance(0.5)
  const prompt = askNumerator
    ? `${num}/${den} es equivalente a ?/${equivDen}. ¿Qué número falta?`
    : `${num}/${den} es equivalente a ${equivNum}/?. ¿Qué número falta?`

  return {
    prompt,
    answerValue: askNumerator ? equivNum : equivDen,
    strategies: [buildEquivalentStrategy(num, den, k)],
  }
}

export const fraccionesGenerator: Generator = {
  subskill: 'fracciones',
  generate(rng: Rng, requestedDifficulty: number, _flavor): Exercise {
    // exerciseId must be the FIRST draw off rng for determinism; clamping
    // first is safe since clampDifficulty never touches rng.
    const difficulty = clampDifficulty(requestedDifficulty, 3, 5)
    const id = exerciseId(rng, 'fracciones', difficulty)
    const kind = rng.pick(KINDS)

    if (kind === 'part-of-unit') {
      const built = buildPartOfUnit(rng, difficulty)
      return {
        id,
        subskill: 'fracciones',
        difficulty,
        prompt: { text: built.prompt, visual: built.visual },
        answer: { kind: 'text', value: built.answerText },
        strategies: built.strategies,
        microlesson: 'Una fracción es una parte de un todo: el denominador dice en cuántos trozos se parte, el numerador cuántos tomamos.',
        challenge: true,
      }
    }

    if (kind === 'part-of-collection') {
      const built = buildPartOfCollection(rng, difficulty)
      return {
        id,
        subskill: 'fracciones',
        difficulty,
        prompt: { text: built.prompt },
        answer: { kind: 'number', value: built.answerValue },
        strategies: built.strategies,
        microlesson: 'Para calcular una fracción de una cantidad, primero repartimos (÷) y luego tomamos las partes que nos piden (×).',
        challenge: true,
      }
    }

    if (kind === 'comparison') {
      const built = buildComparison(rng, difficulty)
      const options = [
        { id: 'frac1', label: built.frac1Label },
        { id: 'frac2', label: built.frac2Label },
      ]
      const correctId = built.firstIsBigger ? 'frac1' : 'frac2'

      return {
        id,
        subskill: 'fracciones',
        difficulty,
        prompt: { text: built.prompt },
        answer: { kind: 'choice', correctId },
        choices: options,
        strategies: built.strategies,
        microlesson: 'Para comparar fracciones con distinto denominador, multiplicamos en cruz.',
        challenge: true,
      }
    }

    const built = buildEquivalent(rng, difficulty)
    return {
      id,
      subskill: 'fracciones',
      difficulty,
      prompt: { text: built.prompt },
      answer: { kind: 'number', value: built.answerValue },
      strategies: built.strategies,
      microlesson: 'Dos fracciones son equivalentes si representan la misma cantidad, aunque se escriban distinto.',
      challenge: true,
    }
  },
}
