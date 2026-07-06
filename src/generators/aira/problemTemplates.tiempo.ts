import type { Rng } from '../../lib/rng'
import {
  assemble,
  boundProblem,
  rollTrap,
  buildPhaseStrategy,
  capitalizeFirst,
  venue,
  num,
  t,
  trap,
  type BoundProblem,
  type ProblemTemplate,
} from './problemTemplates'

const MICROLESSON = 'Manejar bien las horas y los minutos te ayuda a no perder un vuelo, un tren ni una actividad del viaje.'

/** Formats minutes-since-midnight as "H:MM" (24h, no leading zero on the hour). */
function fmtClock(minutes: number): string {
  const h = Math.floor(minutes / 60) % 24
  const m = minutes % 60
  return `${h}:${String(m).padStart(2, '0')}`
}

/** Rolls a "nice" clock time: quarter-hours for d<=3, 5-minute granularity for d>=4. */
function rollClock(rng: Rng, difficulty: number): number {
  const hour = rng.int(8, 18)
  const minuteOptions = difficulty <= 3 ? [0, 15, 30, 45] : [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55]
  return hour * 60 + rng.pick(minuteOptions)
}

/** Rolls a duration in minutes: quarter-hour multiples for d<=3, 5-minute for d>=4. */
function rollDuration(rng: Rng, difficulty: number): number {
  if (difficulty <= 3) return rng.pick([15, 30, 45, 60, 90])
  return rng.pick([20, 35, 40, 50, 55, 70, 85, 100])
}

/** "duración de trayecto" (1-step): start and end time → how long it lasted. */
const duracionTrayecto: ProblemTemplate = {
  id: 'duracion-trayecto',
  contexts: ['tiempo'],
  steps: 1,
  supportsTrap: true,
  difficultyRange: [2, 5],
  bind(rng, difficulty, _flavor, opts): BoundProblem {
    const start = rollClock(rng, difficulty)
    const duration = rollDuration(rng, difficulty)
    const end = start + duration
    const place = venue(rng)

    const trapCount = rollTrap(rng, 2, 8, [start, end, duration])
    const parts = [
      t(`El trayecto hasta ${place} sale a las`),
      num(start, { display: fmtClock(start) }),
      t(`y llega a las`),
      num(end, { display: fmtClock(end), suffix: '.' }),
    ]
    if (opts.injectTrap) {
      parts.push(t(`En el camino veis`), trap(trapCount), t(`puentes.`))
    }
    parts.push(t(`¿Cuántos minutos dura el trayecto?`))

    const tk = assemble(parts)

    const strategy = buildPhaseStrategy({
      datos: `Sale a las ${fmtClock(start)} y llega a las ${fmtClock(end)}.`,
      plan: `Nos preguntan cuánto dura; restamos la hora de salida de la de llegada, contando en minutos.`,
      calculo: [`${end} − ${start} = ${duration}`],
      comprobar: `Si a las ${fmtClock(start)} le sumas ${duration} minutos llegas a las ${fmtClock(end)}. ¡Cuadra!`,
      trapCallout: opts.injectTrap ? `los ${trapCount} puentes del camino` : undefined,
    })

    return boundProblem(tk, duration, [strategy], MICROLESSON)
  },
}

/** "hora de llegada" (1-step): start time + duration → arrival time (answer in minutes-since-midnight). */
const horaLlegada: ProblemTemplate = {
  id: 'hora-llegada',
  contexts: ['tiempo'],
  steps: 1,
  supportsTrap: true,
  difficultyRange: [1, 4],
  bind(rng, difficulty, _flavor, opts): BoundProblem {
    const start = rollClock(rng, difficulty)
    const duration = rollDuration(rng, difficulty)
    const end = start + duration
    const place = venue(rng)

    const trapPeople = rollTrap(rng, 10, 40, [start, end, duration])
    const parts = [
      t(`Salís hacia ${place} a las`),
      num(start, { display: fmtClock(start) }),
      t(`y el trayecto dura`),
      num(duration),
      t(`minutos.`),
    ]
    if (opts.injectTrap) {
      parts.push(t(`En el autobús viajan`), trap(trapPeople), t(`personas.`))
    }
    parts.push(t(`¿A qué hora llegáis, en minutos desde medianoche?`))

    const tk = assemble(parts)

    const strategy = buildPhaseStrategy({
      datos: `Salís a las ${fmtClock(start)} y el trayecto dura ${duration} minutos.`,
      plan: `Nos preguntan la hora de llegada; sumamos los minutos de trayecto a la hora de salida.`,
      calculo: [`${start} + ${duration} = ${end}`],
      comprobar: `${end} minutos desde medianoche son las ${fmtClock(end)}, más tarde que la salida (${fmtClock(start)}). ¡Cuadra!`,
      trapCallout: opts.injectTrap ? `las ${trapPeople} personas del autobús` : undefined,
    })

    return boundProblem(tk, end, [strategy], MICROLESSON)
  },
}

/** "cuánto falta" (1-step): now vs an event time → minutes remaining. */
const cuantoFalta: ProblemTemplate = {
  id: 'cuanto-falta',
  contexts: ['tiempo'],
  steps: 1,
  supportsTrap: true,
  difficultyRange: [1, 4],
  bind(rng, difficulty, _flavor, opts): BoundProblem {
    const now = rollClock(rng, difficulty)
    const wait = rollDuration(rng, difficulty)
    const event = now + wait
    const place = venue(rng)

    const trapNum = rollTrap(rng, 2, 9, [now, event, wait])
    const parts = [
      t(`Ahora son las`),
      num(now, { display: fmtClock(now) }),
      t(`y la actividad en ${place} empieza a las`),
      num(event, { display: fmtClock(event), suffix: '.' }),
    ]
    if (opts.injectTrap) {
      parts.push(t(`El grupo tiene`), trap(trapNum), t(`familias.`))
    }
    parts.push(t(`¿Cuántos minutos faltan para que empiece?`))

    const tk = assemble(parts)

    const strategy = buildPhaseStrategy({
      datos: `Ahora son las ${fmtClock(now)} y la visita empieza a las ${fmtClock(event)}.`,
      plan: `Nos preguntan cuánto falta; restamos la hora de ahora de la hora de inicio.`,
      calculo: [`${event} − ${now} = ${wait}`],
      comprobar: `Si a las ${fmtClock(now)} le sumas ${wait} minutos llegas a las ${fmtClock(event)}. ¡Cuadra!`,
      trapCallout: opts.injectTrap ? `las ${trapNum} familias del grupo` : undefined,
    })

    return boundProblem(tk, wait, [strategy], MICROLESSON)
  },
}

/** "horarios de apertura" (1-step): open and close time → how many minutes open. */
const horarioApertura: ProblemTemplate = {
  id: 'horario-apertura',
  contexts: ['tiempo'],
  steps: 1,
  supportsTrap: true,
  difficultyRange: [2, 5],
  bind(rng, difficulty, _flavor, opts): BoundProblem {
    const open = rollClock(rng, Math.min(difficulty, 3)) // opens on a nice quarter-hour
    const openMinutes = rollDuration(rng, difficulty) + rng.pick([60, 120, 180])
    const close = open + openMinutes
    const place = venue(rng)

    const trapPrice = rollTrap(rng, 5, 20, [open, close, openMinutes])
    const parts = [
      t(`${capitalizeFirst(place)} abre a las`),
      num(open, { display: fmtClock(open) }),
      t(`y cierra a las`),
      num(close, { display: fmtClock(close), suffix: '.' }),
    ]
    if (opts.injectTrap) {
      parts.push(t(`La entrada cuesta`), trap(trapPrice), t(`euros.`))
    }
    parts.push(t(`¿Cuántos minutos está abierto?`))

    const tk = assemble(parts)

    const strategy = buildPhaseStrategy({
      datos: `Abre a las ${fmtClock(open)} y cierra a las ${fmtClock(close)}.`,
      plan: `Nos preguntan cuánto rato está abierto; restamos la hora de apertura de la de cierre.`,
      calculo: [`${close} − ${open} = ${openMinutes}`],
      comprobar: `Si a las ${fmtClock(open)} le sumas ${openMinutes} minutos llegas a las ${fmtClock(close)}. ¡Cuadra!`,
      trapCallout: opts.injectTrap ? `los ${trapPrice} euros de la entrada` : undefined,
    })

    return boundProblem(tk, openMinutes, [strategy], MICROLESSON)
  },
}

/** "minutos ↔ horas" (1-step): convert whole hours to minutes. */
const minutosHoras: ProblemTemplate = {
  id: 'minutos-horas',
  contexts: ['tiempo'],
  steps: 1,
  supportsTrap: true,
  difficultyRange: [1, 4],
  bind(rng, difficulty, _flavor, opts): BoundProblem {
    const hours = rng.int(2, difficulty <= 2 ? 4 : 8)
    const minutes = hours * 60

    const trapKm = rollTrap(rng, 50, 300, [hours, minutes])
    const parts = [
      t(`El vuelo dura`),
      num(hours),
      t(`horas.`),
    ]
    if (opts.injectTrap) {
      parts.push(t(`El avión vuela a`), trap(trapKm), t(`kilómetros por hora.`))
    }
    parts.push(t(`¿Cuántos minutos son en total?`))

    const tk = assemble(parts)
    const strategy = buildPhaseStrategy({
      datos: `El vuelo dura ${hours} horas, y cada hora tiene 60 minutos.`,
      plan: `Nos preguntan los minutos; multiplicamos las horas por 60.`,
      calculo: [`${hours} × 60 = ${minutes}`],
      comprobar: `Al revés: ${minutes} ÷ 60 = ${hours} horas. ¡Cuadra!`,
      trapCallout: opts.injectTrap ? `los ${trapKm} kilómetros por hora` : undefined,
    })

    return boundProblem(tk, minutes, [strategy], MICROLESSON)
  },
}

/** "hora de salida" (1-step): arrival time − duration → departure time (answer in minutes-since-midnight). */
const horaSalida: ProblemTemplate = {
  id: 'hora-salida',
  contexts: ['tiempo'],
  steps: 1,
  supportsTrap: true,
  difficultyRange: [2, 5],
  bind(rng, difficulty, _flavor, opts): BoundProblem {
    const duration = rollDuration(rng, difficulty)
    const arrival = rollClock(rng, difficulty) + duration // ensure departure stays positive/nice
    const departure = arrival - duration
    const place = venue(rng)

    const trapSeats = rollTrap(rng, 20, 60, [arrival, duration, departure])
    const parts = [
      t(`Queréis llegar hasta ${place} a las`),
      num(arrival, { display: fmtClock(arrival) }),
      t(`y el trayecto dura`),
      num(duration),
      t(`minutos.`),
    ]
    if (opts.injectTrap) {
      parts.push(t(`El autobús tiene`), trap(trapSeats), t(`asientos.`))
    }
    parts.push(t(`¿A qué hora tenéis que salir, en minutos desde medianoche?`))

    const tk = assemble(parts)

    const strategy = buildPhaseStrategy({
      datos: `Queréis llegar a las ${fmtClock(arrival)} y el trayecto dura ${duration} minutos.`,
      plan: `Nos preguntan la hora de salida; restamos los minutos de trayecto a la hora de llegada.`,
      calculo: [`${arrival} − ${duration} = ${departure}`],
      comprobar: `${departure} minutos desde medianoche son las ${fmtClock(departure)}, antes de la llegada (${fmtClock(arrival)}). ¡Cuadra!`,
      trapCallout: opts.injectTrap ? `los ${trapSeats} asientos del autobús` : undefined,
    })

    return boundProblem(tk, departure, [strategy], MICROLESSON)
  },
}

export const TIEMPO_TEMPLATES: ProblemTemplate[] = [
  duracionTrayecto,
  horaLlegada,
  horaSalida,
  cuantoFalta,
  horarioApertura,
  minutosHoras,
]
