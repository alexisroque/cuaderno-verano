import { useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router'
import type { Exercise } from '../../types/exercise'
import { getGenerator, flavorFromChapter } from '../../generators/framework'
import '../../generators/aira'
import '../../generators/leo'
import { createRng } from '../../lib/rng'
import { todayISO } from '../../lib/clock'
import { CHAPTERS } from '../../content/chapters'
import { chapterForDate } from '../../engine/dayComposer'
import { useProfileStore } from '../../state/profileStore'
import { useProgressStore } from '../../state/progressStore'
import { usePlayerStore } from '../../state/playerStore'
import { Shell } from '../../components/Shell'
import { Card } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { Pill } from '../../components/ui/Pill'
import { SpeakButton } from '../../components/ui/SpeakButton'
import { NumberPad } from '../../components/ui/NumberPad'
import { Visual } from '../../components/visuals/Visual'
import { Celebration } from '../../components/Celebration'
import { StrategyViewer } from '../../components/StrategyViewer'
import {
  initFlow,
  submitAnswer,
  toggleDatum,
  confirmData,
  retryFromScaffold,
  type ProblemFlowState,
} from './problemFlow'

/** Resolves the chapter a card was composed against (falls back to today's). */
function chapterById(chapterId: string | null) {
  const byId = chapterId ? CHAPTERS.find((c) => c.id === chapterId) : undefined
  return byId ?? chapterForDate(CHAPTERS, todayISO())
}

/** Builds the three gentle Innovamat scaffold prompts from the exercise. */
function scaffoldPrompts(ex: Exercise): string[] {
  const prompts: string[] = ['Vuelve a leerlo con calma. 🧭']
  if (ex.dataHighlight) {
    prompts.push('¿Qué sabemos? Fíjate en los números que de verdad hacen falta.')
  } else {
    prompts.push('¿Qué sabemos? Recuerda los datos del problema.')
  }
  prompts.push('¿Qué nos preguntan? ¿Qué operación nos puede ayudar?')
  return prompts
}

/**
 * The core Aira math loop (spec §5.2): resolve the exercise from the active
 * CardDescriptor, optionally tap the relevant data, answer via keypad/choices,
 * with a two-strike Innovamat scaffold and a strategy reveal on success. Pure
 * flow logic lives in problemFlow.ts; this screen renders it.
 */
export function ProblemPlayer() {
  const navigate = useNavigate()
  const profile = useProfileStore((s) => s.activeProfile) ?? 'aira'
  const card = usePlayerStore((s) => s.card)
  const chapterId = usePlayerStore((s) => s.chapterId)
  const returnTo = usePlayerStore((s) => s.returnTo)
  const clearActiveCard = usePlayerStore((s) => s.clearActiveCard)
  const recordAttempt = useProgressStore((s) => s.recordAttempt)
  const markCardComplete = useProgressStore((s) => s.markCardComplete)

  const chapter = chapterById(chapterId)
  const mascot = chapter.mascot

  // Materialize the exercise once, deterministically from the card seed.
  const exercise = useMemo<Exercise | null>(() => {
    if (!card?.subskill) return null
    const gen = getGenerator(card.subskill)
    if (!gen) return null
    return gen.generate(createRng(card.generatorSeed), card.difficulty ?? 1, flavorFromChapter(chapter))
  }, [card, chapter])

  const [flow, setFlow] = useState<ProblemFlowState>(() =>
    initFlow(exercise?.answer ?? { kind: 'number', value: 0 }, exercise?.dataHighlight),
  )
  const [entry, setEntry] = useState('')
  const [showStrategy, setShowStrategy] = useState(false)
  const [recorded, setRecorded] = useState(false)
  const startedAt = useRef(Date.now())

  if (!card || !exercise) {
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

  const record = (correct: boolean, hintsUsed: number) => {
    if (recorded) return
    setRecorded(true)
    recordAttempt(profile, {
      dateISO: todayISO(),
      cardType: card.cardType,
      subskill: card.subskill ?? 'unknown',
      correct,
      hintsUsed,
      ms: Date.now() - startedAt.current,
      difficulty: exercise.difficulty,
    })
    markCardComplete(profile, todayISO(), card.cardType)
  }

  const handleSubmit = (given: string | number) => {
    const next = submitAnswer(flow, exercise.answer, given)
    setFlow(next)
    if (next.step === 'solved') record(true, next.hintsUsed)
    if (next.step === 'revealed') record(false, next.hintsUsed)
    setEntry('')
  }

  const finish = () => {
    clearActiveCard()
    navigate(returnTo)
  }

  const isNumber = exercise.answer.kind === 'number'
  const highlight = exercise.dataHighlight

  return (
    <Shell>
      <div className="mx-auto max-w-md pt-1">
        <div className="mb-3 flex items-center justify-between gap-2">
          <button type="button" onClick={finish} className="text-sm font-bold" style={{ color: 'var(--ink-soft)' }}>
            ← Salir
          </button>
          <div className="flex gap-2">
            {card.challenge && <Pill tone="sky">⭐ Desafío</Pill>}
            <Pill tone="mint">
              {chapter.emoji} {chapter.place}
            </Pill>
          </div>
        </div>

        <Card accent="var(--peach)">
          <div className="mb-2 flex items-center gap-3">
            <span className="flex h-12 w-12 items-center justify-center rounded-[30%] text-2xl" style={{ background: 'var(--peach-soft)' }} aria-hidden>
              {mascot.emoji}
            </span>
            <div>
              <div className="text-sm font-extrabold">El problema del día</div>
              <div className="text-xs" style={{ color: 'var(--ink-soft)' }}>
                con {mascot.name} · {chapter.place}
              </div>
            </div>
            <div className="ml-auto">
              <SpeakButton text={exercise.audioText ?? exercise.prompt.text} tone="peach" />
            </div>
          </div>

          {/* Prompt (statement + optional visual) */}
          <StatementBlock exercise={exercise} flow={flow} onToggle={(i) => setFlow(toggleDatum(flow, i, highlight?.trapIndex))} />

          {exercise.prompt.visual && exercise.prompt.visual.kind !== 'none' && flow.step !== 'select-data' && (
            <div className="mt-3 flex justify-center">
              <Visual spec={exercise.prompt.visual} />
            </div>
          )}
        </Card>

        {/* Step-specific UI */}
        <div className="mt-4">
          {flow.step === 'select-data' && highlight && (
            <Card>
              <p className="mb-3 text-sm font-bold">Toca los datos que necesitas 👆</p>
              {flow.tappedTrap && (
                <p className="mb-2 text-sm" style={{ color: '#c26a4c' }}>
                  Mmm… ese dato no hace falta para resolverlo. 🤔
                </p>
              )}
              <Button variant="primary" onClick={() => setFlow(confirmData(flow))} className="w-full">
                Listo, a resolver →
              </Button>
            </Card>
          )}

          {flow.step === 'answer' && (
            <Card>
              {isNumber ? (
                <NumberPad value={entry} onChange={setEntry} onSubmit={() => handleSubmit(entry)} allowNegative />
              ) : (
                <ChoiceTiles exercise={exercise} onPick={(id) => handleSubmit(id)} />
              )}
            </Card>
          )}

          {flow.step === 'scaffold' && (
            <Card accent="var(--sky)">
              <div className="mb-2 flex items-center gap-2">
                <span className="text-2xl" aria-hidden>
                  {mascot.emoji}
                </span>
                <p className="text-sm font-extrabold">Casi… vamos por partes:</p>
              </div>
              <ul className="mb-3 space-y-2">
                {scaffoldPrompts(exercise).map((p, i) => (
                  <li key={i} className="rounded-2xl p-3 text-sm" style={{ background: 'var(--bg)' }}>
                    {p}
                  </li>
                ))}
              </ul>
              <Button variant="primary" onClick={() => setFlow(retryFromScaffold(flow))} className="w-full">
                Volver a intentarlo 💪
              </Button>
            </Card>
          )}

          {flow.step === 'solved' && (
            <Card>
              <Celebration emoji="🌟" line="¡Correcto!" />
              {!showStrategy ? (
                <div className="flex flex-col gap-2">
                  <Button variant="soft" onClick={() => setShowStrategy(true)} className="w-full">
                    ¿Cómo lo resolvió {mascot.name}?
                  </Button>
                  <Button variant="primary" onClick={finish} className="w-full">
                    Seguir →
                  </Button>
                </div>
              ) : (
                <>
                  <StrategyViewer strategies={exercise.strategies} seed={exercise.id} mascotName={mascot.name} />
                  <div className="mt-4">
                    <Button variant="primary" onClick={finish} className="w-full">
                      Seguir →
                    </Button>
                  </div>
                </>
              )}
            </Card>
          )}

          {flow.step === 'revealed' && (
            <Card accent="var(--mint)">
              <p className="mb-3 text-sm font-extrabold">No pasa nada — mira cómo se hace:</p>
              <StrategyViewer strategies={exercise.strategies} seed={exercise.id} mascotName={mascot.name} />
              <div className="mt-4 rounded-2xl p-3 text-center" style={{ background: 'var(--bg)' }}>
                <span className="text-sm" style={{ color: 'var(--ink-soft)' }}>
                  La respuesta era{' '}
                </span>
                <span className="text-lg font-black">{answerLabel(exercise)}</span>
              </div>
              <div className="mt-4">
                <Button variant="primary" onClick={finish} className="w-full">
                  Seguir →
                </Button>
              </div>
            </Card>
          )}
        </div>
      </div>
    </Shell>
  )
}

/** Renders the statement — as tappable chips during select-data, plain otherwise. */
function StatementBlock({
  exercise,
  flow,
  onToggle,
}: {
  exercise: Exercise
  flow: ProblemFlowState
  onToggle: (index: number) => void
}) {
  const highlight = exercise.dataHighlight
  if (flow.step === 'select-data' && highlight) {
    return (
      <div className="flex flex-wrap gap-1.5 rounded-2xl p-3 text-base leading-loose" style={{ background: 'var(--bg)' }}>
        {highlight.tokens.map((tok, i) => {
          const selected = flow.selectedIndices.includes(i)
          const isNumberish = /\d/.test(tok)
          return isNumberish ? (
            <button
              key={i}
              type="button"
              onClick={() => onToggle(i)}
              className="rounded-xl px-2 py-0.5 font-bold transition-transform active:translate-y-[1px]"
              style={{
                background: selected ? 'var(--peach)' : 'var(--peach-soft)',
                color: selected ? '#fff' : 'var(--ink)',
              }}
            >
              {tok}
            </button>
          ) : (
            <span key={i}>{tok}</span>
          )
        })}
      </div>
    )
  }
  return (
    <p className="rounded-2xl p-3 text-base leading-relaxed" style={{ background: 'var(--bg)', color: 'var(--ink)' }}>
      {exercise.prompt.text}
    </p>
  )
}

/** Big kawaii choice tiles for choice-kind answers. */
function ChoiceTiles({ exercise, onPick }: { exercise: Exercise; onPick: (id: string) => void }) {
  const choices = exercise.choices ?? []
  return (
    <div className="grid grid-cols-2 gap-2">
      {choices.map((c) => (
        <button
          key={c.id}
          type="button"
          onClick={() => onPick(c.id)}
          className="min-h-[64px] rounded-2xl px-3 py-3 text-lg font-black transition-transform active:translate-y-[2px]"
          style={{ background: 'var(--peach-soft)', color: 'var(--ink)' }}
        >
          {c.label}
        </button>
      ))}
    </div>
  )
}

/** Human-readable canonical answer for the reveal step. */
function answerLabel(exercise: Exercise): string {
  const a = exercise.answer
  switch (a.kind) {
    case 'number':
      return String(a.value)
    case 'text':
      return a.value
    case 'choice':
      return exercise.choices?.find((c) => c.id === a.correctId)?.label ?? a.correctId
    case 'multi':
      return a.correctIds
        .map((id) => exercise.choices?.find((c) => c.id === id)?.label ?? id)
        .join(', ')
  }
}
