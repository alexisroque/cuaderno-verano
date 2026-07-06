import type { Rng } from '../../lib/rng'
import type { ChapterFlavorLite } from '../../types/exercise'

/**
 * Chapter `flavor.animals`/`flavor.foods` are full descriptive Spanish
 * phrases meant for reading kids ("Kiko el gato", "Bocadillo de tortilla"),
 * not bare nouns safe to drop into an emoji-count visual or a "¿Cuántos
 * monos ves?" question for a non-reading 4yo. This module maps those
 * phrases down to a tappable emoji plus the grammatical gender of the
 * generic noun Leo hears in the audioText ("mono" masc., "gaviota" fem.),
 * via keyword sniffing, with a safe animal-emoji fallback so every chapter
 * (including ones with unmapped phrases) still produces a valid pick.
 */
export interface EmojiNoun {
  emoji: string
  /** Generic singular noun a 4yo would say for this emoji, e.g. "mono", "gaviota". */
  noun: string
  /**
   * Correct Spanish plural for `noun`, e.g. "peces" for "pez", "orangutanes"
   * for "orangután", "leones" for "león". Explicit per-noun (rather than
   * derived by a generic rule) because the pool is small and curated, and
   * Spanish pluralization has irregular cases (-z -> -ces, dropped accents
   * on -án/-ón endings) that a naive `${noun}s` gets wrong — see
   * `pluralizeFallback` for the best-effort rule used only by the emoji
   * fallback pool below.
   */
  plural: string
  gender: 'm' | 'f'
}

/** Ordered keyword -> noun table; first matching keyword wins. Covers every animal/food phrase in content/chapters.json plus common extras. */
const ANIMAL_KEYWORDS: { keyword: RegExp; entry: EmojiNoun }[] = [
  { keyword: /gato/i, entry: { emoji: '🐱', noun: 'gato', plural: 'gatos', gender: 'm' } },
  { keyword: /paloma/i, entry: { emoji: '🐦', noun: 'paloma', plural: 'palomas', gender: 'f' } },
  { keyword: /pez|peces|pescad/i, entry: { emoji: '🐟', noun: 'pez', plural: 'peces', gender: 'm' } },
  { keyword: /perro/i, entry: { emoji: '🐶', noun: 'perro', plural: 'perros', gender: 'm' } },
  { keyword: /gaviota/i, entry: { emoji: '🐦', noun: 'gaviota', plural: 'gaviotas', gender: 'f' } },
  { keyword: /leona marina|foca|lobo marino/i, entry: { emoji: '🦭', noun: 'foca', plural: 'focas', gender: 'f' } },
  { keyword: /ave|aves|p[aá]jaro/i, entry: { emoji: '🐦', noun: 'pájaro', plural: 'pájaros', gender: 'm' } },
  { keyword: /mariposa/i, entry: { emoji: '🦋', noun: 'mariposa', plural: 'mariposas', gender: 'f' } },
  { keyword: /orangut[aá]n/i, entry: { emoji: '🦧', noun: 'orangután', plural: 'orangutanes', gender: 'm' } },
  { keyword: /oso/i, entry: { emoji: '🐻', noun: 'oso', plural: 'osos', gender: 'm' } },
  { keyword: /cala[oó]/i, entry: { emoji: '🦜', noun: 'calao', plural: 'calaos', gender: 'm' } },
  { keyword: /ardilla/i, entry: { emoji: '🐿️', noun: 'ardilla', plural: 'ardillas', gender: 'f' } },
  { keyword: /mono|narigud/i, entry: { emoji: '🐒', noun: 'mono', plural: 'monos', gender: 'm' } },
  { keyword: /elefante/i, entry: { emoji: '🐘', noun: 'elefante', plural: 'elefantes', gender: 'm' } },
  { keyword: /cocodrilo/i, entry: { emoji: '🐊', noun: 'cocodrilo', plural: 'cocodrilos', gender: 'm' } },
  { keyword: /tigre/i, entry: { emoji: '🐯', noun: 'tigre', plural: 'tigres', gender: 'm' } },
  { keyword: /murci[eé]lago/i, entry: { emoji: '🦇', noun: 'murciélago', plural: 'murciélagos', gender: 'm' } },
  { keyword: /pato/i, entry: { emoji: '🦆', noun: 'pato', plural: 'patos', gender: 'm' } },
  { keyword: /lib[eé]lula/i, entry: { emoji: '🦟', noun: 'libélula', plural: 'libélulas', gender: 'f' } },
  { keyword: /tortuga/i, entry: { emoji: '🐢', noun: 'tortuga', plural: 'tortugas', gender: 'f' } },
  { keyword: /mantarraya|raya/i, entry: { emoji: '🐠', noun: 'mantarraya', plural: 'mantarrayas', gender: 'f' } },
  { keyword: /payaso/i, entry: { emoji: '🐠', noun: 'pez payaso', plural: 'peces payaso', gender: 'm' } },
]

const FOOD_KEYWORDS: { keyword: RegExp; entry: EmojiNoun }[] = [
  { keyword: /helado/i, entry: { emoji: '🍦', noun: 'helado', plural: 'helados', gender: 'm' } },
  { keyword: /bocadillo/i, entry: { emoji: '🥪', noun: 'bocadillo', plural: 'bocadillos', gender: 'm' } },
  { keyword: /fruta|sand[ií]a|rambut[aá]n|dragón/i, entry: { emoji: '🍉', noun: 'fruta', plural: 'frutas', gender: 'f' } },
  { keyword: /galleta/i, entry: { emoji: '🍪', noun: 'galleta', plural: 'galletas', gender: 'f' } },
  { keyword: /agua|coco/i, entry: { emoji: '🥥', noun: 'coco', plural: 'cocos', gender: 'm' } },
  { keyword: /zumo|batido|t[eé]/i, entry: { emoji: '🥤', noun: 'zumo', plural: 'zumos', gender: 'm' } },
  { keyword: /arroz|nasi|paella/i, entry: { emoji: '🍚', noun: 'arroz', plural: 'arroces', gender: 'm' } },
  { keyword: /fideo|mie goreng|noodle/i, entry: { emoji: '🍜', noun: 'fideo', plural: 'fideos', gender: 'm' } },
  { keyword: /pescado|pez a la parrilla/i, entry: { emoji: '🐟', noun: 'pescado', plural: 'pescados', gender: 'm' } },
  { keyword: /pl[aá]tano|roti/i, entry: { emoji: '🥞', noun: 'roti', plural: 'rotis', gender: 'm' } },
]

/** Generic animal fallback pool, used whenever a flavor phrase doesn't match any keyword. */
const FALLBACK_ANIMALS: EmojiNoun[] = [
  { emoji: '🐶', noun: 'perro', plural: 'perros', gender: 'm' },
  { emoji: '🐱', noun: 'gato', plural: 'gatos', gender: 'm' },
  { emoji: '🐰', noun: 'conejo', plural: 'conejos', gender: 'm' },
  { emoji: '🐻', noun: 'oso', plural: 'osos', gender: 'm' },
  { emoji: '🐼', noun: 'panda', plural: 'pandas', gender: 'm' },
  { emoji: '🦁', noun: 'león', plural: 'leones', gender: 'm' },
  { emoji: '🐸', noun: 'rana', plural: 'ranas', gender: 'f' },
  { emoji: '🐢', noun: 'tortuga', plural: 'tortugas', gender: 'f' },
  { emoji: '🐦', noun: 'pájaro', plural: 'pájaros', gender: 'm' },
  { emoji: '🐟', noun: 'pez', plural: 'peces', gender: 'm' },
]

/** Generic food fallback pool. */
const FALLBACK_FOODS: EmojiNoun[] = [
  { emoji: '🍎', noun: 'manzana', plural: 'manzanas', gender: 'f' },
  { emoji: '🍌', noun: 'plátano', plural: 'plátanos', gender: 'm' },
  { emoji: '🍪', noun: 'galleta', plural: 'galletas', gender: 'f' },
  { emoji: '🍇', noun: 'uva', plural: 'uvas', gender: 'f' },
  { emoji: '🍦', noun: 'helado', plural: 'helados', gender: 'm' },
]

function mapPhrase(phrase: string, table: { keyword: RegExp; entry: EmojiNoun }[]): EmojiNoun | undefined {
  for (const { keyword, entry } of table) {
    if (keyword.test(phrase)) return entry
  }
  return undefined
}

/** Maps a chapter's `flavor.animals` phrases to emoji nouns, falling back to the generic pool for unmatched phrases. */
function resolveAnimalPool(flavor: ChapterFlavorLite): EmojiNoun[] {
  const mapped = flavor.animals.map((a) => mapPhrase(a, ANIMAL_KEYWORDS)).filter((e): e is EmojiNoun => e !== undefined)
  return mapped.length > 0 ? mapped : FALLBACK_ANIMALS
}

/** Maps a chapter's `flavor.foods` phrases to emoji nouns, falling back to the generic pool for unmatched phrases. */
function resolveFoodPool(flavor: ChapterFlavorLite): EmojiNoun[] {
  const mapped = flavor.foods.map((f) => mapPhrase(f, FOOD_KEYWORDS)).filter((e): e is EmojiNoun => e !== undefined)
  return mapped.length > 0 ? mapped : FALLBACK_FOODS
}

/** Picks one random animal emoji-noun from the chapter's flavor (or the fallback pool if unmapped). */
export function pickAnimal(rng: Rng, flavor: ChapterFlavorLite): EmojiNoun {
  return rng.pick(resolveAnimalPool(flavor))
}

/** Picks one random food emoji-noun from the chapter's flavor (or the fallback pool if unmapped). */
export function pickFood(rng: Rng, flavor: ChapterFlavorLite): EmojiNoun {
  return rng.pick(resolveFoodPool(flavor))
}

/** Picks `count` distinct emoji-nouns from the combined animal fallback pool, for classification/odd-one-out exercises that need several distinct categories. */
export function fallbackAnimalPool(): EmojiNoun[] {
  return FALLBACK_ANIMALS
}

export function fallbackFoodPool(): EmojiNoun[] {
  return FALLBACK_FOODS
}

/** "¿Cuántos/Cuántas" agreeing with the noun's gender. */
export function cuantosFor(noun: EmojiNoun): 'Cuántos' | 'Cuántas' {
  return noun.gender === 'm' ? 'Cuántos' : 'Cuántas'
}

/** "escondidos/escondidas" (plural, masc/fem) agreeing with the noun's gender — used by descomponer's "¿Cuántos/Cuántas están escondidos/escondidas?" prompt. */
export function escondidosFor(noun: EmojiNoun): 'escondidos' | 'escondidas' {
  return noun.gender === 'm' ? 'escondidos' : 'escondidas'
}

/**
 * Best-effort Spanish pluralization rule, used ONLY as a fallback for a
 * noun that somehow reaches an interpolation site without its curated
 * `plural` field (every noun in ANIMAL_KEYWORDS/FOOD_KEYWORDS/FALLBACK_*
 * above has one, so this should be dead code in practice — it exists as a
 * safety net, not the primary mechanism). Handles: -z -> -ces (pez ->
 * peces, lápiz -> lápices); a stressed/accented final vowel or an -n/-s
 * ending -> +es with the accent dropped (orangután -> orangutanes, león ->
 * leones); anything else -> +s (gato -> gatos).
 */
export function pluralizeFallback(singular: string): string {
  if (/z$/i.test(singular)) return `${singular.slice(0, -1)}ces`
  const accentedVowelEnding = /[áéíóú]$/i.test(singular)
  const consonantNeedingEs = /[nrlsdjyz]$/i.test(singular) && !/[aeiou]$/i.test(singular)
  if (accentedVowelEnding || consonantNeedingEs) {
    const deaccented = singular
      .replace(/á/g, 'a')
      .replace(/é/g, 'e')
      .replace(/í/g, 'i')
      .replace(/ó/g, 'o')
      .replace(/ú/g, 'u')
    return `${deaccented}es`
  }
  return `${singular}s`
}

/** Correct Spanish plural for `noun.noun` (from its curated `plural` field, falling back to `pluralizeFallback` if somehow missing). */
export function pluralOf(noun: EmojiNoun): string {
  return noun.plural ?? pluralizeFallback(noun.noun)
}

/** `noun.noun` if `count === 1`, else its correct plural — the safe replacement for the naive `${noun}${n === 1 ? '' : 's'}` interpolation. */
export function nounForCount(noun: EmojiNoun, count: number): string {
  return count === 1 ? noun.noun : pluralOf(noun)
}
