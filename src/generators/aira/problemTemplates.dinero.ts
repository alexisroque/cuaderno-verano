import type { Rng } from '../../lib/rng'
import {
  assemble,
  boundProblem,
  rollTrap,
  buildPhaseStrategy,
  capitalizeFirst,
  moneySymbol,
  num,
  t,
  trap,
  twoPriceItems,
  type BindOptions,
  type BoundProblem,
  type ProblemTemplate,
} from './problemTemplates'

const MICROLESSON = 'Saber calcular con dinero (precios, totales y el cambio) evita que te cobren de más o te den mal las vueltas.'

/**
 * Generic countable nouns for "buy N of them" money stories. The flavor's
 * `priceItems` are SINGULAR multi-word phrases ("plato de chicken rice") that
 * can't be safely pluralized ("3 plato de chicken rice cuestan…" is wrong
 * grammar), so for count-based purchases we use these ready-pluralized,
 * flavor-neutral nouns instead — the same tactic division.ts uses for its own
 * noun list. Single-item templates still use the richer flavor priceItems.
 */
interface Countable {
  plural: string
  singular: string
  /** Grammatical gender, so "cada una"/"cada uno" agrees with the noun. */
  fem: boolean
}
const COUNTABLE_ITEMS: Countable[] = [
  { plural: 'entradas', singular: 'entrada', fem: true },
  { plural: 'billetes', singular: 'billete', fem: false },
  { plural: 'raciones', singular: 'ración', fem: true },
  { plural: 'postales', singular: 'postal', fem: true },
  { plural: 'imanes de recuerdo', singular: 'imán de recuerdo', fem: false },
  { plural: 'botellas de agua', singular: 'botella de agua', fem: true },
]

/** Picks a plural countable noun with its singular form and gender. */
function pickCountable(rng: Rng): Countable {
  return rng.pick(COUNTABLE_ITEMS)
}

/** "cada una" / "cada uno" agreeing with the countable's gender. */
function cadaUno(c: Countable): string {
  return c.fem ? 'cada una' : 'cada uno'
}

/** "una sola" / "uno solo" agreeing with the countable's gender. */
function unaSola(c: Countable): string {
  return c.fem ? 'una sola' : 'uno solo'
}

/** Small price appropriate for a per-item cost at the given difficulty. */
function rollPrice(rng: Rng, difficulty: number): number {
  if (difficulty <= 2) return rng.int(2, 9)
  if (difficulty === 3) return rng.int(3, 15)
  return rng.int(4, 25)
}

/** A basket quantity that keeps the story plausible. */
function rollQuantity(rng: Rng, difficulty: number): number {
  if (difficulty <= 2) return rng.int(2, 5)
  if (difficulty === 3) return rng.int(3, 6)
  return rng.int(3, 8)
}

/**
 * Note appended when a chapter's currency is rupias and we switch the money
 * story to euros (see moneySymbol). Deliberately neutral so it reads fine in
 * every dinero context — buying, saving, comparing — not just at the till.
 */
function euroLeadIn(euroSwitch: boolean): string {
  return euroSwitch ? ' (aquí lo contáis todo en euros).' : ''
}

/** "precio unitario" (1-step): total cost of N equal items ÷ N → unit price. */
const precioUnitario: ProblemTemplate = {
  id: 'precio-unitario',
  contexts: ['dinero', 'compra'],
  steps: 1,
  supportsTrap: true,
  difficultyRange: [1, 4],
  bind(rng, difficulty, flavor, opts): BoundProblem {
    const { symbol, euroSwitch } = moneySymbol(flavor)
    const item = pickCountable(rng)
    const count = rollQuantity(rng, difficulty)
    const unit = rollPrice(rng, difficulty)
    const total = unit * count
    const place = capitalizeFirst(flavor.placePhrase)

    const trapMinutes = rollTrap(rng, 10, 40, [count, total, unit])
    // "En Singapur, N entradas cuestan T € en total. ¿Cuánto cuesta cada una?"
    const parts = [
      t(`${place},`),
      num(count),
      t(`${item.plural} cuestan`),
      num(total),
      t(`${symbol} en total.${euroLeadIn(euroSwitch)}`),
    ]
    if (opts.injectTrap) {
      parts.push(t(`La cola para pagar duró`), trap(trapMinutes), t(`minutos.`))
    }
    parts.push(t(`¿Cuánto cuesta cada ${item.singular}?`))

    const tk = assemble(parts)
    const strategy = buildPhaseStrategy({
      datos: `${count} ${item.plural} cuestan ${total} ${symbol} en total.`,
      plan: `Nos preguntan el precio de ${unaSola(item)}; repartimos el total entre ${count}, así que dividimos.`,
      calculo: [`${total} ÷ ${count} = ${unit}`],
      comprobar: `Al revés: ${unit} × ${count} = ${total}, que es el total. ¡Cuadra!`,
      trapCallout: opts.injectTrap ? `los ${trapMinutes} minutos de cola` : undefined,
    })

    return boundProblem(tk, unit, [strategy], MICROLESSON)
  },
}

/** "compra con cambio" (2-step): buy N items at P, pay with a bill B → change. */
const compraConCambio: ProblemTemplate = {
  id: 'compra-con-cambio',
  contexts: ['dinero', 'compra'],
  steps: 2,
  supportsTrap: true,
  difficultyRange: [2, 5],
  bind(rng, difficulty, flavor, opts): BoundProblem {
    const { symbol, euroSwitch } = moneySymbol(flavor)
    const item = pickCountable(rng)
    const count = rollQuantity(rng, difficulty)
    const unit = rollPrice(rng, difficulty)
    const spent = unit * count
    // Pay with the next round bill above the spend (10, 20, 50, 100).
    const bill = [10, 20, 50, 100].find((b) => b > spent) ?? spent + 10
    const change = bill - spent
    const place = capitalizeFirst(flavor.placePhrase)

    const trapCount = rollTrap(rng, 2, 6, [count, unit, bill, spent, change])
    const parts = [
      t(`${place}, compráis`),
      num(count),
      t(`${item.plural} de`),
      num(unit),
      t(`${symbol} ${cadaUno(item)}.${euroLeadIn(euroSwitch)} Pagáis con un billete de`),
      num(bill),
      t(`${symbol}.`),
    ]
    if (opts.injectTrap) {
      parts.push(t(`En la tienda había`), trap(trapCount), t(`personas más.`))
    }
    parts.push(t(`¿Cuánto os devuelven de cambio?`))

    const tk = assemble(parts)
    const strategy = buildPhaseStrategy({
      datos: `${count} ${item.plural} a ${unit} ${symbol} ${cadaUno(item)}, y pagáis con ${bill} ${symbol}.`,
      plan: `Primero cuánto cuesta todo (multiplicamos), luego el cambio (restamos del billete).`,
      calculo: [`${unit} × ${count} = ${spent}`, `${bill} − ${spent} = ${change}`],
      comprobar: `El cambio (${change} ${symbol}) más lo gastado (${spent} ${symbol}) da ${bill} ${symbol}, el billete. ¡Cuadra!`,
      trapCallout: opts.injectTrap ? `las ${trapCount} personas de más` : undefined,
    })

    return boundProblem(tk, change, [strategy], MICROLESSON)
  },
}

/** "ahorro/hucha" (2-step): save W per week for K weeks, then add a starting amount. */
const ahorroHucha: ProblemTemplate = {
  id: 'ahorro-hucha',
  contexts: ['dinero'],
  steps: 2,
  supportsTrap: true,
  difficultyRange: [2, 5],
  bind(rng, difficulty, flavor, opts): BoundProblem {
    const { symbol, euroSwitch } = moneySymbol(flavor)
    const perWeek = rng.int(2, difficulty <= 3 ? 5 : 9)
    const weeks = rng.int(3, difficulty <= 3 ? 5 : 8)
    const start = rng.int(3, 15)
    const saved = perWeek * weeks
    const total = saved + start

    const trapDays = rollTrap(rng, 2, 6, [perWeek, weeks, start, saved, total])
    const parts = [
      t(`Aira ya tiene`),
      num(start),
      t(`${symbol} en la hucha y guarda`),
      num(perWeek),
      t(`${symbol} cada semana durante`),
      num(weeks),
      t(`semanas.${euroLeadIn(euroSwitch)}`),
    ]
    if (opts.injectTrap) {
      parts.push(t(`El viaje dura`), trap(trapDays), t(`días.`))
    }
    parts.push(t(`¿Cuánto dinero tendrá al final?`))

    const tk = assemble(parts)
    const strategy = buildPhaseStrategy({
      datos: `Empieza con ${start} ${symbol} y añade ${perWeek} ${symbol} por semana durante ${weeks} semanas.`,
      plan: `Primero lo ahorrado en total (multiplicamos), luego lo sumamos a lo que ya tenía.`,
      calculo: [`${perWeek} × ${weeks} = ${saved}`, `${saved} + ${start} = ${total}`],
      comprobar: `${total} ${symbol} es más que los ${start} ${symbol} del principio, y tiene sentido que crezca al ahorrar. ¡Cuadra!`,
      trapCallout: opts.injectTrap ? `los ${trapDays} días de viaje` : undefined,
    })

    return boundProblem(tk, total, [strategy], MICROLESSON)
  },
}

/** "comparar precios" (2-step): two items at different prices → how much more one costs. */
const compararPrecios: ProblemTemplate = {
  id: 'comparar-precios',
  contexts: ['dinero', 'compra'],
  steps: 1,
  supportsTrap: true,
  difficultyRange: [1, 4],
  bind(rng, difficulty, flavor, opts): BoundProblem {
    const { symbol, euroSwitch } = moneySymbol(flavor)
    const [item1, item2] = twoPriceItems(rng, flavor)
    const priceHigh = rollPrice(rng, difficulty) + rng.int(3, 10)
    const priceLow = rng.int(2, Math.max(2, priceHigh - 2))
    const diff = priceHigh - priceLow

    const trapAmount = rollTrap(rng, 20, 60, [priceHigh, priceLow, diff])
    const parts = [
      t(`Un ${item1} cuesta`),
      num(priceHigh),
      t(`${symbol} y un ${item2} cuesta`),
      num(priceLow),
      t(`${symbol}.${euroLeadIn(euroSwitch)}`),
    ]
    if (opts.injectTrap) {
      parts.push(t(`Llevas`), trap(trapAmount), t(`${symbol} en la cartera.`))
    }
    parts.push(t(`¿Cuánto más caro es el ${item1}?`))

    const tk = assemble(parts)
    const strategy = buildPhaseStrategy({
      datos: `El ${item1} vale ${priceHigh} ${symbol} y el ${item2} vale ${priceLow} ${symbol}.`,
      plan: `Nos preguntan la diferencia de precio; restamos el más barato del más caro.`,
      calculo: [`${priceHigh} − ${priceLow} = ${diff}`],
      comprobar: `Si al ${item2} le sumas ${diff} ${symbol} llegas a ${priceHigh} ${symbol}, el precio del ${item1}. ¡Cuadra!`,
      trapCallout: opts.injectTrap ? `los ${trapAmount} ${symbol} de la cartera` : undefined,
    })

    return boundProblem(tk, diff, [strategy], MICROLESSON)
  },
}

/** "presupuesto" (2-step): total of two purchases, then how much is left from a budget. */
const presupuesto: ProblemTemplate = {
  id: 'presupuesto',
  contexts: ['dinero', 'compra'],
  steps: 2,
  supportsTrap: true,
  difficultyRange: [2, 5],
  bind(rng, difficulty, flavor, opts): BoundProblem {
    const { symbol, euroSwitch } = moneySymbol(flavor)
    const [item1, item2] = twoPriceItems(rng, flavor)
    const price1 = rollPrice(rng, difficulty)
    const price2 = rollPrice(rng, difficulty)
    const spent = price1 + price2
    const budget = [10, 20, 30, 50].find((b) => b > spent) ?? spent + 10
    const left = budget - spent

    const trapTime = rollTrap(rng, 1, 4, [budget, price1, price2, spent, left])
    const parts = [
      t(`Tienes`),
      num(budget),
      t(`${symbol} para gastar. Compras un ${item1} de`),
      num(price1),
      t(`${symbol} y un ${item2} de`),
      num(price2),
      t(`${symbol}.${euroLeadIn(euroSwitch)}`),
    ]
    if (opts.injectTrap) {
      parts.push(t(`La tienda cierra en`), trap(trapTime), t(`horas.`))
    }
    parts.push(t(`¿Cuánto dinero te sobra?`))

    const tk = assemble(parts)
    const strategy = buildPhaseStrategy({
      datos: `Tienes ${budget} ${symbol}, y gastas ${price1} ${symbol} y ${price2} ${symbol}.`,
      plan: `Primero lo gastado en total (sumamos), luego lo que sobra (restamos del presupuesto).`,
      calculo: [`${price1} + ${price2} = ${spent}`, `${budget} − ${spent} = ${left}`],
      comprobar: `Lo que sobra (${left} ${symbol}) más lo gastado (${spent} ${symbol}) da ${budget} ${symbol}, tu presupuesto. ¡Cuadra!`,
      trapCallout: opts.injectTrap ? `las ${trapTime} horas hasta el cierre` : undefined,
    })

    return boundProblem(tk, left, [strategy], MICROLESSON)
  },
}

/** "precio total" (1-step): buy N equal items at U each → total cost. */
const precioTotal: ProblemTemplate = {
  id: 'precio-total',
  contexts: ['dinero', 'compra'],
  steps: 1,
  supportsTrap: true,
  difficultyRange: [1, 4],
  bind(rng, difficulty, flavor, opts): BoundProblem {
    const { symbol, euroSwitch } = moneySymbol(flavor)
    const item = pickCountable(rng)
    const count = rollQuantity(rng, difficulty)
    const unit = rollPrice(rng, difficulty)
    const total = unit * count

    const trapMinutes = rollTrap(rng, 5, 30, [unit, count, total])
    const parts = [
      t(`Cada ${item.singular} cuesta`),
      num(unit),
      t(`${symbol} y compráis`),
      num(count),
      t(`${item.plural}.${euroLeadIn(euroSwitch)}`),
    ]
    if (opts.injectTrap) {
      parts.push(t(`Esperáis`), trap(trapMinutes), t(`minutos en la cola.`))
    }
    parts.push(t(`¿Cuánto pagáis en total?`))

    const tk = assemble(parts)
    const strategy = buildPhaseStrategy({
      datos: `Cada ${item.singular} cuesta ${unit} ${symbol} y compráis ${count}.`,
      plan: `Nos preguntan el total; multiplicamos el precio de ${unaSola(item)} por cuántas compráis.`,
      calculo: [`${unit} × ${count} = ${total}`],
      comprobar: `${total} ${symbol} entre ${count} da ${unit} ${symbol} ${cadaUno(item)}. ¡Cuadra!`,
      trapCallout: opts.injectTrap ? `los ${trapMinutes} minutos de cola` : undefined,
    })

    return boundProblem(tk, total, [strategy], MICROLESSON)
  },
}

export const DINERO_TEMPLATES: ProblemTemplate[] = [
  precioTotal,
  precioUnitario,
  compraConCambio,
  ahorroHucha,
  compararPrecios,
  presupuesto,
]

// Re-export types some callers may want without reaching into the core module.
export type { BindOptions, BoundProblem }
