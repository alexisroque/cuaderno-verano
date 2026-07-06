import { registerGenerator } from '../framework'
import {
  contarSeisGenerator,
  contarVeinteGenerator,
  compararGenerator,
} from './counting'
import {
  descomponerCuatroSeisGenerator,
  descomponerSieteNueveGenerator,
  doblesGenerator,
  masMenosUnoDosGenerator,
  simbolosGenerator,
  estimarGenerator,
} from './decomposition'

/**
 * Registers every Leo generator on import, mirroring `generators/aira/index.ts`.
 * Callers that need generators available just `import './generators/leo'`
 * (or import a symbol from here) before calling `getGenerator`.
 */
registerGenerator(contarSeisGenerator)
registerGenerator(contarVeinteGenerator)
registerGenerator(compararGenerator)
registerGenerator(descomponerCuatroSeisGenerator)
registerGenerator(descomponerSieteNueveGenerator)
registerGenerator(doblesGenerator)
registerGenerator(masMenosUnoDosGenerator)
registerGenerator(simbolosGenerator)
registerGenerator(estimarGenerator)

export {
  contarSeisGenerator,
  contarVeinteGenerator,
  compararGenerator,
  descomponerCuatroSeisGenerator,
  descomponerSieteNueveGenerator,
  doblesGenerator,
  masMenosUnoDosGenerator,
  simbolosGenerator,
  estimarGenerator,
}
