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
import { patronesGenerator, formasGenerator, simetriaGenerator } from './patterns'
import { clasificarGenerator, posicionesGenerator } from './logicScenes'
import { letrasGenerator, numerosTrazoGenerator, espejoGenerator } from './tracing'

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
registerGenerator(patronesGenerator)
registerGenerator(formasGenerator)
registerGenerator(simetriaGenerator)
registerGenerator(clasificarGenerator)
registerGenerator(posicionesGenerator)
registerGenerator(letrasGenerator)
registerGenerator(numerosTrazoGenerator)
registerGenerator(espejoGenerator)

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
  patronesGenerator,
  formasGenerator,
  simetriaGenerator,
  clasificarGenerator,
  posicionesGenerator,
  letrasGenerator,
  numerosTrazoGenerator,
  espejoGenerator,
}
