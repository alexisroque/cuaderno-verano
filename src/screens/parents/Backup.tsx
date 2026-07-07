import { useRef, useState } from 'react'
import { useProgressStore } from '../../state/progressStore'
import { useSettingsStore } from '../../state/settingsStore'
import type { ProfileId } from '../../state/profileStore'
import {
  BACKUP_VERSION,
  serializeBackup,
  parseBackup,
  exportDiaryText,
  downloadFile,
  type BackupPayload,
} from '../../lib/backup'
import { todayISO } from '../../lib/clock'
import { saveState } from '../../lib/storage'

const PROFILE_NAMES: Record<ProfileId, string> = { aira: 'Aira', leo: 'Leo' }

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section
      className="p-5"
      style={{ background: 'var(--card)', borderRadius: 'var(--r-card)', boxShadow: '0 6px 18px rgba(184,140,120,.12)' }}
    >
      <h3 className="mb-4 text-base font-extrabold" style={{ color: 'var(--ink)' }}>
        {title}
      </h3>
      {children}
    </section>
  )
}

export function Backup() {
  const fileRef = useRef<HTMLInputElement>(null)
  const [message, setMessage] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null)
  const [pending, setPending] = useState<BackupPayload | null>(null)

  function handleExportAll() {
    const { profiles } = useProgressStore.getState()
    const { pin, children, voicePrefs, setLastExport } = useSettingsStore.getState()
    const today = todayISO()
    const payload: BackupPayload = {
      version: BACKUP_VERSION,
      exportedAt: today,
      profiles: { aira: profiles.aira, leo: profiles.leo },
      settings: { pin, children, lastExport: today, voicePrefs },
    }
    downloadFile(`cuaderno-verano-copia-${today}.json`, serializeBackup(payload), 'application/json')
    setLastExport(today)
    setMessage({ kind: 'ok', text: 'Copia de seguridad descargada.' })
  }

  function handleExportDiary(profile: ProfileId) {
    const progress = useProgressStore.getState().profiles[profile]
    const text = exportDiaryText(profile, progress)
    downloadFile(`diario-${profile}-${todayISO()}.txt`, text, 'text/plain')
    setMessage({ kind: 'ok', text: `Diario de ${PROFILE_NAMES[profile]} descargado.` })
  }

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      try {
        const payload = parseBackup(String(reader.result))
        setPending(payload)
        setMessage(null)
      } catch (err) {
        setPending(null)
        setMessage({ kind: 'err', text: err instanceof Error ? err.message : 'No se pudo leer el archivo.' })
      }
    }
    reader.readAsText(file)
    // Reset so re-selecting the same file fires change again.
    e.target.value = ''
  }

  async function confirmImport() {
    if (!pending) return
    // Atomic replace: both stores swapped from the validated payload.
    useProgressStore.setState({ profiles: pending.profiles })
    useSettingsStore.setState({
      pin: pending.settings.pin,
      children: pending.settings.children,
      lastExport: pending.settings.lastExport,
      voicePrefs: pending.settings.voicePrefs,
    })
    // A raw setState doesn't go through the stores' debounced persisters, so
    // persist the imported blobs directly — otherwise a reload would revert to
    // the pre-import data. Keys mirror the ones the stores use.
    await Promise.all([
      saveState('profile:aira', pending.profiles.aira),
      saveState('profile:leo', pending.profiles.leo),
      saveState('settings', {
        pin: pending.settings.pin,
        children: pending.settings.children,
        lastExport: pending.settings.lastExport,
        voicePrefs: pending.settings.voicePrefs,
      }),
    ])
    setPending(null)
    setMessage({ kind: 'ok', text: 'Progreso restaurado. Los cambios ya están activos.' })
  }

  return (
    <div className="flex flex-col gap-5">
      <Section title="Copia de seguridad">
        <p className="mb-4 text-sm" style={{ color: 'var(--ink-soft)' }}>
          Descarga todo el progreso de ambos peques en un archivo. Guárdalo en un lugar
          seguro: es la única forma de recuperar los datos si el iPad los borra.
        </p>
        <button
          type="button"
          onClick={handleExportAll}
          className="min-h-[48px] w-full rounded-full font-extrabold text-white transition-transform active:translate-y-[2px] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--navy)]"
          style={{ background: 'var(--navy)', boxShadow: '0 4px 0 #14283f' }}
        >
          ⬇︎ Exportar todo (JSON)
        </button>
      </Section>

      <Section title="El diario, como recuerdo">
        <p className="mb-4 text-sm" style={{ color: 'var(--ink-soft)' }}>
          Un archivo de texto legible con todo lo que ha escrito cada peque este verano.
        </p>
        <div className="flex flex-col gap-2 sm:flex-row">
          {(['aira', 'leo'] as ProfileId[]).map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => handleExportDiary(p)}
              className="min-h-[48px] flex-1 rounded-full font-extrabold transition-transform active:translate-y-[2px] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--peach)]"
              style={{ background: 'var(--peach-soft)', color: '#c26a4c', boxShadow: '0 3px 0 #f2cdb4' }}
            >
              📖 Diario de {PROFILE_NAMES[p]}
            </button>
          ))}
        </div>
      </Section>

      <Section title="Restaurar desde una copia">
        <p className="mb-4 text-sm" style={{ color: 'var(--ink-soft)' }}>
          Reemplaza el progreso actual por el de un archivo de copia. Esta acción no se
          puede deshacer.
        </p>
        <input ref={fileRef} type="file" accept="application/json,.json" onChange={handleFile} className="hidden" />
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          className="min-h-[48px] w-full rounded-full font-extrabold transition-transform active:translate-y-[2px] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--navy)]"
          style={{ background: 'var(--bg)', color: 'var(--ink)' }}
        >
          ⬆︎ Elegir archivo…
        </button>

        {pending && (
          <div
            className="mt-4 rounded-2xl p-4"
            style={{ background: 'var(--peach-soft)', border: '1px solid #f2cdb4' }}
          >
            <p className="text-sm font-bold" style={{ color: '#c26a4c' }}>
              ¿Restaurar la copia del {pending.exportedAt}?
            </p>
            <p className="mb-3 mt-1 text-xs" style={{ color: '#a5502f' }}>
              Se reemplazará todo el progreso actual de Aira y Leo.
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={confirmImport}
                className="min-h-[44px] flex-1 rounded-full font-extrabold text-white active:translate-y-[2px]"
                style={{ background: 'var(--peach)', boxShadow: '0 3px 0 #d98363' }}
              >
                Sí, restaurar
              </button>
              <button
                type="button"
                onClick={() => setPending(null)}
                className="min-h-[44px] flex-1 rounded-full font-bold active:translate-y-[1px]"
                style={{ background: '#fff', color: 'var(--ink)' }}
              >
                Cancelar
              </button>
            </div>
          </div>
        )}
      </Section>

      {message && (
        <p
          className="text-center text-sm font-semibold"
          style={{ color: message.kind === 'ok' ? '#3f7d55' : '#c0432c' }}
        >
          {message.text}
        </p>
      )}
    </div>
  )
}
