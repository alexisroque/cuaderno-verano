import { useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router'
import { Shell } from '../components/Shell'
import { composeDay, type CardDescriptor } from '../engine/dayComposer'
import { getContentBundle } from '../content/loader'
import { chapterForDate } from '../engine/dayComposer'
import { CHAPTERS } from '../content/chapters'
import { todayISO } from '../lib/clock'
import { useProgressStore } from '../state/progressStore'
import { useSettingsStore } from '../state/settingsStore'
import { usePlayerStore } from '../state/playerStore'
import { SKILL_META } from '../engine/skills'
import { MAX_LEVEL } from '../engine/gems'
import { stickerForDay } from '../engine/collections'
import { speak } from '../lib/tts'
import { SpeakButton } from '../components/ui/SpeakButton'
import { cardTeaser, playerRouteFor } from './cardTeasers'

/** Big-card chrome for Leo's three fixed slots + the rotating surprise. */
const LEO_CARD_META: Record<string, { title: string; emoji: string; accent: string; audio: string }> = {
  trazos: { title: 'Trazos', emoji: '✍️', accent: '#f59e0b', audio: 'Trazos. Vamos a dibujar letras con el dedo.' },
  contar: { title: 'Contar', emoji: '🔢', accent: '#10b981', audio: 'Contar. ¿Cuántos hay?' },
  english: { title: 'English', emoji: '🗣️', accent: '#8b5cf6', audio: 'English. Escucha y toca la imagen.' },
  'sorpresa-rotatoria': { title: 'La sorpresa de hoy', emoji: '🧩', accent: '#ec4899', audio: 'La sorpresa de hoy.' },
}

/** Stable empty array so the completed-cards selector never returns a fresh reference. */
const EMPTY: string[] = []

/**
 * Leo's "página de hoy": 3 big cards (trazos, contar, english) + a rotating
 * surprise card, every card with a 🔊 button and ≥60px touch targets, plus a
 * mural strip. A short greeting is spoken on mount (Leo can't read).
 */
export function TodayLeo() {
  const navigate = useNavigate()
  const content = getContentBundle()
  const dateISO = todayISO()
  const chapter = chapterForDate(CHAPTERS, dateISO)

  const progress = useProgressStore((s) => s.profiles.leo)
  const settings = useSettingsStore((s) => s.children.leo)
  const completed = useProgressStore((s) => s.profiles.leo.completedCards[dateISO]) ?? EMPTY
  const setActiveCard = usePlayerStore((s) => s.setActiveCard)
  const grantSticker = useProgressStore((s) => s.grantSticker)
  const stickerCount = useProgressStore((s) => s.profiles.leo.stickers.length)

  const day = useMemo(
    () => composeDay(dateISO, 'leo', progress, content, settings, progress.gems),
    [dateISO, progress, content, settings],
  )

  const allDone = day.cards.length > 0 && day.cards.every((c) => completed.includes(c.cardType))

  useEffect(() => {
    speak('¡Hola, Leo! Elige una tarjeta para empezar.', 'es-ES')
    // greet once on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Grant the day's mural sticker once all of today's cards are done (idempotent
  // per-day via a chapter-scoped, date-seeded sticker id — §5.8).
  useEffect(() => {
    if (allDone) grantSticker('leo', stickerForDay(chapter, dateISO), chapter.id)
  }, [allDone, chapter, dateISO, grantSticker])

  const baseCards = day.cards.filter((c) => c.cardType !== 'sorpresa-rotatoria')
  const surpriseCard = day.cards.find((c) => c.cardType === 'sorpresa-rotatoria')

  const openCard = (card: CardDescriptor) => {
    setActiveCard(card, chapter.id, '/hoy')
    navigate(playerRouteFor(card))
  }

  return (
    <Shell>
      <div className="mx-auto max-w-2xl pt-1">
        {/* 3 big cards */}
        <div className="grid grid-cols-3 gap-3">
          {baseCards.map((card) => {
            const meta = LEO_CARD_META[card.cardType]
            const isDone = completed.includes(card.cardType)
            return (
              <div
                key={card.cardType}
                role="button"
                tabIndex={0}
                onClick={() => openCard(card)}
                onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && openCard(card)}
                className="relative flex min-h-[150px] cursor-pointer flex-col items-center rounded-3xl p-3 text-center transition-transform active:translate-y-[2px]"
                style={{ background: 'var(--card)', boxShadow: '0 3px 8px rgba(0,0,0,.1)', borderBottom: `6px solid ${meta.accent}` }}
              >
                {isDone && (
                  <span className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full text-base font-black" style={{ background: 'var(--mint)', color: '#3f7d55' }} aria-label="Hecha">
                    ✓
                  </span>
                )}
                <div className="text-5xl" aria-hidden>
                  {meta.emoji}
                </div>
                <div className="mt-1.5 text-base font-black" style={{ color: 'var(--ink)' }}>
                  {meta.title}
                </div>
                <div className="mt-0.5 text-[11px] leading-tight" style={{ color: 'var(--ink-soft)' }}>
                  {cardTeaser(card, chapter)}
                </div>
                <span className="mt-auto pt-2" onClick={(e) => e.stopPropagation()}>
                  <SpeakButton text={`${meta.audio} ${cardTeaser(card, chapter)}`} size="lg" tone="sky" />
                </span>
              </div>
            )
          })}
        </div>

        {/* Rotating surprise card */}
        {surpriseCard && (
          <div
            role="button"
            tabIndex={0}
            onClick={() => openCard(surpriseCard)}
            onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && openCard(surpriseCard)}
            className="mt-3 flex w-full cursor-pointer items-center gap-3 rounded-3xl p-4 text-left transition-transform active:translate-y-[2px]"
            style={{ background: 'var(--card)', boxShadow: '0 2px 6px rgba(0,0,0,.08)', borderLeft: '6px solid #ec4899' }}
          >
            <span className="text-3xl" aria-hidden>
              🧩
            </span>
            <div className="flex-1">
              <div className="text-base font-black" style={{ color: '#9d174d' }}>
                La sorpresa de hoy
              </div>
              <div className="text-xs" style={{ color: 'var(--ink-soft)' }}>
                {cardTeaser(surpriseCard, chapter)}
              </div>
            </div>
            <span onClick={(e) => e.stopPropagation()}>
              <SpeakButton text={`La sorpresa de hoy. ${cardTeaser(surpriseCard, chapter)}`} size="lg" tone="peach" />
            </span>
          </div>
        )}

        {/* El mural (tap to open the full MI SELVA mural in the collection) */}
        <div
          role="button"
          tabIndex={0}
          onClick={() => navigate('/coleccion')}
          onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && navigate('/coleccion')}
          className="mt-4 cursor-pointer rounded-3xl p-4 text-white transition-transform active:translate-y-[2px]"
          style={{ background: 'linear-gradient(160deg,#14532d,#166534)' }}
        >
          <div className="flex items-center justify-between">
            <span className="text-base font-black">🌴 MI SELVA</span>
            <span className="rounded-xl bg-white/20 px-2.5 py-0.5 text-xs">{stickerCount} pegatinas</span>
          </div>
          <p className="mt-2 text-xs opacity-90">
            {allDone
              ? '¡Has ganado una pegatina! Tócame para colocarla en tu selva 🎁'
              : 'Termina las tarjetas de hoy y gana la pegatina misteriosa 🎁'}
          </p>
        </div>

        {/* Star gems (simplified) */}
        <LeoStarGems gems={progress.gems} />
      </div>
    </Shell>
  )
}

/** Leo's simplified gem display: skills as star meters (level → stars). */
function LeoStarGems({ gems }: { gems: Record<string, { skillId: string; level: number }> }) {
  const skills = Object.entries(SKILL_META.leo) as [keyof typeof SKILL_META.leo, { name: string; emoji: string }][]
  return (
    <div className="mt-4 flex justify-center gap-3">
      {skills.map(([skillId, meta]) => {
        const level = gems[skillId]?.level ?? 0
        const stars = Math.max(1, Math.round((level / MAX_LEVEL) * 5))
        return (
          <div key={skillId} className="rounded-2xl px-3 py-2 text-center" style={{ background: 'var(--card)', boxShadow: '0 1px 4px rgba(0,0,0,.08)' }}>
            <div className="text-2xl" aria-hidden>
              {meta.emoji}
            </div>
            <div className="text-sm" aria-label={`${meta.name}: ${stars} de 5 estrellas`}>
              {'⭐'.repeat(stars)}
            </div>
          </div>
        )
      })}
    </div>
  )
}
