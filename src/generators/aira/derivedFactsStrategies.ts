import type { Strategy } from '../../types/exercise'
import { centsToEuroString } from './decimalMoneyStrategies'

/**
 * Builds the "hechos derivados" reasoning strategy: shows the simple known
 * integer fact (e.g. 5 + 4 = 9), then the transformation rule that derives
 * the decimal fact from it (each addend loses 10 cents: 5,00->4,90,
 * 4,00->3,90), then bridges to the decimal result and verifies it
 * independently.
 *
 * `knownA`, `knownB` are the known integer fact's operands (knownA op knownB
 * = knownResult). `derivedACents`/`derivedBCents` are the actual decimal
 * operands used in the exercise, expressed in integer cents. The transform
 * described is "each operand is `deltaCents` less than its whole-euro
 * counterpart" (e.g. deltaCents=10 -> "diez céntimos menos").
 *
 * The two operations need DIFFERENT bridging logic, because the per-operand
 * delta behaves differently under + vs. −:
 *  - Addition: the two deltas ADD UP (each addend is deltaCents short, so
 *    the sum is 2*deltaCents short of the known-fact result). Skipping this
 *    adjustment and jumping straight to the decimal answer is a non-sequitur
 *    — e.g. "12 + 7 = 19" does NOT directly explain "18,80" without stating
 *    that 19 - 0,20 = 18,80. So we make the compensation step explicit.
 *  - Subtraction: the two deltas CANCEL OUT (both operands shift by the same
 *    amount, so the difference is unchanged), so the known integer result
 *    equals the derived decimal result exactly — no adjustment needed, and
 *    "usando el mismo hecho" is literally true as stated.
 */
export function buildHechosDerivadosDecStrategy(
  knownA: number,
  knownB: number,
  isAddition: boolean,
  derivedACents: number,
  derivedBCents: number,
  deltaCents: number,
): Strategy {
  const knownResult = isAddition ? knownA + knownB : knownA - knownB
  const derivedResultCents = isAddition ? derivedACents + derivedBCents : derivedACents - derivedBCents
  const opSymbol = isAddition ? '+' : '−'

  const transformStep = {
    text: `Cada número es ${deltaCents} céntimos menos que un número entero de euros: ${centsToEuroString(derivedACents)} € y ${centsToEuroString(derivedBCents)} €.`,
  }

  if (isAddition) {
    // Deltas add up: sum is short by deltaCents (A) + deltaCents (B) = 2*deltaCents.
    const totalDeltaCents = 2 * deltaCents
    const bridgeStep = {
      text: `Como ${centsToEuroString(derivedACents)} € es ${deltaCents} céntimos menos que ${knownA}, y ${centsToEuroString(derivedBCents)} € es ${deltaCents} céntimos menos que ${knownB}, el total es ${totalDeltaCents} céntimos menos que ${knownResult}: ${knownResult} − ${centsToEuroString(totalDeltaCents)} = ${centsToEuroString(derivedResultCents)}.`,
    }
    return {
      id: 'hechos-derivados-decimales',
      name: 'Hechos derivados',
      steps: [
        { text: `Ya sabemos que ${knownA} ${opSymbol} ${knownB} = ${knownResult}.` },
        transformStep,
        bridgeStep,
        { text: `Comprobamos: ${centsToEuroString(derivedACents)} € ${opSymbol} ${centsToEuroString(derivedBCents)} € = ${centsToEuroString(derivedResultCents)} €.` },
      ],
    }
  }

  // Subtraction: deltas cancel, so the known result transfers over unchanged.
  return {
    id: 'hechos-derivados-decimales',
    name: 'Hechos derivados',
    steps: [
      { text: `Ya sabemos que ${knownA} ${opSymbol} ${knownB} = ${knownResult}.` },
      transformStep,
      {
        text: `Como los dos números bajan lo mismo (${deltaCents} céntimos), la diferencia no cambia: ${centsToEuroString(derivedACents)} ${opSymbol} ${centsToEuroString(derivedBCents)} = ${centsToEuroString(derivedResultCents)} €, usando el mismo hecho que ${knownA} ${opSymbol} ${knownB}.`,
      },
      { text: `Comprobamos: ${centsToEuroString(derivedACents)} € ${opSymbol} ${centsToEuroString(derivedBCents)} € = ${centsToEuroString(derivedResultCents)} €.` },
    ],
  }
}
