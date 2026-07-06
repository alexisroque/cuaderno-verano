import { useState } from 'react'
import { Card } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { SpeakButton } from '../../components/ui/SpeakButton'
import { QuestionTiles } from './QuestionTiles'
import { MangaBurst } from '../../components/celebrations/MangaBurst'
import type { QuizItem } from './quizItems'

/** How many questions make up one "streak of 5" round. */
export const ROUND_SIZE = 5

export interface QuizRoundResult {
  correct: number
  total: number
}

/**
 * A self-contained "streak of 5" quiz round: shows one QuizItem at a time
 * (optional passage + 4-choice question), tallies score, then a summary card.
 * Each answered question calls `onAnswer(item, correct)` so the host can
 * record an attempt against the right skill. `onDone(result)` fires when the
 * child leaves the summary. Presentational: it holds no store state, so it is
 * reused both by the daily reading path and the free-training loop.
 */
export function QuizRound({
  items,
  onAnswer,
  onDone,
  title,
  emoji = '🧠',
}: {
  items: QuizItem[]
  onAnswer: (item: QuizItem, correct: boolean) => void
  onDone: (result: QuizRoundResult) => void
  title: string
  emoji?: string
}) {
  const [step, setStep] = useState(0)
  const [answered, setAnswered] = useState(false)
  const [score, setScore] = useState(0)
  const [burstKey, setBurstKey] = useState<number | null>(null)

  const total = items.length
  const done = step >= total
  const item = items[step]

  const handleAnswered = (correct: boolean) => {
    if (answered) return
    setAnswered(true)
    onAnswer(item, correct)
    if (correct) {
      setScore((s) => s + 1)
      // Manga burst probabilistically (roughly 1 in 3) on a correct answer.
      if (Math.random() < 1 / 3) setBurstKey(Date.now())
    }
  }

  const next = () => {
    setAnswered(false)
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

  return (
    <>
      {burstKey !== null && <MangaBurst key={burstKey} />}
      <Card accent="#10b981">
        <div className="mb-2 flex items-center justify-between">
          <span className="flex items-center gap-1.5 text-sm font-extrabold">
            <span aria-hidden>{emoji}</span> {title}
          </span>
          <span className="text-xs font-bold" style={{ color: 'var(--ink-soft)' }}>
            {step + 1}/{total}
          </span>
        </div>
        {item.passage && (
          <div className="flex items-start gap-2 rounded-2xl p-3 text-base leading-relaxed" style={{ background: 'var(--bg)' }}>
            <p className="flex-1">{item.passage}</p>
            {item.speakLang && (
              <SpeakButton text={item.passage} lang={item.speakLang} tone="mint" label="Listen" />
            )}
          </div>
        )}
      </Card>

      <Card className="mt-4">
        <QuestionTiles key={step} question={item.question} onAnswered={handleAnswered} />
        {answered && (
          <Button variant="primary" onClick={next} className="mt-4 w-full">
            {step + 1 < total ? 'Siguiente →' : 'Ver resultado →'}
          </Button>
        )}
      </Card>
    </>
  )
}
