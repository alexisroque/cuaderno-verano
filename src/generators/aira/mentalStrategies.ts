import type { Strategy } from '../../types/exercise'

/**
 * Minus sign character used consistently across this file's step text, to
 * match the spec's example ("34 + 20 − 1") and keep the subtraction regex
 * (`extractSubtractionClaims` in mental.test.ts) matching a single
 * character. Using U+2212 (minus sign) rather than plain "-" throughout.
 */
const MINUS = '−'

/** "34 + 19 = 34 + 20 − 1" style compensation: round the second addend up to the next ten, then subtract the difference. */
export function buildCompensationAddStrategy(a: number, b: number): Strategy {
  const roundedB = Math.ceil(b / 10) * 10
  const delta = roundedB - b
  const step1 = a + roundedB
  const total = step1 - delta

  return {
    id: 'compensacion',
    name: 'Compensación',
    steps: [
      { text: `${a} + ${b} = ${a} + ${roundedB} ${MINUS} ${delta}` },
      { text: `${a} + ${roundedB} = ${step1}` },
      { text: `${step1} ${MINUS} ${delta} = ${total}` },
    ],
  }
}

/** "52 − 19 = 52 − 20 + 1" style compensation: round the subtrahend up to the next ten, then add back the difference. */
export function buildCompensationSubStrategy(a: number, b: number): Strategy {
  const roundedB = Math.ceil(b / 10) * 10
  const delta = roundedB - b
  const step1 = a - roundedB
  const total = step1 + delta

  return {
    id: 'compensacion',
    name: 'Compensación',
    steps: [
      { text: `${a} ${MINUS} ${b} = ${a} ${MINUS} ${roundedB} + ${delta}` },
      { text: `${a} ${MINUS} ${roundedB} = ${step1}` },
      { text: `${step1} + ${delta} = ${total}` },
    ],
  }
}

/** "El doble de N": N × 2. */
export function buildDoublesStrategy(n: number): Strategy {
  const total = n * 2
  return {
    id: 'dobles',
    name: 'Dobles',
    steps: [{ text: `${n} + ${n} = ${total}` }, { text: `${n} × 2 = ${total}` }],
  }
}

/** "La mitad de N" (N even): N ÷ 2. */
export function buildHalvesStrategy(n: number): Strategy {
  const total = n / 2
  return {
    id: 'mitades',
    name: 'Mitades',
    steps: [{ text: `${n} ÷ 2 = ${total}` }],
  }
}

/** "N × 10": shift every digit one place left (append a zero). */
export function buildTimes10Strategy(n: number): Strategy {
  const total = n * 10
  return {
    id: 'por-10',
    name: 'Multiplicar por 10',
    steps: [
      { text: `Multiplicar por 10 añade un cero: ${n} × 10 = ${total}.` },
      { text: `${n} × 10 = ${total}` },
    ],
  }
}

/** "N × 100": shift every digit two places left (append two zeros). */
export function buildTimes100Strategy(n: number): Strategy {
  const total = n * 100
  return {
    id: 'por-100',
    name: 'Multiplicar por 100',
    steps: [
      { text: `Multiplicar por 100 añade dos ceros: ${n} × 100 = ${total}.` },
      { text: `${n} × 100 = ${total}` },
    ],
  }
}

/** "N ÷ 10" (N a multiple of 10): drop the trailing zero. */
export function buildDiv10Strategy(n: number): Strategy {
  const total = n / 10
  return {
    id: 'entre-10',
    name: 'Dividir entre 10',
    steps: [
      { text: `Dividir entre 10 quita un cero: ${n} ÷ 10 = ${total}.` },
      { text: `${n} ÷ 10 = ${total}` },
    ],
  }
}
