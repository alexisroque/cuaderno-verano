import type { ReactNode } from 'react'
import { useNavigate } from 'react-router'
import { Shell } from '../../components/Shell'
import { Button } from '../../components/ui/Button'
import { Pill } from '../../components/ui/Pill'
import type { Chapter } from '../../content/schemas'

// Re-exported from the shared economy so existing imports keep working while
// `rewards.ts` stays the single source of truth for the coin economy (§5.8).
export { CARD_COINS, awardCardCoins, coinsForCard } from './rewards'

/** Shown by every player when there is no active card (e.g. after a reload). */
export function NoCard() {
  const navigate = useNavigate()
  return (
    <Shell>
      <div className="mx-auto max-w-md pt-8 text-center">
        <p className="mb-4 text-lg font-bold">No hay ninguna actividad abierta.</p>
        <Button variant="primary" onClick={() => navigate('/hoy')}>
          Volver a hoy
        </Button>
      </div>
    </Shell>
  )
}

/** The shared player header: an ← Salir link on the left, chapter pill on the right. */
export function PlayerHeader({ chapter, onExit }: { chapter: Chapter; onExit: () => void }) {
  return (
    <div className="mb-3 flex items-center justify-between gap-2">
      <button type="button" onClick={onExit} className="text-sm font-bold" style={{ color: 'var(--ink-soft)' }}>
        ← Salir
      </button>
      <Pill tone="mint">
        {chapter.emoji} {chapter.place}
      </Pill>
    </div>
  )
}

/** A small titled intro row (emoji tile + title + subtitle), like ProblemPlayer's. */
export function IntroRow({
  emoji,
  title,
  subtitle,
  accent = 'var(--peach-soft)',
  right,
}: {
  emoji: string
  title: string
  subtitle?: string
  accent?: string
  right?: ReactNode
}) {
  return (
    <div className="mb-2 flex items-center gap-3">
      <span
        className="flex h-12 w-12 items-center justify-center rounded-[30%] text-2xl"
        style={{ background: accent }}
        aria-hidden
      >
        {emoji}
      </span>
      <div>
        <div className="text-sm font-extrabold">{title}</div>
        {subtitle && (
          <div className="text-xs" style={{ color: 'var(--ink-soft)' }}>
            {subtitle}
          </div>
        )}
      </div>
      {right && <div className="ml-auto">{right}</div>}
    </div>
  )
}
