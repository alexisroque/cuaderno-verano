import { registerGenerator } from '../framework'
import { mult1CifraGenerator, mult2CifrasGenerator } from './multiplication'
import { tablasGenerator } from './tables'
import { cajitasGenerator } from './cajitas'
import { divRestoGenerator } from './division'
import { mentalGenerator } from './mental'
import { estimacionGenerator } from './estimation'
import { patronesCrecimientoGenerator } from './growthPatterns'
import { romanosGenerator } from './romanos'
import {
  WORD_PROBLEM_GENERATORS,
  unPasoGenerator,
  dosPasosGenerator,
  datoTrampaGenerator,
  dineroGenerator,
  tiempoGenerator,
  medidaGenerator,
} from './wordProblems'

/**
 * Registers every Aira generator on import. Callers that need generators
 * available just `import './generators/aira'` (or import a symbol from
 * here) before calling `getGenerator`. Adding a new generator is a
 * two-line change: create the generator module, then add its
 * `registerGenerator(...)` call below — the full-catalog coverage test
 * (landing with Task 2.6) will then verify every catalog subskill has a
 * registration.
 */
registerGenerator(mult1CifraGenerator)
registerGenerator(mult2CifrasGenerator)
registerGenerator(tablasGenerator)
registerGenerator(cajitasGenerator)
registerGenerator(divRestoGenerator)
registerGenerator(mentalGenerator)
registerGenerator(estimacionGenerator)
registerGenerator(patronesCrecimientoGenerator)
registerGenerator(romanosGenerator)
for (const gen of WORD_PROBLEM_GENERATORS) {
  registerGenerator(gen)
}

export {
  mult1CifraGenerator,
  mult2CifrasGenerator,
  tablasGenerator,
  cajitasGenerator,
  divRestoGenerator,
  mentalGenerator,
  estimacionGenerator,
  patronesCrecimientoGenerator,
  romanosGenerator,
  unPasoGenerator,
  dosPasosGenerator,
  datoTrampaGenerator,
  dineroGenerator,
  tiempoGenerator,
  medidaGenerator,
}
