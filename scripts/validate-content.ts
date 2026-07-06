import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'
import {
  validateChapters,
  validateSeries,
  CuriositiesSchema,
  JokesSchema,
  DiaryPromptsSchema,
  GeographyItemsSchema,
  EnglishUnitsSchema,
  EnglishReadingsSchema,
  MundoItemsSchema,
  CuentosLeoSchema,
} from '../src/content/schemas.ts'

const CONTENT_DIR = join(import.meta.dirname, '..', 'content')

/** Maps a content filename (relative to content/) to its validator. Add new content files here. */
const VALIDATORS: Record<string, (data: unknown) => void> = {
  'chapters.json': (data) => validateChapters(data),
  'curiosities.json': (data) => CuriositiesSchema.parse(data),
  'jokes.json': (data) => JokesSchema.parse(data),
  'diary-prompts.json': (data) => DiaryPromptsSchema.parse(data),
  'geography.json': (data) => GeographyItemsSchema.parse(data),
  'english-units.json': (data) => EnglishUnitsSchema.parse(data),
  'english-readings.json': (data) => EnglishReadingsSchema.parse(data),
  'mundo.json': (data) => MundoItemsSchema.parse(data),
  'cuentos-leo.json': (data) => CuentosLeoSchema.parse(data),
}

/** Files under content/series/ are each a single Series validated with validateSeries. */
const SERIES_DIR_PREFIX = 'series/'

/** Recursively lists every .json file under `dir`, returning paths relative to `dir` (posix-style). */
function listJsonFiles(dir: string, base: string = dir): string[] {
  const entries = readdirSync(dir)
  const files: string[] = []
  for (const entry of entries) {
    const full = join(dir, entry)
    if (statSync(full).isDirectory()) {
      files.push(...listJsonFiles(full, base))
    } else if (entry.endsWith('.json')) {
      files.push(relative(base, full).split('\\').join('/'))
    }
  }
  return files
}

function main(): void {
  const files = listJsonFiles(CONTENT_DIR).sort()

  if (files.length === 0) {
    console.log('No content files found under content/.')
    return
  }

  let hasError = false

  for (const file of files) {
    const validate = file.startsWith(SERIES_DIR_PREFIX)
      ? (data: unknown) => validateSeries(data)
      : VALIDATORS[file]

    if (!validate) {
      console.log(`SKIP  ${file} (no validator registered)`)
      continue
    }

    const raw = readFileSync(join(CONTENT_DIR, file), 'utf-8')

    try {
      const data = JSON.parse(raw)
      validate(data)
      console.log(`OK    ${file}`)
    } catch (error) {
      hasError = true
      const message = error instanceof Error ? error.message : String(error)
      console.error(`FAIL  ${file}: ${message}`)
    }
  }

  if (hasError) {
    process.exit(1)
  }
}

main()
