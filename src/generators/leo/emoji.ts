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
  gender: 'm' | 'f'
}

/** Ordered keyword -> noun table; first matching keyword wins. Covers every animal/food phrase in content/chapters.json plus common extras. */
const ANIMAL_KEYWORDS: { keyword: RegExp; entry: EmojiNoun }[] = [
  { keyword: /gato/i, entry: { emoji: '🐱', noun: 'gato', gender: 'm' } },
  { keyword: /paloma/i, entry: { emoji: '🐦', noun: 'paloma', gender: 'f' } },
  { keyword: /pez|peces|pescad/i, entry: { emoji: '🐟', noun: 'pez', gender: 'm' } },
  { keyword: /perro/i, entry: { emoji: '🐶', noun: 'perro', gender: 'm' } },
  { keyword: /gaviota/i, entry: { emoji: '🐦', noun: 'gaviota', gender: 'f' } },
  { keyword: /leona marina|foca|lobo marino/i, entry: { emoji: '🦭', noun: 'foca', gender: 'f' } },
  { keyword: /ave|aves|p[aá]jaro/i, entry: { emoji: '🐦', noun: 'pájaro', gender: 'm' } },
  { keyword: /mariposa/i, entry: { emoji: '🦋', noun: 'mariposa', gender: 'f' } },
  { keyword: /orangut[aá]n/i, entry: { emoji: '🦧', noun: 'orangután', gender: 'm' } },
  { keyword: /oso/i, entry: { emoji: '🐻', noun: 'oso', gender: 'm' } },
  { keyword: /cala[oó]/i, entry: { emoji: '🦜', noun: 'calao', gender: 'm' } },
  { keyword: /ardilla/i, entry: { emoji: '🐿️', noun: 'ardilla', gender: 'f' } },
  { keyword: /mono|narigud/i, entry: { emoji: '🐒', noun: 'mono', gender: 'm' } },
  { keyword: /elefante/i, entry: { emoji: '🐘', noun: 'elefante', gender: 'm' } },
  { keyword: /cocodrilo/i, entry: { emoji: '🐊', noun: 'cocodrilo', gender: 'm' } },
  { keyword: /tigre/i, entry: { emoji: '🐯', noun: 'tigre', gender: 'm' } },
  { keyword: /murci[eé]lago/i, entry: { emoji: '🦇', noun: 'murciélago', gender: 'm' } },
  { keyword: /pato/i, entry: { emoji: '🦆', noun: 'pato', gender: 'm' } },
  { keyword: /lib[eé]lula/i, entry: { emoji: '🦟', noun: 'libélula', gender: 'f' } },
  { keyword: /tortuga/i, entry: { emoji: '🐢', noun: 'tortuga', gender: 'f' } },
  { keyword: /mantarraya|raya/i, entry: { emoji: '🐠', noun: 'mantarraya', gender: 'f' } },
  { keyword: /payaso/i, entry: { emoji: '🐠', noun: 'pez payaso', gender: 'm' } },
]

const FOOD_KEYWORDS: { keyword: RegExp; entry: EmojiNoun }[] = [
  { keyword: /helado/i, entry: { emoji: '🍦', noun: 'helado', gender: 'm' } },
  { keyword: /bocadillo/i, entry: { emoji: '🥪', noun: 'bocadillo', gender: 'm' } },
  { keyword: /fruta|sand[ií]a|rambut[aá]n|dragón/i, entry: { emoji: '🍉', noun: 'fruta', gender: 'f' } },
  { keyword: /galleta/i, entry: { emoji: '🍪', noun: 'galleta', gender: 'f' } },
  { keyword: /agua|coco/i, entry: { emoji: '🥥', noun: 'coco', gender: 'm' } },
  { keyword: /zumo|batido|t[eé]/i, entry: { emoji: '🥤', noun: 'zumo', gender: 'm' } },
  { keyword: /arroz|nasi|paella/i, entry: { emoji: '🍚', noun: 'arroz', gender: 'm' } },
  { keyword: /fideo|mie goreng|noodle/i, entry: { emoji: '🍜', noun: 'fideo', gender: 'm' } },
  { keyword: /pescado|pez a la parrilla/i, entry: { emoji: '🐟', noun: 'pescado', gender: 'm' } },
  { keyword: /pl[aá]tano|roti/i, entry: { emoji: '🥞', noun: 'roti', gender: 'm' } },
]

/** Generic animal fallback pool, used whenever a flavor phrase doesn't match any keyword. */
const FALLBACK_ANIMALS: EmojiNoun[] = [
  { emoji: '🐶', noun: 'perro', gender: 'm' },
  { emoji: '🐱', noun: 'gato', gender: 'm' },
  { emoji: '🐰', noun: 'conejo', gender: 'm' },
  { emoji: '🐻', noun: 'oso', gender: 'm' },
  { emoji: '🐼', noun: 'panda', gender: 'm' },
  { emoji: '🦁', noun: 'león', gender: 'm' },
  { emoji: '🐸', noun: 'rana', gender: 'f' },
  { emoji: '🐢', noun: 'tortuga', gender: 'f' },
  { emoji: '🐦', noun: 'pájaro', gender: 'm' },
  { emoji: '🐟', noun: 'pez', gender: 'm' },
]

/** Generic food fallback pool. */
const FALLBACK_FOODS: EmojiNoun[] = [
  { emoji: '🍎', noun: 'manzana', gender: 'f' },
  { emoji: '🍌', noun: 'plátano', gender: 'm' },
  { emoji: '🍪', noun: 'galleta', gender: 'f' },
  { emoji: '🍇', noun: 'uva', gender: 'f' },
  { emoji: '🍦', noun: 'helado', gender: 'm' },
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
