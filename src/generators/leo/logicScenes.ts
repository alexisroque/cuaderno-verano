import type { Choice, Generator } from '../../types/exercise'
import { clampDifficulty, exerciseId } from '../framework'
import { fallbackAnimalPool, fallbackFoodPool, type EmojiNoun } from './emoji'

type Category = 'animales' | 'comida'

const CATEGORY_LABEL: Record<Category, string> = { animales: 'animales', comida: 'comidas' }

/** Picks 3 distinct items from `sameCategory` plus exactly 1 from `otherCategory`, all emoji distinct. */
function buildOddOneOutSet(rng: import('../../lib/rng').Rng, sameCategory: EmojiNoun[], otherCategory: EmojiNoun[]) {
  const sameShuffled = rng.shuffle(sameCategory).slice(0, 3)
  const odd = rng.pick(otherCategory)
  return { sameShuffled, odd }
}

/**
 * "¿cuál NO es un {category}?" odd-one-out. Uses the fallback animal/food
 * pools (not chapter-flavor phrases) because both pools need to be
 * simultaneously available and mutually exclusive by category — the
 * chapter flavor's animals/foods lists don't guarantee that split, while
 * the two curated fallback pools always do. Phrasing stays genderless
 * ("cuál NO es un/una") is sidestepped entirely by asking about the
 * category name directly.
 */
export const clasificarGenerator: Generator = {
  subskill: 'clasificar',
  generate(rng, requestedDifficulty, _flavor) {
    const difficulty = clampDifficulty(requestedDifficulty, 1, 3)
    const id = exerciseId(rng, 'clasificar', difficulty)

    const category: Category = rng.pick(['animales', 'comida'])
    const sameCategory = category === 'animales' ? fallbackAnimalPool() : fallbackFoodPool()
    const otherCategory = category === 'animales' ? fallbackFoodPool() : fallbackAnimalPool()
    const { sameShuffled, odd } = buildOddOneOutSet(rng, sameCategory, otherCategory)

    const items = rng.shuffle([...sameShuffled, odd])
    const choices: Choice[] = items.map((item, i) => ({ id: `choice-${i}`, label: item.emoji }))
    const correctId = choices[items.indexOf(odd)].id

    return {
      id,
      subskill: 'clasificar',
      difficulty,
      prompt: {
        text: `¿Cuál de estos NO es ${CATEGORY_LABEL[category]}?`,
        visual: { kind: 'none' },
      },
      answer: { kind: 'choice', correctId },
      choices,
      strategies: [
        {
          id: 'buscar-el-diferente',
          name: 'Buscar el que no pertenece',
          steps: [{ text: `Los demás son ${CATEGORY_LABEL[category]}; busca el único que es diferente.` }],
        },
      ],
      audioText: `Mira estos cuatro. Tres son ${CATEGORY_LABEL[category]} y uno no. Toca el que no pertenece al grupo.`,
      microlesson: 'Clasificar es agrupar las cosas que se parecen y notar la que no encaja.',
    }
  },
}

/**
 * Only `encima`/`debajo` are offered. `al lado` was dropped: on a 2-actor
 * scene, "al lado" is symmetric — both actors are equally "beside" each
 * other, so a child tapping either one is correct, but the generator only
 * graded `mover` as correct. Making it unambiguous would need a 3+ item
 * row with a named anchor ("toca el que está al lado de X"), which is more
 * complexity than this small 2-actor scene format supports well. `delante`
 * was also dropped: the emoji grid has no depth cue for a 4-5yo, so it was
 * implemented with the exact same delta as `debajo` (the row below), making
 * every "delante" scene visually identical to a "debajo" scene — same
 * ambiguity, different label. `encima`/`debajo` are the only two relations
 * this 2-actor top/bottom layout can render with a single, unique answer.
 */
type Position = 'encima' | 'debajo'
const POSITIONS: Position[] = ['encima', 'debajo']

/** Small scene pool: a "container" emoji (fixed reference point) plus a "mover" emoji placed relative to it. */
const SCENE_ACTORS = ['🐶', '🐱', '🐰', '🐢', '⭐', '🎈']

/** Positions available per difficulty (catalog range [1, 3]): both are unambiguous, so all difficulties share the same pool. */
const POSITION_POOL: Record<number, Position[]> = {
  1: POSITIONS,
  2: POSITIONS,
  3: POSITIONS,
}

/** Reference cell every scene is built around (row, col), leaving room to place the mover above/below it on a 3x3 implicit grid. */
const REFERENCE_CELL = { row: 1, col: 1 }

/** Deltas (row, col) that place the mover at `position` relative to the reference cell. */
const POSITION_DELTA: Record<Position, { row: number; col: number }> = {
  encima: { row: -1, col: 0 },
  debajo: { row: 1, col: 0 },
}

export const posicionesGenerator: Generator = {
  subskill: 'posiciones',
  generate(rng, requestedDifficulty, _flavor) {
    const difficulty = clampDifficulty(requestedDifficulty, 1, 3)
    const id = exerciseId(rng, 'posiciones', difficulty)

    const [mover, reference] = rng.shuffle(SCENE_ACTORS).slice(0, 2)
    const targetPosition = rng.pick(POSITION_POOL[difficulty])
    const delta = POSITION_DELTA[targetPosition]
    const moverCell = { row: REFERENCE_CELL.row + delta.row, col: REFERENCE_CELL.col + delta.col }

    // The scene visual is the only place the spatial arrangement is revealed — the
    // prompt/audio text names the position word but never which actor occupies it,
    // so answering requires reading the scene, not just echoing the question.
    const choices: Choice[] = [
      { id: 'mover', label: mover },
      { id: 'reference', label: reference },
    ]

    return {
      id,
      subskill: 'posiciones',
      difficulty,
      prompt: {
        text: `Mira la escena. Toca el que está ${targetPosition} del otro.`,
        visual: {
          kind: 'scene',
          actors: [
            { emoji: mover, row: moverCell.row, col: moverCell.col },
            { emoji: reference, row: REFERENCE_CELL.row, col: REFERENCE_CELL.col },
          ],
        },
      },
      answer: { kind: 'choice', correctId: 'mover' },
      choices,
      strategies: [
        {
          id: 'ubicar-en-la-escena',
          name: 'Ubicar la posición en la escena',
          steps: [{ text: `Mira la escena y busca cuál de los dos está ${targetPosition} del otro.` }],
        },
      ],
      audioText: `Mira la escena. Toca el que está ${targetPosition}.`,
      microlesson: 'Las palabras de posición como encima o debajo te ayudan a describir dónde están las cosas.',
    }
  },
}
