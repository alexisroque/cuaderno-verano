import type { Rng } from '../../lib/rng'
import type { Choice, Exercise, Generator, Strategy } from '../../types/exercise'
import { exerciseId } from '../framework'

/** Which times-tables are in scope for each difficulty (catalog range [1, 4]). */
const TABLE_POOL: Record<number, number[]> = {
  1: [2, 5, 10],
  2: [3, 4, 6],
  3: [7, 8, 9],
  4: [7, 8, 9], // d4 extends d3's tables with a wider multiplicand range (see rollMultiplicand).
}

function clampDifficulty(difficulty: number): number {
  return Math.min(4, Math.max(1, Math.round(difficulty)))
}

/** The multiplicand ("how many times") rolled against the chosen table, widened at higher difficulty. */
function rollMultiplicand(rng: Rng, difficulty: number): number {
  return difficulty >= 4 ? rng.int(1, 12) : rng.int(1, 10)
}

const KINDS = ['missing-factor', 'product', 'pattern-hunt'] as const
type Kind = (typeof KINDS)[number]

/** Facts about a table used by the pattern-hunt kind: last-digit rule + the correct/plausible-wrong choice pool. */
const PATTERN_FACTS: Record<number, { correct: string; wrongs: string[] }> = {
  2: { correct: 'Todos son números pares', wrongs: ['Acaban en 0 o en 5', 'Todos son múltiplos de 3', 'Todos acaban en 1'] },
  3: { correct: 'Suman siempre un múltiplo de 3', wrongs: ['Acaban en 0 o en 5', 'Todos son pares', 'Todos acaban en 7'] },
  4: { correct: 'Todos son el doble de la tabla del 2', wrongs: ['Acaban en 0 o en 5', 'Todos son impares', 'Todos acaban en 3'] },
  5: { correct: 'Acaban en 0 o en 5', wrongs: ['Todos son impares', 'Todos son múltiplos de 7', 'Todos acaban en 2'] },
  6: { correct: 'Todos son el doble de la tabla del 3', wrongs: ['Acaban en 0 o en 5', 'Todos son impares', 'Todos acaban en 9'] },
  7: { correct: 'No siguen un patrón sencillo en la última cifra', wrongs: ['Acaban en 0 o en 5', 'Todos son pares', 'Todos son múltiplos de 2'] },
  8: { correct: 'Todos son el doble de la tabla del 4', wrongs: ['Acaban en 0 o en 5', 'Todos son impares', 'Todos acaban en 1'] },
  9: { correct: 'La suma de sus cifras siempre da 9 (o un múltiplo de 9)', wrongs: ['Acaban en 0 o en 5', 'Todos son pares', 'Todos acaban en 4'] },
  10: { correct: 'Acaban en 0', wrongs: ['Acaban en 5', 'Todos son impares', 'Todos acaban en 1'] },
}

function fallbackPatternFact(table: number) {
  return PATTERN_FACTS[table] ?? PATTERN_FACTS[10]
}

function buildMissingFactorStrategy(table: number, multiplicand: number, product: number): Strategy {
  return {
    id: 'missing-factor',
    name: 'Factor que falta',
    steps: [
      { text: `Buscamos qué número multiplicado por ${table} da ${product}.` },
      { text: `${table} × ${multiplicand} = ${product}` },
    ],
  }
}

function buildProductStrategy(table: number, multiplicand: number, product: number): Strategy {
  return {
    id: 'producto',
    name: 'Producto directo',
    steps: [
      { text: `Recordamos la tabla del ${table}.` },
      { text: `${table} × ${multiplicand} = ${product}` },
    ],
  }
}

function buildPatternStrategy(table: number): Strategy {
  const fact = fallbackPatternFact(table)
  return {
    id: 'patron',
    name: 'Patrón',
    steps: [
      { text: `Miramos los resultados de la tabla del ${table}: ${Array.from({ length: 10 }, (_, i) => table * (i + 1)).join(', ')}.` },
      { text: fact.correct },
    ],
  }
}

function buildMissingFactorExercise(rng: Rng, difficulty: number, table: number): Omit<Exercise, 'id' | 'subskill' | 'difficulty'> {
  const multiplicand = rollMultiplicand(rng, difficulty)
  const product = table * multiplicand
  return {
    prompt: { text: `${table} × ? = ${product}` },
    answer: { kind: 'number', value: multiplicand },
    strategies: [buildMissingFactorStrategy(table, multiplicand, product)],
    microlesson: 'Conocer las tablas te ayuda a calcular rápido sin sumar una y otra vez.',
  }
}

function buildProductExercise(rng: Rng, difficulty: number, table: number): Omit<Exercise, 'id' | 'subskill' | 'difficulty'> {
  const multiplicand = rollMultiplicand(rng, difficulty)
  const product = table * multiplicand
  return {
    prompt: { text: `¿Cuánto es ${table} × ${multiplicand}?` },
    answer: { kind: 'number', value: product },
    strategies: [buildProductStrategy(table, multiplicand, product)],
    microlesson: 'Conocer las tablas te ayuda a calcular rápido sin sumar una y otra vez.',
  }
}

function buildPatternHuntExercise(rng: Rng, table: number): Omit<Exercise, 'id' | 'subskill' | 'difficulty'> {
  const fact = fallbackPatternFact(table)
  const wrongChoices = rng.shuffle(fact.wrongs).slice(0, 2)
  const choices: Choice[] = rng.shuffle([
    { id: 'correct', label: fact.correct },
    { id: 'wrong-0', label: wrongChoices[0] },
    { id: 'wrong-1', label: wrongChoices[1] },
  ])

  return {
    prompt: { text: `¿Qué tienen en común los resultados de la tabla del ${table}?` },
    answer: { kind: 'choice', correctId: 'correct' },
    choices,
    strategies: [buildPatternStrategy(table)],
    microlesson: 'Buscar patrones en las tablas te ayuda a memorizarlas mejor.',
  }
}

export const tablasGenerator: Generator = {
  subskill: 'tablas',
  generate(rng, requestedDifficulty, _flavor) {
    const difficulty = clampDifficulty(requestedDifficulty)
    const id = exerciseId(rng, 'tablas', requestedDifficulty)
    const table = rng.pick(TABLE_POOL[difficulty])
    const kind: Kind = rng.pick([...KINDS])

    let body: Omit<Exercise, 'id' | 'subskill' | 'difficulty'>
    switch (kind) {
      case 'missing-factor':
        body = buildMissingFactorExercise(rng, difficulty, table)
        break
      case 'product':
        body = buildProductExercise(rng, difficulty, table)
        break
      case 'pattern-hunt':
        body = buildPatternHuntExercise(rng, table)
        break
    }

    return { id, subskill: 'tablas', difficulty, ...body }
  },
}
