import type { Rng } from '../../lib/rng'
import type { ChapterFlavorLite, Exercise, Generator } from '../../types/exercise'
import { clampDifficulty, exerciseId } from '../framework'
import type { ProblemContext, ProblemTemplate } from './problemTemplates'
import { DINERO_TEMPLATES } from './problemTemplates.dinero'
import { TIEMPO_TEMPLATES } from './problemTemplates.tiempo'
import { MEDIDA_TEMPLATES } from './problemTemplates.medida'
import { REPARTO_TEMPLATES } from './problemTemplates.reparto'

/** The full template pool, assembled once from every context module. */
export const ALL_TEMPLATES: ProblemTemplate[] = [
  ...DINERO_TEMPLATES,
  ...TIEMPO_TEMPLATES,
  ...MEDIDA_TEMPLATES,
  ...REPARTO_TEMPLATES,
]

/** The problemas subskills this one generator serves. */
export type ProblemasSubskill = '1-paso' | '2-pasos' | 'dato-trampa' | 'dinero' | 'tiempo' | 'medida'

/** Per-subskill difficulty bounds, mirroring the catalog (skills.ts). */
const SUBSKILL_RANGE: Record<ProblemasSubskill, [number, number]> = {
  '1-paso': [1, 4],
  '2-pasos': [2, 5],
  'dato-trampa': [2, 5],
  dinero: [1, 4],
  tiempo: [1, 4],
  medida: [1, 4],
}

/**
 * Selects the candidate templates for a subskill, before difficulty
 * filtering:
 * - `1-paso` / `2-pasos`: any context, filtered by step count.
 * - `dinero` / `tiempo` / `medida`: filtered by that context.
 * - `dato-trampa`: only templates that support a trap (any context/steps).
 */
function candidatesForSubskill(subskill: ProblemasSubskill): ProblemTemplate[] {
  switch (subskill) {
    case '1-paso':
      return ALL_TEMPLATES.filter((tpl) => tpl.steps === 1)
    case '2-pasos':
      return ALL_TEMPLATES.filter((tpl) => tpl.steps === 2)
    case 'dato-trampa':
      return ALL_TEMPLATES.filter((tpl) => tpl.supportsTrap)
    case 'dinero':
    case 'tiempo':
    case 'medida':
      return ALL_TEMPLATES.filter((tpl) => tpl.contexts.includes(subskill as ProblemContext))
  }
}

/** Narrows candidates to those whose difficultyRange covers `difficulty`, falling back to all candidates if none match. */
function withinDifficulty(candidates: ProblemTemplate[], difficulty: number): ProblemTemplate[] {
  const fit = candidates.filter((tpl) => difficulty >= tpl.difficultyRange[0] && difficulty <= tpl.difficultyRange[1])
  return fit.length > 0 ? fit : candidates
}

/**
 * Decides whether to inject a trap for this run:
 * - `dato-trampa`: always (100%).
 * - anything else: only at d >= 3, ~30% of the time, and only if the chosen
 *   template supports it.
 */
function shouldInjectTrap(rng: Rng, subskill: ProblemasSubskill, difficulty: number, template: ProblemTemplate): boolean {
  if (!template.supportsTrap) return false
  if (subskill === 'dato-trampa') return true
  if (difficulty >= 3) return rng.chance(0.3)
  return false
}

/** Builds one word-problem generator bound to a specific problemas subskill. */
function makeGenerator(subskill: ProblemasSubskill): Generator {
  const [min, max] = SUBSKILL_RANGE[subskill]
  return {
    subskill,
    generate(rng, requestedDifficulty, flavor: ChapterFlavorLite): Exercise {
      // exerciseId must be the FIRST draw off rng for determinism.
      const id = exerciseId(rng, subskill, requestedDifficulty)
      const difficulty = clampDifficulty(requestedDifficulty, min, max)

      const candidates = withinDifficulty(candidatesForSubskill(subskill), difficulty)
      const template = rng.pick(candidates)
      const injectTrap = shouldInjectTrap(rng, subskill, difficulty, template)
      const bound = template.bind(rng, difficulty, flavor, { injectTrap })

      return {
        id,
        subskill,
        difficulty,
        prompt: { text: bound.tokens.join(' ') },
        answer: { kind: 'number', value: bound.answer },
        dataHighlight: {
          tokens: bound.tokens,
          relevantIndices: bound.relevantIndices,
          ...(bound.trapIndex !== undefined ? { trapIndex: bound.trapIndex } : {}),
        },
        strategies: bound.strategies,
        microlesson: bound.microlesson,
      }
    },
  }
}

export const unPasoGenerator = makeGenerator('1-paso')
export const dosPasosGenerator = makeGenerator('2-pasos')
export const datoTrampaGenerator = makeGenerator('dato-trampa')
export const dineroGenerator = makeGenerator('dinero')
export const tiempoGenerator = makeGenerator('tiempo')
export const medidaGenerator = makeGenerator('medida')

/** All six word-problem generators, for bulk registration. */
export const WORD_PROBLEM_GENERATORS: Generator[] = [
  unPasoGenerator,
  dosPasosGenerator,
  datoTrampaGenerator,
  dineroGenerator,
  tiempoGenerator,
  medidaGenerator,
]
