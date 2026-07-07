import type { ContentBundle } from '../types/content'
import {
  ChaptersSchema,
  validateSeries,
  CuriositiesSchema,
  JokesSchema,
  DiaryPromptsSchema,
  CuentosLeoSchema,
  GeographyItemsSchema,
  EnglishUnitsSchema,
  EnglishReadingsSchema,
  MundoItemsSchema,
} from './schemas'
import { assertGeographyRegions } from './maps'

import chaptersJson from '../../content/chapters.json'
import curiositiesJson from '../../content/curiosities.json'
import jokesJson from '../../content/jokes.json'
import diaryPromptsJson from '../../content/diary-prompts.json'
import cuentosLeoJson from '../../content/cuentos-leo.json'
import geographyJson from '../../content/geography.json'
import englishUnitsJson from '../../content/english-units.json'
import englishReadingsJson from '../../content/english-readings.json'
import mundoJson from '../../content/mundo.json'

import animalesSeries from '../../content/series/animales.json'
import aventuraHumanosSeries from '../../content/series/aventura-humanos.json'
import exploradoresSeries from '../../content/series/exploradores.json'
import inventosSeries from '../../content/series/inventos.json'
import ortografiaMostraSeries from '../../content/series/ortografia-mostra.json'
import ortografiaCaSeries from '../../content/series/ortografia-ca.json'
import ortografiaEsSeries from '../../content/series/ortografia-es.json'

/**
 * The single static content bundle for the whole app, built once at module
 * load by importing every `content/*.json` file (Vite bundles JSON imports)
 * and validating each pool through its Zod schema. Validation runs at import
 * time so a malformed content edit fails loudly and immediately rather than
 * surfacing as an undefined-field crash deep inside the day composer.
 *
 * The composer only ever reads from a `ContentBundle`; `getContentBundle()`
 * hands it this one, keeping the composer decoupled from where content lives.
 */
export const CONTENT_BUNDLE: ContentBundle = {
  chapters: ChaptersSchema.parse(chaptersJson),
  // validateSeries enforces per-series shape AND sequential episode order.
  // Cultural story series + the rule-focused dictation series. The composer
  // treats a series with focus-tagged episodes as the rule-focus pool and the
  // rest as the cultural pool (see contentSelection.pickDictadoContent).
  series: [
    animalesSeries,
    aventuraHumanosSeries,
    exploradoresSeries,
    inventosSeries,
    ortografiaMostraSeries,
    ortografiaCaSeries,
    ortografiaEsSeries,
  ].map(validateSeries),
  curiosities: CuriositiesSchema.parse(curiositiesJson),
  jokes: JokesSchema.parse(jokesJson),
  diaryPrompts: DiaryPromptsSchema.parse(diaryPromptsJson),
  cuentosLeo: CuentosLeoSchema.parse(cuentosLeoJson),
  geography: assertGeographyRegions(GeographyItemsSchema.parse(geographyJson)),
  englishUnits: EnglishUnitsSchema.parse(englishUnitsJson),
  englishReadings: EnglishReadingsSchema.parse(englishReadingsJson),
  mundo: MundoItemsSchema.parse(mundoJson),
}

/** Returns the app's static content bundle. */
export function getContentBundle(): ContentBundle {
  return CONTENT_BUNDLE
}

/** Looks up a curiosity by id, or undefined. */
export function curiosityById(id: string) {
  return CONTENT_BUNDLE.curiosities.find((c) => c.id === id)
}

/** Looks up a joke by id, or undefined. */
export function jokeById(id: string) {
  return CONTENT_BUNDLE.jokes.find((j) => j.id === id)
}

/** Looks up a diary prompt by id, or undefined. */
export function diaryPromptById(id: string) {
  return CONTENT_BUNDLE.diaryPrompts.find((p) => p.id === id)
}

/** Looks up a Leo cuento by id, or undefined. */
export function cuentoLeoById(id: string) {
  return CONTENT_BUNDLE.cuentosLeo.find((c) => c.id === id)
}

/** Looks up an English vocab unit by id, or undefined. */
export function englishUnitById(id: string) {
  return CONTENT_BUNDLE.englishUnits?.find((u) => u.id === id)
}

/** Looks up an English mini-reading by id, or undefined. */
export function englishReadingById(id: string) {
  return CONTENT_BUNDLE.englishReadings?.find((r) => r.id === id)
}

/** Finds an episode (and its series) by id across all series, or undefined. */
export function episodeById(seriesId?: string, episodeId?: string) {
  if (!episodeId) return undefined
  for (const series of CONTENT_BUNDLE.series) {
    if (seriesId && series.id !== seriesId) continue
    const episode = series.episodes.find((e) => e.id === episodeId)
    if (episode) return { series, episode }
  }
  return undefined
}
