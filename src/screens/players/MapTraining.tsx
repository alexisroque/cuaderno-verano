import { useMemo, useRef, useState } from 'react'
import type { ProfileId } from '../../state/profileStore'
import { getContentBundle } from '../../content/loader'
import { MAP_IDS, MAP_META, mapGeometry } from '../../content/maps'
import { createRng } from '../../lib/rng'
import { Card } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { SvgMap } from '../../components/geo/SvgMap'
import { useCelebrations } from './useCelebrations'
import { buildMapRound, type MapItem } from './mapItems'
import { recordMapAttempt } from './recordMap'
import { MapRound } from './MapRound'

/**
 * The geografia free-training flow: first a map picker (SE Asia / Europe /
 * World, each shown as a live mini-map thumbnail), then an endless streak-of-5
 * MapRound loop for the chosen map. Records every answer against the geografia
 * subskills, pops manga bursts / gem level-ups via the shared celebration seam,
 * and offers a "Ya está" exit summary — mirroring TrainingSession's shape.
 */
export function MapTraining({ profile, onExit }: { profile: ProfileId; onExit: () => void }) {
  const { overlays, celebrateCorrect, settleAttempt } = useCelebrations()
  const [mapId, setMapId] = useState<string | null>(null)
  const [round, setRound] = useState(0)
  const [answered, setAnswered] = useState(0)
  const [correct, setCorrect] = useState(0)
  const [ended, setEnded] = useState(false)
  const startedAt = useRef(Date.now())

  const geography = getContentBundle().geography ?? []
  const items = useMemo<MapItem[]>(
    () => (mapId ? buildMapRound(createRng(`map:${mapId}:${round}`), geography, mapId, 5) : []),
    [mapId, round, geography],
  )

  const onAnswer = (item: MapItem, ok: boolean) => {
    recordMapAttempt(profile, item, ok, startedAt.current)
    startedAt.current = Date.now()
    setAnswered((n) => n + 1)
    if (ok) setCorrect((n) => n + 1)
    if (ok) celebrateCorrect()
    settleAttempt(profile)
  }

  if (ended) {
    return (
      <Card accent="var(--mint)">
        <div className="py-3 text-center">
          <div className="text-5xl" aria-hidden>
            🎉
          </div>
          <p className="mt-2 text-xl font-black">
            {correct} de {answered} correctas
          </p>
          <p className="mt-1 text-sm" style={{ color: 'var(--ink-soft)' }}>
            ¡Buen viaje por el mapa! Tu gema de Geografía ha crecido.
          </p>
          <Button variant="primary" onClick={onExit} className="mt-4 w-full">
            Volver →
          </Button>
        </div>
      </Card>
    )
  }

  // Map picker.
  if (!mapId) {
    return (
      <>
        <p className="mb-3 text-sm" style={{ color: 'var(--ink-soft)' }}>
          Elige un mapa para explorar.
        </p>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {MAP_IDS.filter((id) => mapGeometry(id)).map((id) => {
            const meta = MAP_META[id]
            return (
              <Card
                key={id}
                interactive
                onClick={() => {
                  setMapId(id)
                  setRound(0)
                }}
                className="text-center"
              >
                <div className="pointer-events-none mb-2 overflow-hidden rounded-xl" style={{ background: '#eaf5fa' }}>
                  <SvgMap mapId={id} tappable={[]} showLabels={false} />
                </div>
                <div className="text-base font-black">
                  {meta.emoji} {meta.title}
                </div>
                <div className="text-xs" style={{ color: 'var(--ink-soft)' }}>
                  {meta.blurb}
                </div>
              </Card>
            )
          })}
        </div>
        <Button variant="soft" onClick={onExit} className="mt-4 w-full">
          ← Salir
        </Button>
      </>
    )
  }

  return (
    <>
      {overlays}
      <div className="mb-3 flex items-center justify-between">
        <span className="text-sm font-bold" style={{ color: 'var(--ink-soft)' }}>
          Aciertos: {correct}/{answered}
        </span>
        <div className="flex gap-2">
          <Button variant="ghost" onClick={() => setMapId(null)}>
            Cambiar mapa
          </Button>
          <Button variant="soft" onClick={() => setEnded(true)}>
            Ya está ✓
          </Button>
        </div>
      </div>
      <MapRound key={round} items={items} mapId={mapId} onAnswer={onAnswer} onDone={() => setRound((r) => r + 1)} />
    </>
  )
}
