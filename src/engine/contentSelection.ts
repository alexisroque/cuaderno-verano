import { createRng, type Rng } from '../lib/rng'
import { daysBetween } from '../lib/dates'
import type { ContentBundle, Episode, Series } from '../types/content'
import type { ProfileProgress } from '../types/progress'

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

export interface DictadoPick {
  contentRef?: { seriesId?: string; episodeId?: string; jokeId?: string }
  language: 'ca' | 'es'
}

/**
 * Picks the content + language for a `dictado` card: either a joke or the
 * next unconsumed episode. Language is the deterministic per-`dateISO`
 * pattern (see `pickDictationLanguage`), not seeded off `rng` — the joke/
 * episode pick and the joke-cadence check still use `rng`, so this keeps
 * joke-day behavior otherwise unchanged: a joke picked on a Catalan-pattern
 * day just carries `language: 'ca'` like any other dictation that day.
 */
export function pickDictadoContent(
  rng: Rng,
  content: ContentBundle,
  progress: ProfileProgress,
  dateISO: string,
): DictadoPick {
  const language = pickDictationLanguage(dateISO)

  if (isJokeDay(rng) && content.jokes.length > 0) {
    const joke = pickUnconsumed(rng, content.jokes, consumedIds(progress, 'jokes'))
    return { contentRef: joke ? { jokeId: joke.id } : undefined, language }
  }

  const picked = pickNextEpisode(content.series, consumedIds(progress, 'episodes'))
  return {
    contentRef: picked ? { seriesId: picked.series.id, episodeId: picked.episode.id } : undefined,
    language,
  }
}
