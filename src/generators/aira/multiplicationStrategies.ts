import type { Strategy } from '../../types/exercise'

/**
 * Splits `n` into its nonzero place-value components, most significant
 * first (e.g. 445 -> [400, 40, 5]; 267 -> [200, 60, 7]; 108 -> [100, 8];
 * 40 -> [40]; 7 -> [7]). This is the pedagogically correct decomposition
 * (each chunk is a genuine place value: hundreds, tens, units — never an
 * arbitrary "tens rounding" like the old `splitTensUnits(445)` -> [440, 5],
 * which invented a false "440" chunk that doesn't correspond to any place
 * value of 445).
 */
export function placeValueSplit(n: number): number[] {
  if (n === 0) return [0]

  const digits = String(Math.trunc(Math.abs(n))).length
  const sign = n < 0 ? -1 : 1
  const abs = Math.abs(n)

  const chunks: number[] = []
  for (let place = digits - 1; place >= 0; place--) {
    const scale = 10 ** place
    const digit = Math.floor(abs / scale) % 10
    if (digit > 0) {
      chunks.push(sign * digit * scale)
    }
  }
  return chunks
}

/**
 * Shared arithmetic for the "split one operand into place-value chunks and
 * multiply each chunk by the other operand" family of strategies
 * (rectangular model + descomposición). Splits whichever operand is >= the
 * other (ties go to `a`); if both are single digits (nothing to split),
 * splits `otherOperand` instead so callers still get a usable
 * decomposition. Builders only format `computeSplit`'s result into their
 * own step text/visuals — no arithmetic duplication between them.
 */
export interface Split {
  /** The operand that was decomposed into place-value chunks. */
  splitOperand: number
  /** The operand that was NOT decomposed; each chunk is multiplied by this. */
  otherOperand: number
  /** Nonzero place-value components of `splitOperand`, most significant first. */
  chunks: number[]
  /** `chunks[i] * otherOperand`, same order as `chunks`. */
  parts: number[]
  /** `splitOperand * otherOperand`. */
  total: number
}

export function computeSplit(a: number, b: number): Split {
  const preferA = a >= b
  let splitOperand = preferA ? a : b
  let otherOperand = preferA ? b : a

  let chunks = placeValueSplit(splitOperand)
  if (chunks.length <= 1) {
    // splitOperand is a bare single digit (or 0): nothing meaningful to
    // decompose, so decompose the other operand instead when it has more
    // than one place-value chunk.
    const altChunks = placeValueSplit(otherOperand)
    if (altChunks.length > 1) {
      ;[splitOperand, otherOperand] = [otherOperand, splitOperand]
      chunks = altChunks
    }
  }

  const parts = chunks.map((c) => c * otherOperand)
  const total = splitOperand * otherOperand

  return { splitOperand, otherOperand, chunks, parts, total }
}

/**
 * "Modelo rectangular": visualizes a×b as a rectangle of `rows` x `cols`,
 * split into place-value chunks along one side (Innovamat's
 * rectangle-splitting model, e.g. 17x4 -> (10+7)x4, or 445x9 ->
 * (400+40+5)x9). Only meaningful when at least one operand is >= 10 (a
 * single-digit split has nothing to chunk), so callers should gate on that
 * before including this strategy.
 *
 * The step text is written in a parseable "N × M = P" format so property
 * tests can extract and re-verify each arithmetic claim.
 */
export function buildRectangularStrategy(a: number, b: number): Strategy {
  const { splitOperand, otherOperand, chunks, parts, total } = computeSplit(a, b)

  const rows = otherOperand
  const colsSplit = chunks.length > 0 ? chunks : [splitOperand]

  const steps = [
    {
      text: `Dibujamos un rectángulo de ${rows} filas y ${splitOperand} columnas, y lo partimos en ${chunks.join(' + ')}.`,
      visual: { kind: 'rectangle-model' as const, rows, colsSplit },
    },
    ...chunks.map((chunk, i) => ({ text: `${chunk} × ${otherOperand} = ${parts[i]}` })),
    { text: `${parts.join(' + ')} = ${total}` },
  ]

  return { id: 'rectangular', name: 'Modelo rectangular', steps }
}

/**
 * "Descomposición": splits one operand into place-value chunks and
 * multiplies each chunk separately, e.g. 445×9 -> 400×9=3600, 40×9=360,
 * 5×9=45, 3600+360+45=4005. Always applicable — when both operands are
 * single digits, `computeSplit` falls back to a trivial single-fact step.
 */
export function buildDescomposicionStrategy(a: number, b: number): Strategy {
  const { splitOperand, otherOperand, chunks, parts, total } = computeSplit(a, b)

  if (chunks.length <= 1) {
    // Both operands are single digits: no meaningful decomposition, use a
    // trivial "hechos derivados"-flavored single-fact step instead.
    return {
      id: 'descomposicion',
      name: 'Descomposición',
      steps: [{ text: `${splitOperand} × ${otherOperand} = ${total}` }],
    }
  }

  const steps = [
    { text: `Separamos ${splitOperand} en ${chunks.join(' + ')}.` },
    ...chunks.map((chunk, i) => ({ text: `${chunk} × ${otherOperand} = ${parts[i]}` })),
    { text: `${parts.join(' + ')} = ${total}` },
  ]

  return { id: 'descomposicion', name: 'Descomposición', steps }
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
