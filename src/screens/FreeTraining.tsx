import { Shell } from '../components/Shell'
import { Card } from '../components/ui/Card'

/** Free-training area placeholder (real content lands in a later task). */
export function FreeTraining() {
  return (
    <Shell>
      <div className="mx-auto max-w-4xl pt-2">
        <h2 className="mb-4 text-lg font-extrabold">Entrenar</h2>
        <Card accent="var(--mint)">
          <p className="text-sm" style={{ color: 'var(--ink-soft)' }}>
            Elige la gema que quieras entrenar. Próximamente.
          </p>
        </Card>
      </div>
    </Shell>
  )
}
