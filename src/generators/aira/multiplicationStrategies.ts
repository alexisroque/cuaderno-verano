import type { Strategy } from '../../types/exercise'

/**
 * Splits `n` into a "tens chunk" and a "units chunk" (e.g. 27 -> [20, 7]).
 * Used by both the rectangular model and the descomposición strategy so
 * their steps stay numerically consistent with each other.
 */
export function splitTensUnits(n: number): [number, number] {
  const tens = Math.floor(n / 10) * 10
  const units = n - tens
  return [tens, units]
}

/**
 * "Modelo rectangular": visualizes a×b as a rectangle of `rows` x `cols`,
 * split into easy chunks along one side (Innovamat's rectangle-splitting
 * model, e.g. 17x4 -> (10+7)x4). Only meaningful when at least one operand
 * is >= 10 (a single-digit split has nothing to chunk), so callers should
 * gate on that before including this strategy.
 *
 * The step text is written in a parseable "N × M = P" format so property
 * tests can extract and re-verify each arithmetic claim.
 */
export function buildRectangularStrategy(a: number, b: number): Strategy {
  // Split whichever operand is >= 10; if both are, split the larger one.
  const splitOperand = a >= b ? a : b
  const otherOperand = a >= b ? b : a
  const [chunk1, chunk2] = splitTensUnits(splitOperand)

  const part1 = chunk1 * otherOperand
  const part2 = chunk2 * otherOperand
  const total = part1 + part2

  const rows = otherOperand
  const colsSplit = [chunk1, chunk2].filter((c) => c > 0)

  const steps = [
    {
      text: `Dibujamos un rectángulo de ${rows} filas y ${splitOperand} columnas, y lo partimos en ${chunk1} + ${chunk2}.`,
      visual: { kind: 'rectangle-model' as const, rows, colsSplit: colsSplit.length > 0 ? colsSplit : [splitOperand] },
    },
    { text: `${chunk1} × ${otherOperand} = ${part1}` },
    { text: `${chunk2} × ${otherOperand} = ${part2}` },
    { text: `${part1} + ${part2} = ${total}` },
  ]

  return { id: 'rectangular', name: 'Modelo rectangular', steps }
}

/**
 * "Descomposición": splits one operand into tens + units and multiplies
 * each chunk separately, e.g. 27×4 -> 20×4=80, 7×4=28, 80+28=108. Always
 * applicable (even 1-digit x 1-digit trivially "splits" into 0 + units,
 * which callers avoid by preferring this only where it reads naturally —
 * but the arithmetic is always correct).
 */
export function buildDescomposicionStrategy(a: number, b: number): Strategy {
  const splitOperand = a >= b ? a : b
  const otherOperand = a >= b ? b : a
  const [chunk1, chunk2] = splitTensUnits(splitOperand)

  const part1 = chunk1 * otherOperand
  const part2 = chunk2 * otherOperand
  const total = part1 + part2

  const steps =
    chunk1 > 0
      ? [
          { text: `Separamos ${splitOperand} en ${chunk1} + ${chunk2}.` },
          { text: `${chunk1} × ${otherOperand} = ${part1}` },
          { text: `${chunk2} × ${otherOperand} = ${part2}` },
          { text: `${part1} + ${part2} = ${total}` },
        ]
      : [
          // splitOperand is a bare 1-digit number (chunk1 === 0): nothing to
          // decompose into tens, so decompose the OTHER operand instead.
          ...buildDescomposicionStepsFor(otherOperand, splitOperand),
        ]

  return { id: 'descomposicion', name: 'Descomposición', steps }
}

function buildDescomposicionStepsFor(splitOperand: number, otherOperand: number) {
  const [chunk1, chunk2] = splitTensUnits(splitOperand)
  const part1 = chunk1 * otherOperand
  const part2 = chunk2 * otherOperand
  const total = part1 + part2

  if (chunk1 === 0) {
    // Both operands are single digits: no meaningful decomposition, use a
    // trivial "hechos derivados"-flavored single-fact step instead.
    return [{ text: `${splitOperand} × ${otherOperand} = ${splitOperand * otherOperand}` }]
  }

  return [
    { text: `Separamos ${splitOperand} en ${chunk1} + ${chunk2}.` },
    { text: `${chunk1} × ${otherOperand} = ${part1}` },
    { text: `${chunk2} × ${otherOperand} = ${part2}` },
    { text: `${part1} + ${part2} = ${total}` },
  ]
}

/** "Algoritmo": the traditional written multiplication algorithm, presented as a single final-answer step. */
export function buildAlgoritmoStrategy(a: number, b: number): Strategy {
  const total = a * b
  return {
    id: 'algoritmo',
    name: 'Algoritmo',
    steps: [
      { text: `Multiplicamos en columna: ${a} × ${b}.` },
      { text: `${a} × ${b} = ${total}` },
    ],
  }
}

/**
 * "Hechos derivados": derives the product from a known/easier fact via
 * doubling or halving, e.g. 27×4 = 27×2×2. Only valid when at least one
 * operand is even (so halving it stays an integer) — callers must check
 * this before including the strategy.
 */
export function buildHechosDerivadosStrategy(a: number, b: number): Strategy {
  const [evenOperand, otherOperand] = a % 2 === 0 ? [a, b] : [b, a]
  const half = evenOperand / 2
  const intermediate = half * otherOperand
  const total = intermediate * 2

  return {
    id: 'hechos-derivados',
    name: 'Hechos derivados',
    steps: [
      { text: `${evenOperand} es el doble de ${half}, así que usamos ${half} × ${otherOperand} y lo doblamos.` },
      { text: `${half} × ${otherOperand} = ${intermediate}` },
      { text: `${intermediate} × 2 = ${total}` },
    ],
  }
}
