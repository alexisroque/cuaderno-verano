import type { Rng } from '../../lib/rng'
import type { Choice, Generator, Stroke } from '../../types/exercise'
import { strokesFor, isMirrorProne } from '../../lib/strokes'
import { clampDifficulty, exerciseId } from '../framework'

const UPPER = 'ABCDEFGHIJKLMNOPQRSTUVWXYZÑ'.split('')
const LOWER = 'abcdefghijklmnopqrstuvwxyzñ'.split('')
const DIGITS = '0123456789'.split('')

/**
 * Glyph pool available per difficulty (catalog range [1, 3]) for `letras`:
 * uppercase only at d1 (easiest to tell apart), uppercase+lowercase at d2,
 * and the full pool at d3 — where `pickGlyphOfTheDay` then biases towards
 * mirror-prone glyphs regardless of pool.
 */
const LETRAS_POOL: Record<number, string[]> = {
  1: UPPER,
  2: [...UPPER, ...LOWER],
  3: [...UPPER, ...LOWER],
}

/** Digit pool per difficulty (catalog range [1, 3]) for `numeros-trazo`. */
const NUMEROS_POOL: Record<number, string[]> = {
  1: ['0', '1', '2', '3', '4', '5'],
  2: DIGITS,
  3: DIGITS,
}

/**
 * Picks a "glyph of the day" from `pool`, seed-rotated by `rng` with a mild
 * bias towards mirror-prone glyphs. The generator is stateless (no per-kid
 * mastery tracking here — that's the scheduler's job upstream), so this
 * can't truly "prefer unmastered" glyphs; instead it rolls the dice twice
 * when the pool has mirror-prone candidates and keeps a mirror-prone hit
 * about 60% of the time, which is the practical stand-in the task
 * describes ("seed-rotate with mild bias to mirror-prone").
 */
function pickGlyphOfTheDay(rng: Rng, pool: string[]): string {
  const mirrorProne = pool.filter(isMirrorProne)
  if (mirrorProne.length > 0 && rng.chance(0.6)) {
    return rng.pick(mirrorProne)
  }
  return rng.pick(pool)
}

/** Horizontally mirrors a stroke within its 0..1 box (x -> 1 - x), producing the "wrong way round" rendering used by `espejo`. */
function mirrorStroke(stroke: Stroke): Stroke {
  return stroke.map((p) => ({ x: 1 - p.x, y: p.y }))
}

function buildTracingExercise(rng: Rng, subskill: 'letras' | 'numeros-trazo', difficulty: number, glyph: string) {
  const id = exerciseId(rng, subskill, difficulty)
  const strokes = strokesFor(glyph)
  const isLetter = subskill === 'letras'

  return {
    id,
    subskill,
    difficulty,
    prompt: {
      text: `Vamos a escribir ${isLetter ? 'la letra' : 'el número'} ${glyph}. Sigue la flecha con el dedo.`,
      visual: { kind: 'none' as const },
    },
    answer: { kind: 'text' as const, value: glyph },
    trace: { glyph, strokes },
    strategies: [
      {
        id: 'seguir-el-trazo',
        name: 'Seguir el trazo con el dedo',
        steps: [{ text: `Empieza donde está el punto y sigue la flecha hasta dibujar ${isLetter ? 'la letra' : 'el número'} ${glyph}.` }],
      },
    ],
    audioText: `Vamos a escribir ${isLetter ? 'la letra' : 'el número'} ${glyph}. Sigue la flecha con el dedo, despacio.`,
    microlesson: isLetter
      ? 'Practicar el trazo de las letras te prepara para escribir palabras.'
      : 'Practicar el trazo de los números te ayuda a escribirlos bien siempre.',
  }
}

export const letrasGenerator: Generator = {
  subskill: 'letras',
  generate(rng, requestedDifficulty, _flavor) {
    const difficulty = clampDifficulty(requestedDifficulty, 1, 3)
    const pool = LETRAS_POOL[difficulty]
    const glyph = pickGlyphOfTheDay(rng, pool)
    return buildTracingExercise(rng, 'letras', difficulty, glyph)
  },
}

export const numerosTrazoGenerator: Generator = {
  subskill: 'numeros-trazo',
  generate(rng, requestedDifficulty, _flavor) {
    const difficulty = clampDifficulty(requestedDifficulty, 1, 3)
    const pool = NUMEROS_POOL[difficulty]
    const glyph = pickGlyphOfTheDay(rng, pool)
    return buildTracingExercise(rng, 'numeros-trazo', difficulty, glyph)
  },
}

/**
 * Espejo glyph pool per difficulty (catalog range [1, 3]): mirror-prone
 * digits are the clearest reversal case for a 4-5yo, so they anchor every
 * difficulty; mirror-prone letters join at d3 for extra challenge. Every
 * entry here is deliberately drawn from `MIRROR_PRONE_GLYPHS` (see
 * `strokeData.ts`) — this generator only exists to drill the reversal
 * problem, so quizzing on a glyph nobody actually flips (like "2") would
 * be off-target.
 */
const ESPEJO_POOL: Record<number, string[]> = {
  1: ['3', '5', '7', '9'],
  2: ['3', '5', '7', '9'],
  3: ['3', '5', '7', '9', 'S', 'Z', 'J'],
}

export const espejoGenerator: Generator = {
  subskill: 'espejo',
  generate(rng, requestedDifficulty, _flavor) {
    const difficulty = clampDifficulty(requestedDifficulty, 1, 3)
    const id = exerciseId(rng, 'espejo', difficulty)
    const pool = ESPEJO_POOL[difficulty]
    const glyph = rng.pick(pool)
    const strokes = strokesFor(glyph)
    const mirrored = strokes.map(mirrorStroke)

    // "correct" is always the true (non-mirrored) orientation; which side (choice-0/choice-1) it lands on is randomized.
    // UI MUST render mirror-pair options from strokes (prompt.visual.options[].strokes / mirrorPairOptions below), NEVER
    // from choice.label — labels like "3 (espejo)" spell out which option is mirrored and would leak the answer to a
    // reading-capable UI (or to anyone glancing at the choices). The label text exists only for non-visual consumers
    // (analytics, tests, a11y text alternatives that are read AFTER answering) and must never be shown before grading.
    const correctFirst = rng.chance(0.5)
    const choices: Choice[] = correctFirst
      ? [{ id: 'correct', label: glyph }, { id: 'mirrored', label: `${glyph} (espejo)` }]
      : [{ id: 'mirrored', label: `${glyph} (espejo)` }, { id: 'correct', label: glyph }]
    const mirrorPairOptions = correctFirst
      ? [{ choiceId: 'correct', strokes }, { choiceId: 'mirrored', strokes: mirrored }]
      : [{ choiceId: 'mirrored', strokes: mirrored }, { choiceId: 'correct', strokes }]

    return {
      id,
      subskill: 'espejo',
      difficulty,
      prompt: {
        text: `Aquí hay dos formas de escribir ${glyph}. ¿Cuál está escrita del modo correcto, no al revés?`,
        visual: { kind: 'mirror-pair', options: mirrorPairOptions },
      },
      answer: { kind: 'choice', correctId: 'correct' },
      choices,
      trace: { glyph, strokes },
      strategies: [
        {
          id: 'comparar-con-el-modelo',
          name: 'Comparar con el modelo correcto',
          steps: [{ text: `Fíjate hacia qué lado mira ${glyph}: una está al revés, como en un espejo.` }],
        },
      ],
      audioText: `Aquí hay dos formas de ${glyph}. Una está al revés, como en un espejo. Toca la que está escrita del modo correcto.`,
      microlesson: 'Algunos números y letras se pueden escribir al revés por error: fíjate bien hacia qué lado miran.',
    }
  },
}

export { mirrorStroke }
