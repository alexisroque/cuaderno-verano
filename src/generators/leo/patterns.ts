import type { Rng } from '../../lib/rng'
import type { Choice, Generator } from '../../types/exercise'
import { clampDifficulty, exerciseId } from '../framework'

/** A small emoji palette Leo can tell apart at a glance (kept short and visually distinct). */
const PATTERN_EMOJI = ['🔵', '🟡', '🔺', '⭐', '🟩', '🐶']

type PatternKind = 'AB' | 'AAB' | 'ABC'

/** Builds one full pattern cycle for `kind` from up to 3 distinct emoji drawn off `pool`. */
function buildCycle(rng: Rng, kind: PatternKind, pool: string[]): string[] {
  const [a, b, c] = rng.shuffle(pool).slice(0, 3)
  if (kind === 'AB') return [a, b]
  if (kind === 'AAB') return [a, a, b]
  return [a, b, c]
}

/** Repeats `cycle` until it reaches at least `length` items. */
function repeatToLength(cycle: string[], length: number): string[] {
  const out: string[] = []
  while (out.length < length) out.push(...cycle)
  return out.slice(0, length)
}

/** Pattern kinds and sequence length available per difficulty (catalog range [1, 3]). */
const PATTERN_CONFIG: Record<number, { kinds: PatternKind[]; length: number }> = {
  1: { kinds: ['AB'], length: 4 },
  2: { kinds: ['AB', 'AAB'], length: 6 },
  3: { kinds: ['AAB', 'ABC'], length: 6 },
}

export const patronesGenerator: Generator = {
  subskill: 'patrones',
  generate(rng, requestedDifficulty, _flavor) {
    const difficulty = clampDifficulty(requestedDifficulty, 1, 3)
    const id = exerciseId(rng, 'patrones', difficulty)
    const { kinds, length } = PATTERN_CONFIG[difficulty]
    const kind = rng.pick(kinds)
    const cycle = buildCycle(rng, kind, PATTERN_EMOJI)
    const sequence = repeatToLength(cycle, length)

    // Hide the last slot (easier to reason about "what comes next") for AB/AAB,
    // and a middle slot for ABC once the pattern is established, so difficulty 3
    // exercises both "next" and "in the middle" pattern reasoning.
    const hideIndex = kind === 'ABC' && length > 3 ? Math.floor(length / 2) : length - 1
    const correctEmoji = sequence[hideIndex]
    const shown = sequence.map((e, i) => (i === hideIndex ? '❓' : e))

    const distractorPool = PATTERN_EMOJI.filter((e) => e !== correctEmoji)
    const distractors = rng.shuffle(distractorPool).slice(0, 2)
    const options = rng.shuffle([correctEmoji, ...distractors])
    const choices: Choice[] = options.map((e, i) => ({ id: `choice-${i}`, label: e }))
    const correctId = choices[options.indexOf(correctEmoji)].id

    return {
      id,
      subskill: 'patrones',
      difficulty,
      prompt: {
        text: `Mira el patrón: ${shown.join(' ')}. ¿Qué va en el lugar del signo de pregunta?`,
        visual: { kind: 'none' },
      },
      answer: { kind: 'choice', correctId },
      choices,
      strategies: [
        {
          id: 'seguir-el-patron',
          name: 'Seguir el patrón que se repite',
          steps: [{ text: `El patrón se repite así: ${cycle.join(' ')} — sigue el orden y encontrarás la pieza que falta.` }],
        },
      ],
      audioText: `Mira el patrón que se repite. ¿Qué figura falta donde está el signo de pregunta? Tócala.`,
      microlesson: 'Un patrón es un orden que se repite; si lo descubres, puedes adivinar qué sigue.',
    }
  },
}

const SHAPE_POOL: { emoji: string; name: string }[] = [
  { emoji: '⚪', name: 'círculo' },
  { emoji: '🟦', name: 'cuadrado' },
  { emoji: '🔺', name: 'triángulo' },
  { emoji: '⭐', name: 'estrella' },
]

export const formasGenerator: Generator = {
  subskill: 'formas',
  generate(rng, requestedDifficulty, _flavor) {
    const difficulty = clampDifficulty(requestedDifficulty, 1, 3)
    const id = exerciseId(rng, 'formas', difficulty)
    const target = rng.pick(SHAPE_POOL)
    // At difficulty 1, offer only 3 options; from 2 onward, the full 4-way choice.
    const otherShapes = SHAPE_POOL.filter((s) => s.name !== target.name)
    const distractorCount = difficulty === 1 ? 2 : 3
    const distractors = rng.shuffle(otherShapes).slice(0, distractorCount)
    const options = rng.shuffle([target, ...distractors])
    const choices: Choice[] = options.map((s, i) => ({ id: `choice-${i}`, label: s.emoji }))
    const correctId = choices[options.indexOf(target)].id

    return {
      id,
      subskill: 'formas',
      difficulty,
      prompt: { text: `Toca el ${target.name}.`, visual: { kind: 'none' } },
      answer: { kind: 'choice', correctId },
      choices,
      strategies: [
        {
          id: 'reconocer-la-forma',
          name: 'Reconocer la forma',
          steps: [{ text: `Busca la figura que se llama "${target.name}".` }],
        },
      ],
      audioText: `Toca el ${target.name}.`,
      microlesson: 'Reconocer formas te ayuda a describir el mundo que ves.',
    }
  },
}

/** Symmetric emoji pairs: each entry is a shape whose "mirror" reads identically, so we can build a clean is-it-symmetric task. */
const SYMMETRIC_SHAPES = ['⭐', '⚪', '🟦', '❤️', '🔷', '🦋']
/** Asymmetric-looking glyphs, used as the "wrong"/non-mirrored option. */
const ASYMMETRIC_LOOKING = ['🔤', '➡️', '🔻', '↗️', '🔣']

export const simetriaGenerator: Generator = {
  subskill: 'simetria',
  generate(rng, requestedDifficulty, _flavor) {
    const difficulty = clampDifficulty(requestedDifficulty, 1, 3)
    const id = exerciseId(rng, 'simetria', difficulty)
    const symmetric = rng.pick(SYMMETRIC_SHAPES)
    const asymmetric = rng.pick(ASYMMETRIC_LOOKING)

    const options = rng.shuffle([symmetric, asymmetric])
    const choices: Choice[] = options.map((e, i) => ({ id: `choice-${i}`, label: e }))
    const correctId = choices[options.indexOf(symmetric)].id

    return {
      id,
      subskill: 'simetria',
      difficulty,
      prompt: {
        text: `¿Cuál de estas dos figuras se ve igual si la reflejas como en un espejo?`,
        visual: { kind: 'none' },
      },
      answer: { kind: 'choice', correctId },
      choices,
      strategies: [
        {
          id: 'imaginar-el-espejo',
          name: 'Imaginar un espejo en el medio',
          steps: [{ text: 'Imagina una línea en el medio: si las dos mitades son iguales, es simétrica.' }],
        },
      ],
      audioText: `Mira las dos figuras. ¿Cuál se ve igual como en un espejo? Tócala.`,
      microlesson: 'Algo es simétrico cuando sus dos mitades son exactamente iguales, como un espejo.',
    }
  },
}
