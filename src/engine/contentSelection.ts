import type { Rng } from '../lib/rng'
import type { ContentBundle, Episode, Series } from '../types/content'
import type { ProfileProgress } from '../types/progress'

/** Weighted probability that a dictation day is served in Catalan rather than Spanish. */
const CA_WEIGHT = 0.65

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

/** Seeded dictation language: ~65% Catalan, ~35% Spanish. */
export function pickDictationLanguage(rng: Rng): 'ca' | 'es' {
  return rng.chance(CA_WEIGHT) ? 'ca' : 'es'
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

/** Picks the content + language for a `dictado` card: either a joke or the next unconsumed episode. */
export function pickDictadoContent(rng: Rng, content: ContentBundle, progress: ProfileProgress): DictadoPick {
  const language = pickDictationLanguage(rng)

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
