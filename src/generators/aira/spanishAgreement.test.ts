import { describe, expect, it } from 'vitest'
import './index'
import '../leo/index'
import { createRng } from '../../lib/rng'
import { listRegistered, getGenerator } from '../framework'
import { REAL_CHAPTER_FLAVORS, DEFAULT_SEEDS } from '../testUtils'

/**
 * Repo-wide Spanish-agreement sweep: scans every piece of Spanish prose a
 * generator can produce (prompt text, strategy step text, choice labels)
 * across every registered generator x 200 seeds x every real chapter, for
 * the known bad patterns this task fixed (gender/number mismatches, stale
 * parentheticals, double spaces, etc.). Cheap and repo-wide by design, so a
 * regression in ANY generator — not just the ones touched by this task —
 * gets caught here. Imports both `aira/index` and `leo/index` so
 * `listRegistered()` actually covers every generator family, not just Aira.
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
  { name: '"Cuántas ... escondidos" (fem. question word + masc. adjective)', pattern: /\bCuántas [^?]*\bescondidos\b/ },
  { name: '"Cuántos ... escondidas" (masc. question word + fem. adjective)', pattern: /\bCuántos [^?]*\bescondidas\b/ },
  // Naive `${noun}s` pluralization spoken to a non-reading child (Leo's
  // emoji-noun pool): nouns ending in -z need -ces (pez -> peces, not
  // "pezs"), and nouns ending in an accented vowel/tilde-bearing consonant
  // (orangután, león) need the accent dropped and -es added, not a bare -s.
  { name: 'naive plural: word+zs (should be -ces, e.g. "pezs" -> "peces")', pattern: /\b\w*zs\b/i },
  { name: 'naive plural: word+áns/óns/énes-typo (accented vowel/consonant + bare s, e.g. "orangutáns", "leóns")', pattern: /\b\w*[áéíóú][a-zñ]?ns\b/i },
  // Curated list of every known-bad naive `${noun}s` plural for the current
  // Leo noun pool (emoji.ts) — belt-and-braces on top of the regexes above,
  // so a regression is caught even if a future noun doesn't match the
  // general patterns above.
  { name: 'known-bad naive plural from the Leo noun pool', pattern: /\b(pezs|orangutáns|leóns|pez payasos)\b/ },
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
  const seeds = DEFAULT_SEEDS

  it('has generators registered to sweep', () => {
    expect(subskills.length).toBeGreaterThan(0)
  })

  // Some subskills (e.g. mult-1cifra) build a heavier exercise per seed than
  // others; 200 seeds x every real chapter x this repo-wide pattern sweep
  // occasionally pushes a single case past vitest's default 5s test timeout
  // under CPU contention, causing an intermittent flake. Raise the timeout
  // for these cases rather than reducing seed count, so coverage stays the
  // same and only the (unrealistic) 5s budget changes.
  it.each(subskills)(
    '%s: no known bad Spanish pattern across %d seeds x every real chapter',
    (subskill) => {
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
    },
    20000,
  )
})
