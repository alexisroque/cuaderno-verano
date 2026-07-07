import { useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router'
import { CHAPTERS } from '../../content/chapters'
import { chapterForDate } from '../../engine/dayComposer'
import { curiosityById, englishReadingById } from '../../content/loader'
import { todayISO } from '../../lib/clock'
import { useProfileStore } from '../../state/profileStore'
import { useProgressStore } from '../../state/progressStore'
import { usePlayerStore } from '../../state/playerStore'
import { Shell } from '../../components/Shell'
import { Card } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { SpeakButton } from '../../components/ui/SpeakButton'
import { Celebration } from '../../components/Celebration'
import { NoCard, PlayerHeader, IntroRow } from './playerChrome'
import { awardCardCoins } from './rewards'
import { useCelebrations } from './useCelebrations'
import { QuestionTiles, type QuestionLike } from './QuestionTiles'

type Resolved =
  | { kind: 'english'; title: string; sentences: string[]; questions: QuestionLike[]; consumeId: string }
  | { kind: 'curiosity'; text: string; questions: QuestionLike[]; consumeId: string }

/**
 * Aira's "¿Sabías que…?" reading card (Task 5.5). Resolves either an English
 * mini-reading (contentRef.readingId → show text with a 🔊 + literal/reflexiva
 * questions) or a curiosity (contentRef.curiosityId → show the fact + any
 * reflexiva question, else just an acknowledgement). Records into the `lectura`
 * skill (comprension/reflexion), marks the card complete, awards coins.
 */
export function ReadingPlayer() {
  const navigate = useNavigate()
  const profile = useProfileStore((s) => s.activeProfile) ?? 'aira'
  const card = usePlayerStore((s) => s.card)
  const chapterId = usePlayerStore((s) => s.chapterId)
  const returnTo = usePlayerStore((s) => s.returnTo)
  const clearActiveCard = usePlayerStore((s) => s.clearActiveCard)
  const recordAttempt = useProgressStore((s) => s.recordAttempt)
  const markCardComplete = useProgressStore((s) => s.markCardComplete)
  const markConsumed = useProgressStore((s) => s.markConsumed)
  const { overlays, celebrateCorrect, settleAttempt } = useCelebrations()

  const [step, setStep] = useState(0)
  const [done, setDone] = useState(false)
  const startedAt = useRef(Date.now())
  const finalized = useRef(false)

  const chapter = useMemo(
    () => (chapterId ? CHAPTERS.find((c) => c.id === chapterId) : undefined) ?? chapterForDate(CHAPTERS, todayISO()),
    [chapterId],
  )

  const resolved = useMemo<Resolved | null>(() => {
    const ref = card?.contentRef
    if (ref?.readingId) {
      const r = englishReadingById(ref.readingId)
      if (r) return { kind: 'english', title: r.title, sentences: r.sentences, questions: r.questions, consumeId: r.id }
    }
    if (ref?.curiosityId) {
      const cur = curiosityById(ref.curiosityId)
      if (cur) return { kind: 'curiosity', text: cur.text.es, questions: [], consumeId: cur.id }
    }
    return null
  }, [card])

  if (!card || !resolved) return <NoCard />

  const questions = resolved.questions
  const exit = () => {
    clearActiveCard()
    navigate(returnTo)
  }

  const finalize = () => {
    if (finalized.current) return
    finalized.current = true
    const poolKey = resolved.kind === 'english' ? 'englishReadings' : 'curiosities'
    markConsumed(profile, poolKey, resolved.consumeId)
    markCardComplete(profile, todayISO(), 'sabias-que')
    awardCardCoins(profile, card.challenge)
  }

  const onAnswered = (q: QuestionLike, correct: boolean) => {
    recordAttempt(profile, {
      dateISO: todayISO(),
      cardType: 'sabias-que',
      subskill: q.kind === 'reflexiva' ? 'reflexion' : 'comprension',
      // Reflexivas always count as engaged/correct — thinking, not one truth.
      correct: q.kind === 'reflexiva' ? true : correct,
      hintsUsed: 0,
      ms: Date.now() - startedAt.current,
      difficulty: 2,
    })
    if (q.kind !== 'reflexiva' && correct) celebrateCorrect()
    settleAttempt(profile)
  }

  const advance = () => {
    if (step + 1 < questions.length) {
      setStep(step + 1)
    } else {
      finalize()
      setDone(true)
    }
  }

  return (
    <Shell>
      {overlays}
      <div className="mx-auto max-w-md pt-1">
        <PlayerHeader chapter={chapter} onExit={exit} />

        <Card accent="#10b981">
          <IntroRow
            emoji="🌍"
            title="¿Sabías que…?"
            subtitle={resolved.kind === 'english' ? `Reading · ${resolved.title}` : 'Un dato del mundo'}
            accent="var(--mint)"
            right={
              resolved.kind === 'english' ? (
                <SpeakButton text={resolved.sentences.join(' ')} lang="en-GB" tone="mint" label="Listen" />
              ) : (
                <SpeakButton text={resolved.text} lang="es-ES" tone="mint" label="Escuchar" />
              )
            }
          />
          <div className="rounded-2xl p-3 text-base leading-relaxed" style={{ background: 'var(--bg)' }}>
            {resolved.kind === 'english' ? resolved.sentences.join(' ') : resolved.text}
          </div>
        </Card>

        {!done ? (
          <Card className="mt-4">
            {questions.length > 0 ? (
              <>
                <p className="mb-3 text-xs font-bold" style={{ color: 'var(--ink-soft)' }}>
                  Pregunta {step + 1} de {questions.length}
                </p>
                <QuestionTiles key={step} question={questions[step]} onAnswered={(c) => onAnswered(questions[step], c)} />
                <Button variant="primary" onClick={advance} className="mt-4 w-full">
                  {step + 1 < questions.length ? 'Siguiente pregunta →' : 'Terminar →'}
                </Button>
              </>
            ) : (
              <div className="text-center">
                <p className="text-sm" style={{ color: 'var(--ink-soft)' }}>
                  ¡Qué curioso! Guarda este dato en tu cabeza para sorprender a alguien. 🧠
                </p>
                <Button
                  variant="primary"
                  onClick={() => {
                    finalize()
                    setDone(true)
                  }}
                  className="mt-4 w-full"
                >
                  ¡Genial! →
                </Button>
              </div>
            )}
          </Card>
        ) : (
          <Card className="mt-4" accent="var(--mint)">
            <Celebration emoji="🧠" line="¡Un dato más en tu mochila!" />
            <Button variant="primary" onClick={exit} className="mt-2 w-full">
              Seguir →
            </Button>
          </Card>
        )}
      </div>
    </Shell>
  )
}
