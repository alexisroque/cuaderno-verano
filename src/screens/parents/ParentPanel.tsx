import { useState } from 'react'
import { useNavigate } from 'react-router'
import type { ProfileId } from '../../state/profileStore'
import { useSettingsStore } from '../../state/settingsStore'
import { useTestModeStore } from '../../state/testModeStore'
import { useParentSession } from './session'
import { Dashboard } from './Dashboard'
import { Heatmap } from './Heatmap'
import { Settings } from './Settings'
import { VoiceSettings } from './VoiceSettings'
import { Backup } from './Backup'
import { todayISO } from '../../lib/clock'
import { daysBetween } from '../../lib/dates'

type Tab = 'dashboard' | 'heatmap' | 'settings' | 'voice' | 'backup' | 'testmode'

const TABS: { id: Tab; label: string; emoji: string }[] = [
  { id: 'dashboard', label: 'Actividad', emoji: '📊' },
  { id: 'heatmap', label: 'Mapa de calor', emoji: '🗺️' },
  { id: 'settings', label: 'Ajustes', emoji: '⚙️' },
  { id: 'voice', label: 'Voz', emoji: '🗣️' },
  { id: 'backup', label: 'Copia', emoji: '💾' },
  { id: 'testmode', label: 'Modo prueba', emoji: '🧪' },
]

const CHILDREN: { id: ProfileId; name: string; emoji: string }[] = [
  { id: 'aira', name: 'Aira', emoji: '🌸' },
  { id: 'leo', name: 'Leo', emoji: '🦖' },
]

/** Days without a backup after which the dashboard nudges the parent to export. */
const BACKUP_NUDGE_DAYS = 14

function BackupNudge({ onGoBackup }: { onGoBackup: () => void }) {
  const lastExport = useSettingsStore((s) => s.lastExport)
  const today = todayISO()
  const daysSince = lastExport === null ? Infinity : daysBetween(lastExport, today)
  if (daysSince <= BACKUP_NUDGE_DAYS) return null

  const text =
    lastExport === null
      ? 'Aún no has hecho ninguna copia de seguridad.'
      : `Última copia: hace ${daysSince} días.`

  return (
    <button
      type="button"
      onClick={onGoBackup}
      className="flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left transition-transform active:translate-y-[1px] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--peach)]"
      style={{ background: '#fdeee2', border: '1px solid #f2cdb4' }}
    >
      <span aria-hidden className="text-lg">
        📦
      </span>
      <span className="flex-1 text-sm font-semibold" style={{ color: '#a5502f' }}>
        {text} Toca para exportar y guardarla a salvo.
      </span>
      <span aria-hidden style={{ color: '#c26a4c' }}>
        →
      </span>
    </button>
  )
}

/**
 * "Modo prueba" toggle: lets the parent try the exercises without any of it
 * counting toward the kids' real progress. Turning it ON snapshots the current
 * progress and drops to profile select so the parent can play as either kid;
 * turning it OFF restores the pre-test progress. Nothing is written to disk
 * while it is on, so there is zero trace afterwards.
 */
function TestModePanel({ onEnabled }: { onEnabled: () => void }) {
  const active = useTestModeStore((s) => s.active)
  const enable = useTestModeStore((s) => s.enable)
  const disable = useTestModeStore((s) => s.disable)

  function toggle() {
    if (active) {
      disable()
    } else {
      enable()
      onEnabled()
    }
  }

  return (
    <div
      className="rounded-2xl p-5"
      style={{ background: 'var(--card)', boxShadow: '0 2px 6px rgba(184,140,120,.14)' }}
    >
      <div className="flex items-center justify-between gap-4">
        <div className="flex-1">
          <div className="flex items-center gap-2 text-base font-extrabold" style={{ color: 'var(--navy)' }}>
            <span aria-hidden>🧪</span> Modo prueba
          </div>
          <p className="mt-1 text-sm" style={{ color: 'var(--ink-soft)' }}>
            Prueba los ejercicios sin que cuenten para Aira ni Leo. Al salir, no queda rastro.
          </p>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={active}
          aria-label="Activar modo prueba"
          onClick={toggle}
          className="relative h-8 w-14 shrink-0 rounded-full transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--navy)]"
          style={{ background: active ? 'var(--navy)' : '#d8cec8' }}
        >
          <span
            className="absolute top-1 h-6 w-6 rounded-full bg-white transition-all"
            style={{ left: active ? '30px' : '4px', boxShadow: '0 1px 3px rgba(0,0,0,.2)' }}
          />
        </button>
      </div>
      {active && (
        <p className="mt-3 text-sm font-semibold" style={{ color: '#c26a4c' }}>
          Modo prueba activo. El progreso no se está guardando.
        </p>
      )}
    </div>
  )
}

/**
 * The unlocked parent panel: child selector (Aira/Leo) + section tabs
 * (Actividad / Mapa de calor / Ajustes / Copia / Modo prueba). Adult register,
 * denser than the kid UI but on-brand (navy accents on the warm peach base).
 */
export function ParentPanel() {
  const navigate = useNavigate()
  const lock = useParentSession((s) => s.lock)
  const [child, setChild] = useState<ProfileId>('aira')
  const [tab, setTab] = useState<Tab>('dashboard')

  function leave() {
    lock()
    navigate('/')
  }

  return (
    <main className="min-h-screen" style={{ background: 'var(--bg)', color: 'var(--ink)' }}>
      {/* Header */}
      <header
        className="sticky top-0 z-10 border-b px-5 py-3.5"
        style={{ background: 'var(--card)', borderColor: 'rgba(30,58,95,.08)' }}
      >
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span aria-hidden className="text-lg">
              🔓
            </span>
            <h1 className="text-lg font-extrabold" style={{ color: 'var(--navy)' }}>
              Zona de padres
            </h1>
          </div>
          <button
            type="button"
            onClick={leave}
            className="rounded-full px-4 py-2 text-sm font-bold transition-transform active:translate-y-[1px] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--navy)]"
            style={{ background: 'var(--bg)', color: 'var(--ink)' }}
          >
            Bloquear y salir
          </button>
        </div>
      </header>

      <div className="mx-auto max-w-3xl px-5 pb-16 pt-5">
        {/* Child selector */}
        <div className="mb-4 flex gap-2">
          {CHILDREN.map((c) => {
            const active = child === c.id
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => setChild(c.id)}
                className="flex min-h-[48px] flex-1 items-center justify-center gap-2 rounded-2xl text-base font-extrabold transition-transform active:translate-y-[1px] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--navy)]"
                style={
                  active
                    ? { background: 'var(--navy)', color: '#fff', boxShadow: '0 4px 0 #14283f' }
                    : { background: 'var(--card)', color: 'var(--ink)', boxShadow: '0 2px 6px rgba(184,140,120,.14)' }
                }
              >
                <span aria-hidden>{c.emoji}</span>
                {c.name}
              </button>
            )
          })}
        </div>

        {/* Section tabs */}
        <div className="mb-5 flex gap-1.5 overflow-x-auto pb-1">
          {TABS.map((t) => {
            const active = tab === t.id
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setTab(t.id)}
                className="flex min-h-[44px] items-center gap-1.5 whitespace-nowrap rounded-full px-4 text-sm font-bold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--navy)]"
                style={
                  active
                    ? { background: 'var(--peach)', color: '#fff' }
                    : { background: 'var(--card)', color: 'var(--ink-soft)' }
                }
              >
                <span aria-hidden>{t.emoji}</span>
                {t.label}
              </button>
            )
          })}
        </div>

        {tab === 'dashboard' && (
          <div className="flex flex-col gap-4">
            <BackupNudge onGoBackup={() => setTab('backup')} />
            <Dashboard profile={child} />
          </div>
        )}
        {tab === 'heatmap' && <Heatmap profile={child} />}
        {tab === 'settings' && <Settings profile={child} />}
        {tab === 'voice' && <VoiceSettings />}
        {tab === 'backup' && <Backup />}
        {tab === 'testmode' && <TestModePanel onEnabled={() => navigate('/')} />}
      </div>
    </main>
  )
}
