import type { ContentBundle } from '../types/content'
import type { GemState, ProfileProgress } from '../types/progress'
import type { ChildSettings } from '../state/settingsStore'
import type { ProfileId } from '../state/profileStore'
import { createRng, type Rng } from '../lib/rng'
import { CATALOG, skillOfSubskill, type SubskillId } from './skills'
import { pickSubskill } from './scheduler'
import { suggestedDifficulty } from './mastery'
import { consumedIds, pickDictadoContent, pickUnconsumed } from './contentSelection'

/** Fixed rotation order for Leo's daily "sorpresa-rotatoria" card. */
const LEO_ROTATION: readonly string[] = ['patrones', 'formas', 'simetria', 'clasificar', 'posiciones', 'cuento']

const AIRA_CARD_TYPES = ['problema', 'dictado', 'sabias-que', 'diario'] as const
const LEO_BASE_CARD_TYPES = ['trazos', 'contar', 'english'] as const

type AiraCardType = (typeof AIRA_CARD_TYPES)[number]
type LeoCardType = (typeof LEO_BASE_CARD_TYPES)[number] | 'sorpresa-rotatoria'
export type CardType = AiraCardType | LeoCardType

export interface ContentRef {
  seriesId?: string
  episodeId?: string
  jokeId?: string
  curiosityId?: string
  promptId?: string
  cuentoId?: string
}

/** A card DESCRIPTOR: what to render, not a materialized exercise instance. */
export interface CardDescriptor {
  cardType: CardType
  subskill?: SubskillId
  contentRef?: ContentRef
  generatorSeed: string
  difficulty?: number
  challenge?: boolean
  language?: 'ca' | 'es'
}

/** Builds the `dictado` card: either a joke or the next unconsumed episode, with a seeded language. */
function buildDictadoCard(rng: Rng, content: ContentBundle, progress: ProfileProgress, seed: string): CardDescriptor {
  const { contentRef, language } = pickDictadoContent(rng, content, progress)
  return { cardType: 'dictado', contentRef, generatorSeed: seed, language }
}

/** Builds the `problema` card: subskill restricted to problemas/calculo, difficulty from mastery + parent offset. */
function buildProblemaCard(
  rng: Rng,
  attempts: ProfileProgress['attempts'],
  settings: ChildSettings,
  dateISO: string,
  gems: Record<string, GemState>,
  seed: string,
): CardDescriptor {
  const subskillId = pickSubskill(rng, attempts, 'aira', settings, dateISO, gems, {
    skillFilter: ['problemas', 'calculo'],
  })

  const owningSkill = skillOfSubskill('aira', subskillId) ?? 'problemas'
  const skills = CATALOG.aira.skills as Record<
    string,
    { subskills: Record<string, { difficultyRange: [number, number] }> }
  >
  const difficultyRange = skills[owningSkill]?.subskills[subskillId]?.difficultyRange ?? [1, 5]

  const base = suggestedDifficulty(attempts, { id: subskillId, skill: owningSkill, difficultyRange })
  const offset = settings.subskillAdjustments[subskillId]?.difficultyOffset ?? 0
  const [min, max] = difficultyRange
  const difficulty = Math.min(max, Math.max(min, base + offset))

  return { cardType: 'problema', subskill: subskillId, generatorSeed: seed, difficulty }
}

function buildSabiasQueCard(rng: Rng, content: ContentBundle, progress: ProfileProgress, seed: string): CardDescriptor {
  const picked = pickUnconsumed(rng, content.curiosities, consumedIds(progress, 'curiosities'))
  return { cardType: 'sabias-que', contentRef: picked ? { curiosityId: picked.id } : undefined, generatorSeed: seed }
}

function buildDiarioCard(rng: Rng, content: ContentBundle, progress: ProfileProgress, seed: string): CardDescriptor {
  const picked = pickUnconsumed(rng, content.diaryPrompts, consumedIds(progress, 'diaryPrompts'))
  return { cardType: 'diario', contentRef: picked ? { promptId: picked.id } : undefined, generatorSeed: seed }
}

/** Builds Aira's mission cards: [problema, dictado, sabias-que, diario], truncated to `settings.missionSize`. */
export function buildAiraCards(
  dateISO: string,
  profile: ProfileId,
  progress: ProfileProgress,
  content: ContentBundle,
  settings: ChildSettings,
  gems: Record<string, GemState>,
): CardDescriptor[] {
  const cards: CardDescriptor[] = []

  for (let i = 0; i < settings.missionSize && i < AIRA_CARD_TYPES.length; i++) {
    const seed = `${dateISO}:${profile}:${i}`
    const rng = createRng(seed)
    const cardType = AIRA_CARD_TYPES[i]

    switch (cardType) {
      case 'problema':
        cards.push(buildProblemaCard(rng, progress.attempts, settings, dateISO, gems, seed))
        break
      case 'dictado':
        cards.push(buildDictadoCard(rng, content, progress, seed))
        break
      case 'sabias-que':
        cards.push(buildSabiasQueCard(rng, content, progress, seed))
        break
      case 'diario':
        cards.push(buildDiarioCard(rng, content, progress, seed))
        break
    }
  }

  return cards
}

/** Deterministically rotates the Leo "sorpresa-rotatoria" pick by day count since a fixed epoch. */
function pickRotatingSorpresa(dateISO: string): string {
  const epochMillis = Date.parse('2026-01-01T00:00:00Z')
  const dayMillis = Date.parse(`${dateISO}T00:00:00Z`)
  const daysSinceEpoch = Math.round((dayMillis - epochMillis) / (24 * 60 * 60 * 1000))
  const index = ((daysSinceEpoch % LEO_ROTATION.length) + LEO_ROTATION.length) % LEO_ROTATION.length
  return LEO_ROTATION[index]
}

const LEO_SKILL_BY_SLOT: Record<(typeof LEO_BASE_CARD_TYPES)[number], 'trazos' | 'numeros' | 'english'> = {
  trazos: 'trazos',
  contar: 'numeros',
  english: 'english',
}

function buildRotationCard(dateISO: string, profile: ProfileId, progress: ProfileProgress, content: ContentBundle, index: number): CardDescriptor {
  const seed = `${dateISO}:${profile}:${index}`
  const pick = pickRotatingSorpresa(dateISO)

  if (pick === 'cuento') {
    const picked = pickUnconsumed(createRng(seed), content.cuentosLeo, consumedIds(progress, 'cuentosLeo'))
    return {
      cardType: 'sorpresa-rotatoria',
      subskill: 'cuento',
      contentRef: picked ? { cuentoId: picked.id } : undefined,
      generatorSeed: seed,
    }
  }

  return { cardType: 'sorpresa-rotatoria', subskill: pick, generatorSeed: seed }
}

/** Builds Leo's mission cards: [trazos, contar, english] (truncated to `settings.missionSize`) + sorpresa-rotatoria. */
export function buildLeoCards(
  dateISO: string,
  profile: ProfileId,
  progress: ProfileProgress,
  content: ContentBundle,
  settings: ChildSettings,
  gems: Record<string, GemState>,
): CardDescriptor[] {
  const cards: CardDescriptor[] = []

  for (let i = 0; i < settings.missionSize && i < LEO_BASE_CARD_TYPES.length; i++) {
    const seed = `${dateISO}:${profile}:${i}`
    const rng = createRng(seed)
    const cardType = LEO_BASE_CARD_TYPES[i]
    const subskillId = pickSubskill(rng, progress.attempts, 'leo', settings, dateISO, gems, {
      skillFilter: [LEO_SKILL_BY_SLOT[cardType]],
    })
    cards.push({ cardType, subskill: subskillId, generatorSeed: seed })
  }

  cards.push(buildRotationCard(dateISO, profile, progress, content, cards.length))
  return cards
}
