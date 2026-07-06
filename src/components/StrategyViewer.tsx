import { useState } from 'react'
import type { Strategy } from '../types/exercise'
import { createRng } from '../lib/rng'
import { Button } from './ui/Button'
import { SpeakButton } from './ui/SpeakButton'
import { Visual } from './visuals/Visual'

interface StrategyViewerProps {
  strategies: Strategy[]
  /** Seed to rotate which strategy is shown (e.g. the exercise id). */
  seed: string
  /** Optional lead-in, e.g. "¿Cómo lo resolvió Tang?". */
  mascotName?: string
  /** Called once the child answers the "¿igual o distinto?" reflection (logged). */
  onReflect?: (sameApproach: boolean) => void
}

/**
 * Reveals one worked Strategy step-by-step ("siguiente" advances, each step
 * fades in). Which strategy is shown rotates deterministically off `seed` so a
 * child who re-opens the same exercise sees a stable pick, but different
 * exercises show variety. Ends with a light "¿lo hiciste igual o de otra
 * forma?" reflection that just logs via `onReflect`.
 */
export function StrategyViewer({ strategies, seed, mascotName, onReflect }: StrategyViewerProps) {
  const strategy = strategies.length > 0 ? createRng(`strategy:${seed}`).pick(strategies) : undefined
  const [stepIndex, setStepIndex] = useState(0)
  const [reflected, setReflected] = useState(false)

  if (!strategy) return null

  const current = strategy.steps[stepIndex]
  const isLast = stepIndex >= strategy.steps.length - 1

  const reflect = (same: boolean) => {
    setReflected(true)
    onReflect?.(same)
  }

  return (
    <div>
      <div className="mb-2 flex items-center justify-between gap-2">
        <h3 className="text-base font-extrabold" style={{ color: 'var(--ink)' }}>
          {mascotName ? `¿Cómo lo resolvió ${mascotName}?` : 'Una forma de resolverlo'}
        </h3>
        <SpeakButton text={current.text} tone="mint" />
      </div>
      <div className="mb-1 text-sm font-bold" style={{ color: 'var(--ink-soft)' }}>
        {strategy.name} · paso {stepIndex + 1} de {strategy.steps.length}
      </div>

      <div
        key={stepIndex}
        className="animate-[fadeIn_.35s_ease-out] rounded-2xl p-4"
        style={{ background: 'var(--bg)' }}
      >
        <p className="text-base leading-relaxed" style={{ color: 'var(--ink)' }}>
          {current.text}
        </p>
        {current.visual && current.visual.kind !== 'none' && (
          <div className="mt-3 flex justify-center">
            <Visual spec={current.visual} />
          </div>
        )}
      </div>

      <div className="mt-4 flex items-center justify-between gap-2">
        <div className="flex gap-1.5">
          {strategy.steps.map((_, i) => (
            <span
              key={i}
              className="h-2 w-2 rounded-full"
              style={{ background: i <= stepIndex ? 'var(--peach)' : 'var(--peach-soft)' }}
            />
          ))}
        </div>
        {!isLast ? (
          <Button variant="primary" onClick={() => setStepIndex((i) => Math.min(strategy.steps.length - 1, i + 1))}>
            Siguiente →
          </Button>
        ) : (
          !reflected && (
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold" style={{ color: 'var(--ink-soft)' }}>
                ¿Lo hiciste igual?
              </span>
              <Button variant="soft" onClick={() => reflect(true)}>
                Igual 😊
              </Button>
              <Button variant="soft" onClick={() => reflect(false)}>
                Distinto 🤔
              </Button>
            </div>
          )
        )}
      </div>
      {reflected && (
        <p className="mt-3 text-sm font-bold" style={{ color: '#3f7d55' }}>
          ¡Genial! Hay muchas formas de llegar a la respuesta. ✨
        </p>
      )}
    </div>
  )
}
