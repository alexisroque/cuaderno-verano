import type { Rng } from '../../lib/rng'
import type { ChapterFlavorLite, Exercise, Generator, Strategy } from '../../types/exercise'
import { clampDifficulty as clampDifficultyToRange, exerciseId } from '../framework'
import {
  buildAlgoritmoStrategy,
  buildDescomposicionStrategy,
  buildHechosDerivadosStrategy,
  buildRectangularStrategy,
} from './multiplicationStrategies'

/** Inclusive [min, max] operand range for one factor. */
type Range = [number, number]

interface OperandRanges {
  a: Range
  b: Range
}

/**
 * d1 mixes two operand shapes for `mult-1cifra` per the spec: "1-digit ×
 * 1-digit beyond tables feel" (e.g. 6×7) and "1-digit × teens". Rolled 50/50
 * via `rng` so both flavors show up across a session.
 */
const MULT_1CIFRA_D1_SHAPES: OperandRanges[] = [
  { a: [6, 9], b: [6, 9] }, // beyond-tables-feel: both factors 6-9.
  { a: [2, 9], b: [11, 19] }, // 1-digit × teens.
]

/**
 * Operand ranges per difficulty for `mult-1cifra` (catalog range [1, 4]).
 * d1's entry here is a placeholder only, used by `clampDifficulty` to know
 * the valid key range — `rollOperandsFor1Cifra` overrides d1 with a 50/50
 * roll between MULT_1CIFRA_D1_SHAPES instead of using this table directly.
 * - d2: 1-digit × 2-digit (full 2-digit range).
 * - d3: 1-digit × 3-digit.
 * - d4: 1-digit × 3-digit, larger range (extends d3).
 */
const MULT_1CIFRA_RANGES: Record<number, OperandRanges> = {
  1: MULT_1CIFRA_D1_SHAPES[0],
  2: { a: [2, 9], b: [20, 99] },
  3: { a: [2, 9], b: [100, 299] },
  4: { a: [2, 9], b: [300, 799] },
}

/**
 * Operand ranges per difficulty for `mult-2cifras` (catalog range [2, 5]).
 * - d2/d3: 2-digit × 2-digit, small (second factor <= 30).
 * - d4: 2-digit × 2-digit, full range.
 * - d5: 2-digit × 3-digit.
 */
const MULT_2CIFRAS_RANGES: Record<number, OperandRanges> = {
  2: { a: [11, 30], b: [11, 30] },
  3: { a: [11, 30], b: [11, 30] },
  4: { a: [11, 99], b: [11, 99] },
  5: { a: [11, 99], b: [100, 299] },
}

/** Clamps `difficulty` to the min/max keys of `ranges`, guarding against NaN/Infinity via the shared framework helper. */
function clampDifficulty(difficulty: number, ranges: Record<number, OperandRanges>): number {
  const keys = Object.keys(ranges).map(Number)
  const min = Math.min(...keys)
  const max = Math.max(...keys)
  return clampDifficultyToRange(difficulty, min, max)
}

function rollOperands(rng: Rng, ranges: OperandRanges): [number, number] {
  const a = rng.int(ranges.a[0], ranges.a[1])
  const b = rng.int(ranges.b[0], ranges.b[1])
  return [a, b]
}

/** mult-1cifra's d1 rolls a 50/50 shape (see MULT_1CIFRA_D1_SHAPES) instead of a single fixed range. */
function rollOperandsFor1Cifra(rng: Rng, difficulty: number): [number, number] {
  if (difficulty === 1) {
    return rollOperands(rng, rng.pick(MULT_1CIFRA_D1_SHAPES))
  }
  return rollOperands(rng, MULT_1CIFRA_RANGES[difficulty])
}

/** Builds every applicable strategy for the pair (a, b) at the given difficulty, per the pedagogy rules. */
function buildStrategies(a: number, b: number, difficulty: number): Strategy[] {
  const strategies: Strategy[] = []

  // rectangular: present when either operand is >= 10.
  if (a >= 10 || b >= 10) {
    strategies.push(buildRectangularStrategy(a, b))
  }

  // descomposición: always present.
  strategies.push(buildDescomposicionStrategy(a, b))

  // algoritmo: present for d >= 2.
  if (difficulty >= 2) {
    strategies.push(buildAlgoritmoStrategy(a, b))
  }

  // hechos-derivados: only when a or b is even (so halving stays exact).
  if (a % 2 === 0 || b % 2 === 0) {
    strategies.push(buildHechosDerivadosStrategy(a, b))
  }

  return strategies
}

/** Builds a "pure calculation" prompt: no story context, just the operation. */
function buildPureCalculationPrompt(a: number, b: number): string {
  return `¿Cuánto es ${a} × ${b}?`
}

/** Capitalizes the first letter of `s`, leaving the rest untouched. */
function capitalizeFirst(s: string): string {
  if (s.length === 0) return s
  return s[0].toUpperCase() + s.slice(1)
}

/**
 * Builds a light-context prompt flavored with the chapter's place phrase,
 * price item and currency symbol. Deliberately keeps `priceItem` singular
 * throughout (never pluralized) to stay interpolation-safe against
 * multi-word Spanish noun phrases like "plato de chicken rice" — naively
 * appending "s" would produce "plato de chicken rices". Uses "cada" rather
 * than an article ("un"/"una") so the sentence stays grammatically correct
 * regardless of the price item's gender (avoids "un entrada" for a
 * feminine noun like "entrada a Waterbom"). Example output: "En Singapur,
 * cada plato de chicken rice cuesta 4 S$. Si compráis 3, ¿cuánto pagáis en
 * total?"
 */
function buildContextPrompt(rng: Rng, a: number, b: number, flavor: ChapterFlavorLite): string {
  const priceItem = flavor.priceItems.length > 0 ? rng.pick(flavor.priceItems) : 'helado'
  const place = capitalizeFirst(flavor.placePhrase)
  return `${place}, cada ${priceItem} cuesta ${a} ${flavor.currencySymbol}. Si compráis ${b}, ¿cuánto pagáis en total?`
}

/**
 * A context prompt reads as plausible only when the quantity ("Si compráis
 * {b}") is a reasonable basket size (2-12 units) and the price ("cada ...
 * cuesta {a}") stays within a sane per-item price (<= 100). Outside those
 * bounds the story ("cada barco cuesta 823, si compráis 47...") stops making
 * real-world sense, so callers should fall back to the pure-calculation
 * prompt instead.
 */
function isContextPlausible(a: number, b: number): boolean {
  return b >= 2 && b <= 12 && a <= 100
}

function buildPrompt(rng: Rng, a: number, b: number, flavor: ChapterFlavorLite): string {
  // 60% pure-calculation, 40% light-context — but only when the
  // light-context template stays plausible for (a, b); otherwise fall back
  // to the pure-calculation prompt.
  const wantsContext = rng.chance(0.6) === false
  if (wantsContext && isContextPlausible(a, b)) {
    return buildContextPrompt(rng, a, b, flavor)
  }
  return buildPureCalculationPrompt(a, b)
}

/** Assembles the final Exercise once (subskill, difficulty, a, b, id) are known. Shared by both generators. */
function finishExercise(
  id: string,
  subskill: string,
  difficulty: number,
  a: number,
  b: number,
  rng: Rng,
  flavor: ChapterFlavorLite,
): Exercise {
  return {
    id,
    subskill,
    difficulty,
    prompt: { text: buildPrompt(rng, a, b, flavor) },
    answer: { kind: 'number', value: a * b },
    strategies: buildStrategies(a, b, difficulty),
    microlesson: 'Multiplicar te ahorra sumar lo mismo muchas veces.',
  }
}

export const mult1CifraGenerator: Generator = {
  subskill: 'mult-1cifra',
  generate(rng, requestedDifficulty, flavor) {
    // exerciseId must be the FIRST draw off rng for determinism (see
    // exerciseId's contract); clamping first is safe since clampDifficulty
    // never touches rng.
    const difficulty = clampDifficulty(requestedDifficulty, MULT_1CIFRA_RANGES)
    const id = exerciseId(rng, 'mult-1cifra', difficulty)
    const [a, b] = rollOperandsFor1Cifra(rng, difficulty)
    return finishExercise(id, 'mult-1cifra', difficulty, a, b, rng, flavor)
  },
}

export const mult2CifrasGenerator: Generator = {
  subskill: 'mult-2cifras',
  generate(rng, requestedDifficulty, flavor) {
    const difficulty = clampDifficulty(requestedDifficulty, MULT_2CIFRAS_RANGES)
    const id = exerciseId(rng, 'mult-2cifras', difficulty)
    const [a, b] = rollOperands(rng, MULT_2CIFRAS_RANGES[difficulty])
    return finishExercise(id, 'mult-2cifras', difficulty, a, b, rng, flavor)
  },
}
