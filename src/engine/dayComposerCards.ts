import type { ContentBundle } from '../types/content'
import type { GemState, ProfileProgress } from '../types/progress'
import type { ChildSettings } from '../state/settingsStore'
import type { ProfileId } from '../state/profileStore'
import { createRng, type Rng } from '../lib/rng'
import {
  CATALOG,
  CHALLENGE_GATE_LEVEL,
  isSkillEnabled,
  skillOfSubskill,
  type SkillId,
  type SubskillDef,
  type SubskillId,
} from './skills'
import { pickSubskill } from './scheduler'
import { suggestedDifficulty } from './mastery'
import { consumedIds, pickDictadoContent, pickUnconsumed } from './contentSelection'
import type { Surprise } from './surprises'

/** Fixed rotation order for Leo's daily "sorpresa-rotatoria" (lógica) card. */
const LEO_ROTATION: readonly string[] = ['patrones', 'formas', 'simetria', 'clasificar', 'posiciones', 'cuento']

/**
 * Aira's daily page has ONE card per enabled skill (all of them), so the child
 * touches every skill every day. Each card type maps 1:1 to a skill; a skill
 * disabled in the parent's `moduleToggles` simply drops its card (the day
 * shrinks). Card identity across the app (React keys, per-day completion in
 * progressStore) is the `cardType`, so a day never contains two cards of the
 * same type.
 *
 * Order below is the display order on the daily page.
 */
const AIRA_CARD_TYPES = ['calculo', 'problemas', 'dictado', 'diario', 'sabias-que', 'english', 'geografia', 'mundo'] as const

const LEO_BASE_CARD_TYPES = ['trazos', 'contar', 'english'] as const

/**
 * Which catalog skill each Aira daily card draws from. A card is kept only if
 * its skill is enabled in the parent's `moduleToggles`; otherwise it is dropped
 * (see `buildAiraCards`).
 */
const AIRA_CARD_SKILL: Record<(typeof AIRA_CARD_TYPES)[number], SkillId> = {
  calculo: 'calculo',
  problemas: 'problemas',
  dictado: 'ortografia',
  diario: 'escritura',
  'sabias-que': 'lectura',
  english: 'english',
  geografia: 'geografia',
  mundo: 'mundo',
}

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
  /** English mini-reading id (english-readings), used by the ReadingPlayer/QuizPlayer. */
  readingId?: string
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

/**
 * Builds the `dictado` card: a joke, a rule-focused dictation (toward the
 * child's weakest ortografia rule, or the parent's weekly pin), or a cultural
 * story dictation — see `pickDictadoContent` for the balance. `subskill`
 * carries the focus rule when the pick is rule-focused, so the attempt is
 * recorded under that rule and the player can show the "avui treballem" banner.
 */
function buildDictadoCard(
  rng: Rng,
  content: ContentBundle,
  progress: ProfileProgress,
  settings: ChildSettings,
  dateISO: string,
  seed: string,
): CardDescriptor {
  const { contentRef, language, focus } = pickDictadoContent(rng, content, progress, dateISO, settings.weeklyFocus)
  return { cardType: 'dictado', contentRef, generatorSeed: seed, language, subskill: focus }
}

/**
 * The skill(s) the `desafio` surprise draws its challenge from for Aira.
 * A desafio converts the Cálculo card (or, if calculo is off, the Problemas
 * card) into a challenge exercise — the two number skills that carry challenge
 * subskills. Exported so a catalog-coverage invariant test (skills.test.ts)
 * can assert every challenge-bearing Aira skill is listed here — otherwise a
 * future catalog edit (e.g. a challenge subskill added to a skill outside this
 * list) would silently never surface via `desafio`.
 */
export const AIRA_PROBLEMA_SKILLS: SkillId[] = ['calculo', 'problemas']

/**
 * Which Aira card the `desafio` surprise converts. It must be a number card
 * that is BOTH enabled AND actually has an unlocked challenge subskill (gem
 * level >= 2), otherwise `pickChallengeSubskill` would throw. Prefers Cálculo,
 * then Problemas. Returns null when neither qualifies (the desafio then leaves
 * the day as-is) — `rollSurprise` only fires desafio when some skill qualifies,
 * so in practice one of these two matches.
 */
function desafioCardTypeFor(settings: ChildSettings, gems: Record<string, GemState>): AiraCardType | null {
  for (const cardType of ['calculo', 'problemas'] as const) {
    if (!isSkillEnabled(settings.moduleToggles, cardType)) continue
    if (unlockedChallengeSubskills('aira', [cardType], gems).length > 0) return cardType
  }
  return null
}

/**
 * Builds a number card (`calculo` or `problemas`): subskill restricted to that
 * single skill, difficulty from mastery + parent offset. When `asChallenge` is
 * set (this is the card a `desafio` surprise converts), it instead picks a
 * challenge subskill (gem level >= 2) seeded via `rng`, with difficulty pinned
 * to its range floor — a desafio spotlights harder material, not extra ramp.
 */
function buildNumberCard(
  cardType: 'calculo' | 'problemas',
  rng: Rng,
  attempts: ProfileProgress['attempts'],
  settings: ChildSettings,
  dateISO: string,
  gems: Record<string, GemState>,
  seed: string,
  asChallenge: boolean,
): CardDescriptor {
  const skill = AIRA_CARD_SKILL[cardType]
  const skillFilter: SkillId[] = [skill]

  if (asChallenge) {
    const challengeSubskill = pickChallengeSubskill(rng, 'aira', skillFilter, gems)
    return {
      cardType,
      subskill: challengeSubskill.id,
      generatorSeed: seed,
      difficulty: challengeSubskill.difficultyRange[0],
      challenge: true,
    }
  }

  const subskillId = pickSubskill(rng, attempts, 'aira', settings, dateISO, gems, { skillFilter })

  const owningSkill = skillOfSubskill('aira', subskillId) ?? skill
  const skills = CATALOG.aira.skills as Record<
    string,
    { subskills: Record<string, { difficultyRange: [number, number] }> }
  >
  const difficultyRange = skills[owningSkill]?.subskills[subskillId]?.difficultyRange ?? [1, 5]

  const base = suggestedDifficulty(attempts, { id: subskillId, skill: owningSkill, difficultyRange })
  const offset = settings.subskillAdjustments[subskillId]?.difficultyOffset ?? 0
  const [min, max] = difficultyRange
  const difficulty = Math.min(max, Math.max(min, base + offset))

  return { cardType, subskill: subskillId, generatorSeed: seed, difficulty }
}

/**
 * Builds the `sabias-que` (Lectura) card: a curiosity/serie reading with a
 * comprehension question in Spanish/Catalan. Since English is now its own card,
 * this always serves a curiosity (contentRef.curiosityId) — the reflexiva
 * question, when any, is added by the ReadingPlayer.
 */
function buildSabiasQueCard(rng: Rng, content: ContentBundle, progress: ProfileProgress, seed: string): CardDescriptor {
  const picked = pickUnconsumed(rng, content.curiosities, consumedIds(progress, 'curiosities'))
  return { cardType: 'sabias-que', contentRef: picked ? { curiosityId: picked.id } : undefined, generatorSeed: seed }
}

/**
 * Builds the `english` card: the next unconsumed English mini-reading, rendered
 * by the QuizPlayer as its literal + reflexiva questions (records into the
 * english + lectura gems). Falls back to no contentRef if the pool is exhausted;
 * the player then shows the gentle "no card" state.
 */
function buildEnglishCard(rng: Rng, content: ContentBundle, progress: ProfileProgress, seed: string): CardDescriptor {
  const readings = content.englishReadings ?? []
  const reading = pickUnconsumed(rng, readings, consumedIds(progress, 'englishReadings'))
  return {
    cardType: 'english',
    subskill: 'reading',
    contentRef: reading ? { readingId: reading.id } : undefined,
    generatorSeed: seed,
  }
}

function buildDiarioCard(rng: Rng, content: ContentBundle, progress: ProfileProgress, seed: string): CardDescriptor {
  const picked = pickUnconsumed(rng, content.diaryPrompts, consumedIds(progress, 'diaryPrompts'))
  return { cardType: 'diario', contentRef: picked ? { promptId: picked.id } : undefined, generatorSeed: seed }
}

/**
 * Builds a quiz-style card (`geografia` or `mundo`) by picking a subskill of
 * that skill via the scheduler. The QuizPlayer resolves this: a geografia
 * subskill → tap-on-map round; a mundo subskill → mundo quiz round.
 */
function buildQuizCard(
  cardType: 'geografia' | 'mundo',
  rng: Rng,
  attempts: ProfileProgress['attempts'],
  settings: ChildSettings,
  dateISO: string,
  gems: Record<string, GemState>,
  seed: string,
): CardDescriptor {
  const skill = AIRA_CARD_SKILL[cardType]
  const subskillId = pickSubskill(rng, attempts, 'aira', settings, dateISO, gems, { skillFilter: [skill] })
  return { cardType, subskill: subskillId, generatorSeed: seed }
}

/**
 * Builds Aira's daily cards: one card per ENABLED skill, in the fixed display
 * order (calculo, problemas, dictado, diario, sabias-que, english, geografia,
 * mundo).
 *
 * Module toggles: a card whose skill is disabled is DROPPED and the day
 * SHRINKS gracefully; the remaining cards keep their order. Card identity is
 * the `cardType` (React keys, per-day completion), so a day never contains two
 * cards of the same type. missionSize does NOT truncate the daily page — the
 * default day is the full set of enabled skills; parents shrink the day via the
 * module toggles, not a card-count cap.
 *
 * A `desafio` surprise converts one number card (Cálculo, or Problemas if
 * calculo is off) into an actual challenge exercise.
 *
 * If a parent disables every skill, we fall back to a single calculo card so
 * the day is never empty.
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
  const enabledCardTypes = AIRA_CARD_TYPES.filter((cardType) =>
    isSkillEnabled(settings.moduleToggles, AIRA_CARD_SKILL[cardType]),
  )

  const desafioCardType = surprise?.kind === 'desafio' ? desafioCardTypeFor(settings, gems) : null

  const cards: CardDescriptor[] = []
  const push = (cardType: AiraCardType) => {
    const i = cards.length
    const seed = `${dateISO}:${profile}:${i}`
    const rng = createRng(seed)
    switch (cardType) {
      case 'calculo':
        cards.push(buildNumberCard('calculo', rng, progress.attempts, settings, dateISO, gems, seed, desafioCardType === 'calculo'))
        break
      case 'problemas':
        cards.push(buildNumberCard('problemas', rng, progress.attempts, settings, dateISO, gems, seed, desafioCardType === 'problemas'))
        break
      case 'dictado':
        cards.push(buildDictadoCard(rng, content, progress, settings, dateISO, seed))
        break
      case 'diario':
        cards.push(buildDiarioCard(rng, content, progress, seed))
        break
      case 'sabias-que':
        cards.push(buildSabiasQueCard(rng, content, progress, seed))
        break
      case 'english':
        cards.push(buildEnglishCard(rng, content, progress, seed))
        break
      case 'geografia':
        cards.push(buildQuizCard('geografia', rng, progress.attempts, settings, dateISO, gems, seed))
        break
      case 'mundo':
        cards.push(buildQuizCard('mundo', rng, progress.attempts, settings, dateISO, gems, seed))
        break
    }
  }

  for (const cardType of enabledCardTypes) {
    push(cardType)
  }

  // Never emit an empty day: a lone calculo card is the gentle fallback when a
  // parent has turned every module off.
  if (cards.length === 0) {
    push('calculo')
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

/**
 * Maps each Leo base card slot to its owning skill. Only the `contar` slot
 * currently routes to `pickChallengeSubskill` on a `desafio` day (see
 * `buildLeoBaseCard`), so `numeros` is the only Leo skill whose challenge
 * subskills are ever servable. Exported so a catalog-coverage invariant
 * test (skills.test.ts) can assert no OTHER Leo skill gains a challenge
 * subskill without a corresponding slot being wired up here — otherwise
 * that subskill would silently never surface via `desafio`.
 */
export const LEO_SKILL_BY_SLOT: Record<(typeof LEO_BASE_CARD_TYPES)[number], 'trazos' | 'numeros' | 'english'> = {
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
 * `rng`, difficulty pinned to its range floor — mirrors buildNumberCard's
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
 * Builds Leo's daily cards: one card per enabled skill — [trazos, contar,
 * english] + a trailing sorpresa-rotatoria (lógica/cuento). `surprise` is the
 * day's already-rolled surprise (see composeDay).
 *
 * Module toggles: a base card whose skill is disabled is dropped; the remaining
 * base cards keep their order. The trailing sorpresa-rotatoria (lógica) is
 * dropped only when `logica` is disabled. missionSize does NOT truncate the
 * day. If everything Leo has is disabled we still emit a single trazos card so
 * the day is never empty.
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
  const enabledBaseSlots = LEO_BASE_CARD_TYPES.filter((cardType) =>
    isSkillEnabled(settings.moduleToggles, LEO_SKILL_BY_SLOT[cardType]),
  )
  const cards: CardDescriptor[] = []

  for (const cardType of enabledBaseSlots) {
    const seed = `${dateISO}:${profile}:${cards.length}`
    const rng = createRng(seed)
    cards.push(buildLeoBaseCard(rng, cardType, progress, settings, dateISO, gems, seed, surprise))
  }

  // The rotating surprise card is Leo's `logica` slot (patrones/formas/…),
  // plus the occasional `cuento`. Drop it when logica is off.
  if (isSkillEnabled(settings.moduleToggles, 'logica')) {
    cards.push(buildRotationCard(dateISO, profile, progress, content, cards.length))
  }

  // Never emit an empty day.
  if (cards.length === 0) {
    const seed = `${dateISO}:${profile}:0`
    cards.push(buildLeoBaseCard(createRng(seed), 'trazos', progress, settings, dateISO, gems, seed, surprise))
  }

  return cards
}
