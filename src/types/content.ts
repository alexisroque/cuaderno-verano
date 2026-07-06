import type {
  Chapter,
  Episode,
  Series,
  Curiosity,
  Joke,
  DiaryPrompt,
  GeographyItem,
  EnglishUnit,
  EnglishReading,
  MundoItem,
  CuentoLeo,
} from '../content/schemas'

export type {
  Chapter,
  Episode,
  Series,
  Curiosity,
  Joke,
  DiaryPrompt,
  GeographyItem,
  EnglishUnit,
  EnglishReading,
  MundoItem,
  CuentoLeo,
}

/**
 * The full static content package Phase 4 will produce; the composer only
 * ever reads from this. `geography`/`englishUnits`/`englishReadings`/`mundo`
 * are optional additions (not yet wired into the day composer) so existing
 * bundles built before their introduction remain valid without changes.
 */
export interface ContentBundle {
  chapters: Chapter[]
  series: Series[]
  curiosities: Curiosity[]
  jokes: Joke[]
  diaryPrompts: DiaryPrompt[]
  cuentosLeo: CuentoLeo[]
  geography?: GeographyItem[]
  englishUnits?: EnglishUnit[]
  englishReadings?: EnglishReading[]
  mundo?: MundoItem[]
}
