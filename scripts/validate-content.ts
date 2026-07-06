import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { validateChapters } from '../src/content/schemas.ts'

const CONTENT_DIR = join(import.meta.dirname, '..', 'content')

/** Maps a content filename to its validator. Add new content files here. */
const VALIDATORS: Record<string, (data: unknown) => void> = {
  'chapters.json': (data) => validateChapters(data),
}

function main(): void {
  const files = readdirSync(CONTENT_DIR).filter((f) => f.endsWith('.json'))

  if (files.length === 0) {
    console.log('No content files found under content/.')
    return
  }

  let hasError = false

  for (const file of files) {
    const validate = VALIDATORS[file]
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
