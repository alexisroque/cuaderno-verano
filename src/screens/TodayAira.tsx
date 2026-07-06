import { useMemo } from 'react'
import { useNavigate } from 'react-router'
import { Shell } from '../components/Shell'
import { Card } from '../components/ui/Card'
import { composeDay, type CardDescriptor } from '../engine/dayComposer'
import { getContentBundle } from '../content/loader'
import { chapterForDate } from '../engine/dayComposer'
import { CHAPTERS } from '../content/chapters'
import { todayISO } from '../lib/clock'
import { useProgressStore } from '../state/progressStore'
import { useSettingsStore } from '../state/settingsStore'
import { usePlayerStore } from '../state/playerStore'
import { SKILL_META } from '../engine/skills'
import { gemVisual } from '../engine/gems'
import type { Surprise } from '../engine/surprises'
import { cardTeaser, playerRouteFor } from './cardTeasers'

/** Per-cardType display chrome for Aira's 2×2 grid, matching the mockup. */
const AIRA_CARD_META: Record<string, { title: string; emoji: string; accent: string; gemHint: string; badge: string }> = {
  problema: { title: 'El problema del día', emoji: '🔢', accent: '#f59e0b', gemHint: '💎 Problemas', badge: 'NUEVO' },
  dictado: { title: 'El dictado del día', emoji: '✏️', accent: '#3b82f6', gemHint: '💎 Ortografía', badge: 'NUEVO' },
  'sabias-que': { title: '¿Sabías que…?', emoji: '🌍', accent: '#10b981', gemHint: '💎 Lectura', badge: 'NUEVO' },
  diario: { title: 'Mi diario', emoji: '📔', accent: '#8b5cf6', gemHint: '💎 Escritura', badge: 'HOY' },
}

/** Stable empty array so the completed-cards selector never returns a fresh reference. */
const EMPTY: string[] = []

const SURPRISE_BANNER: Record<Surprise['kind'], { emoji: string; text: string }> = {
  desafio: { emoji: '🚀', text: '¡Hoy hay un desafío de 5º escondido en el problema!' },
  relampago: { emoji: '⚡', text: '¡Ronda relámpago! Resuelve rápido para ganar extra.' },
  'gema-doble': { emoji: '💎', text: '¡Hoy tu gema más floja gana el doble de progreso!' },
  invitado: { emoji: '🐾', text: '¡Un animal invitado te acompaña hoy!' },
  'cofre-mejorado': { emoji: '🎁', text: '¡El cofre de hoy trae premio mejorado!' },
}

/**
 * Aira's "La página de hoy": the 4 daily cards as a 2×2 grid (problema,
 * dictado, sabías-que, diario), each a door into its own player. Below: a
 * "¿quieres más?" strip into free training and the gem cabinet. Deterministic —
 * `composeDay` yields the same page for the same day.
 */
export function TodayAira() {
  const navigate = useNavigate()
  const content = getContentBundle()
  const dateISO = todayISO()
  const chapter = chapterForDate(CHAPTERS, dateISO)

  const progress = useProgressStore((s) => s.profiles.aira)
  const settings = useSettingsStore((s) => s.children.aira)
  // Select the stable stored slice (not a fresh array) to avoid a re-render loop.
  const completed = useProgressStore((s) => s.profiles.aira.completedCards[dateISO]) ?? EMPTY
  const setActiveCard = usePlayerStore((s) => s.setActiveCard)

  const day = useMemo(
    () => composeDay(dateISO, 'aira', progress, content, settings, progress.gems),
    [dateISO, progress, content, settings],
  )

  const openCard = (card: CardDescriptor) => {
    setActiveCard(card, chapter.id, '/hoy')
    navigate(playerRouteFor(card))
  }

  const doneCount = day.cards.filter((c) => completed.includes(c.cardType)).length

  return (
    <Shell>
      <div className="mx-auto max-w-2xl pt-1">
        {/* Surprise banner */}
        {day.surprise && (
          <div
            className="mb-3 flex items-center gap-2 rounded-2xl px-4 py-2.5 text-sm font-bold"
            style={{ background: 'var(--sun)', color: '#7a5c00' }}
          >
            <span className="text-lg" aria-hidden>
              {SURPRISE_BANNER[day.surprise.kind].emoji}
            </span>
            {SURPRISE_BANNER[day.surprise.kind].text}
          </div>
        )}

        <div className="mb-3 flex items-baseline justify-between">
          <h2 className="text-lg font-extrabold">La página de hoy</h2>
          <span className="text-sm font-bold" style={{ color: 'var(--ink-soft)' }}>
            {doneCount}/{day.cards.length} hechas
          </span>
        </div>

        {/* 2×2 grid of day cards */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {day.cards.map((card) => {
            const meta = AIRA_CARD_META[card.cardType] ?? {
              title: card.cardType,
              emoji: '✨',
              accent: 'var(--peach)',
              gemHint: '',
              badge: 'NUEVO',
            }
            const isDone = completed.includes(card.cardType)
            return (
              <Card
                key={card.cardType}
                accent={meta.accent}
                interactive
                onClick={() => openCard(card)}
                className="flex flex-col"
              >
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-sm font-extrabold" style={{ color: 'var(--ink)' }}>
                    <span aria-hidden>{meta.emoji}</span> {meta.title}
                  </span>
                  {isDone ? (
                    <span
                      className="flex h-6 w-6 items-center justify-center rounded-full text-sm font-black"
                      style={{ background: 'var(--mint)', color: '#3f7d55' }}
                      aria-label="Hecha"
                    >
                      ✓
                    </span>
                  ) : (
                    <span
                      className="rounded-lg px-2 py-0.5 text-[10px] font-black"
                      style={{ background: 'var(--peach-soft)', color: '#c26a4c' }}
                    >
                      {meta.badge}
                    </span>
                  )}
                </div>
                <p className="mt-1.5 text-xs leading-snug" style={{ color: 'var(--ink-soft)' }}>
                  {cardTeaser(card, chapter)}
                </p>
                {meta.gemHint && (
                  <p className="mt-2 text-[11px] font-bold" style={{ color: 'var(--ink-soft)' }}>
                    + {meta.gemHint}
                  </p>
                )}
              </Card>
            )
          })}
        </div>

        {/* ¿Quieres más? strip */}
        <button
          type="button"
          onClick={() => navigate('/entrenar')}
          className="mt-3 flex w-full items-center justify-between rounded-2xl border border-dashed px-4 py-3 text-left"
          style={{ borderColor: 'var(--peach)', background: 'rgba(255,255,255,.5)' }}
        >
          <span className="text-sm font-bold" style={{ color: '#c26a4c' }}>
            ¿Quieres más? Entrena la gema que tú elijas
          </span>
          <span className="text-sm" style={{ color: 'var(--ink-soft)' }}>
            →
          </span>
        </button>

        {/* Treasure chest entry */}
        <button
          type="button"
          onClick={() => navigate('/coleccion')}
          className="mt-3 flex w-full items-center justify-between rounded-2xl px-4 py-3 text-left"
          style={{ background: 'var(--peach-soft)' }}
        >
          <span className="text-sm font-bold" style={{ color: '#c26a4c' }}>
            🎁 El Cofre de los Tesoros · gasta tus monedas
          </span>
          <span className="text-sm" style={{ color: 'var(--ink-soft)' }}>
            →
          </span>
        </button>

        {/* Gem cabinet */}
        <GemCabinet gems={progress.gems} />
      </div>
    </Shell>
  )
}

/** Aira's vitrina de gemas: each skill's current gem level from progress. */
function GemCabinet({ gems }: { gems: Record<string, { skillId: string; level: number }> }) {
  const skills = Object.entries(SKILL_META.aira) as [keyof typeof SKILL_META.aira, { name: string; emoji: string }][]
  return (
    <div className="mt-5">
      <h3 className="mb-2 text-sm font-black tracking-wide uppercase" style={{ color: 'var(--ink-soft)' }}>
        Mi vitrina de gemas
      </h3>
      <div className="grid grid-cols-4 gap-2">
        {skills.map(([skillId, meta]) => {
          const level = gems[skillId]?.level ?? 0
          const visual = gemVisual(level)
          return (
            <div key={skillId} className="rounded-2xl p-2 text-center" style={{ background: 'var(--card)', boxShadow: '0 1px 4px rgba(184,140,120,.14)' }}>
              <div className="text-2xl" aria-hidden>
                {visual.emoji}
              </div>
              <div className="text-[10px] font-black" style={{ color: 'var(--ink)' }}>
                {meta.name}
              </div>
              <div className="text-[9px]" style={{ color: 'var(--ink-soft)' }}>
                {visual.name}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
