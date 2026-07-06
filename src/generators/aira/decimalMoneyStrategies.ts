import type { Strategy, VisualSpec } from '../../types/exercise'

/** Formats an integer cents amount as a euro string with 2 decimals, e.g. 890 -> "8,90". */
export function centsToEuroString(cents: number): string {
  const sign = cents < 0 ? '-' : ''
  const abs = Math.abs(cents)
  const euros = Math.floor(abs / 100)
  const rest = abs % 100
  return `${sign}${euros},${String(rest).padStart(2, '0')}`
}

/** Euro coin/bill denominations in cents, largest first — used by the "monedas" decomposition. */
const DENOMINATIONS_CENTS = [20000, 10000, 5000, 2000, 1000, 500, 200, 100, 50, 20, 10, 5, 2, 1]

/** Greedily decomposes `cents` into the fewest coins/bills from DENOMINATIONS_CENTS. */
export function decomposeIntoCoins(cents: number): number[] {
  let remaining = Math.abs(Math.round(cents))
  const pieces: number[] = []
  for (const denom of DENOMINATIONS_CENTS) {
    while (remaining >= denom) {
      pieces.push(denom)
      remaining -= denom
    }
  }
  return pieces
}

/** Labels a cents denomination the kid-friendly way: bills "20 €", coins "50 c" / "1 €". */
function labelDenomination(cents: number): string {
  if (cents >= 100) return `${cents / 100} €`
  return `${cents} c`
}

/**
 * "Saltos en la línea": walks from `startCents` to `endCents` in a sequence
 * of number-line jumps (euros first, then remaining cents), so the sum of
 * jumps equals the operation performed. Works for both addition (endCents >
 * startCents) and subtraction (endCents < startCents).
 */
export function buildSaltosLineaStrategy(startCents: number, opCents: number, isAddition: boolean): Strategy {
  const endCents = isAddition ? startCents + opCents : startCents - opCents
  const direction = isAddition ? 1 : -1

  // Split the jump into a whole-euro chunk + a remaining-cents chunk (both >= 0), so at most 2 jumps.
  const absOp = Math.abs(opCents)
  const euroChunk = Math.floor(absOp / 100) * 100
  const centsChunk = absOp - euroChunk

  const jumps: { from: number; to: number; label: string }[] = []
  let cursor = startCents
  if (euroChunk > 0) {
    const next = cursor + direction * euroChunk
    jumps.push({ from: cursor, to: next, label: `${direction > 0 ? '+' : '-'}${euroChunk / 100} €` })
    cursor = next
  }
  if (centsChunk > 0) {
    const next = cursor + direction * centsChunk
    jumps.push({ from: cursor, to: next, label: `${direction > 0 ? '+' : '-'}${centsChunk} c` })
    cursor = next
  }
  if (jumps.length === 0) {
    // opCents === 0: a single no-op jump so the visual always has at least one entry.
    jumps.push({ from: cursor, to: cursor, label: '+0' })
  }

  const opSymbol = isAddition ? '+' : '-'
  const visual: VisualSpec = {
    kind: 'number-line',
    from: Math.min(startCents, endCents),
    to: Math.max(startCents, endCents),
    jumps,
  }

  const jumpSteps = jumps.map((j) => ({ text: `Saltamos ${j.label}: de ${centsToEuroString(j.from)} € a ${centsToEuroString(j.to)} €.`, visual }))

  return {
    id: 'saltos-linea',
    name: 'Saltos en la línea',
    steps: [
      { text: `Empezamos en ${centsToEuroString(startCents)} € y vamos a ${opSymbol === '+' ? 'sumar' : 'restar'} ${centsToEuroString(absOp)} €.` },
      ...jumpSteps,
      { text: `Llegamos a ${centsToEuroString(endCents)} €.` },
    ],
  }
}

/**
 * "Descomposición en monedas": breaks `startCents` and `opCents` each into
 * coins/bills, then combines them to reach the result — teaches money sense
 * via physical denominations rather than pure column arithmetic.
 */
export function buildDescomposicionMonedasStrategy(startCents: number, opCents: number, isAddition: boolean): Strategy {
  const endCents = isAddition ? startCents + opCents : startCents - opCents
  const startCoins = decomposeIntoCoins(startCents)
  const opCoins = decomposeIntoCoins(opCents)

  const startLabel = startCoins.map(labelDenomination).join(' + ')
  const opLabel = opCoins.map(labelDenomination).join(' + ')
  const opWord = isAddition ? 'añadimos' : 'quitamos'

  return {
    id: 'descomposicion-monedas',
    name: 'Monedas y billetes',
    steps: [
      { text: `${centsToEuroString(startCents)} € se puede formar con: ${startLabel}.` },
      { text: `${isAddition ? 'Sumamos' : 'Restamos'} ${centsToEuroString(opCents)} €, que es: ${opLabel}.` },
      { text: `Si ${opWord} esas monedas y billetes, llegamos a ${centsToEuroString(endCents)} €.` },
    ],
  }
}
