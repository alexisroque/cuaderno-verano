import type { Rng } from '../../lib/rng'
import type { GeographyItem } from '../../content/schemas'

/**
 * A single map-based geography exercise. Two families:
 *
 *  - `tap`  → the child taps a country ON the map. `donde-esta` prompts by name
 *             ("Toca Malasia"); the answer is correct when the tapped regionId
 *             equals `target.regionId`.
 *  - `pick` → a 4-choice question. `que-pais` highlights a country and asks its
 *             name; `capitales` asks a country's capital; `banderas` matches a
 *             flag to its country. `choices`/`correctIdx` drive the tiles, and
 *             for `que-pais` the map highlights `target.regionId`.
 *
 * Every item carries the geografia `subskill` it records against
 * (donde-esta / capitales / banderas) plus the `mapId` it belongs to.
 */
export type MapExerciseKind = 'donde-esta' | 'que-pais' | 'capitales' | 'banderas'

export interface MapItem {
  id: string
  kind: MapExerciseKind
  mapId: string
  /** The country this item is about. */
  target: GeographyItem
  /** How the child interacts: tap the map, or pick a tile. */
  mode: 'tap' | 'pick'
  /** Prompt line (Spanish), already interpolated. */
  prompt: string
  /** When set, the map highlights this region (que-pais) rather than hiding names. */
  highlightRegionId?: string
  /** For `pick` items: the 4 answer tiles and the index of the correct one. */
  choices?: string[]
  correctIdx?: number
  /** The geografia subskill this item feeds. */
  subskill: 'donde-esta' | 'capitales' | 'banderas'
}

/** Builds a 4-tile choice set: the correct value plus up to 3 unique distractors, shuffled. */
function buildChoices(rng: Rng, correct: string, pool: string[]): { choices: string[]; correctIdx: number } {
  const distractors = rng.shuffle(pool.filter((p) => p !== correct)).slice(0, 3)
  const choices = rng.shuffle([correct, ...distractors])
  return { choices, correctIdx: choices.indexOf(correct) }
}

/** The geography items that live on `mapId`. */
export function countriesOnMap(all: GeographyItem[], mapId: string): GeographyItem[] {
  return all.filter((g) => g.mapId === mapId)
}

/**
 * Builds a "Toca X en el mapa" tap exercise for `target`. Pure: no map
 * geometry needed here — the player resolves the region shape from `regionId`.
 */
export function dondeEstaItem(target: GeographyItem): MapItem {
  return {
    id: `donde-${target.id}`,
    kind: 'donde-esta',
    mapId: target.mapId,
    target,
    mode: 'tap',
    prompt: `Toca ${target.name} en el mapa`,
    subskill: 'donde-esta',
  }
}

/** True when `tappedRegionId` is the country the tap exercise asked for. */
export function isCorrectTap(item: MapItem, tappedRegionId: string): boolean {
  return item.mode === 'tap' && tappedRegionId === item.target.regionId
}

/** Builds the inverse "¿Qué país está marcado?" pick exercise (map highlights the target). */
export function quePaisItem(rng: Rng, target: GeographyItem, peers: GeographyItem[]): MapItem {
  const { choices, correctIdx } = buildChoices(rng, target.name, dedupeNames(peers))
  return {
    id: `pais-${target.id}`,
    kind: 'que-pais',
    mapId: target.mapId,
    target,
    mode: 'pick',
    prompt: '¿Qué país está marcado en el mapa?',
    highlightRegionId: target.regionId,
    choices,
    correctIdx,
    subskill: 'donde-esta',
  }
}

/** Builds a "¿Cuál es la capital de X?" pick exercise. */
export function capitalItem(rng: Rng, target: GeographyItem, peers: GeographyItem[]): MapItem {
  const pool = dedupeCapitals(peers)
  const { choices, correctIdx } = buildChoices(rng, target.capital, pool)
  return {
    id: `cap-${target.id}`,
    kind: 'capitales',
    mapId: target.mapId,
    target,
    mode: 'pick',
    prompt: `¿Cuál es la capital de ${target.name}?`,
    highlightRegionId: target.regionId,
    choices,
    correctIdx,
    subskill: 'capitales',
  }
}

/** Builds a "¿De qué país es esta bandera?" pick exercise (prompt shows the flag). */
export function banderaItem(rng: Rng, target: GeographyItem, peers: GeographyItem[]): MapItem {
  const { choices, correctIdx } = buildChoices(rng, target.name, dedupeNames(peers))
  return {
    id: `flag-${target.id}`,
    kind: 'banderas',
    mapId: target.mapId,
    target,
    mode: 'pick',
    prompt: `¿De qué país es esta bandera?  ${target.flag}`,
    choices,
    correctIdx,
    subskill: 'banderas',
  }
}

/** Unique country names within a set (España can appear twice across maps). */
function dedupeNames(items: GeographyItem[]): string[] {
  return [...new Set(items.map((i) => i.name))]
}
/** Unique capital names within a set. */
function dedupeCapitals(items: GeographyItem[]): string[] {
  return [...new Set(items.map((i) => i.capital))]
}

/**
 * Builds a mixed round of `count` exercises for one map, seeded by `rng`.
 * `donde-esta` (tap) is the primary; the round interleaves the inverse
 * name-pick, capitals and flags so a session exercises all three subskills.
 * Countries are sampled without replacement until the map runs out, then the
 * pool refills, so short maps (SE Asia) still yield a full round.
 */
export function buildMapRound(rng: Rng, all: GeographyItem[], mapId: string, count = 5): MapItem[] {
  const pool = countriesOnMap(all, mapId)
  if (pool.length === 0) return []

  // Exercise-kind rotation: tap first, then a spread of the other kinds.
  const kinds: MapExerciseKind[] = ['donde-esta', 'que-pais', 'capitales', 'donde-esta', 'banderas']

  let bag: GeographyItem[] = []
  const draw = (): GeographyItem => {
    if (bag.length === 0) bag = rng.shuffle(pool.slice())
    return bag.pop()!
  }

  const items: MapItem[] = []
  for (let i = 0; i < count; i++) {
    const kind = kinds[i % kinds.length]
    const target = draw()
    const peers = pool
    switch (kind) {
      case 'donde-esta':
        items.push(dondeEstaItem(target))
        break
      case 'que-pais':
        items.push(quePaisItem(rng, target, peers))
        break
      case 'capitales':
        items.push(capitalItem(rng, target, peers))
        break
      case 'banderas':
        items.push(banderaItem(rng, target, peers))
        break
    }
  }
  return items
}
