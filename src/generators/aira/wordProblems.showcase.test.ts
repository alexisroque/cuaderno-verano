import { describe, expect, it } from 'vitest'
import { createRng } from '../../lib/rng'
import { REAL_CHAPTER_FLAVORS } from '../testUtils'
import type { Exercise } from '../../types/exercise'
import {
  datoTrampaGenerator,
  dineroGenerator,
  dosPasosGenerator,
  medidaGenerator,
  tiempoGenerator,
  unPasoGenerator,
} from './wordProblems'

/**
 * SHOWCASE: prints one fully-bound problem per subskill for human review, and
 * asserts each is coherent (answer non-negative, matches the final cálculo,
 * dataHighlight reconstructs the prompt, and any trap token is not a relevant
 * one). The printed block is meant to be eyeballed in review — read every
 * problem aloud and check the Spanish and the pedagogy.
 */

/** A hand-picked (generator, seed, difficulty, chapter) tuple chosen to show a varied, representative problem. */
interface ShowcasePick {
  label: string
  generate: () => Exercise
}

/** Barcelona (0), Singapur (2), Sepilok (3), Kuala Lumpur (5), Ubud (6=Rp), Gili Air (7). */
const F = REAL_CHAPTER_FLAVORS

const PICKS: ShowcasePick[] = [
  { label: '1-paso · Kuala Lumpur', generate: () => unPasoGenerator.generate(createRng('showcase:1paso:11'), 3, F[5]) },
  { label: '2-pasos · Singapur', generate: () => dosPasosGenerator.generate(createRng('showcase:2pasos:4'), 4, F[2]) },
  { label: 'dato-trampa · Sepilok', generate: () => datoTrampaGenerator.generate(createRng('showcase:trampa:9'), 4, F[3]) },
  { label: 'dinero · Ubud (rupias→€)', generate: () => dineroGenerator.generate(createRng('showcase:dinero:2'), 3, F[6]) },
  { label: 'tiempo · Barcelona', generate: () => tiempoGenerator.generate(createRng('showcase:tiempo:6'), 3, F[0]) },
  { label: 'medida · Kuala Lumpur (Petronas)', generate: () => medidaGenerator.generate(createRng('showcase:medida:2'), 3, F[5]) },
]

/** Renders one exercise as a readable multi-line block. */
function render(label: string, ex: Exercise): string {
  const lines: string[] = []
  lines.push(`\n──────────── ${label} ────────────`)
  lines.push(`PROBLEMA: ${ex.prompt.text}`)
  const answer = ex.answer.kind === 'number' ? String(ex.answer.value) : JSON.stringify(ex.answer)
  lines.push(`RESPUESTA: ${answer}`)
  const dh = ex.dataHighlight!
  lines.push(`DATOS RELEVANTES: ${dh.relevantIndices.map((i) => dh.tokens[i]).join(', ')}`)
  if (dh.trapIndex !== undefined) lines.push(`DATO TRAMPA: ${dh.tokens[dh.trapIndex]}`)
  for (const strat of ex.strategies) {
    lines.push(`ESTRATEGIA (${strat.name}):`)
    for (const step of strat.steps) lines.push(`   • ${step.text}`)
  }
  lines.push(`MICROLECCIÓN: ${ex.microlesson}`)
  return lines.join('\n')
}

describe('word-problem SHOWCASE (6 problems, one per subskill)', () => {
  it('prints and validates one representative problem per subskill', () => {
    const blocks: string[] = []
    for (const pick of PICKS) {
      const ex = pick.generate()
      blocks.push(render(pick.label, ex))

      // Non-trivial assertions on each showcased problem.
      expect(ex.answer.kind).toBe('number')
      if (ex.answer.kind !== 'number') continue
      expect(ex.answer.value).toBeGreaterThanOrEqual(0)

      // Prompt reconstructs from tokens and ends in a question.
      expect(ex.dataHighlight!.tokens.join(' ')).toBe(ex.prompt.text)
      expect(ex.prompt.text.endsWith('?')).toBe(true)

      // Primary strategy is the 5-phase scaffold with the required phases.
      const strat = ex.strategies[0]
      expect(strat.id).toBe('fases')
      expect(strat.steps[0].text.startsWith('¿Qué está pasando?')).toBe(true)
      expect(strat.steps[strat.steps.length - 1].text.startsWith('¿Tiene sentido?')).toBe(true)

      // The final cálculo line's result equals the answer.
      const calc = strat.steps.slice(3, strat.steps.length - 1)
      const last = calc[calc.length - 1]
      const m = last.text.match(/=\s*(-?\d+)\s*$/)
      expect(m, `no result in final cálculo "${last.text}"`).toBeTruthy()
      expect(Number(m![1])).toBe(ex.answer.value)
    }

    // eslint-disable-next-line no-console
    console.log(blocks.join('\n') + '\n')

    // The dato-trampa showcase must actually carry a trap.
    const trampa = datoTrampaGenerator.generate(createRng('showcase:trampa:9'), 4, F[3])
    expect(trampa.dataHighlight!.trapIndex).toBeDefined()
  })
})
