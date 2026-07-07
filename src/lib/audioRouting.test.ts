import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

/**
 * Guard: every audio call in the app must go through the single, quality-aware,
 * preference-honouring `speak()` in `lib/tts.ts`. If any component reaches for
 * the Web Speech API directly (a raw `new SpeechSynthesisUtterance` or
 * `speechSynthesis.speak`), it would bypass the chosen/best voice and sound
 * robotic — the exact regression this suite exists to prevent. `lib/tts.ts` is
 * the one allowed home of those primitives.
 */

const SRC = join(__dirname, '..')
const ALLOWED = new Set([join(SRC, 'lib', 'tts.ts')])

function collectSourceFiles(dir: string): string[] {
  const out: string[] = []
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name)
    if (entry.isDirectory()) {
      out.push(...collectSourceFiles(full))
    } else if (/\.(ts|tsx)$/.test(entry.name) && !/\.test\.(ts|tsx)$/.test(entry.name)) {
      out.push(full)
    }
  }
  return out
}

describe('audio routing', () => {
  const files = collectSourceFiles(SRC)

  it('finds source files to scan', () => {
    expect(files.length).toBeGreaterThan(20)
  })

  it('no component creates a raw SpeechSynthesisUtterance (only tts.ts may)', () => {
    const offenders = files
      .filter((f) => !ALLOWED.has(f))
      .filter((f) => /new\s+SpeechSynthesisUtterance/.test(readFileSync(f, 'utf8')))
      .map((f) => f.slice(SRC.length + 1))
    expect(offenders, `these files bypass speak(): ${offenders.join(', ')}`).toEqual([])
  })

  it('no component calls speechSynthesis.speak directly (only tts.ts may)', () => {
    const offenders = files
      .filter((f) => !ALLOWED.has(f))
      .filter((f) => /speechSynthesis\s*(\??\.)\s*speak\b/.test(readFileSync(f, 'utf8')))
      .map((f) => f.slice(SRC.length + 1))
    expect(offenders, `these files bypass speak(): ${offenders.join(', ')}`).toEqual([])
  })
})
