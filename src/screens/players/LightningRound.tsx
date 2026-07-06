import { useEffect, useMemo, useRef, useState } from 'react'
import type { Exercise } from '../../types/exercise'
import { getGenerator, flavorFromChapter } from '../../generators/framework'
import '../../generators/aira'
import { createRng } from '../../lib/rng'
import type { Chapter } from '../../content/schemas'
import { Card } from '../../components/ui/Card'
import { NumberPad } from '../../components/ui/NumberPad'

/** Duration of the lightning (relámpago) mental-calc round, in seconds. */
const DURATION_S = 60
const SUBSKILL = 'mental'

/**
 * A 60-second timed mental-calc mode offered when the day's `relámpago`
 * surprise is active. Serves back-to-back `calculo/mental` exercises; each
 * correct answer scores a point, wrong answers are skipped forward. Records
 * an attempt per answer (so it still feeds the Cálculo gem) and shows a final
 * score. Aira-only (mental arithmetic is a 5º-grade skill).
 */
export function LightningRound({
  chapter,
  onAnswer,
  onDone,
}: {
  chapter: Chapter
  onAnswer: (subskill: string, correct: boolean, difficulty: number) => void
  onDone: (score: number) => void
}) {
  const [index, setIndex] = useState(0)
  const [entry, setEntry] = useState('')
  const [score, setScore] = useState(0)
  const [left, setLeft] = useState(DURATION_S)
  const doneRef = useRef(false)

  const exercise = useMemo<Exercise | null>(() => {
    const gen = getGenerator(SUBSKILL)
    if (!gen) return null
    // Difficulty 2 keeps it brisk-but-doable for rapid fire.
    return gen.generate(createRng(`lightning:${index}`), 2, flavorFromChapter(chapter))
  }, [index, chapter])

  useEffect(() => {
    if (left <= 0) {
      if (!doneRef.current) {
        doneRef.current = true
        onDone(score)
      }
      return
    }
    const t = setTimeout(() => setLeft((l) => l - 1), 1000)
    return () => clearTimeout(t)
  }, [left, score, onDone])

  if (!exercise || exercise.answer.kind !== 'number') {
    return (
      <Card>
        <p className="text-sm" style={{ color: 'var(--ink-soft)' }}>
          El modo relámpago no está disponible ahora mismo.
        </p>
      </Card>
    )
  }

  const submit = () => {
    const correct = Number(entry) === (exercise.answer as { value: number }).value
    onAnswer(SUBSKILL, correct, exercise.difficulty)
    if (correct) setScore((s) => s + 1)
    setEntry('')
    setIndex((i) => i + 1)
  }

  return (
    <>
      <div className="mb-3 flex items-center justify-between">
        <span className="text-sm font-black" style={{ color: '#c26a4c' }}>
          ⚡ Ronda relámpago
        </span>
        <span
          className="rounded-xl px-3 py-1 text-lg font-black tabular-nums"
          style={{ background: left <= 10 ? '#fde2df' : 'var(--sun)', color: left <= 10 ? '#c0392b' : '#7a5c00' }}
        >
          {left}s
        </span>
      </div>
      <Card accent="var(--pow)">
        <p className="text-center text-2xl font-black">{exercise.prompt.text}</p>
      </Card>
      <Card className="mt-3">
        <NumberPad value={entry} onChange={setEntry} onSubmit={submit} allowNegative />
        <p className="mt-2 text-center text-sm font-bold" style={{ color: 'var(--ink-soft)' }}>
          Aciertos: {score}
        </p>
      </Card>
    </>
  )
}
