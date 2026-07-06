import type { ChapterFlavorLite } from '../../types/exercise'
import {
  assemble,
  boundProblem,
  rollTrap,
  buildPhaseStrategy,
  num,
  t,
  trap,
  type BoundProblem,
  type ProblemTemplate,
} from './problemTemplates'

const MICROLESSON = 'Comparar distancias, alturas y pesos con números te ayuda a hacerte una idea del tamaño real de las cosas del mundo.'

/**
 * A handful of REAL, fact-checked landmark heights (metres) tied to the trip,
 * used when a chapter's flavor mentions them; otherwise we use a generic
 * "torre" with a plausible rolled height. Petronas: 452 m (real). Marina Bay
 * Sands towers: ~200 m. Values kept to safe rounded figures per the spec.
 */
const REAL_HEIGHTS: { needle: string; name: string; height: number }[] = [
  { needle: 'petronas', name: 'las Torres Petronas', height: 452 },
  { needle: 'marina bay', name: 'Marina Bay Sands', height: 200 },
]

/** Finds a real height whose landmark appears in this chapter, if any. */
function realHeightFor(flavor: ChapterFlavorLite): { name: string; height: number } | undefined {
  const hay = flavor.landmarks.join(' ').toLowerCase()
  const hit = REAL_HEIGHTS.find((h) => hay.includes(h.needle))
  return hit ? { name: hit.name, height: hit.height } : undefined
}

/** "alturas comparadas" (1-step): a tall landmark vs a shorter one → difference in metres. */
const alturasComparadas: ProblemTemplate = {
  id: 'alturas-comparadas',
  contexts: ['medida'],
  steps: 1,
  supportsTrap: true,
  difficultyRange: [2, 5],
  bind(rng, _difficulty, flavor, opts): BoundProblem {
    const real = realHeightFor(flavor)
    // Fallback when the chapter has no fact-checked landmark: a generic tall
    // tower with a plausible rolled height (never an arbitrary flavor landmark,
    // which could be an object like "la maleta grande" that can't "medir 452 m").
    const tallName = real ? real.name : 'la torre más alta de la ciudad'
    const tallHeight = real ? real.height : rng.int(80, 300)
    // Something shorter to compare against: a plausible building/tree height.
    const shortHeight = rng.int(20, Math.max(25, Math.floor(tallHeight / 2)))
    const diff = tallHeight - shortHeight

    const trapFloors = rollTrap(rng, 30, 90, [tallHeight, shortHeight, diff])
    const parts = [
      t(`La altura de ${tallName} es de`),
      num(tallHeight),
      t(`metros y la de un árbol gigante de la selva es de`),
      num(shortHeight),
      t(`metros.`),
    ]
    if (opts.injectTrap) {
      parts.push(t(`El edificio tiene`), trap(trapFloors), t(`plantas.`))
    }
    parts.push(t(`¿Cuántos metros de diferencia de altura hay entre ${tallName} y el árbol?`))

    const tk = assemble(parts)
    const strategy = buildPhaseStrategy({
      datos: `La altura de ${tallName} es ${tallHeight} m y la del árbol es ${shortHeight} m.`,
      plan: `Nos preguntan cuánto más alto; restamos la altura menor de la mayor.`,
      calculo: [`${tallHeight} − ${shortHeight} = ${diff}`],
      comprobar: `Si al árbol (${shortHeight} m) le sumas ${diff} m llegas a ${tallHeight} m. ¡Cuadra!`,
      trapCallout: opts.injectTrap ? `las ${trapFloors} plantas del edificio` : undefined,
    })

    return boundProblem(tk, diff, [strategy], MICROLESSON)
  },
}

/**
 * Curated singular masculine animals with fact-checked plausible weights (kg),
 * so "cada ${animal} pesa …" and "hay N de ellos" agree grammatically and the
 * numbers are realistic. Flavor animals are unreliable here (many are plural
 * phrases like "los monos del Monkey Forest" or proper nouns like "Kiko el
 * gato" that break "cada … pesa"). Orangutan ~40-90 kg, tapir ~35 kg per juvenile
 * figure kept low, etc. — safe rounded values for a 9-year-old.
 */
const WEIGHT_ANIMALS: { name: string; min: number; max: number }[] = [
  { name: 'orangután', min: 40, max: 80 },
  { name: 'oso malayo', min: 30, max: 60 },
  { name: 'cocodrilo joven', min: 25, max: 70 },
  { name: 'mono narigudo', min: 15, max: 22 },
]

/** "pesos de animales" (1-step): weight of one animal times a count. */
const pesosAnimales: ProblemTemplate = {
  id: 'pesos-animales',
  contexts: ['medida'],
  steps: 1,
  supportsTrap: true,
  difficultyRange: [1, 4],
  bind(rng, difficulty, _flavor, opts): BoundProblem {
    const chosen = rng.pick(WEIGHT_ANIMALS)
    const beast = chosen.name
    const weight = rng.int(chosen.min, chosen.max)
    const count = rng.int(2, difficulty <= 2 ? 3 : 5)
    const total = weight * count

    const trapAge = rollTrap(rng, 3, 15, [weight, count, total])
    const parts = [
      t(`Cada ${beast} pesa unos`),
      num(weight),
      t(`kilos. En el centro hay`),
      num(count),
      t(`de ellos.`),
    ]
    if (opts.injectTrap) {
      parts.push(t(`El más viejo tiene`), trap(trapAge), t(`años.`))
    }
    parts.push(t(`¿Cuántos kilos pesan entre todos?`))

    const tk = assemble(parts)
    const strategy = buildPhaseStrategy({
      datos: `Cada ${beast} pesa ${weight} kg y hay ${count}.`,
      plan: `Nos preguntan el peso de todos juntos; multiplicamos el peso de uno por cuántos hay.`,
      calculo: [`${weight} × ${count} = ${total}`],
      comprobar: `${total} kg entre ${count} da ${weight} kg cada uno. ¡Cuadra!`,
      trapCallout: opts.injectTrap ? `los ${trapAge} años del más viejo` : undefined,
    })

    return boundProblem(tk, total, [strategy], MICROLESSON)
  },
}

/** "distancias del viaje" (2-step): two legs of a journey → total, or remaining distance. */
const distanciasViaje: ProblemTemplate = {
  id: 'distancias-viaje',
  contexts: ['medida'],
  steps: 2,
  supportsTrap: true,
  difficultyRange: [2, 5],
  bind(rng, difficulty, _flavor, opts): BoundProblem {
    const leg1 = rng.int(20, difficulty <= 3 ? 120 : 400)
    const leg2 = rng.int(20, difficulty <= 3 ? 120 : 400)
    const flownTotal = leg1 + leg2
    // Total planned trip a bit longer, so "cuánto queda" is a clean 2nd step.
    const remaining = rng.int(30, 200)
    const planned = flownTotal + remaining

    const trapPeople = rollTrap(rng, 50, 300, [leg1, leg2, flownTotal, planned, remaining])
    const parts = [
      t(`Hoy recorréis`),
      num(leg1),
      t(`km por la mañana y`),
      num(leg2),
      t(`km por la tarde. El viaje entero es de`),
      num(planned),
      t(`km.`),
    ]
    if (opts.injectTrap) {
      parts.push(t(`En el barco viajan`), trap(trapPeople), t(`pasajeros.`))
    }
    parts.push(t(`¿Cuántos km os quedan por recorrer?`))

    const tk = assemble(parts)
    const strategy = buildPhaseStrategy({
      datos: `Recorréis ${leg1} km y ${leg2} km, y el viaje total es de ${planned} km.`,
      plan: `Primero lo recorrido hoy (sumamos las dos partes), luego lo que queda (restamos del total).`,
      calculo: [`${leg1} + ${leg2} = ${flownTotal}`, `${planned} − ${flownTotal} = ${remaining}`],
      comprobar: `Lo recorrido (${flownTotal} km) más lo que queda (${remaining} km) da ${planned} km, el viaje entero. ¡Cuadra!`,
      trapCallout: opts.injectTrap ? `los ${trapPeople} pasajeros del barco` : undefined,
    })

    return boundProblem(tk, remaining, [strategy], MICROLESSON)
  },
}

/** "capacidades" (1-step): fill N containers of C litres → total litres. */
const capacidades: ProblemTemplate = {
  id: 'capacidades',
  contexts: ['medida'],
  steps: 1,
  supportsTrap: true,
  difficultyRange: [1, 4],
  bind(rng, difficulty, _flavor, opts): BoundProblem {
    const perBottle = rng.int(2, difficulty <= 2 ? 3 : 6)
    const count = rng.int(3, difficulty <= 2 ? 5 : 9)
    const total = perBottle * count

    const trapTemp = rollTrap(rng, 25, 35, [perBottle, count, total])
    const parts = [
      t(`Lleváis`),
      num(count),
      t(`botellas de`),
      num(perBottle),
      t(`litros cada una para el viaje.`),
    ]
    if (opts.injectTrap) {
      parts.push(t(`Hace`), trap(trapTemp), t(`grados de calor.`))
    }
    parts.push(t(`¿Cuántos litros de agua lleváis en total?`))

    const tk = assemble(parts)
    const strategy = buildPhaseStrategy({
      datos: `${count} botellas de ${perBottle} litros cada una.`,
      plan: `Nos preguntan el total de litros; multiplicamos los litros de una por cuántas hay.`,
      calculo: [`${perBottle} × ${count} = ${total}`],
      comprobar: `${total} litros entre ${count} botellas da ${perBottle} litros cada una. ¡Cuadra!`,
      trapCallout: opts.injectTrap ? `los ${trapTemp} grados de calor` : undefined,
    })

    return boundProblem(tk, total, [strategy], MICROLESSON)
  },
}

/** "distancia total" (1-step): two legs of a journey → total km. */
const distanciaTotal: ProblemTemplate = {
  id: 'distancia-total',
  contexts: ['medida'],
  steps: 1,
  supportsTrap: true,
  difficultyRange: [1, 4],
  bind(rng, difficulty, _flavor, opts): BoundProblem {
    const leg1 = rng.int(15, difficulty <= 2 ? 90 : 350)
    const leg2 = rng.int(15, difficulty <= 2 ? 90 : 350)
    const total = leg1 + leg2

    const trapHours = rollTrap(rng, 2, 9, [leg1, leg2, total])
    const parts = [
      t(`Hoy recorréis`),
      num(leg1),
      t(`km en barco y`),
      num(leg2),
      t(`km en coche.`),
    ]
    if (opts.injectTrap) {
      parts.push(t(`El viaje dura`), trap(trapHours), t(`horas.`))
    }
    parts.push(t(`¿Cuántos km recorréis en total?`))

    const tk = assemble(parts)
    const strategy = buildPhaseStrategy({
      datos: `Recorréis ${leg1} km en barco y ${leg2} km en coche.`,
      plan: `Nos preguntan el total; sumamos las dos partes del trayecto.`,
      calculo: [`${leg1} + ${leg2} = ${total}`],
      comprobar: `${total} km es más que cada parte por separado, y tiene sentido que el total sea mayor. ¡Cuadra!`,
      trapCallout: opts.injectTrap ? `las ${trapHours} horas de viaje` : undefined,
    })

    return boundProblem(tk, total, [strategy], MICROLESSON)
  },
}

export const MEDIDA_TEMPLATES: ProblemTemplate[] = [
  alturasComparadas,
  pesosAnimales,
  distanciasViaje,
  distanciaTotal,
  capacidades,
]
