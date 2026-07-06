import type { Rng } from '../../lib/rng'
import type { ChapterFlavorLite, Exercise, Generator } from '../../types/exercise'
import { clampDifficulty, exerciseId } from '../framework'
import { buildDescomposicionMonedasStrategy, buildSaltosLineaStrategy, centsToEuroString } from './decimalMoneyStrategies'

/** Cents ranges per difficulty (catalog range [3, 5]) — kept as whole-cent multiples of 5 so amounts feel like real prices. */
const START_CENTS_RANGES: Record<number, [number, number]> = {
  3: [200, 2000],
  4: [500, 5000],
  5: [1000, 9900],
}
const OP_CENTS_RANGES: Record<number, [number, number]> = {
  3: [50, 800],
  4: [100, 1500],
  5: [200, 3000],
}

/** Rolls a cents amount in [min, max], snapped to the nearest multiple of 5 cents (real coin granularity). */
function rollCents(rng: Rng, min: number, max: number): number {
  const raw = rng.int(min, max)
  return Math.round(raw / 5) * 5
}

export const decimalesDineroGenerator: Generator = {
  subskill: 'decimales-dinero',
  generate(rng: Rng, requestedDifficulty: number, _flavor: ChapterFlavorLite): Exercise {
    // exerciseId must be the FIRST draw off rng for determinism; clamping
    // first is safe since clampDifficulty never touches rng.
    const difficulty = clampDifficulty(requestedDifficulty, 3, 5)
    const id = exerciseId(rng, 'decimales-dinero', difficulty)

    const [startMin, startMax] = START_CENTS_RANGES[difficulty]
    const [opMin, opMax] = OP_CENTS_RANGES[difficulty]
    const startCents = rollCents(rng, startMin, startMax)
    const isAddition = rng.chance(0.5)
    // For subtraction, cap the op so it never goes negative.
    const opCents = isAddition ? rollCents(rng, opMin, opMax) : rollCents(rng, opMin, Math.min(opMax, startCents))
    const resultCents = isAddition ? startCents + opCents : startCents - opCents

    // Deliberately NOT using the chapter's moneySymbol/currencySymbol here:
    // decimal-money arithmetic is scoped to euros regardless of chapter
    // flavor (Singapore S$, Malaysia RM, ...) — the trip/country flavor is
    // narrative color, not the currency unit for this skill. This keeps the
    // prompt's currency in lockstep with the strategy text below, which
    // always renders € via centsToEuroString/decimalMoneyStrategies.
    const symbol = '€'
    const opSymbolChar = isAddition ? '+' : '−'
    const prompt = `Aira tiene ${centsToEuroString(startCents)} ${symbol} ahorrados. ${isAddition ? 'Le regalan' : 'Se gasta'} ${centsToEuroString(opCents)} ${symbol}. ¿Cuánto dinero tiene ahora? (${centsToEuroString(startCents)} ${opSymbolChar} ${centsToEuroString(opCents)})`

    // Assert (in comments/invariant, verified by property tests): resultCents is always an integer, so
    // resultCents/100 is exact to 2 decimal places — no float drift, since all arithmetic stays in integer cents.
    const answerValue = resultCents / 100

    return {
      id,
      subskill: 'decimales-dinero',
      difficulty,
      prompt: { text: prompt },
      answer: { kind: 'number', value: answerValue },
      strategies: [
        buildSaltosLineaStrategy(startCents, opCents, isAddition),
        buildDescomposicionMonedasStrategy(startCents, opCents, isAddition),
      ],
      microlesson: 'El dinero se cuenta en euros y céntimos: 100 céntimos hacen 1 euro, igual que 100 unidades hacen 1 centena.',
      challenge: true,
    }
  },
}
