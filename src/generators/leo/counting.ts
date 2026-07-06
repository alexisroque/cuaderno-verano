import type { Rng } from '../../lib/rng'
import type { Choice, Generator } from '../../types/exercise'
import { clampDifficulty, exerciseId } from '../framework'
import { cuantosFor, nounForCount, pickAnimal, pluralOf } from './emoji'

/** Inclusive count range per difficulty (catalog range [1, 3] for contar-6). */
const COUNT_RANGE: Record<number, [number, number]> = {
  1: [1, 3],
  2: [2, 5],
  3: [3, 6],
}

/** Inclusive count range per difficulty for the I5 challenge contar-20 (catalog range [2, 4]). */
const CHALLENGE_COUNT_RANGE: Record<number, [number, number]> = {
  2: [7, 11],
  3: [8, 15],
  4: [10, 20],
}

/** Builds 3 distinct near-number choices (including the correct one), all >= 0. */
function buildNearNumberChoices(rng: Rng, n: number, maxSpread: number): Choice[] {
  const values = new Set<number>([n])
  let guard = 0
  while (values.size < 3 && guard < 50) {
    const delta = rng.int(-maxSpread, maxSpread)
    const candidate = n + delta
    if (candidate >= 0 && candidate !== n) values.add(candidate)
    guard++
  }
  // Fallback fill in the unlikely event deltas keep colliding.
  let filler = n + maxSpread + 1
  while (values.size < 3) {
    if (!values.has(filler) && filler >= 0) values.add(filler)
    filler++
  }
  const shuffled = rng.shuffle([...values])
  return shuffled.map((v, i) => ({ id: `choice-${i}`, label: String(v) }))
}

export const contarSeisGenerator: Generator = {
  subskill: 'contar-6',
  generate(rng, requestedDifficulty, flavor) {
    const difficulty = clampDifficulty(requestedDifficulty, 1, 3)
    const id = exerciseId(rng, 'contar-6', difficulty)
    const [min, max] = COUNT_RANGE[difficulty]
    const n = rng.int(min, max)
    const animal = pickAnimal(rng, flavor)
    const choices = buildNearNumberChoices(rng, n, 2)
    const correctId = choices.find((c) => c.label === String(n))!.id

    return {
      id,
      subskill: 'contar-6',
      difficulty,
      prompt: {
        text: `¿${cuantosFor(animal)} ${nounForCount(animal, n)} ves?`,
        visual: { kind: 'emoji-count', emoji: animal.emoji, count: n },
      },
      answer: { kind: 'choice', correctId },
      choices,
      strategies: [
        {
          id: 'contar-uno-a-uno',
          name: 'Contar uno a uno',
          steps: [{ text: 'Toca cada uno y cuenta en voz alta: 1, 2, 3...' }],
        },
      ],
      audioText: `¿${cuantosFor(animal)} ${nounForCount(animal, n)} ves? Tócalos para contarlos.`,
      microlesson: 'Contar cosas de una en una es el primer paso para aprender a sumar.',
    }
  },
}

export const contarVeinteGenerator: Generator = {
  subskill: 'contar-20',
  generate(rng, requestedDifficulty, flavor) {
    const difficulty = clampDifficulty(requestedDifficulty, 2, 4)
    const id = exerciseId(rng, 'contar-20', difficulty)
    const [min, max] = CHALLENGE_COUNT_RANGE[difficulty]
    const n = rng.int(min, max)
    const animal = pickAnimal(rng, flavor)
    const choices = buildNearNumberChoices(rng, n, 3)
    const correctId = choices.find((c) => c.label === String(n))!.id
    // Rows of up to 5 keep the grid readable for numbers beyond 6.
    const rows = Math.ceil(n / 5)

    return {
      id,
      subskill: 'contar-20',
      difficulty,
      challenge: true,
      prompt: {
        text: `¿${cuantosFor(animal)} ${nounForCount(animal, n)} ves? Cuéntalos en filas.`,
        visual: { kind: 'emoji-count', emoji: animal.emoji, count: n, rows },
      },
      answer: { kind: 'choice', correctId },
      choices,
      strategies: [
        {
          id: 'contar-en-filas',
          name: 'Contar en filas',
          steps: [{ text: 'Cuenta una fila entera y luego sigue con la siguiente.' }],
        },
      ],
      audioText: `¿${cuantosFor(animal)} ${nounForCount(animal, n)} ves? Cuéntalos fila por fila con el dedo.`,
      microlesson: 'Contar en filas ayuda cuando hay demasiados para contarlos todos de golpe.',
    }
  },
}

export const compararGenerator: Generator = {
  subskill: 'comparar',
  generate(rng, requestedDifficulty, flavor) {
    const difficulty = clampDifficulty(requestedDifficulty, 1, 3)
    const id = exerciseId(rng, 'comparar', difficulty)
    const maxCount = difficulty === 1 ? 3 : difficulty === 2 ? 5 : 6

    const animal = pickAnimal(rng, flavor)
    let left = rng.int(0, maxCount)
    let right = rng.int(0, maxCount)
    // Bias towards a real answer roughly 2/3 of the time; allow ties the rest, since "iguales" is a valid, teachable case.
    if (left === right && rng.chance(0.65)) {
      right = left === maxCount ? left - 1 : left + 1
    }

    const winner: 'izquierda' | 'derecha' | 'iguales' = left === right ? 'iguales' : left > right ? 'izquierda' : 'derecha'

    const choices: Choice[] = [
      { id: 'izquierda', label: 'Izquierda' },
      { id: 'derecha', label: 'Derecha' },
      { id: 'iguales', label: 'Son iguales' },
    ]

    return {
      id,
      subskill: 'comparar',
      difficulty,
      prompt: {
        text: `¿Dónde hay más ${pluralOf(animal)}? Mira los dos grupos.`,
        visual: { kind: 'compare-groups', left: { emoji: animal.emoji, count: left }, right: { emoji: animal.emoji, count: right } },
      },
      answer: { kind: 'choice', correctId: winner },
      choices,
      dataHighlight: { relevantIndices: [0, 1], tokens: [String(left), String(right)] },
      strategies: [
        {
          id: 'comparar-grupos',
          name: 'Comparar grupos',
          steps: [{ text: 'Cuenta cada grupo y compara: el número más grande tiene más.' }],
        },
      ],
      audioText: `Mira los dos grupos de ${pluralOf(animal)}. ¿Dónde hay más? Toca izquierda, derecha, o iguales si son los mismos.`,
      microlesson: 'Comparar cantidades te ayuda a decidir cuál grupo tiene más o menos.',
    }
  },
}
