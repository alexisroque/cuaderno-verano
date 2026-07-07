import type { ReactNode } from 'react'
import { SpeakButton } from '../../components/ui/SpeakButton'

/**
 * Near-fullscreen, in-app map overlay (no Fullscreen API, so it stays reliable
 * inside an installed PWA and offline). Shows the same live map big enough that
 * small countries are easy to tap with a finger on an iPad, in portrait or
 * landscape. The prompt stays visible (and re-readable) at the top; a big ✕
 * closes it. `map` is the shared <SvgMap> element so taps still record.
 */
export function MapOverlay({
  title,
  emoji,
  prompt,
  showHint,
  map,
  onClose,
}: {
  title: string
  emoji: string
  prompt: string
  showHint: boolean
  map: ReactNode
  onClose: () => void
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex flex-col"
      style={{ background: 'rgba(45,32,26,.72)', backdropFilter: 'blur(2px)' }}
      role="dialog"
      aria-modal="true"
      aria-label={`Mapa grande: ${title}`}
    >
      <div className="flex items-center justify-between gap-2 px-4 pt-4 pb-2">
        <span
          className="flex items-center gap-2 rounded-full px-3 py-1.5 text-sm font-extrabold"
          style={{ background: 'rgba(255,255,255,.92)', color: 'var(--ink)' }}
        >
          <span aria-hidden>{emoji}</span> {prompt}
          <SpeakButton text={prompt} lang="es-ES" tone="mint" label="Escuchar" />
        </span>
        <button
          type="button"
          onClick={onClose}
          aria-label="Cerrar el mapa grande"
          className="flex h-12 w-12 items-center justify-center rounded-full text-2xl shadow-[0_2px_8px_rgba(0,0,0,.22)] transition-transform active:translate-y-[1px] focus-visible:outline focus-visible:outline-2 focus-visible:outline-white"
          style={{ background: '#fff', color: 'var(--ink)' }}
        >
          <span aria-hidden>✕</span>
        </button>
      </div>
      <div className="flex flex-1 items-center justify-center overflow-hidden px-3 pb-4">
        <div
          className="w-full overflow-hidden rounded-2xl"
          style={{ maxWidth: 'min(96vw, calc((100vh - 7rem) * 1.6))', background: '#eaf5fa' }}
        >
          {map}
        </div>
      </div>
      {showHint && <p className="pb-5 text-center text-sm font-bold text-white">👆 Toca el país en el mapa</p>}
    </div>
  )
}
