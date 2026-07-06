import type { Rng } from '../../lib/rng'
import type { ChapterFlavorLite, Exercise, Generator } from '../../types/exercise'
import { clampDifficulty, exerciseId } from '../framework'
import { centsToEuroString } from './decimalMoneyStrategies'
import { buildHechosDerivadosDecStrategy } from './derivedFactsStrategies'

/** Known-integer-fact operand ranges per difficulty (catalog range [3, 5]) — small, easy-to-hold facts. */
const KNOWN_OPERAND_RANGES: Record<number, [number, number]> = {
  3: [2, 9],
  4: [3, 12],
  5: [4, 15],
}

/** Possible "cents below a whole euro" deltas the derived fact uses (10c or 5c shifts, the classic Innovamat move). */
const DELTA_OPTIONS = [10, 5, 20]

export const hechosDerivadosDecGenerator: Generator = {
  subskill: 'hechos-derivados-dec',
  generate(rng: Rng, requestedDifficulty: number, _flavor: ChapterFlavorLite): Exercise {
    // exerciseId must be the FIRST draw off rng for determinism; clamping
    // first is safe since clampDifficulty never touches rng.
    const difficulty = clampDifficulty(requestedDifficulty, 3, 5)
    const id = exerciseId(rng, 'hechos-derivados-dec', difficulty)

    const [min, max] = KNOWN_OPERAND_RANGES[difficulty]
    const isAddition = rng.chance(0.6)
    let knownA = rng.int(min, max)
    let knownB = rng.int(min, max)
    // For subtraction, ensure knownA >= knownB so the known fact stays non-negative.
    if (!isAddition && knownA < knownB) {
      ;[knownA, knownB] = [knownB, knownA]
    }
    const deltaCents = rng.pick(DELTA_OPTIONS)

    // The derived decimal fact: each known integer operand becomes
    // (operand euros) minus deltaCents, e.g. known 5 -> derived 4,90 (delta=10).
    const derivedACents = knownA * 100 - deltaCents
    const derivedBCents = knownB * 100 - deltaCents

    // Deliberately NOT using the chapter's moneySymbol/currencySymbol here —
    // same rationale as decimalMoney.ts: this skill's decimal-money
    // arithmetic is always in euros, regardless of chapter flavor, so the
    // prompt stays consistent with the strategy text (derivedFactsStrategies
    // always renders € via centsToEuroString).
    const symbol = '€'
    const opWord = isAddition ? 'sumar' : 'restar'
    const opSymbolChar = isAddition ? '+' : '−'
    const derivedResultCents = isAddition ? derivedACents + derivedBCents : derivedACents - derivedBCents

    const prompt = `Sabiendo que ${knownA} ${isAddition ? '+' : '-'} ${knownB} = ${isAddition ? knownA + knownB : knownA - knownB}, ¿cuánto es ${centsToEuroString(derivedACents)} ${symbol} ${opSymbolChar} ${centsToEuroString(derivedBCents)} ${symbol}? (vas a ${opWord})`

    const answerValue = derivedResultCents / 100

    return {
      id,
      subskill: 'hechos-derivados-dec',
      difficulty,
      prompt: { text: prompt },
      answer: { kind: 'number', value: answerValue },
      strategies: [buildHechosDerivadosDecStrategy(knownA, knownB, isAddition, derivedACents, derivedBCents, deltaCents)],
      microlesson: 'Un hecho fácil que ya conoces (como 5+4=9) te ayuda a resolver hechos parecidos con decimales, sin volver a empezar de cero.',
      challenge: true,
    }
  },
}
