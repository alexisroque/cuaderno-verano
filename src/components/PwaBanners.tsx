import { useEffect, useState } from 'react'
import { subscribeUpdate, applyUpdate } from '../lib/swUpdate'
import { shouldShowCaVoiceBanner, dismissCaVoiceBanner } from '../lib/boot'

/**
 * Gentle "a new version is ready" toast. Only appears once the waiting service
 * worker reports it (registerType: 'prompt'), and tapping "Actualizar"
 * activates it and reloads onto the new version. Dismiss just hides it until
 * next launch — the update stays waiting, harmlessly.
 */
function UpdateToast() {
  const [show, setShow] = useState(false)

  useEffect(() => subscribeUpdate((needRefresh) => setShow(needRefresh)), [])

  if (!show) return null

  return (
    <div
      role="status"
      className="fixed inset-x-0 bottom-3 z-50 mx-auto flex w-[min(92%,26rem)] items-center gap-3 rounded-3xl px-4 py-3"
      style={{ background: 'var(--card)', boxShadow: '0 8px 26px rgba(184,140,120,.28)' }}
    >
      <span className="flex-1 text-sm font-bold" style={{ color: 'var(--ink)' }}>
        Hay una versión nueva ✨
      </span>
      <button
        type="button"
        onClick={() => void applyUpdate()}
        className="rounded-full px-4 py-2 text-sm font-extrabold text-white"
        style={{ background: 'var(--peach)', boxShadow: '0 3px 0 #d98363' }}
      >
        Actualizar
      </button>
      <button
        type="button"
        aria-label="Cerrar"
        onClick={() => setShow(false)}
        className="rounded-full px-2 py-1 text-lg font-bold"
        style={{ color: 'var(--ink-soft)' }}
      >
        ✕
      </button>
    </div>
  )
}

/**
 * One-time, dismissible nudge shown when no Catalan voice is installed on the
 * device, since dictations read aloud in Catalan. It's a nudge, not a blocker
 * (the dictation player has an adult-reader fallback), and once dismissed it
 * never returns (persisted in localStorage).
 */
function CaVoiceBanner() {
  const [show, setShow] = useState(false)

  useEffect(() => {
    let alive = true
    void shouldShowCaVoiceBanner().then((should) => {
      if (alive) setShow(should)
    })
    return () => {
      alive = false
    }
  }, [])

  if (!show) return null

  const close = () => {
    dismissCaVoiceBanner()
    setShow(false)
  }

  return (
    <div
      role="note"
      className="fixed inset-x-0 top-3 z-50 mx-auto w-[min(94%,32rem)] rounded-3xl px-4 py-3"
      style={{ background: 'var(--peach-soft)', boxShadow: '0 8px 26px rgba(184,140,120,.24)' }}
    >
      <div className="flex items-start gap-3">
        <span className="text-xl" aria-hidden>
          🗣️
        </span>
        <div className="flex-1 text-sm" style={{ color: 'var(--ink)' }}>
          <p className="font-extrabold">Falta la voz en catalán</p>
          <p className="mt-1" style={{ color: 'var(--ink)' }}>
            Los dictados se leen en catalán. Para activar la voz en el iPad:
            <br />
            Ajustes → Accesibilidad → Contenido hablado → Voces → Català.
          </p>
          <p className="mt-1" style={{ color: 'var(--ink-soft)' }}>
            Mientras tanto, puede leer un adulto. 😊
          </p>
        </div>
        <button
          type="button"
          aria-label="Entendido"
          onClick={close}
          className="rounded-full px-2 py-1 text-lg font-bold"
          style={{ color: 'var(--ink-soft)' }}
        >
          ✕
        </button>
      </div>
    </div>
  )
}

/** Mounts the PWA-related overlays (update toast + Catalan-voice nudge). */
export function PwaBanners() {
  return (
    <>
      <CaVoiceBanner />
      <UpdateToast />
    </>
  )
}
