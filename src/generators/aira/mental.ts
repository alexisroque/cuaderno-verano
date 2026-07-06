import type { Rng } from '../../lib/rng'
import type { ChapterFlavorLite, Exercise, Generator } from '../../types/exercise'
import { clampDifficulty, exerciseId } from '../framework'
import {
  buildCompensationAddStrategy,
  buildCompensationSubStrategy,
  buildDiv10Strategy,
  buildDoublesStrategy,
  buildHalvesStrategy,
  buildTimes10Strategy,
  buildTimes100Strategy,
} from './mentalStrategies'

type Kind = 'compensation-add' | 'compensation-sub' | 'doubles' | 'halves' | 'times10' | 'times100' | 'div10'

const KINDS: Kind[] = ['compensation-add', 'compensation-sub', 'doubles', 'halves', 'times10', 'times100', 'div10']

/**
 * Magnitude cap per difficulty (catalog range [1, 5]): d1 < 50, d2 < 100,
 * d3 < 500, d4 < 1000. d5 reuses d4's range (no further magnitude increase)
 * — documented judgment call: the spec leaves d5's exact bound
 * underspecified ("d5 can extend d4's range or reuse it"), and mental-math
 * facts stop feeling like "mental" calculation much past four digits for
 * this age group, so d5 keeps d4's cap rather than growing it further.
 */
const MAGNITUDE_CAP: Record<number, number> = {
  1: 50,
  2: 100,
  3: 500,
  4: 1000,
  5: 1000,
}

function rollOperandForCap(rng: Rng, cap: number): number {
  return rng.int(10, cap - 1)
}

function buildExerciseForKind(rng: Rng, kind: Kind, cap: number): { prompt: string; value: number; strategy: ReturnType<typeof buildCompensationAddStrategy> } {
  switch (kind) {
    case 'compensation-add': {
      const a = rollOperandForCap(rng, cap)
      const b = rng.int(10, Math.min(cap - 1, 90))
      const value = a + b
      return { prompt: `¿Cuánto es ${a} + ${b}?`, value, strategy: buildCompensationAddStrategy(a, b) }
    }
    case 'compensation-sub': {
      const b = rng.int(10, Math.min(cap - 1, 90))
      const a = rng.int(b + 1, cap - 1)
      const value = a - b
      return { prompt: `¿Cuánto es ${a} − ${b}?`, value, strategy: buildCompensationSubStrategy(a, b) }
    }
    case 'doubles': {
      const n = rollOperandForCap(rng, cap)
      const value = n * 2
      return { prompt: `¿Cuál es el doble de ${n}?`, value, strategy: buildDoublesStrategy(n) }
    }
    case 'halves': {
      // Only even numbers, so halving stays exact.
      let n = rollOperandForCap(rng, cap)
      if (n % 2 !== 0) n = n - 1 < 10 ? n + 1 : n - 1
      const value = n / 2
      return { prompt: `¿Cuál es la mitad de ${n}?`, value, strategy: buildHalvesStrategy(n) }
    }
    case 'times10': {
      const n = rollOperandForCap(rng, cap)
      const value = n * 10
      return { prompt: `¿Cuánto es ${n} × 10?`, value, strategy: buildTimes10Strategy(n) }
    }
    case 'times100': {
      const n = rollOperandForCap(rng, cap)
      const value = n * 100
      return { prompt: `¿Cuánto es ${n} × 100?`, value, strategy: buildTimes100Strategy(n) }
    }
    case 'div10': {
      // Multiple of 10, so dividing stays exact.
      const base = rollOperandForCap(rng, cap)
      const n = base - (base % 10) || 10
      const value = n / 10
      return { prompt: `¿Cuánto es ${n} ÷ 10?`, value, strategy: buildDiv10Strategy(n) }
    }
  }
}

export const mentalGenerator: Generator = {
  subskill: 'mental',
  generate(rng, requestedDifficulty, _flavor: ChapterFlavorLite): Exercise {
    // exerciseId must be the FIRST draw off rng for determinism.
    const id = exerciseId(rng, 'mental', requestedDifficulty)
    const difficulty = clampDifficulty(requestedDifficulty, 1, 5)
    const cap = MAGNITUDE_CAP[difficulty]

    const kind = rng.pick(KINDS)
    const { prompt, value, strategy } = buildExerciseForKind(rng, kind, cap)

    return {
      id,
      subskill: 'mental',
      difficulty,
      prompt: { text: prompt },
      answer: { kind: 'number', value },
      strategies: [strategy],
      microlesson: 'El cálculo mental te ayuda a resolver cuentas rápido, sin papel ni calculadora.',
    }
  },
}
