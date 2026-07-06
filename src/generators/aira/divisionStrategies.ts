import type { Strategy } from '../../types/exercise'

/**
 * Shared canonical final-answer line for every division strategy: states the
 * quotient and remainder in Innovamat's standard "Cociente X, resto Y" form.
 * Kept as one function so all three strategies (reparto-sucesivo, cajita,
 * descomposición) end on identical, consistent phrasing — the single place to
 * change if the wording ever needs to.
 */
export function formatQuotientRemainder(quotient: number, remainder: number): string {
  return `Cociente ${quotient}, resto ${remainder}.`
}

/** One dealing round of "reparto sucesivo": deal `amountThisRound` to each of `divisor` recipients, consuming `usedThisRound` from the remaining pool. */
export interface DealingRound {
  amountThisRound: number
  usedThisRound: number
  remainingAfter: number
}

/**
 * Computes the real dealing rounds for "reparto sucesivo" (Innovamat's
 * vertical-scheme successive-dealing strategy): deal in chunks of 10 while
 * at least `divisor * 10` remain, then deal the rest in one final chunk.
 * E.g. dividend=53, divisor=4 -> deal 10 each (uses 40, 13 left), then deal
 * 3 each (uses 12, 1 left) -> quotient 13, remainder 1. Every round's
 * arithmetic is real (not fabricated text), so tests can recompute it.
 */
export function computeDealingRounds(dividend: number, divisor: number): DealingRound[] {
  const rounds: DealingRound[] = []
  let remaining = dividend

  // Deal in rounds of 10-per-recipient while a full round of 10 still fits.
  while (remaining >= divisor * 10) {
    const usedThisRound = divisor * 10
    remaining -= usedThisRound
    rounds.push({ amountThisRound: 10, usedThisRound, remainingAfter: remaining })
  }

  // Final round: deal out the largest amount-per-recipient that still fits.
  const finalAmount = Math.floor(remaining / divisor)
  if (finalAmount > 0) {
    const usedThisRound = finalAmount * divisor
    remaining -= usedThisRound
    rounds.push({ amountThisRound: finalAmount, usedThisRound, remainingAfter: remaining })
  }

  return rounds
}

/**
 * "Reparto sucesivo": deals the dividend to `divisor` recipients in rounds,
 * tracking running totals used and remaining, ending with the quotient and
 * remainder stated together in the final step.
 */
export function buildRepartoSucesivoStrategy(dividend: number, divisor: number): Strategy {
  const rounds = computeDealingRounds(dividend, divisor)
  const quotient = Math.floor(dividend / divisor)
  const remainder = dividend - divisor * quotient

  const steps = rounds.map((round, i) => {
    const priorRemaining = i === 0 ? dividend : rounds[i - 1].remainingAfter
    return {
      text: `Repartimos ${round.amountThisRound} a cada uno: usamos ${divisor} × ${round.amountThisRound} = ${round.usedThisRound}, quedan ${priorRemaining} − ${round.usedThisRound} = ${round.remainingAfter}.`,
    }
  })

  const finalText = `En total cada uno recibe ${quotient}. ${formatQuotientRemainder(quotient, remainder)}`

  return {
    id: 'reparto-sucesivo',
    name: 'Reparto sucesivo',
    steps: [...steps, { text: finalText }],
  }
}

/**
 * "Cajita" (nearest-multiple strategy): finds the largest multiple of
 * `divisor` that is <= `dividend`, then computes the leftover bit and final
 * quotient+remainder.
 */
export function buildCajitaDivisionStrategy(dividend: number, divisor: number): Strategy {
  const quotient = Math.floor(dividend / divisor)
  const nearestMultiple = divisor * quotient
  const remainder = dividend - nearestMultiple

  const steps = [
    { text: `${divisor} × ${quotient} = ${nearestMultiple} se acerca a ${dividend}.` },
    {
      text:
        remainder > 0
          ? `${dividend} − ${nearestMultiple} = ${remainder}, y como ${remainder} es menor que ${divisor} ya no podemos repartir más. ${formatQuotientRemainder(quotient, remainder)}`
          : `${dividend} − ${nearestMultiple} = 0, así que no sobra nada. ${formatQuotientRemainder(quotient, remainder)}`,
    },
  ]

  return { id: 'cajita', name: 'Cajita', steps }
}

/** Splits `dividend` into 2+ divisor-friendly chunks (each evenly divisible by `divisor`) summing to `dividend - remainder`, largest place-value chunk first. */
function splitIntoDivisorFriendlyChunks(dividendMinusRemainder: number, divisor: number): number[] {
  const quotient = dividendMinusRemainder / divisor
  const chunks: number[] = []

  const digits = String(quotient).length
  let remainingQuotient = quotient
  for (let place = digits - 1; place >= 0; place--) {
    const scale = 10 ** place
    const digit = Math.floor(remainingQuotient / scale)
    if (digit > 0) {
      chunks.push(digit * scale * divisor)
      remainingQuotient -= digit * scale
    }
  }
  return chunks.length > 0 ? chunks : [dividendMinusRemainder]
}

/**
 * "Descomposición": splits the dividend into 2+ divisor-friendly chunks (each
 * evenly divisible by `divisor`) summing to `dividend - remainder`, e.g.
 * 200÷9 -> 180÷9=20 y 18÷9=2, resto 2. The caller (division.ts) gates this
 * strategy on the VALUE of the dividend (>= 100), not on its digit count:
 * only for dividends of 100+ does a place-value decomposition buy enough over
 * the simpler cajita strategy to be worth showing. This value-based gate is
 * intentional (a 2-digit dividend like 84 would decompose to just 80 + 4,
 * which the cajita strategy already covers more directly).
 */
export function buildDescomposicionDivisionStrategy(dividend: number, divisor: number): Strategy {
  const quotient = Math.floor(dividend / divisor)
  const remainder = dividend - divisor * quotient
  const cleanDividend = dividend - remainder

  const chunks = splitIntoDivisorFriendlyChunks(cleanDividend, divisor)
  const partialQuotients = chunks.map((chunk) => chunk / divisor)

  const introText =
    remainder > 0
      ? `Separamos ${dividend} en ${chunks.join(' + ')} y ${remainder} (lo que sobra).`
      : `Separamos ${dividend} en ${chunks.join(' + ')}.`

  const chunkSteps = chunks.map((chunk, i) => ({
    text: `${chunk} ÷ ${divisor} = ${partialQuotients[i]}`,
  }))

  const finalText = `${partialQuotients.join(' + ')} = ${quotient}. ${formatQuotientRemainder(quotient, remainder)}`

  return {
    id: 'descomposicion',
    name: 'Descomposición',
    steps: [{ text: introText }, ...chunkSteps, { text: finalText }],
  }
}
