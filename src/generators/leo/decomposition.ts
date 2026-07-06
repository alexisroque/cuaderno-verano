import type { Rng } from '../../lib/rng'
import type { Choice, Generator } from '../../types/exercise'
import { clampDifficulty, exerciseId } from '../framework'
import { cuantosFor, escondidosFor, pickAnimal } from './emoji'

/** Total range per difficulty for descomponer-4-6 (catalog range [1, 3]): total lands in [4, 6]. */
const DESCOMPONER_TOTAL_RANGE: Record<number, [number, number]> = {
  1: [4, 4],
  2: [4, 5],
  3: [4, 6],
}

/** Total range per difficulty for the I5 challenge descomponer-7-9 (catalog range [2, 4]). */
const DESCOMPONER_CHALLENGE_TOTAL_RANGE: Record<number, [number, number]> = {
  2: [7, 7],
  3: [7, 8],
  4: [7, 9],
}

function buildNearNumberChoices(rng: Rng, n: number, maxSpread: number): Choice[] {
  const values = new Set<number>([n])
  let guard = 0
  while (values.size < 3 && guard < 50) {
    const delta = rng.int(-maxSpread, maxSpread)
    const candidate = n + delta
    if (candidate >= 0 && candidate !== n) values.add(candidate)
    guard++
  }
  let filler = n + maxSpread + 1
  while (values.size < 3) {
    if (!values.has(filler) && filler >= 0) values.add(filler)
    filler++
  }
  const shuffled = rng.shuffle([...values])
  return shuffled.map((v, i) => ({ id: `choice-${i}`, label: String(v) }))
}

function buildDescomponer(
  rng: Rng,
  subskill: 'descomponer-4-6' | 'descomponer-7-9',
  difficulty: number,
  totalRange: [number, number],
  challenge: boolean,
  flavor: Parameters<Generator['generate']>[2],
) {
  const id = exerciseId(rng, subskill, difficulty)
  const [minT, maxT] = totalRange
  const total = rng.int(minT, maxT)
  // Visible count leaves at least 1 hidden, and at least 1 visible, so the "escondidos" question always has a positive, guessable answer.
  const visible = rng.int(1, total - 1)
  const hidden = total - visible
  const animal = pickAnimal(rng, flavor)
  const choices = buildNearNumberChoices(rng, hidden, 2)
  const correctId = choices.find((c) => c.label === String(hidden))!.id

  return {
    id,
    subskill,
    difficulty,
    challenge: challenge || undefined,
    prompt: {
      text: `Hay ${total} ${animal.noun}s en total. Ves ${visible}. ¿${cuantosFor(animal)} están ${escondidosFor(animal)}?`,
      visual: { kind: 'boxes' as const, groups: 1, perGroup: visible, remainder: hidden },
    },
    answer: { kind: 'choice' as const, correctId },
    choices,
    strategies: [
      {
        id: 'contar-los-que-faltan',
        name: 'Contar los que faltan',
        steps: [{ text: `Si en total hay ${total} y ves ${visible}, los que faltan son ${total} − ${visible} = ${hidden}.` }],
      },
    ],
    audioText: `Hay ${total} ${animal.noun}s en total, pero solo ves ${visible}. ¿${cuantosFor(animal)} están ${escondidosFor(animal)} en la caja?`,
    microlesson: 'Descomponer un número te ayuda a ver las partes que lo forman.',
  }
}

export const descomponerCuatroSeisGenerator: Generator = {
  subskill: 'descomponer-4-6',
  generate(rng, requestedDifficulty, flavor) {
    const difficulty = clampDifficulty(requestedDifficulty, 1, 3)
    return buildDescomponer(rng, 'descomponer-4-6', difficulty, DESCOMPONER_TOTAL_RANGE[difficulty], false, flavor)
  },
}

export const descomponerSieteNueveGenerator: Generator = {
  subskill: 'descomponer-7-9',
  generate(rng, requestedDifficulty, flavor) {
    const difficulty = clampDifficulty(requestedDifficulty, 2, 4)
    return buildDescomponer(rng, 'descomponer-7-9', difficulty, DESCOMPONER_CHALLENGE_TOTAL_RANGE[difficulty], true, flavor)
  },
}

/** n range per difficulty for dobles (catalog range [2, 4]): keeps 2n within a friendly 2..12 span. */
const DOBLES_N_RANGE: Record<number, [number, number]> = {
  2: [1, 3],
  3: [1, 5],
  4: [1, 6],
}

export const doblesGenerator: Generator = {
  subskill: 'dobles',
  generate(rng, requestedDifficulty, flavor) {
    const difficulty = clampDifficulty(requestedDifficulty, 2, 4)
    const id = exerciseId(rng, 'dobles', difficulty)
    const [min, max] = DOBLES_N_RANGE[difficulty]
    const n = rng.int(min, max)
    const value = n * 2
    const animal = pickAnimal(rng, flavor)
    const choices = buildNearNumberChoices(rng, value, 2)
    const correctId = choices.find((c) => c.label === String(value))!.id

    return {
      id,
      subskill: 'dobles',
      difficulty,
      challenge: true,
      prompt: {
        text: `El doble de ${n} es tener dos grupos de ${n} ${animal.noun}s. ¿Cuántos hay en total?`,
        visual: { kind: 'compare-groups', left: { emoji: animal.emoji, count: n }, right: { emoji: animal.emoji, count: n } },
      },
      answer: { kind: 'choice', correctId },
      choices,
      strategies: [
        {
          id: 'doble-es-dos-veces',
          name: 'El doble es dos veces lo mismo',
          steps: [{ text: `${n} + ${n} = ${value}` }],
        },
      ],
      audioText: `Mira los dos grupos de ${n} ${animal.noun}s. Ese es el doble de ${n}. ¿Cuántos hay en total?`,
      microlesson: 'El doble de un número es sumarlo con él mismo.',
    }
  },
}

/** n range per difficulty for mas-menos-1-2 (catalog range [2, 4]): keeps n±2 within [1, 10]. */
const MAS_MENOS_N_RANGE: Record<number, [number, number]> = {
  2: [2, 6],
  3: [2, 8],
  4: [3, 9],
}

export const masMenosUnoDosGenerator: Generator = {
  subskill: 'mas-menos-1-2',
  generate(rng, requestedDifficulty, flavor) {
    const difficulty = clampDifficulty(requestedDifficulty, 2, 4)
    const id = exerciseId(rng, 'mas-menos-1-2', difficulty)
    const [min, max] = MAS_MENOS_N_RANGE[difficulty]
    const n = rng.int(min, max)
    const delta = rng.pick([1, 2, -1, -2])
    // Clamp the result into [1, 10] by flipping the delta's sign if it would fall outside.
    const rawValue = n + delta
    const value = rawValue < 1 ? n - delta : rawValue > 10 ? n - delta : rawValue
    const sign = value > n ? '+' : value < n ? '−' : '+'
    const diff = Math.abs(value - n)
    const animal = pickAnimal(rng, flavor)
    const choices = buildNearNumberChoices(rng, value, 2)
    const correctId = choices.find((c) => c.label === String(value))!.id

    return {
      id,
      subskill: 'mas-menos-1-2',
      difficulty,
      challenge: true,
      prompt: {
        text: `Hay ${n} ${animal.noun}s. ¿Cuánto es ${n} ${sign} ${diff}?`,
        visual: { kind: 'emoji-count', emoji: animal.emoji, count: n },
      },
      answer: { kind: 'choice', correctId },
      choices,
      strategies: [
        {
          id: 'contar-hacia-arriba-o-abajo',
          name: sign === '+' ? 'Contar hacia arriba' : 'Contar hacia abajo',
          steps: [{ text: `${n} ${sign} ${diff} = ${value}` }],
        },
      ],
      audioText: `Hay ${n} ${animal.noun}s. ¿Cuánto es ${n} ${sign === '+' ? 'más' : 'menos'} ${diff}?`,
      microlesson: 'Sumar o restar 1 o 2 es contar un poquito hacia arriba o hacia abajo.',
    }
  },
}

/** n range for simbolos (catalog range [2, 4]): operands stay within [1, 9]. */
const SIMBOLOS_RANGE: [number, number] = [1, 9]

export const simbolosGenerator: Generator = {
  subskill: 'simbolos',
  generate(rng, requestedDifficulty, _flavor) {
    const difficulty = clampDifficulty(requestedDifficulty, 2, 4)
    const id = exerciseId(rng, 'simbolos', difficulty)
    const [min, max] = SIMBOLOS_RANGE

    const a = rng.int(min, max)
    const b = rng.int(min, max)
    const sum = a + b
    // Only offer subtraction when it stays non-negative, so the "correct" symbol is always well-defined and unique among the three offered.
    const canSubtract = a - b >= 0
    const canEqual = a === b

    const symbolOptions: ('+' | '−' | '=')[] = ['+']
    if (canSubtract) symbolOptions.push('−')
    if (canEqual) symbolOptions.push('=')

    const correctSymbol = rng.pick(symbolOptions)
    const result = correctSymbol === '+' ? sum : correctSymbol === '−' ? a - b : a

    const allSymbols: ('+' | '−' | '=')[] = ['+', '−', '=']
    const choices: Choice[] = allSymbols.map((s, i) => ({ id: `choice-${i}`, label: s }))
    const correctId = choices[allSymbols.indexOf(correctSymbol)].id

    return {
      id,
      subskill: 'simbolos',
      difficulty,
      challenge: true,
      prompt: {
        text: `${a} ? ${b} = ${result}. ¿Qué símbolo falta: +, − o =?`,
        visual: { kind: 'none' },
      },
      answer: { kind: 'choice', correctId },
      choices,
      strategies: [
        {
          id: 'probar-el-simbolo',
          name: 'Probar el símbolo correcto',
          steps: [{ text: `${a} ${correctSymbol} ${b} = ${result}` }],
        },
      ],
      audioText: `Mira la cuenta: ${a}, después un símbolo, después ${b}, igual a ${result}. Toca el símbolo que falta: más, menos, o igual.`,
      microlesson: 'Los símbolos +, − y = dicen qué hacer con los números.',
    }
  },
}

/** Total range per difficulty for estimar (catalog range [2, 4]): larger, harder-to-subitize crowds as difficulty rises. */
const ESTIMAR_TOTAL_RANGE: Record<number, [number, number]> = {
  2: [8, 12],
  3: [10, 16],
  4: [12, 20],
}

/** Builds 3 range-choices (as "entre X y Y" strings) around n, one of which contains n; ranges don't overlap. */
function buildRangeChoices(rng: Rng, n: number): { choices: Choice[]; correctId: string } {
  const width = 4
  // The correct band always contains n, floored to a multiple of `width` for tidy, non-overlapping bands.
  const bandStart = Math.max(1, Math.floor((n - 1) / width) * width + 1)
  const bandEnd = bandStart + width - 1
  const bands: [number, number][] = [[bandStart, bandEnd]]

  const lowerStart = Math.max(1, bandStart - width)
  if (lowerStart < bandStart) bands.push([lowerStart, bandStart - 1])
  const higherStart = bandEnd + 1
  bands.push([higherStart, higherStart + width - 1])

  const shuffled = rng.shuffle(bands)
  const choices: Choice[] = shuffled.map((b, i) => ({ id: `choice-${i}`, label: `Entre ${b[0]} y ${b[1]}` }))
  const correctIndex = shuffled.findIndex((b) => b[0] === bandStart && b[1] === bandEnd)
  return { choices, correctId: choices[correctIndex].id }
}

export const estimarGenerator: Generator = {
  subskill: 'estimar',
  generate(rng, requestedDifficulty, flavor) {
    const difficulty = clampDifficulty(requestedDifficulty, 2, 4)
    const id = exerciseId(rng, 'estimar', difficulty)
    const [min, max] = ESTIMAR_TOTAL_RANGE[difficulty]
    const n = rng.int(min, max)
    const animal = pickAnimal(rng, flavor)
    const { choices, correctId } = buildRangeChoices(rng, n)

    return {
      id,
      subskill: 'estimar',
      difficulty,
      challenge: true,
      prompt: {
        text: `Mira rápido: ¿cuántos ${animal.noun}s crees que hay?`,
        visual: { kind: 'emoji-count', emoji: animal.emoji, count: n },
      },
      answer: { kind: 'choice', correctId },
      choices,
      strategies: [
        {
          id: 'estimar-y-comprobar',
          name: 'Estimar y comprobar contando',
          steps: [{ text: `Adivina primero, y luego cuenta despacio para comprobar: hay ${n}.` }],
        },
      ],
      audioText: `Mira rápido, sin contar uno a uno. ¿Cuántos ${animal.noun}s crees que hay? Elige el grupo que te parezca correcto.`,
      microlesson: 'Estimar es adivinar una cantidad aproximada sin contar todo.',
    }
  },
}
