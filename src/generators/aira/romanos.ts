import type { Rng } from '../../lib/rng'
import type { Answer, ChapterFlavorLite, Choice, Exercise, Generator } from '../../types/exercise'
import { clampDifficulty, exerciseId } from '../framework'

/** Standard subtractive-pair table, largest value first, used by both the encoder and to validate canonical form. */
const SUBTRACTIVE_PAIRS: [number, string][] = [
  [1000, 'M'],
  [900, 'CM'],
  [500, 'D'],
  [400, 'CD'],
  [100, 'C'],
  [90, 'XC'],
  [50, 'L'],
  [40, 'XL'],
  [10, 'X'],
  [9, 'IX'],
  [5, 'V'],
  [4, 'IV'],
  [1, 'I'],
]

/** Encodes a positive integer (1-3999 range is safe for this table) into canonical roman numeral notation. */
export function toRoman(n: number): string {
  let remaining = n
  let result = ''
  for (const [value, symbol] of SUBTRACTIVE_PAIRS) {
    while (remaining >= value) {
      result += symbol
      remaining -= value
    }
  }
  return result
}

const ROMAN_DIGIT_VALUES: Record<string, number> = { I: 1, V: 5, X: 10, L: 50, C: 100, D: 500, M: 1000 }

/** Decodes a canonical roman numeral string back to an integer, by summing/subtracting adjacent digit values left to right. */
export function fromRoman(roman: string): number {
  let total = 0
  for (let i = 0; i < roman.length; i++) {
    const value = ROMAN_DIGIT_VALUES[roman[i]]
    const nextValue = i + 1 < roman.length ? ROMAN_DIGIT_VALUES[roman[i + 1]] : 0
    if (value < nextValue) {
      total -= value
    } else {
      total += value
    }
  }
  return total
}

/** Max value per catalog difficulty (catalog range [1, 3]). */
const MAX_VALUE: Record<number, number> = { 1: 20, 2: 100, 3: 1000 }

type Kind = 'roman-to-decimal' | 'decimal-to-roman' | 'pick-correct-roman'
const KINDS: Kind[] = ['roman-to-decimal', 'decimal-to-roman', 'pick-correct-roman']

const MICROLESSON = 'Los romanos no tenían el cero: por eso su sistema era mucho más difícil que el nuestro.'

/** Builds plausible off-by-one/off-by-a-digit distractors for a roman numeral, all textually distinct from the correct answer. */
function buildRomanDistractors(rng: Rng, n: number): string[] {
  const distractors = new Set<string>()
  const deltas = [1, -1, 10, -10, 5, -5]
  for (const delta of deltas) {
    const candidate = n + delta
    if (candidate >= 1 && candidate !== n) {
      const roman = toRoman(candidate)
      if (roman !== toRoman(n)) distractors.add(roman)
    }
    if (distractors.size >= 3) break
  }
  // Fallback fill in the unlikely event of collisions exhausting the delta list.
  let guard = 0
  while (distractors.size < 3 && guard < 20) {
    const candidate = Math.max(1, n + rng.int(-15, 15))
    const roman = toRoman(candidate)
    if (roman !== toRoman(n)) distractors.add(roman)
    guard++
  }
  return [...distractors].slice(0, 3)
}

function buildRomanToDecimal(n: number): { prompt: string; answer: Answer; choices?: Choice[] } {
  return {
    prompt: `¿Qué número decimal es ${toRoman(n)}?`,
    answer: { kind: 'number', value: n },
  }
}

function buildDecimalToRoman(n: number): { prompt: string; answer: Answer; choices?: Choice[] } {
  return {
    prompt: `Escribe ${n} en números romanos.`,
    answer: { kind: 'text', value: toRoman(n) },
  }
}

function buildPickCorrectRoman(rng: Rng, n: number): { prompt: string; answer: Answer; choices?: Choice[] } {
  const correct = toRoman(n)
  const distractorValues = buildRomanDistractors(rng, n)
  const allValues = rng.shuffle([correct, ...distractorValues])
  const choices: Choice[] = allValues.map((v, i) => ({ id: `choice-${i}`, label: v }))
  const correctId = choices[allValues.indexOf(correct)].id

  return {
    prompt: `¿Cuál de estos números romanos representa el ${n}?`,
    answer: { kind: 'choice', correctId },
    choices,
  }
}

export const romanosGenerator: Generator = {
  subskill: 'romanos',
  generate(rng, requestedDifficulty, _flavor: ChapterFlavorLite): Exercise {
    // exerciseId must be the FIRST draw off rng for determinism.
    const id = exerciseId(rng, 'romanos', requestedDifficulty)
    const difficulty = clampDifficulty(requestedDifficulty, 1, 3)
    const maxValue = MAX_VALUE[difficulty]

    const n = rng.int(1, maxValue)
    const kind = rng.pick(KINDS)

    const built =
      kind === 'roman-to-decimal'
        ? buildRomanToDecimal(n)
        : kind === 'decimal-to-roman'
          ? buildDecimalToRoman(n)
          : buildPickCorrectRoman(rng, n)

    return {
      id,
      subskill: 'romanos',
      difficulty,
      prompt: { text: built.prompt },
      answer: built.answer,
      choices: built.choices,
      strategies: [
        {
          id: 'valores-romanos',
          name: 'Valores de las letras romanas',
          steps: [
            { text: `${toRoman(n)} = ${n}` },
            { text: 'Recuerda: M=1000, D=500, C=100, L=50, X=10, V=5, I=1, y una letra menor antes de una mayor se resta (como en IV o IX).' },
          ],
        },
      ],
      microlesson: MICROLESSON,
    }
  },
}
