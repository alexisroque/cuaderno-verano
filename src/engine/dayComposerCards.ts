import type { ContentBundle } from '../types/content'
import type { GemState, ProfileProgress } from '../types/progress'
import type { ChildSettings } from '../state/settingsStore'
import type { ProfileId } from '../state/profileStore'
import { createRng, type Rng } from '../lib/rng'
import { CATALOG, skillOfSubskill, type SkillId, type SubskillDef, type SubskillId } from './skills'
import { pickSubskill } from './scheduler'
import { suggestedDifficulty } from './mastery'
import { consumedIds, pickDictadoContent, pickUnconsumed } from './contentSelection'
import type { Surprise } from './surprises'

/** Fixed rotation order for Leo's daily "sorpresa-rotatoria" card. */
const LEO_ROTATION: readonly string[] = ['patrones', 'formas', 'simetria', 'clasificar', 'posiciones', 'cuento']

/** Gem level (Ámbar) at/above which a skill's challenge subskills are servable. Mirrors scheduler.ts's CHALLENGE_GATE_LEVEL. */
const CHALLENGE_GATE_LEVEL = 2

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

/**
 * All challenge subskills (challenge: true) for `profile`, restricted to
 * `skillFilter`, whose owning skill's gem level is >= CHALLENGE_GATE_LEVEL.
 */
function unlockedChallengeSubskills(
  profile: ProfileId,
  skillFilter: SkillId[],
  gems: Record<string, GemState>,
): SubskillDef[] {
  const skills = CATALOG[profile].skills as Record<string, { subskills: Record<string, SubskillDef> }>
  const candidates: SubskillDef[] = []

  for (const skillId of skillFilter) {
    const def = skills[skillId]
    if (!def) continue
    const level = gems[skillId]?.level ?? 0
    if (level < CHALLENGE_GATE_LEVEL) continue
    for (const sub of Object.values(def.subskills)) {
      if (sub.challenge) candidates.push(sub)
    }
  }

  return candidates
}

/**
 * Picks a challenge subskill (seeded via `rng`) among `skillFilter`'s skills
 * whose gem level is >= CHALLENGE_GATE_LEVEL. `rollSurprise` only fires
 * `desafio` when `hasUnlockedChallengeSkill` already found a qualifying
 * skill (see surprises.ts), so a candidate is always expected here — this
 * throws with a clear message if that invariant is ever violated, so a
 * regression in the gating logic fails loudly in tests rather than silently
 * falling back to a non-challenge card.
 */
function pickChallengeSubskill(
  rng: Rng,
  profile: ProfileId,
  skillFilter: SkillId[],
  gems: Record<string, GemState>,
): SubskillDef {
  const candidates = unlockedChallengeSubskills(profile, skillFilter, gems)
  if (candidates.length === 0) {
    throw new Error(
      `pickChallengeSubskill: no unlocked challenge subskill found for profile "${profile}" among skills [${skillFilter.join(', ')}] — rollSurprise should only fire 'desafio' when one exists (see hasUnlockedChallengeSkill in surprises.ts). This indicates a gating mismatch between surprises.ts and dayComposerCards.ts.`,
    )
  }
  return rng.pick(candidates)
}

/** Builds the `dictado` card: either a joke or the next unconsumed episode, with a deterministic date-patterned language. */
function buildDictadoCard(
  rng: Rng,
  content: ContentBundle,
  progress: ProfileProgress,
  dateISO: string,
  seed: string,
): CardDescriptor {
  const { contentRef, language } = pickDictadoContent(rng, content, progress, dateISO)
  return { cardType: 'dictado', contentRef, generatorSeed: seed, language }
}

const AIRA_PROBLEMA_SKILLS: SkillId[] = ['problemas', 'calculo']

/**
 * Builds the `problema` card: subskill restricted to problemas/calculo,
 * difficulty from mastery + parent offset. On a `desafio` surprise day, this
 * becomes a challenge card instead: a challenge subskill (gem level >= 2)
 * is picked, seeded via `rng`, with difficulty pinned to its range floor —
 * a desafio is meant to spotlight the harder material, not additionally
 * ramp its difficulty via mastery.
 */
function buildProblemaCard(
  rng: Rng,
  attempts: ProfileProgress['attempts'],
  settings: ChildSettings,
  dateISO: string,
  gems: Record<string, GemState>,
  seed: string,
  surprise: Surprise | null,
): CardDescriptor {
  if (surprise?.kind === 'desafio') {
    const challengeSubskill = pickChallengeSubskill(rng, 'aira', AIRA_PROBLEMA_SKILLS, gems)
    return {
      cardType: 'problema',
      subskill: challengeSubskill.id,
      generatorSeed: seed,
      difficulty: challengeSubskill.difficultyRange[0],
      challenge: true,
    }
  }

  const subskillId = pickSubskill(rng, attempts, 'aira', settings, dateISO, gems, {
    skillFilter: AIRA_PROBLEMA_SKILLS,
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

/**
 * Builds Aira's mission cards: [problema, dictado, sabias-que, diario],
 * truncated to `settings.missionSize`. `surprise` is the day's already-
 * rolled surprise (see composeDay): a `desafio` surprise turns the
 * `problema` slot into a challenge card.
 */
export function buildAiraCards(
  dateISO: string,
  profile: ProfileId,
  progress: ProfileProgress,
  content: ContentBundle,
  settings: ChildSettings,
  gems: Record<string, GemState>,
  surprise: Surprise | null = null,
): CardDescriptor[] {
  const cards: CardDescriptor[] = []

  for (let i = 0; i < settings.missionSize && i < AIRA_CARD_TYPES.length; i++) {
    const seed = `${dateISO}:${profile}:${i}`
    const rng = createRng(seed)
    const cardType = AIRA_CARD_TYPES[i]

    switch (cardType) {
      case 'problema':
        cards.push(buildProblemaCard(rng, progress.attempts, settings, dateISO, gems, seed, surprise))
        break
      case 'dictado':
        cards.push(buildDictadoCard(rng, content, progress, dateISO, seed))
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

/**
 * Builds one of Leo's base cards (trazos/contar/english). On a `desafio`
 * surprise day, the `contar` slot (numeros) becomes a challenge card
 * instead: a challenge subskill (gem level >= 2) is picked, seeded via
 * `rng`, difficulty pinned to its range floor — mirrors buildProblemaCard's
 * desafio handling for Aira.
 */
function buildLeoBaseCard(
  rng: Rng,
  cardType: (typeof LEO_BASE_CARD_TYPES)[number],
  progress: ProfileProgress,
  settings: ChildSettings,
  dateISO: string,
  gems: Record<string, GemState>,
  seed: string,
  surprise: Surprise | null,
): CardDescriptor {
  const skillId = LEO_SKILL_BY_SLOT[cardType]

  if (cardType === 'contar' && surprise?.kind === 'desafio') {
    const challengeSubskill = pickChallengeSubskill(rng, 'leo', [skillId], gems)
    return {
      cardType,
      subskill: challengeSubskill.id,
      generatorSeed: seed,
      difficulty: challengeSubskill.difficultyRange[0],
      challenge: true,
    }
  }

  const subskillId = pickSubskill(rng, progress.attempts, 'leo', settings, dateISO, gems, {
    skillFilter: [skillId],
  })
  return { cardType, subskill: subskillId, generatorSeed: seed }
}

/**
 * Builds Leo's mission cards: [trazos, contar, english] (truncated to
 * `settings.missionSize`) + sorpresa-rotatoria. `surprise` is the day's
 * already-rolled surprise (see composeDay).
 */
export function buildLeoCards(
  dateISO: string,
  profile: ProfileId,
  progress: ProfileProgress,
  content: ContentBundle,
  settings: ChildSettings,
  gems: Record<string, GemState>,
  surprise: Surprise | null = null,
): CardDescriptor[] {
  const cards: CardDescriptor[] = []

  for (let i = 0; i < settings.missionSize && i < LEO_BASE_CARD_TYPES.length; i++) {
    const seed = `${dateISO}:${profile}:${i}`
    const rng = createRng(seed)
    const cardType = LEO_BASE_CARD_TYPES[i]
    cards.push(buildLeoBaseCard(rng, cardType, progress, settings, dateISO, gems, seed, surprise))
  }

  cards.push(buildRotationCard(dateISO, profile, progress, content, cards.length))
  return cards
}
