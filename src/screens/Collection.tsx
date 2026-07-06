import { Shell } from '../components/Shell'
import { Card } from '../components/ui/Card'

/** Gem cabinet / passport / mural collection placeholder. */
export function Collection() {
  return (
    <Shell>
      <div className="mx-auto max-w-4xl pt-2">
        <h2 className="mb-4 text-lg font-extrabold">Mi colección</h2>
        <Card accent="var(--sky)">
          <p className="text-sm" style={{ color: 'var(--ink-soft)' }}>
            Tu vitrina de gemas, el pasaporte y el mural vivirán aquí. Próximamente.
          </p>
        </Card>
      </div>
    </Shell>
  )
}
