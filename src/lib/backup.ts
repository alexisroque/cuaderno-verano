import * as z from 'zod'
import type { ProfileProgress } from '../types/progress'
import type { ProfileId } from '../state/profileStore'
import { ProfileProgressSchema, PersistedSettingsSchema } from '../state/persistSchemas'

/**
 * Versioned, offline backup of the whole app: both children's progress plus
 * settings. This is the family's only safety net against iOS purging
 * IndexedDB (§10 of the design doc), so the format is deliberately explicit
 * and validated on import.
 *
 * The pure core (serialize/parse/diary text) is separated from the browser
 * download/read side-effects so it can be unit-tested without a DOM.
 */

export const BACKUP_VERSION = 1

const BackupSchema = z.object({
  version: z.literal(BACKUP_VERSION, {
    error: 'Versión de copia no compatible.',
  }),
  exportedAt: z.string(),
  profiles: z.object({
    aira: ProfileProgressSchema,
    leo: ProfileProgressSchema,
  }),
  settings: PersistedSettingsSchema,
})

export type BackupPayload = z.infer<typeof BackupSchema>

/** Serializes a backup payload to pretty-printed JSON. */
export function serializeBackup(payload: BackupPayload): string {
  return JSON.stringify(payload, null, 2)
}

/**
 * Parses and validates backup JSON. Throws (with a Spanish message for the
 * version mismatch) on malformed JSON, wrong version, or a shape that fails
 * the schema — callers should surface the error and abort the import atomically.
 */
export function parseBackup(json: string): BackupPayload {
  let raw: unknown
  try {
    raw = JSON.parse(json)
  } catch {
    throw new Error('El archivo no es un JSON válido.')
  }
  const result = BackupSchema.safeParse(raw)
  if (!result.success) {
    const versionIssue = result.error.issues.find((i) => i.path[0] === 'version')
    throw new Error(versionIssue?.message ?? 'El archivo de copia no tiene el formato esperado.')
  }
  return result.data
}

const PROFILE_NAMES: Record<ProfileId, string> = { aira: 'Aira', leo: 'Leo' }

/**
 * Renders a child's diary as a keepsake plain-text document, entries in
 * chronological order (oldest first). Shape:
 *
 *   El diario de Aira — verano 2026
 *
 *   [2026-07-14]
 *   Volamos a Singapur.
 *
 *   [2026-07-15]
 *   Vimos orangutanes.
 */
export function exportDiaryText(profile: ProfileId, progress: ProfileProgress): string {
  const name = PROFILE_NAMES[profile]
  const header = `El diario de ${name} — verano 2026`
  const entries = [...progress.diaryEntries].sort((a, b) =>
    a.dateISO < b.dateISO ? -1 : a.dateISO > b.dateISO ? 1 : 0,
  )

  if (entries.length === 0) {
    return `${header}\n\n(Todavía no hay entradas en el diario.)\n`
  }

  const body = entries.map((e) => `[${e.dateISO}]\n${e.text.trim()}`).join('\n\n')
  return `${header}\n\n${body}\n`
}

/**
 * Triggers a client-side file download of `contents` under `filename`. No-op
 * outside a browser (guards `document`). Kept apart from the pure functions
 * above so those stay testable.
 */
export function downloadFile(filename: string, contents: string, mime: string): void {
  if (typeof document === 'undefined') return
  const blob = new Blob([contents], { type: mime })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  // Revoke on the next tick so the click has a chance to start the download.
  setTimeout(() => URL.revokeObjectURL(url), 0)
}
