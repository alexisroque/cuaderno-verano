import { useNavigate } from 'react-router'
import { Shell } from '../../components/Shell'
import { Card } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { usePlayerStore } from '../../state/playerStore'

/**
 * Placeholder for players not yet built (dictado, diario, trazos, english,
 * cuento…). Lands the child softly and points back to the day page, so every
 * card on the daily page is already tappable while later tasks fill in the
 * real players.
 */
export function ComingSoonPlayer() {
  const navigate = useNavigate()
  const card = usePlayerStore((s) => s.card)
  const clearActiveCard = usePlayerStore((s) => s.clearActiveCard)
  const back = () => {
    clearActiveCard()
    navigate('/hoy')
  }
  return (
    <Shell>
      <div className="mx-auto max-w-md pt-8">
        <Card accent="var(--sky)">
          <div className="text-center">
            <div className="text-5xl" aria-hidden>
              🚧
            </div>
            <h2 className="mt-2 text-lg font-extrabold">Muy pronto</h2>
            <p className="mt-1 text-sm" style={{ color: 'var(--ink-soft)' }}>
              Esta actividad ({card?.cardType ?? '—'}) llegará en una próxima versión.
            </p>
            <div className="mt-4">
              <Button variant="primary" onClick={back}>
                Volver a hoy
              </Button>
            </div>
          </div>
        </Card>
      </div>
    </Shell>
  )
}
