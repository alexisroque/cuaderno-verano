import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router'
import { useSettingsStore } from '../../state/settingsStore'
import { hashPin, verifyPin, RECOVERY_QUESTION, RECOVERY_ANSWER } from '../../lib/pin'
import { useParentSession } from './session'

type Mode = 'set' | 'enter' | 'recover'

const PIN_LENGTH = 4

/**
 * PIN gate for the parent panel. Three modes:
 * - `set`: no PIN stored yet → choose and confirm a 4-digit PIN (stored hashed).
 * - `enter`: a PIN exists → type it to unlock for the session.
 * - `recover`: forgot the PIN → answer a fixed math question to clear it and
 *   fall back into `set`.
 *
 * On success it flips the session-only unlock flag; the panel renders in place.
 */
export function ParentGate() {
  const navigate = useNavigate()
  const pinHash = useSettingsStore((s) => s.pin)
  const setPin = useSettingsStore((s) => s.setPin)
  const unlock = useParentSession((s) => s.unlock)

  const [mode, setMode] = useState<Mode>(pinHash ? 'enter' : 'set')
  const [entry, setEntry] = useState('')
  const [confirm, setConfirm] = useState('')
  const [recovery, setRecovery] = useState('')
  const [error, setError] = useState<string | null>(null)
  // In `set` mode we go through two steps: pick, then confirm.
  const [stage, setStage] = useState<'pick' | 'confirm'>('pick')

  const digits = useMemo(() => ['1', '2', '3', '4', '5', '6', '7', '8', '9', 'del', '0', 'ok'], [])

  const active = stage === 'confirm' ? confirm : entry
  const setActive = stage === 'confirm' ? setConfirm : setEntry

  function pressDigit(d: string) {
    setError(null)
    if (d === 'del') {
      setActive(active.slice(0, -1))
      return
    }
    if (d === 'ok') {
      submitPin()
      return
    }
    if (active.length >= PIN_LENGTH) return
    setActive(active + d)
  }

  function submitPin() {
    if (mode === 'enter') {
      if (entry.length !== PIN_LENGTH) return
      if (pinHash && verifyPin(entry, pinHash)) {
        unlock()
      } else {
        setError('PIN incorrecto. Inténtalo de nuevo.')
        setEntry('')
      }
      return
    }
    // set mode
    if (stage === 'pick') {
      if (entry.length !== PIN_LENGTH) return
      setStage('confirm')
      return
    }
    // confirm stage
    if (confirm.length !== PIN_LENGTH) return
    if (confirm === entry) {
      setPin(hashPin(entry))
      unlock()
    } else {
      setError('Los PIN no coinciden. Empieza de nuevo.')
      setEntry('')
      setConfirm('')
      setStage('pick')
    }
  }

  function submitRecovery() {
    if (Number(recovery.trim()) === RECOVERY_ANSWER) {
      // Clear the stored PIN and drop into set mode to choose a new one.
      setPin(null)
      setMode('set')
      setStage('pick')
      setEntry('')
      setConfirm('')
      setRecovery('')
      setError(null)
    } else {
      setError('Respuesta incorrecta.')
      setRecovery('')
    }
  }

  const heading =
    mode === 'recover'
      ? 'Recuperar acceso'
      : mode === 'enter'
        ? 'Introduce tu PIN'
        : stage === 'pick'
          ? 'Crea un PIN de 4 cifras'
          : 'Confirma tu PIN'

  const subtitle =
    mode === 'recover'
      ? 'Responde para restablecer el PIN.'
      : mode === 'enter'
        ? 'Zona de padres · protegida'
        : stage === 'pick'
          ? 'Lo usarás para entrar aquí. No lo verán los peques.'
          : 'Escríbelo otra vez para confirmarlo.'

  return (
    <main
      className="flex min-h-screen flex-col items-center justify-center px-6 py-10"
      style={{ background: 'linear-gradient(180deg,#fef9ee,#f6ecdd)', color: 'var(--ink)' }}
    >
      <div
        className="w-full max-w-sm p-7"
        style={{
          background: 'var(--card)',
          borderRadius: 'var(--r-card)',
          boxShadow: '0 14px 40px rgba(91,74,67,.18)',
          borderTop: '4px solid var(--navy)',
        }}
      >
        <div className="mb-1 flex items-center gap-2">
          <span aria-hidden className="text-xl">
            🔒
          </span>
          <h1 className="text-lg font-extrabold" style={{ color: 'var(--navy)' }}>
            {heading}
          </h1>
        </div>
        <p className="mb-5 text-sm" style={{ color: 'var(--ink-soft)' }}>
          {subtitle}
        </p>

        {mode === 'recover' ? (
          <div className="flex flex-col gap-4">
            <label className="text-sm font-semibold" style={{ color: 'var(--ink)' }}>
              ¿Cuánto es {RECOVERY_QUESTION}?
            </label>
            <input
              type="number"
              inputMode="numeric"
              value={recovery}
              onChange={(e) => {
                setRecovery(e.target.value)
                setError(null)
              }}
              onKeyDown={(e) => e.key === 'Enter' && submitRecovery()}
              className="min-h-[48px] rounded-2xl px-4 text-lg font-bold focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--navy)]"
              style={{ background: 'var(--bg)', color: 'var(--ink)' }}
              autoFocus
            />
            {error && (
              <p className="text-sm font-semibold" style={{ color: '#c0432c' }}>
                {error}
              </p>
            )}
            <button
              type="button"
              onClick={submitRecovery}
              className="min-h-[48px] rounded-full font-extrabold text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--navy)]"
              style={{ background: 'var(--navy)', boxShadow: '0 4px 0 #14283f' }}
            >
              Restablecer PIN
            </button>
            <button
              type="button"
              onClick={() => {
                setMode('enter')
                setError(null)
              }}
              className="text-sm font-semibold underline"
              style={{ color: 'var(--ink-soft)' }}
            >
              Volver
            </button>
          </div>
        ) : (
          <>
            {/* PIN dots */}
            <div className="mb-5 flex justify-center gap-3" aria-hidden>
              {Array.from({ length: PIN_LENGTH }).map((_, i) => (
                <span
                  key={i}
                  className="h-4 w-4 rounded-full transition-colors"
                  style={{
                    background: i < active.length ? 'var(--navy)' : 'rgba(30,58,95,.15)',
                  }}
                />
              ))}
            </div>

            {error && (
              <p className="mb-3 text-center text-sm font-semibold" style={{ color: '#c0432c' }}>
                {error}
              </p>
            )}

            <div className="grid grid-cols-3 gap-3">
              {digits.map((d) => {
                const isAction = d === 'del' || d === 'ok'
                return (
                  <button
                    key={d}
                    type="button"
                    onClick={() => pressDigit(d)}
                    aria-label={d === 'del' ? 'Borrar' : d === 'ok' ? 'Aceptar' : d}
                    className="flex min-h-[56px] items-center justify-center rounded-2xl text-xl font-extrabold transition-transform active:translate-y-[2px] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--navy)]"
                    style={{
                      background: isAction ? 'var(--peach-soft)' : 'var(--bg)',
                      color: d === 'ok' ? '#c26a4c' : 'var(--ink)',
                    }}
                  >
                    {d === 'del' ? '⌫' : d === 'ok' ? '✓' : d}
                  </button>
                )
              })}
            </div>

            <div className="mt-5 flex items-center justify-between">
              <button
                type="button"
                onClick={() => navigate('/')}
                className="text-sm font-semibold"
                style={{ color: 'var(--ink-soft)' }}
              >
                ← Salir
              </button>
              {mode === 'enter' && (
                <button
                  type="button"
                  onClick={() => {
                    setMode('recover')
                    setError(null)
                  }}
                  className="text-sm font-semibold underline"
                  style={{ color: 'var(--ink-soft)' }}
                >
                  Olvidé el PIN
                </button>
              )}
            </div>
          </>
        )}
      </div>
    </main>
  )
}
