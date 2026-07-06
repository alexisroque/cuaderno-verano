import type { Strategy } from '../../types/exercise'

/**
 * "Parte de una unidad": a single whole (pizza/pastel) cut into `den` equal
 * slices, `num` of them shaded. Answer is just `num`/`den` shown visually —
 * the strategy walks through counting shaded vs total slices.
 */
export function buildPartOfUnitStrategy(num: number, den: number): Strategy {
  return {
    id: 'parte-de-unidad',
    name: 'Parte de una unidad',
    steps: [
      { text: `Partimos el entero en ${den} trozos iguales.` },
      { text: `Coloreamos ${num} de esos ${den} trozos.` },
      { text: `Eso es la fracción ${num}/${den}.` },
    ],
  }
}

/**
 * "Parte de una colección": splits `whole` objects into `den` equal groups
 * (÷den), then takes `num` of those groups (×num) — e.g. 3/4 de 36 = 27 via
 * 36÷4=9, 9×3=27. `whole` must be exactly divisible by `den` by construction.
 */
export function buildPartOfCollectionStrategy(whole: number, num: number, den: number): Strategy {
  const perGroup = whole / den
  const result = perGroup * num

  return {
    id: 'parte-de-coleccion',
    name: 'Parte de una colección',
    steps: [
      { text: `Repartimos ${whole} en ${den} grupos iguales.` },
      { text: `${whole} ÷ ${den} = ${perGroup}` },
      { text: `Como queremos ${num} de esos grupos, multiplicamos: ${perGroup} × ${num} = ${result}` },
    ],
  }
}

/**
 * "Comparar fracciones": compares num1/den by cross-multiplying against
 * num2/den2 when denominators differ, or directly comparing numerators when
 * denominators match. Always states the correct relation.
 */
export function buildComparisonStrategy(num1: number, den1: number, num2: number, den2: number): Strategy {
  if (den1 === den2) {
    const relation = num1 > num2 ? 'mayor que' : num1 < num2 ? 'menor que' : 'igual a'
    return {
      id: 'comparar-mismo-denominador',
      name: 'Comparar con el mismo denominador',
      steps: [
        { text: `Las dos fracciones tienen el mismo denominador (${den1}), así que comparamos los numeradores.` },
        { text: `${num1} es ${relation} ${num2}, así que ${num1}/${den1} es ${relation} ${num2}/${den2}.` },
      ],
    }
  }

  const cross1 = num1 * den2
  const cross2 = num2 * den1
  const relation = cross1 > cross2 ? 'mayor que' : cross1 < cross2 ? 'menor que' : 'igual a'

  return {
    id: 'comparar-productos-cruzados',
    name: 'Comparar multiplicando en cruz',
    steps: [
      { text: `Multiplicamos en cruz: ${num1} × ${den2} = ${cross1}, y ${num2} × ${den1} = ${cross2}.` },
      { text: `${cross1} es ${relation} ${cross2}, así que ${num1}/${den1} es ${relation} ${num2}/${den2}.` },
    ],
  }
}

/**
 * "Fracciones equivalentes": scales num/den by `k` (same number top and
 * bottom) to get an equivalent fraction — the core equivalence rule.
 */
export function buildEquivalentStrategy(num: number, den: number, k: number): Strategy {
  const equivNum = num * k
  const equivDen = den * k

  return {
    id: 'fracciones-equivalentes',
    name: 'Fracciones equivalentes',
    steps: [
      { text: `Multiplicamos numerador y denominador por el mismo número: ${k}.` },
      { text: `${num} × ${k} = ${equivNum}, y ${den} × ${k} = ${equivDen}.` },
      { text: `${num}/${den} y ${equivNum}/${equivDen} son fracciones equivalentes: representan la misma cantidad.` },
    ],
  }
}
