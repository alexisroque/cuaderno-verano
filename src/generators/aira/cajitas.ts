import type { Generator, Strategy } from '../../types/exercise'
import { exerciseId } from '../framework'

/** Inclusive operand ranges per difficulty (catalog range [1, 4]): both factors grow together. */
const OPERAND_RANGES: Record<number, [number, number]> = {
  1: [2, 5],
  2: [3, 9],
  3: [5, 15],
  4: [10, 25],
}

function clampDifficulty(difficulty: number): number {
  return Math.min(4, Math.max(1, Math.round(difficulty)))
}

const HIDE_POSITIONS = ['a', 'b', 'product'] as const
type HidePosition = (typeof HIDE_POSITIONS)[number]

/**
 * "Cajita multiplicativa" (Innovamat): a trio (a, b, a×b) is shown as a box
 * with one of the three numbers hidden. The strategy explains all four
 * related operations that connect the trio: a×b, b×a, product÷a, product÷b.
 */
function buildCajitaStrategy(a: number, b: number, product: number, hidden: HidePosition): Strategy {
  const relations = [
    { text: `${a} × ${b} = ${product}` },
    { text: `${b} × ${a} = ${product}` },
    { text: `${product} ÷ ${a} = ${b}` },
    { text: `${product} ÷ ${b} = ${a}` },
  ]

  const introByHidden: Record<HidePosition, string> = {
    a: `Falta el primer factor. Como ${b} × ? = ${product}, dividimos: ${product} ÷ ${b} = ${a}.`,
    b: `Falta el segundo factor. Como ${a} × ? = ${product}, dividimos: ${product} ÷ ${a} = ${b}.`,
    product: `Falta el resultado. Multiplicamos los dos factores: ${a} × ${b} = ${product}.`,
  }

  return {
    id: 'cajita-relaciones',
    name: 'Las 4 operaciones de la cajita',
    steps: [{ text: introByHidden[hidden] }, ...relations],
  }
}

function buildPrompt(a: number, b: number, product: number, hidden: HidePosition): string {
  const boxA = hidden === 'a' ? '?' : String(a)
  const boxB = hidden === 'b' ? '?' : String(b)
  const boxProduct = hidden === 'product' ? '?' : String(product)
  return `Cajita multiplicativa: ${boxA} × ${boxB} = ${boxProduct}. ¿Qué número falta?`
}

export const cajitasGenerator: Generator = {
  subskill: 'cajitas',
  generate(rng, requestedDifficulty, _flavor) {
    const id = exerciseId(rng, 'cajitas', requestedDifficulty)
    const difficulty = clampDifficulty(requestedDifficulty)
    const [min, max] = OPERAND_RANGES[difficulty]

    const a = rng.int(min, max)
    const b = rng.int(min, max)
    const product = a * b
    const hidden = rng.pick([...HIDE_POSITIONS])

    const hiddenValue = hidden === 'a' ? a : hidden === 'b' ? b : product

    return {
      id,
      subskill: 'cajitas',
      difficulty,
      prompt: { text: buildPrompt(a, b, product, hidden) },
      answer: { kind: 'number', value: hiddenValue },
      strategies: [buildCajitaStrategy(a, b, product, hidden)],
      microlesson: 'Multiplicación y división son operaciones inversas: una deshace lo que hace la otra.',
    }
  },
}
