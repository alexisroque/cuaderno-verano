import { createRng, type Rng } from '../lib/rng'
import { daysBetween } from '../lib/dates'
import type { ContentBundle, Episode, Series } from '../types/content'
import type { Attempt, ProfileProgress } from '../types/progress'
import { episodeFocusLang } from '../content/schemas'
import { masteryFor } from './mastery'
import { ORTOGRAFIA_RULE_IDS, isOrtografiaRule, type SubskillId } from './skills'

/**
 * Fixed epoch for the Catalan-dictation 3-day cycle, so the cycle boundary is
 * stable regardless of when a chapter/campaign happens to start (mirrors the
 * `pickRotatingSorpresa` epoch convention in dayComposerCards.ts).
 */
const CA_CYCLE_EPOCH = '2026-01-01'

/**
 * Base pattern for one dictation-language cycle: 2 Catalan days, 1 Spanish
 * day. The cycle's internal order is seeded-shuffled per cycle (see
 * `pickDictationLanguage`) so consecutive days aren't visibly repetitive,
 * but every complete cycle keeps exactly 2/3 Catalan. A misaligned 30-day
 * window (one not starting exactly on a cycle boundary) spans 11 cycles:
 * up to 10 full cycles plus two partial fringe cycles at the ends. Each
 * cycle — full or partial — contributes at most 1 'es' day (the pattern has
 * exactly one 'es' per 3 days), so a 30-day window has at most 11 'es' days,
 * i.e. at least 19/30 ≈ 63.3% ca, which still clears the spec's >= 60%
 * threshold regardless of window alignment.
 */
const CA_CYCLE_PATTERN: readonly ('ca' | 'es')[] = ['ca', 'ca', 'es']

/** 1-in-N days (uniform over this range) a dictation slot swaps for a joke instead of an episode. */
const JOKE_CADENCE_MIN = 6
const JOKE_CADENCE_MAX = 7

/** Consumed ids for a given content pool key, or [] if none recorded yet. */
export function consumedIds(progress: ProfileProgress, poolKey: string): string[] {
  return progress.consumedContent[poolKey] ?? []
}

/**
 * Picks the lowest-`order` episode not yet consumed from the series with the
 * fewest unconsumed episodes remaining (episodes are sequential within a
 * series, so "pick the next one" means lowest order, not random — this
 * rotates toward finishing an in-progress series before starting a fresh
 * one). When every episode across every series is consumed, resets by
 * treating nothing as consumed (repeats allowed) and picks the lowest-order
 * episode of the first series. Returns undefined if there are no
 * series/episodes at all.
 */
export function pickNextEpisode(series: Series[], consumed: string[]): { series: Series; episode: Episode } | undefined {
  if (series.length === 0) return undefined

  const consumedSet = new Set(consumed)
  const withUnconsumed = series
    .map((s) => ({ s, unconsumed: s.episodes.filter((e) => !consumedSet.has(e.id)) }))
    .filter((x) => x.unconsumed.length > 0)

  if (withUnconsumed.length > 0) {
    withUnconsumed.sort((a, b) => a.unconsumed.length - b.unconsumed.length || a.s.id.localeCompare(b.s.id))
    const chosen = withUnconsumed[0]
    const nextEpisode = [...chosen.unconsumed].sort((a, b) => a.order - b.order)[0]
    return { series: chosen.s, episode: nextEpisode }
  }

  const withEpisodes = series.filter((s) => s.episodes.length > 0)
  if (withEpisodes.length === 0) return undefined
  const first = withEpisodes[0]
  const nextEpisode = [...first.episodes].sort((a, b) => a.order - b.order)[0]
  return { series: first, episode: nextEpisode }
}

/**
 * Picks a seeded-random item from `pool` that isn't in `consumed`, using
 * `rng`. When every item is consumed, resets (allows repeats) by picking
 * from the full pool. Returns undefined if `pool` is empty.
 */
export function pickUnconsumed<T extends { id: string }>(rng: Rng, pool: T[], consumed: string[]): T | undefined {
  if (pool.length === 0) return undefined
  const consumedSet = new Set(consumed)
  const unconsumed = pool.filter((item) => !consumedSet.has(item.id))
  return rng.pick(unconsumed.length > 0 ? unconsumed : pool)
}

/**
 * Deterministic dictation language for `dateISO`: a repeating 3-day cycle of
 * 2 Catalan days + 1 Spanish day (guarantees >= 60% ca over ANY 30-day
 * window, per spec, since 3 evenly divides 30). Which of the 3 slots in a
 * given cycle is "the" Spanish day varies cycle-to-cycle via a seeded
 * shuffle keyed on the cycle index (not the day), so the order is stable
 * across all 3 days of one cycle but varies from one cycle to the next —
 * variety without ever breaking the 2-ca-per-3-days invariant.
 */
export function pickDictationLanguage(dateISO: string): 'ca' | 'es' {
  const dayIndex = daysBetween(CA_CYCLE_EPOCH, dateISO)
  const cycleLength = CA_CYCLE_PATTERN.length
  const cycleIndex = Math.floor(dayIndex / cycleLength)
  const positionInCycle = ((dayIndex % cycleLength) + cycleLength) % cycleLength

  const cycleRng = createRng(`ca-dictation-cycle:${cycleIndex}`)
  const shuffled = cycleRng.shuffle([...CA_CYCLE_PATTERN])
  return shuffled[positionInCycle]
}

/** Seeded joke-cadence check: true roughly 1-in-(6 or 7) days. */
export function isJokeDay(rng: Rng): boolean {
  const period = rng.int(JOKE_CADENCE_MIN, JOKE_CADENCE_MAX)
  return rng.int(1, period) === 1
}

/**
 * Fixed epoch for the rule-focus vs cultural dictation cycle (mirrors the
 * CA_CYCLE_EPOCH convention), so the balance pattern is stable regardless of
 * when a chapter/campaign starts.
 */
const RULE_FOCUS_EPOCH = '2026-01-01'

/**
 * Balance between rule-focused dictations and cultural (story) dictations,
 * over a repeating 3-day cycle: 2 rule-focus days + 1 cultural day. Spelling
 * is Aira's weakness, so the day composer LEANS rule-focused (~2/3 of
 * dictation days), but keeps the beloved cultural series in the mix (~1/3) so
 * the summer story doesn't disappear. Deterministic per `dateISO` — same day
 * always resolves the same way, preserving composeDay's "same inputs → equal
 * page" invariant. A rule-focus day still falls back to a cultural dictation
 * when no focus content exists for the target rule (today: only the fixture),
 * so the day is never empty.
 */
const RULE_FOCUS_CYCLE: readonly ('rule' | 'cultural')[] = ['rule', 'rule', 'cultural']

/** True if `dateISO` is a rule-focused dictation day per the balance cycle. */
export function isRuleFocusDay(dateISO: string): boolean {
  const dayIndex = daysBetween(RULE_FOCUS_EPOCH, dateISO)
  const len = RULE_FOCUS_CYCLE.length
  const pos = ((dayIndex % len) + len) % len
  return RULE_FOCUS_CYCLE[pos] === 'rule'
}

/** True if `episode` is a rule-focused dictation (carries a `focus` tag). */
function isFocusEpisode(episode: Episode): boolean {
  return episode.focus !== undefined
}

/**
 * The ortografia spelling rule the child is WEAKEST at, by min `masteryFor`
 * across every rule. A never-attempted rule (mastery undefined) is treated as
 * the weakest of all — untrained rules deserve first attention — and ties
 * break by the catalog's declaration order (via ORTOGRAFIA_RULE_IDS), so the
 * pick is deterministic. Returns the first rule id when there are no attempts
 * at all. Assumes `ORTOGRAFIA_RULE_IDS` is non-empty (it always is).
 */
export function weakestOrtografiaRule(attempts: Attempt[]): SubskillId {
  let weakest = ORTOGRAFIA_RULE_IDS[0]
  // -1 sorts below any real mastery (0..1) so undefined/never-attempted wins.
  let weakestScore = Infinity
  for (const ruleId of ORTOGRAFIA_RULE_IDS) {
    const relevant = attempts.filter((a) => a.subskill === ruleId)
    const mastery = masteryFor(relevant, ruleId)
    const score = mastery === undefined ? -1 : mastery
    if (score < weakestScore) {
      weakestScore = score
      weakest = ruleId
    }
  }
  return weakest
}

/**
 * The rule to target for a rule-focus dictation: a parent's weekly pin wins
 * (the first ortografia rule id in `weeklyFocus`, if any), otherwise the
 * child's weakest rule. Keeps the adaptive default while honoring an explicit
 * parent override.
 */
export function targetRule(attempts: Attempt[], weeklyFocus: string[]): SubskillId {
  const pinned = weeklyFocus.find((id) => isOrtografiaRule(id))
  return pinned ?? weakestOrtografiaRule(attempts)
}

/**
 * Picks the next unconsumed focus episode whose rule === `rule`, lowest
 * `order` first (rule series are sequential like any other). When every
 * matching episode is consumed, resets (allows a repeat) rather than giving
 * up, so a child who has seen all b/v dictations still gets a b/v dictation
 * when b/v is the target. Returns undefined when no episode targets `rule`.
 */
export function pickFocusEpisodeForRule(
  series: Series[],
  rule: SubskillId,
  consumed: string[],
): { series: Series; episode: Episode } | undefined {
  const consumedSet = new Set(consumed)
  const matches: { series: Series; episode: Episode }[] = []
  for (const s of series) {
    for (const e of s.episodes) {
      if (e.focus === rule) matches.push({ series: s, episode: e })
    }
  }
  if (matches.length === 0) return undefined

  const unconsumed = matches.filter((m) => !consumedSet.has(m.episode.id))
  const pool = unconsumed.length > 0 ? unconsumed : matches
  pool.sort((a, b) => a.episode.order - b.episode.order || a.series.id.localeCompare(b.series.id))
  return pool[0]
}

/** Series filtered to those with at least one non-focus (cultural) episode. */
function culturalSeries(series: Series[]): Series[] {
  return series
    .map((s) => ({ ...s, episodes: s.episodes.filter((e) => !isFocusEpisode(e)) }))
    .filter((s) => s.episodes.length > 0)
}

export interface DictadoPick {
  contentRef?: { seriesId?: string; episodeId?: string; jokeId?: string }
  language: 'ca' | 'es'
  /** The rule this dictation focuses on, when a rule-focused episode was chosen. */
  focus?: SubskillId
}

/**
 * Picks the content + language for a `dictado` card. Order of preference:
 *
 *  1. Joke day (unchanged cadence): serve a joke, language from the rotation.
 *  2. Rule-focus day (see `isRuleFocusDay`): serve the next focus episode for
 *     the target rule (parent pin > weakest rule, see `targetRule`). The
 *     episode carries its own language (`episodeFocusLang`), so a b/v Catalan
 *     dictation is always in Catalan regardless of the day's rotation. Falls
 *     back to a cultural dictation when no focus content exists for that rule.
 *  3. Cultural day (or the fallback above): serve the next unconsumed CULTURAL
 *     (non-focus) episode, language from the deterministic rotation.
 *
 * Everything is deterministic per `dateISO` + progress, so composeDay's
 * "same inputs → deep-equal page" invariant still holds. `settings.weeklyFocus`
 * lets a parent pin the rule for the week (see `targetRule`).
 */
export function pickDictadoContent(
  rng: Rng,
  content: ContentBundle,
  progress: ProfileProgress,
  dateISO: string,
  weeklyFocus: string[] = [],
): DictadoPick {
  const language = pickDictationLanguage(dateISO)
  const consumed = consumedIds(progress, 'episodes')

  if (isJokeDay(rng) && content.jokes.length > 0) {
    const joke = pickUnconsumed(rng, content.jokes, consumedIds(progress, 'jokes'))
    return { contentRef: joke ? { jokeId: joke.id } : undefined, language }
  }

  if (isRuleFocusDay(dateISO)) {
    const rule = targetRule(progress.attempts, weeklyFocus)
    const focusPick = pickFocusEpisodeForRule(content.series, rule, consumed)
    if (focusPick) {
      return {
        contentRef: { seriesId: focusPick.series.id, episodeId: focusPick.episode.id },
        // A focus episode dictates in its own language, not the day's rotation.
        language: episodeFocusLang(focusPick.episode) ?? language,
        focus: focusPick.episode.focus,
      }
    }
    // No focus content for this rule (e.g. only the fixture exists) → fall
    // through to a cultural dictation so the day still has a dictado.
  }

  const picked = pickNextEpisode(culturalSeries(content.series), consumed)
  return {
    contentRef: picked ? { seriesId: picked.series.id, episodeId: picked.episode.id } : undefined,
    language,
  }
}
