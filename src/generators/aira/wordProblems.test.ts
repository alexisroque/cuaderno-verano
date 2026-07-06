import { describe, expect, it } from 'vitest'
import { createRng } from '../../lib/rng'
import { DEFAULT_TEST_FLAVOR, propertyTestWithDeterminism, REAL_CHAPTER_FLAVORS } from '../testUtils'
import type { Exercise, Strategy } from '../../types/exercise'
import {
  ALL_TEMPLATES,
  datoTrampaGenerator,
  dineroGenerator,
  dosPasosGenerator,
  medidaGenerator,
  tiempoGenerator,
  unPasoGenerator,
  WORD_PROBLEM_GENERATORS,
  type ProblemasSubskill,
} from './wordProblems'

// ---------------------------------------------------------------------------
// Token / arithmetic parsing helpers (independent of the generator)
// ---------------------------------------------------------------------------

/**
 * Parses a data token into the number it represents, understanding both plain
 * integers ("40", "40." with trailing punctuation, "50 S$" never happens
 * because the symbol is a separate token) and clock strings ("9:30" → 570
 * minutes-since-midnight). Returns undefined if the token is not numeric.
 */
function parseTokenNumber(token: string): number | undefined {
  const clean = token.replace(/[.,;]+$/, '')
  const clockMatch = clean.match(/^(\d{1,2}):(\d{2})$/)
  if (clockMatch) {
    return Number(clockMatch[1]) * 60 + Number(clockMatch[2])
  }
  if (/^\d+$/.test(clean)) return Number(clean)
  return undefined
}

/**
 * The cálculo steps of the primary 5-phase strategy: everything between the
 * plan step (index 2) and the final comprobar step. entender/datos/plan are
 * the first three steps; comprobar is always the last — the middle steps are
 * the pure arithmetic "N op M = P" lines.
 */
function calculoSteps(strategy: Strategy): Strategy['steps'] {
  return strategy.steps.slice(3, strategy.steps.length - 1)
}

/** Every number appearing in the cálculo steps (operands and results). */
function numbersInCalculo(strategy: Strategy): Set<number> {
  const nums = new Set<number>()
  const re = /-?\d+/g
  for (const step of calculoSteps(strategy)) {
    for (const m of step.text.matchAll(re)) nums.add(Number(m[0]))
  }
  return nums
}

/** The operands of the FIRST cálculo line — the input data the child must actually use. */
function firstLineOperands(strategy: Strategy): number[] {
  const calc = calculoSteps(strategy)
  if (calc.length === 0) return []
  const m = calc[0].text.match(/(-?\d+)\s*[+−×÷]\s*(-?\d+)/)
  return m ? [Number(m[1]), Number(m[2])] : []
}

/** Extracts arithmetic claims of the forms "N + M = P", "N − M = P", "N × M = P", "N ÷ M = P" and checks each is self-consistent. */
function assertCalculoSelfConsistent(strategy: Strategy) {
  for (const step of strategy.steps) {
    const add = step.text.match(/(-?\d+)\s*\+\s*(-?\d+)\s*=\s*(-?\d+)/)
    const sub = step.text.match(/(-?\d+)\s*−\s*(-?\d+)\s*=\s*(-?\d+)/)
    const mul = step.text.match(/(-?\d+)\s*×\s*(-?\d+)\s*=\s*(-?\d+)/)
    const div = step.text.match(/(-?\d+)\s*÷\s*(-?\d+)\s*=\s*(-?\d+)/)
    if (add) expect(Number(add[1]) + Number(add[2]), `"${step.text}"`).toBe(Number(add[3]))
    if (sub) expect(Number(sub[1]) - Number(sub[2]), `"${step.text}"`).toBe(Number(sub[3]))
    if (mul) expect(Number(mul[1]) * Number(mul[2]), `"${step.text}"`).toBe(Number(mul[3]))
    if (div) expect(Math.floor(Number(div[1]) / Number(div[2])), `"${step.text}"`).toBe(Number(div[3]))
  }
}

/** The primary strategy of an exercise (the 5-phase scaffold). */
function primaryStrategy(exercise: Exercise): Strategy {
  return exercise.strategies[0]
}

// ---------------------------------------------------------------------------
// Independent per-template-family answer recompute (breaks the
// answer-vs-strategy semi-circularity: the OLD test only checked that
// `exercise.answer` matched the RESULT the strategy itself claims, so a
// generator bug that fed the wrong numbers into both `answer` and the
// strategy the same way would slip through undetected). This recomputes the
// expected answer from the RELEVANT DATA TOKENS actually shown to the child
// (`dataHighlight.relevantIndices`), using each template's own arithmetic,
// entirely independent of what the strategy text says.
// ---------------------------------------------------------------------------

/** One template family: how to recognize its prompt, and how to recompute its answer from ordered relevant values. */
interface TemplateFamily {
  id: string
  /** A substring/regex unique to this template's question line, distinguishing it from every other template. */
  match: RegExp
  /** Recomputes the expected answer from the relevant-token values, in the order they appear in the prompt. */
  recompute: (values: number[]) => number | undefined
}

const TEMPLATE_FAMILIES: TemplateFamily[] = [
  // reparto.ts
  { id: 'reparto-grupos', match: /tocan a cada uno\?$/, recompute: ([total, kids]) => (kids ? Math.floor(total / kids) : undefined) },
  { id: 'unidades-por-pack', match: /tenéis en total\?$/, recompute: ([packs, perPack]) => packs * perPack },
  { id: 'mesas-sillas', match: /pueden sentarse en total\?$/, recompute: ([tables, chairs]) => tables * chairs },
  { id: 'comparar-cantidades', match: /más hicisteis el lunes\?$/, recompute: ([groupsA, perA, countB]) => groupsA * perA - countB },
  { id: 'juntar-y-repartir', match: /tocan a cada amigo\?$/, recompute: ([packs, perPack, kids]) => (kids ? Math.floor((packs * perPack) / kids) : undefined) },
  // dinero.ts
  { id: 'precio-unitario', match: /¿Cuánto cuesta cada/, recompute: ([count, total]) => (count ? Math.floor(total / count) : undefined) },
  { id: 'compra-con-cambio', match: /devuelven de cambio\?$/, recompute: ([count, unit, bill]) => bill - unit * count },
  { id: 'ahorro-hucha', match: /tendrá al final\?$/, recompute: ([start, perWeek, weeks]) => start + perWeek * weeks },
  { id: 'comparar-precios', match: /más caro es el primero que el segundo\?$/, recompute: ([priceHigh, priceLow]) => priceHigh - priceLow },
  { id: 'presupuesto', match: /dinero te sobra\?$/, recompute: ([budget, price1, price2]) => budget - (price1 + price2) },
  { id: 'precio-total', match: /pagáis en total\?$/, recompute: ([unit, count]) => unit * count },
  // tiempo.ts
  { id: 'duracion-trayecto', match: /dura el trayecto\?$/, recompute: ([start, end]) => end - start },
  // hora-llegada / hora-salida share the same question suffix ("en minutos
  // desde medianoche?"), so both are matched via HORA_LLEGADA_O_SALIDA below
  // instead of here.
  { id: 'cuanto-falta', match: /faltan para que empiece\?$/, recompute: ([now, event]) => event - now },
  { id: 'horario-apertura', match: /minutos está abierto\?$/, recompute: ([open, close]) => close - open },
  { id: 'minutos-horas', match: /minutos son en total\?$/, recompute: ([hours]) => hours * 60 },
  // medida.ts
  { id: 'alturas-comparadas', match: /diferencia de altura hay entre/, recompute: ([tall, short]) => tall - short },
  { id: 'pesos-animales', match: /kilos pesan entre todos\?$/, recompute: ([weight, count]) => weight * count },
  { id: 'distancias-viaje', match: /km os quedan por recorrer\?$/, recompute: ([leg1, leg2, planned]) => planned - (leg1 + leg2) },
  { id: 'capacidades', match: /litros de agua lleváis en total\?$/, recompute: ([count, perBottle]) => count * perBottle },
  { id: 'distancia-total', match: /km recorréis en total\?$/, recompute: ([leg1, leg2]) => leg1 + leg2 },
]

/**
 * "hora-llegada" ("Salís...y el trayecto dura...¿A qué hora llegáis...?",
 * answer = start + duration) and "hora-salida" ("Queréis llegar...y el
 * trayecto dura...¿A qué hora tenéis que salir...?", answer = arrival -
 * duration) share the same question suffix, so they're disambiguated by a
 * distinctive prefix instead.
 */
const HORA_LLEGADA_O_SALIDA: TemplateFamily[] = [
  { id: 'hora-llegada', match: /^Salís hacia/, recompute: ([start, duration]) => start + duration },
  { id: 'hora-salida', match: /^Queréis llegar hasta/, recompute: ([arrival, duration]) => arrival - duration },
]

/** Finds the template family matching `text`, or undefined if none of the known families recognize it. */
function findFamily(text: string): TemplateFamily | undefined {
  for (const family of HORA_LLEGADA_O_SALIDA) {
    if (family.match.test(text)) return family
  }
  for (const family of TEMPLATE_FAMILIES) {
    if (family.match.test(text)) return family
  }
  return undefined
}

/** The five Innovamat phase openers, in order, that the primary strategy must present. */
const PHASE_OPENERS = [
  '¿Qué está pasando?',
  '¿Qué sabemos?',
  '¿Qué nos preguntan',
  // (cálculo lines are in the middle — variable count)
  '¿Tiene sentido?',
]

const ALL_SUBSKILLS: { name: ProblemasSubskill; difficulties: number[] }[] = [
  { name: '1-paso', difficulties: [1, 2, 3, 4] },
  { name: '2-pasos', difficulties: [2, 3, 4, 5] },
  { name: 'dato-trampa', difficulties: [2, 3, 4, 5] },
  { name: 'dinero', difficulties: [1, 2, 3, 4] },
  { name: 'tiempo', difficulties: [1, 2, 3, 4] },
  { name: 'medida', difficulties: [1, 2, 3, 4] },
]

const GEN_BY_NAME: Record<ProblemasSubskill, (typeof WORD_PROBLEM_GENERATORS)[number]> = {
  '1-paso': unPasoGenerator,
  '2-pasos': dosPasosGenerator,
  'dato-trampa': datoTrampaGenerator,
  dinero: dineroGenerator,
  tiempo: tiempoGenerator,
  medida: medidaGenerator,
}

describe('word-problem generators', () => {
  describe.each(ALL_SUBSKILLS)('$name subskill', ({ name, difficulties }) => {
    const generator = GEN_BY_NAME[name]

    it('produces a valid, deterministic exercise shape (200 seeds x each difficulty)', () => {
      propertyTestWithDeterminism(generator, { difficulties }, (exercise, ctx) => {
        expect(exercise.subskill).toBe(name)
        expect(exercise.difficulty).toBe(ctx.difficulty)
        expect(exercise.answer.kind).toBe('number')
        expect(exercise.strategies.length).toBeGreaterThanOrEqual(1)
        expect(exercise.dataHighlight, 'dataHighlight present').toBeDefined()
        expect(exercise.microlesson && exercise.microlesson.length).toBeGreaterThan(0)
      })
    })

    it('answer matches the primary strategy final cálculo result, and every cálculo line is self-consistent', () => {
      propertyTestWithDeterminism(generator, { difficulties }, (exercise) => {
        if (exercise.answer.kind !== 'number') return
        const strat = primaryStrategy(exercise)
        assertCalculoSelfConsistent(strat)

        // The answer must equal the RESULT of the last cálculo line.
        const calcLines = calculoSteps(strat)
        expect(calcLines.length, 'at least one cálculo line').toBeGreaterThanOrEqual(1)
        const lastCalc = calcLines[calcLines.length - 1]
        const resultMatch = lastCalc.text.match(/=\s*(-?\d+)\s*$/) ?? lastCalc.text.match(/=\s*(-?\d+)/)
        expect(resultMatch, `no result in "${lastCalc.text}"`).toBeTruthy()
        expect(Number(resultMatch![1])).toBe(exercise.answer.value)
      })
    })

    it('answer is independently recomputable from the RELEVANT DATA TOKENS alone (not just self-consistent with the strategy text)', () => {
      propertyTestWithDeterminism(generator, { difficulties }, (exercise) => {
        if (exercise.answer.kind !== 'number') return
        const dh = exercise.dataHighlight!
        const relevantValues = dh.relevantIndices.map((idx) => parseTokenNumber(dh.tokens[idx]))
        expect(relevantValues.every((v) => v !== undefined), 'every relevant token is numeric').toBe(true)

        const family = findFamily(exercise.prompt.text)
        if (family) {
          // Strong check: recompute the answer purely from the relevant
          // token values, using this template's own arithmetic — completely
          // independent of anything the strategy text claims.
          const recomputed = family.recompute(relevantValues as number[])
          expect(
            recomputed,
            `[${family.id}] could not recompute from relevant values ${relevantValues.join(',')}: "${exercise.prompt.text}"`,
          ).not.toBeUndefined()
          expect(
            recomputed,
            `[${family.id}] recomputed answer ${recomputed} != exercise.answer.value ${exercise.answer.value} for "${exercise.prompt.text}"`,
          ).toBe(exercise.answer.value)
        } else {
          // Fallback for any prompt shape not covered by a known family
          // (e.g. a future template): at minimum, every operand the FIRST
          // cálculo line actually uses must be among the relevant token
          // values shown to the child — the strategy can't be computing from
          // numbers the child was never shown.
          const strat = primaryStrategy(exercise)
          const ops = firstLineOperands(strat)
          for (const op of ops) {
            expect(
              relevantValues,
              `first cálculo line operand ${op} is not among relevant token values ${relevantValues.join(',')}: "${exercise.prompt.text}"`,
            ).toContain(op)
          }
        }
      })
    })

    it('presents the 5 Innovamat phases in order (entender, datos, plan, cálculo, comprobar)', () => {
      propertyTestWithDeterminism(generator, { difficulties }, (exercise) => {
        const strat = primaryStrategy(exercise)
        expect(strat.id).toBe('fases')
        const texts = strat.steps.map((s) => s.text)

        // entender / datos / plan are the first three; comprobar is the last.
        expect(texts[0].startsWith(PHASE_OPENERS[0])).toBe(true)
        expect(texts[1].startsWith(PHASE_OPENERS[1])).toBe(true)
        expect(texts[2].startsWith(PHASE_OPENERS[2])).toBe(true)
        expect(texts[texts.length - 1].startsWith(PHASE_OPENERS[3])).toBe(true)

        // Between plan and comprobar there is at least one cálculo line.
        const calcCount = texts.slice(3, -1).length
        expect(calcCount, 'at least one cálculo line between plan and comprobar').toBeGreaterThanOrEqual(1)
      })
    })

    it('dataHighlight.tokens.join(" ") reconstructs the prompt text exactly', () => {
      propertyTestWithDeterminism(generator, { difficulties }, (exercise) => {
        expect(exercise.dataHighlight!.tokens.join(' ')).toBe(exercise.prompt.text)
      })
    })

    it('relevantIndices point at NUMBER tokens whose values are used in the cálculo; trapIndex points at a NUMBER token NOT among the true inputs', () => {
      propertyTestWithDeterminism(generator, { difficulties }, (exercise) => {
        const dh = exercise.dataHighlight!
        const strat = primaryStrategy(exercise)
        const calcNumbers = numbersInCalculo(strat)

        expect(dh.relevantIndices.length, 'at least one relevant number').toBeGreaterThanOrEqual(1)
        const relevantValues = new Set<number>()
        for (const idx of dh.relevantIndices) {
          const token = dh.tokens[idx]
          const value = parseTokenNumber(token)
          expect(value, `relevant token "${token}" (idx ${idx}) is not numeric`).not.toBeUndefined()
          expect(
            calcNumbers.has(value!),
            `relevant value ${value} (token "${token}") does not appear in cálculo ${[...calcNumbers].join(',')}`,
          ).toBe(true)
          relevantValues.add(value!)
        }

        if (dh.trapIndex !== undefined) {
          const token = dh.tokens[dh.trapIndex]
          const value = parseTokenNumber(token)
          expect(value, `trap token "${token}" is not numeric`).not.toBeUndefined()
          // A trap must not be one of the values the child actually needs, and
          // must not be an operand of the FIRST cálculo line (the real inputs).
          // (A coincidental match with a computed *result* is harmless.)
          expect(relevantValues.has(value!), `trap value ${value} equals a relevant input`).toBe(false)
          expect(firstLineOperands(strat), `trap value ${value} is a real input operand`).not.toContain(value!)
          expect(dh.relevantIndices).not.toContain(dh.trapIndex)
        }
      })
    })

    it('text quality gates: no undefined/double-space/digit-letter, starts uppercase (or ¿), ends with "?", no "En En"', () => {
      propertyTestWithDeterminism(generator, { difficulties }, (exercise) => {
        const text = exercise.prompt.text
        expect(text).not.toMatch(/undefined/)
        expect(text).not.toMatch(/ {2,}/)
        expect(text).not.toMatch(/\d[a-zA-Z]/)
        expect(text).not.toMatch(/ [.,]/) // no space before punctuation
        expect(text).not.toMatch(/En En/)
        expect(text.match(/^[A-ZÁÉÍÓÚÑ¿]/), `does not start uppercase: "${text}"`).toBeTruthy()
        expect(text.endsWith('?'), `does not end with "?": "${text}"`).toBe(true)
      })
    })
  })

  describe('trap injection rates', () => {
    it('dato-trampa injects a trap 100% of the time', () => {
      let total = 0
      let withTrap = 0
      propertyTestWithDeterminism(datoTrampaGenerator, { difficulties: [2, 3, 4, 5], seeds: 100 }, (exercise) => {
        total++
        if (exercise.dataHighlight!.trapIndex !== undefined) withTrap++
      })
      expect(withTrap).toBe(total)
    })

    it('other subskills inject a trap 15-45% of the time at d>=3, and never at d<3', () => {
      for (const gen of [unPasoGenerator, dosPasosGenerator, dineroGenerator, tiempoGenerator, medidaGenerator]) {
        let highTotal = 0
        let highTrap = 0
        propertyTestWithDeterminism(gen, { difficulties: [3, 4], seeds: 150, seedPrefix: `${gen.subskill}:hi` }, (exercise) => {
          highTotal++
          if (exercise.dataHighlight!.trapIndex !== undefined) highTrap++
        })
        const rate = highTrap / highTotal
        expect(rate, `${gen.subskill} d>=3 trap rate ${rate} out of [0.15, 0.45]`).toBeGreaterThanOrEqual(0.15)
        expect(rate, `${gen.subskill} d>=3 trap rate ${rate} out of [0.15, 0.45]`).toBeLessThanOrEqual(0.45)

        // d<3: never (only run for subskills whose range includes d<3).
        const lowRange = gen.subskill === '2-pasos' ? [2] : [1, 2]
        propertyTestWithDeterminism(gen, { difficulties: lowRange, seeds: 100, seedPrefix: `${gen.subskill}:lo` }, (exercise) => {
          expect(exercise.dataHighlight!.trapIndex, `${gen.subskill} injected a trap at d<3`).toBeUndefined()
        })
      }
    })
  })

  describe('every template renders against every real chapter', () => {
    it('every template x every real chapter binds without crashing and produces clean prose (with and without trap)', () => {
      for (const template of ALL_TEMPLATES) {
        for (const flavor of REAL_CHAPTER_FLAVORS) {
          for (const injectTrap of template.supportsTrap ? [false, true] : [false]) {
            for (let s = 0; s < 5; s++) {
              const rng = createRng(`${template.id}:${flavor.placeName}:${injectTrap}:${s}`)
              const difficulty = Math.min(Math.max(1, s + 1), template.difficultyRange[1])
              const bound = template.bind(rng, difficulty, flavor, { injectTrap })
              const text = bound.tokens.join(' ')

              expect(text, `${template.id}/${flavor.placeName}`).not.toMatch(/undefined/)
              expect(text).not.toMatch(/ {2,}/)
              expect(text).not.toMatch(/\d[a-zA-Z]/)
              expect(text).not.toMatch(/ [.,]/)
              expect(text).not.toMatch(/ a el | de el /)
              expect(text.match(/^[A-ZÁÉÍÓÚÑ¿]/), `${template.id} does not start uppercase: "${text}"`).toBeTruthy()
              expect(text.endsWith('?'), `${template.id} does not end with "?": "${text}"`).toBe(true)

              // Trap injection contract honored by the template.
              if (injectTrap) {
                expect(bound.trapIndex, `${template.id} did not inject a trap when asked`).toBeDefined()
              } else {
                expect(bound.trapIndex, `${template.id} injected a trap when not asked`).toBeUndefined()
              }
            }
          }
        }
      }
    })
  })

  describe('subskill routing', () => {
    it('1-paso only picks 1-step templates; 2-pasos only 2-step templates', () => {
      // Reconstruct the template used by checking cálculo line count in the primary strategy.
      propertyTestWithDeterminism(unPasoGenerator, { difficulties: [1, 2, 3, 4] }, (exercise) => {
        const calc = calculoSteps(primaryStrategy(exercise))
        expect(calc.length, `1-paso should have exactly 1 cálculo line: "${exercise.prompt.text}"`).toBe(1)
      })
      propertyTestWithDeterminism(dosPasosGenerator, { difficulties: [2, 3, 4, 5] }, (exercise) => {
        const calc = calculoSteps(primaryStrategy(exercise))
        expect(calc.length, `2-pasos should have exactly 2 cálculo lines: "${exercise.prompt.text}"`).toBe(2)
      })
    })

    it('does not throw for NaN/Infinity/undefined difficulty and clamps to range-min', () => {
      for (const { name, difficulties } of ALL_SUBSKILLS) {
        const generator = GEN_BY_NAME[name]
        const rangeMin = Math.min(...difficulties)
        for (const bogus of [NaN, Infinity, -Infinity, undefined]) {
          const rng = createRng(`nan:${name}`)
          let exercise: Exercise | undefined
          expect(() => {
            exercise = generator.generate(rng, bogus as unknown as number, DEFAULT_TEST_FLAVOR)
          }).not.toThrow()
          expect(exercise).toBeDefined()
          expect(exercise!.difficulty).toBe(rangeMin)
        }
      }
    })
  })

  it('has ~25 templates covering all five contexts', () => {
    expect(ALL_TEMPLATES.length).toBeGreaterThanOrEqual(20)
    const contexts = new Set(ALL_TEMPLATES.flatMap((t) => t.contexts))
    for (const ctx of ['dinero', 'tiempo', 'medida', 'reparto', 'compra']) {
      expect(contexts.has(ctx as never), `no template serves context "${ctx}"`).toBe(true)
    }
  })
})
