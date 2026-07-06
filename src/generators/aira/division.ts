import type { Rng } from '../../lib/rng'
import type { Answer, ChapterFlavorLite, Generator, Strategy } from '../../types/exercise'
import { clampDifficulty, exerciseId } from '../framework'
import {
  buildCajitaDivisionStrategy,
  buildDescomposicionDivisionStrategy,
  buildRepartoSucesivoStrategy,
} from './divisionStrategies'

/** Divisor ranges per catalog difficulty (catalog range [2, 5]): d2/d3 stay within the 2-9 tables; d4/d5 extend to 2-12. */
const DIVISOR_RANGES: Record<number, [number, number]> = {
  2: [2, 9],
  3: [2, 9],
  4: [2, 12],
  5: [2, 12],
}

/** Max dividend per catalog difficulty. d2 forces remainder 0 (exact division); d3-5 allow a nonzero remainder. */
const MAX_DIVIDEND: Record<number, number> = {
  2: 50,
  3: 100,
  4: 300,
  5: 1000,
}

/** A plural noun phrase tagged with its grammatical gender, so "¿Cuántos/Cuántas…?" agrees with it. */
interface GenderedNoun {
  word: string
  gender: 'm' | 'f'
}

/** Own word list for division contexts (plural, division-appropriate nouns), independent of `flavor.priceItems`' singular-noun shape. */
const DIVISION_NOUNS: GenderedNoun[] = [
  { word: 'pegatinas', gender: 'f' },
  { word: 'fotos', gender: 'f' },
  { word: 'cartas', gender: 'f' },
  { word: 'canicas', gender: 'f' },
  { word: 'pinchos de saté', gender: 'm' },
  { word: 'pulseras', gender: 'f' },
]

/** Group-container nouns for the "agrupar" meaning (rotated via rng). */
const GROUP_CONTAINERS: GenderedNoun[] = [
  { word: 'grupos', gender: 'm' },
  { word: 'botes', gender: 'm' },
  { word: 'cajas', gender: 'f' },
]

/** "¿Cuántos…?" / "¿Cuántas…?" agreeing with the noun's gender. */
function cuantos(noun: GenderedNoun): string {
  return noun.gender === 'm' ? 'Cuántos' : 'Cuántas'
}

type Meaning = 'repartir' | 'agrupar'
type Variant = 'ask-quotient' | 'ask-remainder'

interface RolledDivision {
  divisor: number
  quotient: number
  remainder: number
  dividend: number
}

/**
 * Rolls a divisor and quotient (not divisor+dividend directly), then derives
 * `dividend = divisor*quotient + remainder`, so remainder is controlled
 * precisely: d2 forces remainder=0 (exact division); d3-5 roll remainder in
 * [0, divisor-1], sometimes landing on 0 too via `rng.chance`. The quotient
 * is rerolled/clamped downward until the derived dividend fits within this
 * difficulty's max.
 */
function rollDivision(rng: Rng, difficulty: number): RolledDivision {
  const [minDivisor, maxDivisor] = DIVISOR_RANGES[difficulty]
  const maxDividend = MAX_DIVIDEND[difficulty]
  const divisor = rng.int(minDivisor, maxDivisor)

  // d2: always exact (remainder forced to 0). d3-5: remainder is nonzero
  // most of the time (70%), but zero sometimes too, so ask-quotient-with-
  // exact-division cases still show up at higher difficulties.
  const remainder = difficulty === 2 ? 0 : rng.chance(0.7) ? rng.int(1, divisor - 1 || 1) : 0
  const safeRemainder = divisor > 1 ? remainder : 0

  // Roll a quotient large enough to make a meaningful division (at least 2),
  // then clamp it down until divisor*quotient+remainder fits maxDividend.
  const maxQuotientForRange = Math.max(2, Math.floor((maxDividend - safeRemainder) / divisor))
  let quotient = rng.int(2, Math.max(2, maxQuotientForRange))
  if (divisor * quotient + safeRemainder > maxDividend) {
    quotient = Math.max(1, Math.floor((maxDividend - safeRemainder) / divisor))
  }

  const dividend = divisor * quotient + safeRemainder
  return { divisor, quotient, remainder: safeRemainder, dividend }
}

function buildStrategies(dividend: number, divisor: number): Strategy[] {
  const strategies: Strategy[] = [
    buildRepartoSucesivoStrategy(dividend, divisor),
    buildCajitaDivisionStrategy(dividend, divisor),
  ]
  if (dividend >= 100) {
    strategies.push(buildDescomposicionDivisionStrategy(dividend, divisor))
  }
  return strategies
}

/** Picks a people/group noun phrase for the "repartir" meaning; count is 2-9 unless the divisor already conveniently represents it. */
function pickRepartirTargetPhrase(rng: Rng, divisor: number): string {
  if (divisor >= 2 && divisor <= 9) {
    return rng.chance(0.5) ? 'amigos' : 'niños'
  }
  const count = rng.int(2, 9)
  return `${count} amigos`
}

function buildRepartirPrompt(rng: Rng, dividend: number, divisor: number, variant: Variant): string {
  const noun = rng.pick(DIVISION_NOUNS)
  const targetPhrase = pickRepartirTargetPhrase(rng, divisor)
  const question =
    variant === 'ask-quotient'
      ? `¿${cuantos(noun)} recibe cada uno?`
      : `¿${cuantos(noun)} sobran sin repartir?`
  return `Repartimos ${dividend} ${noun.word} entre ${divisor} ${targetPhrase}. ${question}`
}

function buildAgruparPrompt(rng: Rng, dividend: number, divisor: number, variant: Variant): string {
  const noun = rng.pick(DIVISION_NOUNS)
  const container = rng.pick(GROUP_CONTAINERS)
  const question =
    variant === 'ask-quotient'
      ? `¿${cuantos(container)} ${container.word} se llenan?`
      : `¿${cuantos(noun)} quedan sin agrupar?`
  return `${dividend} ${noun.word} en ${container.word} de ${divisor}. ${question}`
}

function buildPrompt(rng: Rng, dividend: number, divisor: number, meaning: Meaning, variant: Variant): string {
  return meaning === 'repartir'
    ? buildRepartirPrompt(rng, dividend, divisor, variant)
    : buildAgruparPrompt(rng, dividend, divisor, variant)
}

export const divRestoGenerator: Generator = {
  subskill: 'div-resto',
  generate(rng, requestedDifficulty, _flavor: ChapterFlavorLite) {
    // exerciseId must be the FIRST draw off rng for determinism; clamping
    // first is safe since clampDifficulty never touches rng.
    const difficulty = clampDifficulty(requestedDifficulty, 2, 5)
    const id = exerciseId(rng, 'div-resto', difficulty)

    const { divisor, quotient, remainder, dividend } = rollDivision(rng, difficulty)
    const meaning: Meaning = rng.pick(['repartir', 'agrupar'])
    // ask-remainder is only meaningful when remainder > 0; force ask-quotient otherwise.
    const variant: Variant = remainder > 0 && rng.chance(0.5) ? 'ask-remainder' : 'ask-quotient'

    const answer: Answer = {
      kind: 'number',
      value: variant === 'ask-quotient' ? quotient : remainder,
    }

    return {
      id,
      subskill: 'div-resto',
      difficulty,
      prompt: { text: buildPrompt(rng, dividend, divisor, meaning, variant) },
      answer,
      strategies: buildStrategies(dividend, divisor),
      microlesson:
        'Dividir puede significar repartir a partes iguales o hacer grupos del mismo tamaño: las dos formas usan la misma operación.',
    }
  },
}
