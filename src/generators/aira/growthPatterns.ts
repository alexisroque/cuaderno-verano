import type { Rng } from '../../lib/rng'
import type { ChapterFlavorLite, Exercise, Generator, Strategy } from '../../types/exercise'
import { clampDifficulty, exerciseId } from '../framework'

type PatternKind = 'arithmetic' | 'doubling' | 'triangular' | 'growing-step'

/**
 * Difficulty -> pattern kind mapping (catalog range [2, 5]), a documented
 * judgment call since the spec leaves the exact mapping a little open:
 * - d2: arithmetic, small constant step (+2..+5) — the simplest pattern.
 * - d3: doubling (×2 each step) — a bigger conceptual jump than a constant
 *   step, but still a single simple rule.
 * - d4: triangular numbers (classic 1,3,6,10,15,... cumulative sums) —
 *   requires noticing the step itself grows by a constant amount.
 * - d5: growing-step ("+2, +3, +4, ..." — differences themselves form an
 *   arithmetic sequence with a variable start) — the most demanding
 *   pattern, since the step size changes every time by a non-fixed amount.
 */
function pickKindForDifficulty(difficulty: number): PatternKind {
  if (difficulty <= 2) return 'arithmetic'
  if (difficulty === 3) return 'doubling'
  if (difficulty === 4) return 'triangular'
  return 'growing-step'
}

interface Built {
  terms: number[]
  nextTerm: number
  strategy: Strategy
}

function buildArithmetic(rng: Rng): Built {
  const step = rng.int(2, 5)
  const start = rng.int(1, 10)
  const terms = [start, start + step, start + 2 * step, start + 3 * step]
  const nextTerm = terms[terms.length - 1] + step

  return {
    terms,
    nextTerm,
    strategy: {
      id: 'diferencias-constantes',
      name: 'Diferencias entre términos',
      steps: [
        { text: `Las diferencias son +${step}, +${step}, +${step} → el siguiente salto también es +${step}.` },
        { text: `${terms[terms.length - 1]} + ${step} = ${nextTerm}` },
      ],
    },
  }
}

function buildDoubling(rng: Rng): Built {
  const start = rng.int(1, 5)
  const terms = [start, start * 2, start * 4, start * 8]
  const nextTerm = terms[terms.length - 1] * 2

  return {
    terms,
    nextTerm,
    strategy: {
      id: 'duplicar',
      name: 'Duplicar cada vez',
      steps: [
        { text: `Cada término es el doble del anterior: ×2 cada vez.` },
        { text: `${terms[terms.length - 1]} × 2 = ${nextTerm}` },
      ],
    },
  }
}

/** Classic triangular numbers: 1, 3, 6, 10, 15, ... (cumulative sums of 1, 2, 3, 4, 5, ...). Always starts at the classic sequence's beginning for consistency across seeds/difficulties. */
function buildTriangular(): Built {
  const terms = [1, 3, 6, 10, 15]
  const nextTerm = 21 // 15 + 6

  return {
    terms,
    nextTerm,
    strategy: {
      id: 'numeros-triangulares',
      name: 'Números triangulares',
      steps: [
        { text: `Las diferencias son +2, +3, +4, +5 → el siguiente salto es +6.` },
        { text: `${terms[terms.length - 1]} + 6 = ${nextTerm}` },
      ],
    },
  }
}

/** "Growing-step": differences themselves grow by 1 each time (+2, +3, +4, ...), with a rolled starting difference so it varies across seeds. */
function buildGrowingStep(rng: Rng): Built {
  const start = rng.int(1, 8)
  const firstDiff = rng.int(2, 4)
  const diffs = [firstDiff, firstDiff + 1, firstDiff + 2, firstDiff + 3]
  const terms = [start]
  for (const d of diffs) {
    terms.push(terms[terms.length - 1] + d)
  }
  const nextDiff = diffs[diffs.length - 1] + 1
  const nextTerm = terms[terms.length - 1] + nextDiff

  return {
    terms,
    nextTerm,
    strategy: {
      id: 'salto-creciente',
      name: 'El salto crece cada vez',
      steps: [
        { text: `Las diferencias son +${diffs.join(', +')} → el siguiente salto es +${nextDiff}.` },
        { text: `${terms[terms.length - 1]} + ${nextDiff} = ${nextTerm}` },
      ],
    },
  }
}

function buildPrompt(terms: number[]): string {
  return `Aquí tienes una secuencia: ${terms.join(', ')}, ... ¿Cuál es el siguiente número?`
}

export const patronesCrecimientoGenerator: Generator = {
  subskill: 'patrones-crecimiento',
  generate(rng, requestedDifficulty, _flavor: ChapterFlavorLite): Exercise {
    // exerciseId must be the FIRST draw off rng for determinism.
    const id = exerciseId(rng, 'patrones-crecimiento', requestedDifficulty)
    const difficulty = clampDifficulty(requestedDifficulty, 2, 5)
    const kind = pickKindForDifficulty(difficulty)

    const built =
      kind === 'arithmetic'
        ? buildArithmetic(rng)
        : kind === 'doubling'
          ? buildDoubling(rng)
          : kind === 'triangular'
            ? buildTriangular()
            : buildGrowingStep(rng)

    return {
      id,
      subskill: 'patrones-crecimiento',
      difficulty,
      prompt: { text: buildPrompt(built.terms) },
      answer: { kind: 'number', value: built.nextTerm },
      strategies: [built.strategy],
      microlesson: 'En una secuencia, fíjate en cómo cambian los números de uno al siguiente: eso te da la regla.',
    }
  },
}
