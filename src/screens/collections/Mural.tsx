import { useRef, useState } from 'react'
import { useProgressStore } from '../../state/progressStore'
import { CHAPTERS } from '../../content/chapters'
import { currentChapter } from '../../content/chapters'
import { stickerEmoji, parseStickerId } from '../../engine/collections'
import type { PlacedSticker } from '../../types/progress'

/**
 * Leo's MI SELVA mural (§5.8): the current chapter's jungle scene onto which he
 * drags earned stickers (one per completed day). Placed positions persist as
 * PlacedSticker {x,y in 0..1 of the scene}. Unplaced stickers (x<0) sit in a
 * tray below; tapping one drops it into the scene center, then it can be
 * dragged. Past chapters' murals show as small read-only galleries.
 */
export function Mural() {
  const stickers = useProgressStore((s) => s.profiles.leo.stickers)
  const placeSticker = useProgressStore((s) => s.placeSticker)
  const chapter = currentChapter()
  const sceneRef = useRef<HTMLDivElement>(null)
  const [dragging, setDragging] = useState<string | null>(null)

  const inThisChapter = stickers.filter((s) => parseStickerId(s.stickerId).chapterId === chapter.id)
  const placed = inThisChapter.filter((s) => s.x >= 0)
  const tray = inThisChapter.filter((s) => s.x < 0)
  const pastChapters = CHAPTERS.filter(
    (c) => c.id !== chapter.id && stickers.some((s) => parseStickerId(s.stickerId).chapterId === c.id),
  )

  const moveTo = (sticker: PlacedSticker, clientX: number, clientY: number) => {
    const rect = sceneRef.current?.getBoundingClientRect()
    if (!rect) return
    const x = Math.min(0.94, Math.max(0.02, (clientX - rect.left) / rect.width))
    const y = Math.min(0.9, Math.max(0.02, (clientY - rect.top) / rect.height))
    placeSticker('leo', { ...sticker, x, y })
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <span className="text-base font-black">🌴 MI SELVA · {chapter.place}</span>
        <span className="rounded-xl px-2.5 py-0.5 text-xs font-bold" style={{ background: 'var(--mint)', color: '#3f7d55' }}>
          {inThisChapter.length} pegatinas
        </span>
      </div>

      {/* The scene */}
      <div
        ref={sceneRef}
        className="relative w-full overflow-hidden rounded-3xl"
        style={{ aspectRatio: '3 / 2', background: 'linear-gradient(160deg,#14532d,#166534 60%,#3f6212)' }}
        onPointerMove={(e) => {
          if (dragging) {
            const s = placed.find((p) => p.stickerId === dragging)
            if (s) moveTo(s, e.clientX, e.clientY)
          }
        }}
        onPointerUp={() => setDragging(null)}
        onPointerLeave={() => setDragging(null)}
      >
        <span className="pointer-events-none absolute bottom-2 left-3 text-xs text-white/70">
          Arrastra las pegatinas por la selva 👆
        </span>
        {placed.map((s) => (
          <button
            key={s.stickerId}
            type="button"
            onPointerDown={(e) => {
              e.currentTarget.setPointerCapture(e.pointerId)
              setDragging(s.stickerId)
            }}
            className="absolute -translate-x-1/2 -translate-y-1/2 touch-none text-4xl transition-transform active:scale-110"
            style={{ left: `${s.x * 100}%`, top: `${s.y * 100}%`, cursor: 'grab' }}
            aria-label="Mover pegatina"
          >
            <span aria-hidden>{stickerEmoji(s.stickerId, CHAPTERS)}</span>
          </button>
        ))}
      </div>

      {/* Tray of unplaced stickers */}
      {tray.length > 0 && (
        <div>
          <p className="mb-2 text-sm font-bold" style={{ color: 'var(--ink-soft)' }}>
            Toca para colocar en la selva:
          </p>
          <div className="flex flex-wrap gap-3">
            {tray.map((s) => (
              <button
                key={s.stickerId}
                type="button"
                onClick={() => placeSticker('leo', { ...s, x: 0.5, y: 0.5 })}
                className="flex h-16 w-16 items-center justify-center rounded-2xl text-3xl transition-transform active:scale-95"
                style={{ background: 'var(--card)', boxShadow: '0 2px 6px rgba(0,0,0,.1)' }}
                aria-label="Colocar pegatina"
              >
                <span aria-hidden>{stickerEmoji(s.stickerId, CHAPTERS)}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {inThisChapter.length === 0 && (
        <p className="rounded-2xl p-4 text-sm" style={{ background: 'var(--card)', color: 'var(--ink-soft)' }}>
          Termina todas las tarjetas de un día y ganarás una pegatina para tu selva. 🎁
        </p>
      )}

      {/* Past murals gallery */}
      {pastChapters.length > 0 && (
        <div>
          <h3 className="mb-2 text-sm font-black uppercase tracking-wide" style={{ color: 'var(--ink-soft)' }}>
            Murales de antes
          </h3>
          <div className="space-y-2">
            {pastChapters.map((c) => (
              <div key={c.id} className="rounded-2xl p-3" style={{ background: 'linear-gradient(160deg,#1f2937,#374151)' }}>
                <span className="text-xs font-bold text-white/80">
                  {c.emoji} {c.place}
                </span>
                <div className="mt-1 flex flex-wrap gap-2">
                  {stickers
                    .filter((s) => parseStickerId(s.stickerId).chapterId === c.id)
                    .map((s) => (
                      <span key={s.stickerId} className="text-2xl" aria-hidden>
                        {stickerEmoji(s.stickerId, CHAPTERS)}
                      </span>
                    ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
