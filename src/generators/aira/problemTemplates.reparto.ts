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

const MICROLESSON = 'Repartir en grupos iguales y contar por paquetes es lo que hacemos al organizar cosas de verdad: mesas, entradas, souvenirs…'

/** Flavor-neutral countable objects for grouping/sharing stories (already plural). */
const OBJECTS = ['pegatinas', 'postales', 'conchas', 'fotos del viaje', 'pulseras', 'caramelos']

/** "reparto en grupos iguales" (1-step): N objects shared among G kids → each gets... */
const repartoGrupos: ProblemTemplate = {
  id: 'reparto-grupos',
  contexts: ['reparto'],
  steps: 1,
  supportsTrap: true,
  difficultyRange: [1, 4],
  bind(rng, difficulty, _flavor, opts): BoundProblem {
    const kids = rng.int(2, difficulty <= 2 ? 4 : 6)
    const each = rng.int(3, difficulty <= 2 ? 6 : 10)
    const total = kids * each
    const object = rng.pick(OBJECTS)

    const trapAge = rollTrap(rng, 7, 12, [total, kids, each])
    const parts = [
      t(`Repartís`),
      num(total),
      t(`${object} entre`),
      num(kids),
      t(`amigos, a partes iguales.`),
    ]
    if (opts.injectTrap) {
      parts.push(t(`El mayor tiene`), trap(trapAge), t(`años.`))
    }
    parts.push(t(`¿Cuántas le tocan a cada uno?`))

    const tk = assemble(parts)
    const strategy = buildPhaseStrategy({
      datos: `${total} ${object} para ${kids} amigos, a partes iguales.`,
      plan: `Nos preguntan cuántas por persona; repartimos, así que dividimos.`,
      calculo: [`${total} ÷ ${kids} = ${each}`],
      comprobar: `Al revés: ${each} × ${kids} = ${total}, todas las ${object}. ¡Cuadra!`,
      trapCallout: opts.injectTrap ? `los ${trapAge} años del mayor` : undefined,
    })

    return boundProblem(tk, each, [strategy], MICROLESSON)
  },
}

/** "unidades por pack" (1-step): P packs of U units each → total units. */
const unidadesPorPack: ProblemTemplate = {
  id: 'unidades-por-pack',
  contexts: ['reparto', 'compra'],
  steps: 1,
  supportsTrap: true,
  difficultyRange: [1, 4],
  bind(rng, difficulty, _flavor, opts): BoundProblem {
    const packs = rng.int(2, difficulty <= 2 ? 5 : 9)
    const perPack = rng.int(3, difficulty <= 2 ? 6 : 12)
    const total = packs * perPack
    const object = rng.pick(OBJECTS)

    const trapPrice = rollTrap(rng, 2, 9, [packs, perPack, total])
    const parts = [
      t(`Compráis`),
      num(packs),
      t(`paquetes de ${object}, con`),
      num(perPack),
      t(`en cada paquete.`),
    ]
    if (opts.injectTrap) {
      parts.push(t(`Cada paquete cuesta`), trap(trapPrice), t(`euros.`))
    }
    parts.push(t(`¿Cuántas ${object} tenéis en total?`))

    const tk = assemble(parts)
    const strategy = buildPhaseStrategy({
      datos: `${packs} paquetes con ${perPack} ${object} en cada uno.`,
      plan: `Nos preguntan el total; multiplicamos los paquetes por lo que trae cada uno.`,
      calculo: [`${packs} × ${perPack} = ${total}`],
      comprobar: `${total} entre ${packs} paquetes da ${perPack} en cada uno. ¡Cuadra!`,
      trapCallout: opts.injectTrap ? `los ${trapPrice} euros de cada paquete` : undefined,
    })

    return boundProblem(tk, total, [strategy], MICROLESSON)
  },
}

/** "mesas y sillas" (1-step): T tables with C chairs each → total seats. */
const mesasSillas: ProblemTemplate = {
  id: 'mesas-sillas',
  contexts: ['reparto'],
  steps: 1,
  supportsTrap: true,
  difficultyRange: [1, 4],
  bind(rng, difficulty, _flavor, opts): BoundProblem {
    const tables = rng.int(3, difficulty <= 2 ? 6 : 12)
    const chairs = rng.int(2, difficulty <= 2 ? 4 : 6)
    const total = tables * chairs

    const trapDishes = rollTrap(rng, 3, 9, [tables, chairs, total])
    const parts = [
      t(`En el hawker center hay`),
      num(tables),
      t(`mesas y en cada una caben`),
      num(chairs),
      t(`personas.`),
    ]
    if (opts.injectTrap) {
      parts.push(t(`El puesto sirve`), trap(trapDishes), t(`platos distintos.`))
    }
    parts.push(t(`¿Cuántas personas pueden sentarse en total?`))

    const tk = assemble(parts)
    const strategy = buildPhaseStrategy({
      datos: `${tables} mesas con ${chairs} personas en cada una.`,
      plan: `Nos preguntan el total de sitios; multiplicamos las mesas por las plazas de cada una.`,
      calculo: [`${tables} × ${chairs} = ${total}`],
      comprobar: `${total} personas entre ${tables} mesas da ${chairs} por mesa. ¡Cuadra!`,
      trapCallout: opts.injectTrap ? `los ${trapDishes} platos del puesto` : undefined,
    })

    return boundProblem(tk, total, [strategy], MICROLESSON)
  },
}

/** "comparar cantidades" (generic 2-step): two groups, each a product, then their difference. */
const compararCantidades: ProblemTemplate = {
  id: 'comparar-cantidades',
  contexts: ['reparto'],
  steps: 2,
  supportsTrap: true,
  difficultyRange: [3, 5],
  bind(rng, difficulty, _flavor, opts): BoundProblem {
    const groupsA = rng.int(3, 6)
    const perA = rng.int(4, difficulty <= 3 ? 8 : 12)
    const countA = groupsA * perA
    const countB = rng.int(5, Math.max(6, countA - 3))
    const diff = countA - countB
    const object = rng.pick(OBJECTS)

    const trapDays = rollTrap(rng, 2, 7, [groupsA, perA, countA, countB, diff])
    const parts = [
      t(`El lunes hacéis`),
      num(groupsA),
      t(`tandas de`),
      num(perA),
      t(`${object}. El martes hacéis`),
      num(countB),
      t(`${object}.`),
    ]
    if (opts.injectTrap) {
      parts.push(t(`Estáis de viaje`), trap(trapDays), t(`días.`))
    }
    parts.push(t(`¿Cuántas ${object} más hicisteis el lunes?`))

    const tk = assemble(parts)
    const strategy = buildPhaseStrategy({
      datos: `El lunes: ${groupsA} tandas de ${perA}. El martes: ${countB} ${object}.`,
      plan: `Primero cuántas el lunes (multiplicamos), luego la diferencia con el martes (restamos).`,
      calculo: [`${groupsA} × ${perA} = ${countA}`, `${countA} − ${countB} = ${diff}`],
      comprobar: `Si al martes (${countB}) le sumas ${diff} llegas a ${countA}, las del lunes. ¡Cuadra!`,
      trapCallout: opts.injectTrap ? `los ${trapDays} días de viaje` : undefined,
    })

    return boundProblem(tk, diff, [strategy], MICROLESSON)
  },
}

/** "juntar y repartir" (2-step): total from P packs of U, then shared among K kids. */
const juntarYRepartir: ProblemTemplate = {
  id: 'juntar-y-repartir',
  contexts: ['reparto'],
  steps: 2,
  supportsTrap: true,
  difficultyRange: [3, 5],
  bind(rng, difficulty, _flavor, opts): BoundProblem {
    // Build so every division is exact: roll packs and per-pack for a total,
    // then pick the number of kids from the divisors of that total (>= 2 and
    // small enough to be a sensible group), so total ÷ kids is a whole number.
    const packs = rng.int(2, 4)
    const perPack = rng.int(4, difficulty <= 3 ? 10 : 16)
    const total = packs * perPack
    const divisors = []
    for (let d = 2; d <= 6; d++) {
      if (total % d === 0 && total / d >= 2) divisors.push(d)
    }
    const kids = divisors.length > 0 ? rng.pick(divisors) : 2
    const eachChild = total / kids
    const object = rng.pick(OBJECTS)

    const parts = [
      t(`Abrís`),
      num(packs),
      t(`paquetes con`),
      num(perPack),
      t(`${object} cada uno y las repartís entre`),
      num(kids),
      t(`amigos.`),
    ]
    const trapAge = rollTrap(rng, 7, 12, [packs, perPack, total, kids, eachChild])
    if (opts.injectTrap) {
      parts.push(t(`El más pequeño tiene`), trap(trapAge), t(`años.`))
    }
    parts.push(t(`¿Cuántas ${object} le tocan a cada amigo?`))

    const tk = assemble(parts)
    const strategy = buildPhaseStrategy({
      datos: `${packs} paquetes de ${perPack} ${object}, para ${kids} amigos.`,
      plan: `Primero cuántas hay en total (multiplicamos), luego las repartimos (dividimos entre los amigos).`,
      calculo: [`${packs} × ${perPack} = ${total}`, `${total} ÷ ${kids} = ${eachChild}`],
      comprobar: `Al revés: ${eachChild} × ${kids} = ${total}, todas las ${object}. ¡Cuadra!`,
      trapCallout: opts.injectTrap ? `los ${trapAge} años del más pequeño` : undefined,
    })

    return boundProblem(tk, eachChild, [strategy], MICROLESSON)
  },
}

export const REPARTO_TEMPLATES: ProblemTemplate[] = [
  repartoGrupos,
  unidadesPorPack,
  mesasSillas,
  compararCantidades,
  juntarYRepartir,
]
