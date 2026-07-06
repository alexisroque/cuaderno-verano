import { describe, expect, it } from 'vitest'
import './index'
import { createRng } from '../../lib/rng'
import { listRegistered, getGenerator } from '../framework'
import { REAL_CHAPTER_FLAVORS } from '../testUtils'

/**
 * Repo-wide Spanish-agreement sweep: scans every piece of Spanish prose a
 * generator can produce (prompt text, strategy step text, choice labels)
 * across every registered generator x 200 seeds x every real chapter, for
 * the known bad patterns this task fixed (gender/number mismatches, stale
 * parentheticals, double spaces, etc.). Cheap and repo-wide by design, so a
 * regression in ANY generator — not just the ones touched by this task —
 * gets caught here.
 */
const BAD_PATTERNS: { name: string; pattern: RegExp }[] = [
  { name: 'un + feminine noun (e.g. "un entrada")', pattern: /\bun (entrada|postal|ración|botella|caja|imán)\b/i },
  { name: 'una + masculine noun (e.g. "una imán")', pattern: /\buna (billete|imán|trayecto|barco|tren)\b/i },
  { name: '"Cuántos cajas" (masc. question word + fem. noun)', pattern: /\bCuántos (cajas|pegatinas|fotos|cartas|canicas|pulseras|postales|conchas|entradas)\b/ },
  { name: '"Cuántas grupos/botes/caramelos" (fem. question word + masc. noun)', pattern: /\bCuántas (grupos|botes|caramelos|pinchos)\b/ },
  { name: 'double "En En"', pattern: /\bEn En\b/ },
  { name: 'double space', pattern: / {2,}/ },
  { name: 'stray "undefined"', pattern: /undefined/ },
  { name: 'digit glued to a letter (e.g. "3entradas")', pattern: /\d[a-zA-ZÁÉÍÓÚÑáéíóúñ]/ },
  // Excludes a legitimate ellipsis ("5, 10, 20, ... ¿Cuál…") used by
  // patrones-crecimiento to show a continuing sequence — that's a deliberate
  // "..." token, not a stray space-before-punctuation typo.
  { name: 'space before punctuation', pattern: / [.,](?!\.\.)/ },
  { name: 'leftover parenthetical euro note', pattern: /\(aquí lo contáis todo en euros\)/ },
  { name: '"el/un" + trayecto departing (trayecto cannot "salir")', pattern: /trayecto (?:sale|salió|saldrá) a las/i },
]

/** Every piece of Spanish prose a generator can surface, for one exercise. */
function allProseIn(exercise: { prompt: { text: string }; strategies: { steps: { text: string }[] }[]; choices?: { label: string }[] }): string[] {
  const texts = [exercise.prompt.text]
  for (const strategy of exercise.strategies) {
    for (const step of strategy.steps) {
      texts.push(step.text)
    }
  }
  if (exercise.choices) {
    for (const choice of exercise.choices) {
      texts.push(choice.label)
    }
  }
  return texts
}

describe('Spanish-agreement sweep (repo-wide)', () => {
  const subskills = listRegistered()
  const seeds = 200

  it('has generators registered to sweep', () => {
    expect(subskills.length).toBeGreaterThan(0)
  })

  it.each(subskills)('%s: no known bad Spanish pattern across %d seeds x every real chapter', (subskill) => {
    const generator = getGenerator(subskill)!

    for (const flavor of REAL_CHAPTER_FLAVORS) {
      for (let i = 0; i < seeds; i++) {
        const seed = `spanish-sweep:${subskill}:${flavor.placeName}:${i}`
        const rng = createRng(seed)
        // A mid-range difficulty; clampDifficulty in every generator makes
        // this safe regardless of that subskill's actual catalog range.
        const exercise = generator.generate(rng, 3, flavor)

        for (const text of allProseIn(exercise)) {
          for (const { name, pattern } of BAD_PATTERNS) {
            expect(pattern.test(text), `[${subskill}] "${name}" matched in "${text}" (seed ${seed})`).toBe(false)
          }
        }
      }
    }
  })
})
