import { registerGenerator } from '../framework'
import { mult1CifraGenerator, mult2CifrasGenerator } from './multiplication'
import { tablasGenerator } from './tables'
import { cajitasGenerator } from './cajitas'

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

export { mult1CifraGenerator, mult2CifrasGenerator, tablasGenerator, cajitasGenerator }
