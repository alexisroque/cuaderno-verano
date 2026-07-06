import { useNavigate } from 'react-router'
import { Card } from '../components/ui/Card'
import { Button } from '../components/ui/Button'

/**
 * Parent area — gated behind a lock on the cover. The real PIN gate and
 * controls arrive in a later task; for now it is a distinct, adult-toned
 * placeholder with a way back to the cover.
 */
export function ParentArea() {
  const navigate = useNavigate()
  return (
    <main
      className="flex min-h-screen flex-col items-center justify-center gap-6 px-6"
      style={{ background: 'var(--bg)', color: 'var(--ink)' }}
    >
      <Card className="w-full max-w-md">
        <div className="mb-2 flex items-center gap-2">
          <span className="text-2xl" aria-hidden>
            🔒
          </span>
          <h1 className="text-xl font-extrabold">Zona de padres</h1>
        </div>
        <p className="text-sm" style={{ color: 'var(--ink-soft)' }}>
          Aquí podrás ajustar dificultad, foco semanal y ver el progreso. El
          acceso con PIN y los controles llegarán pronto.
        </p>
        <div className="mt-5">
          <Button variant="soft" onClick={() => navigate('/')}>
            ← Volver
          </Button>
        </div>
      </Card>
    </main>
  )
}
