import type { Chapter } from '../content/schemas'
import type { ProfileProgress } from '../types/progress'
import { createRng } from '../lib/rng'

/**
 * A purchasable item in "El Cofre de los Tesoros". Cosmetic/bonus only — never
 * anything that affects learning. Prices are flat and cheap (5-15 coins) so a
 * child can afford one after a couple of days.
 */
export interface Treasure {
  id: string
  emoji: string
  name: string
  description: string
  cost: number
  category: 'curiosidad' | 'chiste' | 'pegatina' | 'accesorio'
}

/** The treasure catalog. Accessories are cosmetic hats/scarves worn by the mascot. */
export const TREASURES: Treasure[] = [
  { id: 'cur-premium-espacio', emoji: '🚀', name: 'Dato secreto del espacio', description: 'Una curiosidad premium sobre el universo.', cost: 8, category: 'curiosidad' },
  { id: 'cur-premium-animales', emoji: '🦥', name: 'Dato secreto de animales', description: 'Un dato increíble de la selva.', cost: 8, category: 'curiosidad' },
  { id: 'joke-pack-1', emoji: '😹', name: 'Pack de chistes', description: 'Cinco chistes nuevos para contar.', cost: 6, category: 'chiste' },
  { id: 'sticker-bonus-arcoiris', emoji: '🌈', name: 'Pegatina arcoíris', description: 'Una pegatina brillante para tu mural.', cost: 10, category: 'pegatina' },
  { id: 'sticker-bonus-cohete', emoji: '🛸', name: 'Pegatina platillo', description: 'Un OVNI para tu colección.', cost: 10, category: 'pegatina' },
  { id: 'hat-party', emoji: '🎉', name: 'Gorro de fiesta', description: 'Tu mascota se pone un gorro de fiesta.', cost: 12, category: 'accesorio' },
  { id: 'hat-crown', emoji: '👑', name: 'Corona', description: 'Tu mascota se corona.', cost: 15, category: 'accesorio' },
  { id: 'scarf-cool', emoji: '🧣', name: 'Bufanda molona', description: 'Tu mascota se abriga con estilo.', cost: 12, category: 'accesorio' },
]

/** Looks up a treasure by id, or undefined. */
export function treasureById(id: string): Treasure | undefined {
  return TREASURES.find((t) => t.id === id)
}

/**
 * Whether `profile` can afford `treasure` and hasn't already unlocked it.
 * Pure over the passed coins/unlocked set so it's trivially testable and the
 * UI and the purchase action agree on the exact same rule.
 */
export function canAfford(coins: number, unlocked: string[], treasure: Treasure): boolean {
  return coins >= treasure.cost && !unlocked.includes(treasure.id)
}

/** The mascot accessory currently equipped (last-unlocked accessory), or undefined. */
export function equippedAccessory(unlocked: string[]): Treasure | undefined {
  const accessories = unlocked.map(treasureById).filter((t): t is Treasure => t?.category === 'accesorio')
  return accessories.length > 0 ? accessories[accessories.length - 1] : undefined
}

/**
 * Deterministically picks which sticker id a completed day grants Leo, from
 * `chapter.stickers`. Seeded by `dateISO`+chapter so the same completed day
 * always grants the same sticker (idempotent grant), and consecutive days in a
 * chapter walk different stickers. Returns the sticker id (chapter-scoped
 * `${chapterId}:${stickerId}` so the same emoji in two chapters stays distinct).
 */
export function stickerForDay(chapter: Chapter, dateISO: string): string {
  const rng = createRng(`${chapter.id}:${dateISO}:sticker`)
  const sticker = rng.pick(chapter.stickers)
  return `${chapter.id}:${sticker.id}`
}

/** Splits a chapter-scoped sticker id back into its parts. */
export function parseStickerId(id: string): { chapterId: string; stickerId: string } {
  const idx = id.indexOf(':')
  if (idx === -1) return { chapterId: '', stickerId: id }
  return { chapterId: id.slice(0, idx), stickerId: id.slice(idx + 1) }
}

/** Resolves a chapter-scoped sticker id to its emoji, searching the given chapters. */
export function stickerEmoji(id: string, chapters: Chapter[]): string {
  const { chapterId, stickerId } = parseStickerId(id)
  const chapter = chapters.find((c) => c.id === chapterId)
  return chapter?.stickers.find((s) => s.id === stickerId)?.emoji ?? '⭐'
}

/**
 * Passport milestone entries derived from progress: gem levels reached, first
 * week, and desafío-cleared badges. Pure so the Passport screen just renders
 * the returned list. `daysActive` is the count of distinct completed days.
 */
export interface Milestone {
  id: string
  emoji: string
  label: string
  achieved: boolean
}

/** Builds the milestone list for the passport (achieved + not-yet, so it teaches). */
export function milestones(progress: ProfileProgress): Milestone[] {
  const daysActive = Object.values(progress.completedCards).filter((c) => c.length > 0).length
  const maxGem = Math.max(0, ...Object.values(progress.gems).map((g) => g.level))
  const clearedChallenge = progress.attempts.some((a) => a.difficulty >= 3 && a.correct)

  return [
    { id: 'primer-dia', emoji: '🌱', label: 'Tu primer día', achieved: daysActive >= 1 },
    { id: 'primera-semana', emoji: '📅', label: 'Primera semana (7 días)', achieved: daysActive >= 7 },
    { id: 'gema-ambar', emoji: '🟠', label: 'Primera gema Ámbar', achieved: maxGem >= 2 },
    { id: 'gema-diamante', emoji: '💎', label: 'Una gema Diamante', achieved: maxGem >= 5 },
    { id: 'desafio-5', emoji: '🚀', label: 'Desafío de 5º superado', achieved: clearedChallenge },
  ]
}
