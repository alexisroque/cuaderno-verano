import { useMemo, useState } from 'react'
import { Card } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { SvgMap, type RegionStatus } from '../../components/geo/SvgMap'
import { MangaBurst } from '../../components/celebrations/MangaBurst'
import { MAP_META } from '../../content/maps'
import { getContentBundle } from '../../content/loader'
import { isCorrectTap, type MapItem } from './mapItems'

export interface MapRoundResult {
  correct: number
  total: number
}

/** regionId → country name, for map aria-labels and reveal labels. */
function regionNameLookup(): Record<string, string> {
  const out: Record<string, string> = {}
  for (const g of getContentBundle().geography ?? []) out[g.regionId] = g.name
  return out
}

/**
 * A self-contained "streak of 5" map round. For each MapItem it shows either the
 * tap-on-map task ("Toca Malasia") or a 4-choice tile question (¿qué país? /
 * capital / bandera), tallying score, then a summary. Presentational: it holds no
 * store state, so both the daily geografia route and free-training reuse it.
 * `onAnswer(item, correct)` records the attempt; `onDone(result)` fires on exit.
 */
export function MapRound({
  items,
  mapId,
  onAnswer,
  onDone,
}: {
  items: MapItem[]
  mapId: string
  onAnswer: (item: MapItem, correct: boolean) => void
  onDone: (result: MapRoundResult) => void
}) {
  const names = useMemo(regionNameLookup, [])
  const meta = MAP_META[mapId] ?? { title: 'Geografía', emoji: '🗺️', blurb: '' }

  const [step, setStep] = useState(0)
  const [score, setScore] = useState(0)
  const [answered, setAnswered] = useState(false)
  const [tapStatus, setTapStatus] = useState<Record<string, RegionStatus>>({})
  const [pickedIdx, setPickedIdx] = useState<number | null>(null)
  const [burstKey, setBurstKey] = useState<number | null>(null)

  const total = items.length
  const done = step >= total
  const item = items[step]

  const settle = (correct: boolean) => {
    setAnswered(true)
    onAnswer(item, correct)
    if (correct) {
      setScore((s) => s + 1)
      if (Math.random() < 1 / 3) setBurstKey(Date.now())
    }
  }

  const onTap = (regionId: string) => {
    if (item.mode !== 'tap') return
    const correct = isCorrectTap(item, regionId)
    if (!correct) {
      // Gentle retry: flash the wrong country red, let them try again.
      setTapStatus((s) => ({ ...s, [regionId]: 'wrong' }))
      window.setTimeout(() => setTapStatus((s) => ({ ...s, [regionId]: 'idle' })), 550)
      return
    }
    setTapStatus({ [item.target.regionId]: 'correct' })
    settle(true)
  }

  const onPick = (idx: number) => {
    if (answered) return
    setPickedIdx(idx)
    settle(idx === item.correctIdx)
  }

  const next = () => {
    setAnswered(false)
    setPickedIdx(null)
    setTapStatus({})
    setBurstKey(null)
    setStep((s) => s + 1)
  }

  if (done) {
    const allRight = score === total
    return (
      <Card accent="var(--mint)">
        <div className="py-2 text-center">
          <div className="text-5xl" aria-hidden>
            {allRight ? '🏆' : '🌟'}
          </div>
          <p className="mt-2 text-xl font-black">
            {score} de {total} correctas
          </p>
          <p className="mt-1 text-sm" style={{ color: 'var(--ink-soft)' }}>
            {allRight ? '¡Ronda perfecta!' : score >= total - 1 ? '¡Casi perfecta!' : '¡Buen trabajo!'}
          </p>
          <Button variant="primary" onClick={() => onDone({ correct: score, total })} className="mt-4 w-full">
            Seguir →
          </Button>
        </div>
      </Card>
    )
  }

  const isTap = item.mode === 'tap'

  return (
    <>
      {burstKey !== null && <MangaBurst key={burstKey} />}
      <Card accent={COLORS_ACCENT}>
        <div className="mb-2 flex items-center justify-between">
          <span className="flex items-center gap-1.5 text-sm font-extrabold">
            <span aria-hidden>{meta.emoji}</span> {meta.title}
          </span>
          <span className="text-xs font-bold" style={{ color: 'var(--ink-soft)' }}>
            {step + 1}/{total}
          </span>
        </div>

        <p className="mb-3 text-base font-extrabold" style={{ color: 'var(--ink)' }}>
          {item.prompt}
        </p>

        <div className="overflow-hidden rounded-2xl" style={{ background: '#eaf5fa' }}>
          <SvgMap
            mapId={mapId}
            highlightRegionId={answered && isTap ? item.target.regionId : item.highlightRegionId}
            status={tapStatus}
            tappable={isTap && !answered ? undefined : []}
            showLabels={answered && !isTap}
            onTapRegion={isTap && !answered ? onTap : undefined}
            regionNames={names}
          />
        </div>

        {isTap && !answered && (
          <p className="mt-2 text-center text-xs font-bold" style={{ color: 'var(--ink-soft)' }}>
            👆 Toca el país en el mapa
          </p>
        )}

        {isTap && answered && (
          <p className="mt-2 text-center text-sm font-bold" style={{ color: '#3f7d55' }}>
            ¡Correcto! Ese es {item.target.name}. 🌟
          </p>
        )}
      </Card>

      {!isTap && (
        <Card className="mt-4">
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {item.choices!.map((c, i) => {
              const isBest = i === item.correctIdx
              const isPicked = pickedIdx === i
              let bg = 'var(--peach-soft)'
              let fg = 'var(--ink)'
              if (answered && isBest) {
                bg = 'var(--mint)'
                fg = '#3f7d55'
              } else if (answered && isPicked && !isBest) {
                bg = '#fde2df'
                fg = '#c0392b'
              }
              return (
                <button
                  key={i}
                  type="button"
                  onClick={() => onPick(i)}
                  disabled={answered}
                  className="min-h-[48px] rounded-2xl px-3 py-2 text-center text-base font-bold transition-transform active:translate-y-[1px] disabled:active:translate-y-0"
                  style={{ background: bg, color: fg }}
                >
                  {c}
                </button>
              )
            })}
          </div>
          {answered && (
            <p className="mt-3 text-sm font-bold" style={{ color: '#3f7d55' }}>
              {pickedIdx === item.correctIdx ? '¡Correcto! 🌟' : '¡Casi! Fíjate en la respuesta en verde.'}
            </p>
          )}
        </Card>
      )}

      {answered && (
        <Button variant="primary" onClick={next} className="mt-4 w-full">
          {step + 1 < total ? 'Siguiente →' : 'Ver resultado →'}
        </Button>
      )}
    </>
  )
}

const COLORS_ACCENT = '#38bdf8'
