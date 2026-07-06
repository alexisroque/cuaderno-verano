import type { Rng } from '../../lib/rng'
import type { Exercise, Generator } from '../../types/exercise'
import { clampDifficulty, exerciseId } from '../framework'
import { buildDotGridSquareStrategy, buildInverseSquareStrategy } from './squaresStrategies'

/** n ranges per difficulty (catalog range [3, 5]): small squares first, up to 12² at the top. */
const N_RANGES: Record<number, [number, number]> = {
  3: [2, 6],
  4: [4, 9],
  5: [6, 12],
}

export const cuadradosGenerator: Generator = {
  subskill: 'cuadrados',
  generate(rng: Rng, requestedDifficulty: number, _flavor): Exercise {
    // exerciseId must be the FIRST draw off rng for determinism; clamping
    // first is safe since clampDifficulty never touches rng.
    const difficulty = clampDifficulty(requestedDifficulty, 3, 5)
    const id = exerciseId(rng, 'cuadrados', difficulty)

    const [min, max] = N_RANGES[difficulty]
    const n = rng.int(min, max)
    const square = n * n
    const isForward = rng.chance(0.6)

    if (isForward) {
      // Forward: ask for n², show the dot-grid strategy.
      return {
        id,
        subskill: 'cuadrados',
        difficulty,
        prompt: { text: `¿Cuánto es ${n} al cuadrado (${n}²)?`, visual: { kind: 'dot-grid', n } },
        answer: { kind: 'number', value: square },
        strategies: [buildDotGridSquareStrategy(n)],
        microlesson: 'Un número al cuadrado es ese número multiplicado por sí mismo: se puede dibujar como una rejilla cuadrada de puntos.',
        challenge: true,
      }
    }

    // Reverse: give the perfect square, ask for n (the square root).
    return {
      id,
      subskill: 'cuadrados',
      difficulty,
      prompt: { text: `¿Qué número multiplicado por sí mismo da ${square}?` },
      answer: { kind: 'number', value: n },
      strategies: [buildInverseSquareStrategy(n)],
      microlesson: 'Buscar la raíz cuadrada es al revés que elevar al cuadrado: buscamos qué número, multiplicado por sí mismo, da el resultado.',
      challenge: true,
    }
  },
}
