import type { Strategy, VisualSpec } from '../../types/exercise'

/** "Cuadrado como rejilla de puntos": n² visualized as an n×n grid of dots, plus the repeated-addition cross-check. */
export function buildDotGridSquareStrategy(n: number): Strategy {
  const square = n * n
  const rows = Array.from({ length: n }, () => n).join(' + ')

  return {
    id: 'cuadrado-rejilla-puntos',
    name: 'Cuadrado como rejilla de puntos',
    steps: [
      { text: `Dibujamos una rejilla de ${n} filas por ${n} columnas de puntos.`, visual: { kind: 'dot-grid', n } as VisualSpec },
      { text: `${n} × ${n} = ${square}` },
      { text: `Si lo comprobamos sumando ${n} filas de ${n} puntos: ${rows} = ${square}.` },
    ],
  }
}

/**
 * "Raíz cuadrada inversa": given a perfect square, finds n by recognizing
 * it as a known n² fact — walks through nearby squares to locate it.
 */
export function buildInverseSquareStrategy(n: number): Strategy {
  const square = n * n
  const prevSquare = (n - 1) * (n - 1)
  const nextSquare = (n + 1) * (n + 1)

  return {
    id: 'raiz-cuadrada-inversa',
    name: 'Buscar la raíz cuadrada',
    steps: [
      { text: `Buscamos qué número multiplicado por sí mismo da ${square}.` },
      { text: `${n - 1} × ${n - 1} = ${prevSquare}, y ${n + 1} × ${n + 1} = ${nextSquare}, así que probamos con ${n}.` },
      { text: `${n} × ${n} = ${square}. ¡Es ${n}!` },
    ],
  }
}
