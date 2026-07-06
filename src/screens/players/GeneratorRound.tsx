import { useEffect, useMemo, useState } from 'react'
import type { Exercise } from '../../types/exercise'
import { getGenerator, flavorFromChapter } from '../../generators/framework'
import '../../generators/aira'
import '../../generators/leo'
import { createRng } from '../../lib/rng'
import { speak } from '../../lib/tts'
import type { Chapter } from '../../content/schemas'
import { Card } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { SpeakButton } from '../../components/ui/SpeakButton'
import { NumberPad } from '../../components/ui/NumberPad'
import { Visual } from '../../components/visuals/Visual'

/** True if `answer` matches the exercise's canonical answer. */
function isCorrect(exercise: Exercise, given: string): boolean {
  const a = exercise.answer
  if (a.kind === 'number') return Number(given) === a.value
  if (a.kind === 'choice') return given === a.correctId
  if (a.kind === 'text') return [a.value, ...(a.accept ?? [])].some((v) => v.toLowerCase() === given.trim().toLowerCase())
  if (a.kind === 'multi') return a.correctIds.includes(given)
  return false
}

/**
 * One free-training generator exercise: materializes it from a subskill +
 * seed, renders a keypad (number answers) or big choice tiles, grades locally,
 * and calls `onAnswer(subskill, correct, difficulty)` then `onNext()`. Audio-
 * first for Leo (auto-speaks the prompt). Deliberately lean — the daily
 * ProblemPlayer keeps the full Innovamat scaffold; free training is fast reps.
 */
export function GeneratorRound({
  subskill,
  difficulty,
  seed,
  chapter,
  leo,
  onAnswer,
  onNext,
  onCorrect,
}: {
  subskill: string
  difficulty: number
  seed: string
  chapter: Chapter
  leo: boolean
  onAnswer: (subskill: string, correct: boolean, difficulty: number) => void
  onNext: () => void
  onCorrect: () => void
}) {
  const exercise = useMemo<Exercise | null>(() => {
    const gen = getGenerator(subskill)
    if (!gen) return null
    return gen.generate(createRng(seed), difficulty, flavorFromChapter(chapter))
  }, [subskill, difficulty, seed, chapter])

  const [entry, setEntry] = useState('')
  const [result, setResult] = useState<'right' | 'wrong' | null>(null)

  useEffect(() => {
    if (leo && exercise?.audioText) speak(exercise.audioText, 'es-ES')
  }, [exercise?.id, leo])

  if (!exercise) {
    return (
      <Card>
        <p className="text-sm" style={{ color: 'var(--ink-soft)' }}>
          Esta gema aún no tiene ejercicios de entrenamiento.
        </p>
        <Button variant="primary" onClick={onNext} className="mt-3 w-full">
          Otra →
        </Button>
      </Card>
    )
  }

  const grade = (given: string) => {
    if (result) return
    const ok = isCorrect(exercise, given)
    setResult(ok ? 'right' : 'wrong')
    onAnswer(subskill, ok, exercise.difficulty)
    if (ok) onCorrect()
    if (leo) speak(ok ? '¡Muy bien!' : '¡Casi!', 'es-ES')
  }

  const isNumber = exercise.answer.kind === 'number'

  return (
    <>
      <Card accent="var(--peach)">
        <div className="mb-2 flex items-center justify-between gap-2">
          <p className="flex-1 text-base leading-relaxed">{exercise.prompt.text}</p>
          <SpeakButton text={exercise.audioText ?? exercise.prompt.text} tone="peach" size={leo ? 'lg' : 'md'} />
        </div>
        {exercise.prompt.visual && exercise.prompt.visual.kind !== 'none' && (
          <div className="mt-2 flex justify-center">
            <Visual spec={exercise.prompt.visual} />
          </div>
        )}
      </Card>

      <Card className="mt-3">
        {result === null ? (
          isNumber ? (
            <NumberPad value={entry} onChange={setEntry} onSubmit={() => grade(entry)} allowNegative />
          ) : (
            <div className="grid grid-cols-2 gap-2">
              {(exercise.choices ?? []).map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => grade(c.id)}
                  className="min-h-[60px] rounded-2xl px-3 py-3 text-lg font-black transition-transform active:translate-y-[2px]"
                  style={{ background: 'var(--peach-soft)', color: 'var(--ink)' }}
                >
                  {c.label}
                </button>
              ))}
            </div>
          )
        ) : (
          <div className="text-center">
            <p className="text-lg font-black" style={{ color: result === 'right' ? '#3f7d55' : '#c26a4c' }}>
              {result === 'right' ? '¡Correcto! 🌟' : `Casi… era ${answerText(exercise)}`}
            </p>
            <Button
              variant="primary"
              size={leo ? 'lg' : 'md'}
              onClick={() => {
                setEntry('')
                setResult(null)
                onNext()
              }}
              className="mt-3 w-full"
            >
              Otra →
            </Button>
          </div>
        )}
      </Card>
    </>
  )
}

/** Human-readable canonical answer, for the "casi… era X" line. */
function answerText(exercise: Exercise): string {
  const a = exercise.answer
  if (a.kind === 'number') return String(a.value)
  if (a.kind === 'text') return a.value
  if (a.kind === 'choice') return exercise.choices?.find((c) => c.id === a.correctId)?.label ?? a.correctId
  return a.correctIds.join(', ')
}
