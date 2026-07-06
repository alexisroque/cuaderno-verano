import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router'
import type { Exercise, StrokePoint } from '../../types/exercise'
import { getGenerator, flavorFromChapter } from '../../generators/framework'
import '../../generators/leo'
import { createRng } from '../../lib/rng'
import { todayISO } from '../../lib/clock'
import { CHAPTERS } from '../../content/chapters'
import { chapterForDate } from '../../engine/dayComposer'
import { isMirrorProne } from '../../lib/strokes'
import { mirrorStroke } from '../../generators/leo/tracing'
import { traceScore } from '../../lib/traceScore'
import { speak } from '../../lib/tts'
import { useProfileStore } from '../../state/profileStore'
import { useProgressStore } from '../../state/progressStore'
import { usePlayerStore } from '../../state/playerStore'
import { Shell } from '../../components/Shell'
import { Card } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { SpeakButton } from '../../components/ui/SpeakButton'
import { Celebration } from '../../components/Celebration'
import { NoCard, PlayerHeader, IntroRow, CARD_COINS } from './playerChrome'
import { TracingCanvas } from './TracingCanvas'

function chapterById(chapterId: string | null) {
  return (chapterId ? CHAPTERS.find((c) => c.id === chapterId) : undefined) ?? chapterForDate(CHAPTERS, todayISO())
}

/** Praise line keyed to the star count — always warm, never scolding (spec). */
function praiseFor(stars: number): string {
  if (stars >= 3) return '¡Perfecto, Leo! ⭐⭐⭐'
  if (stars === 2) return '¡Muy bien, Leo! ⭐⭐'
  if (stars === 1) return '¡Bien! Lo has conseguido. ⭐'
  return '¡Casi! Vamos a intentarlo otra vez.'
}

/**
 * Leo's flagship fine-motor player (spec §5.6): render the glyph HUGE as a
 * light guide with an animated start dot + direction arrow, let the child
 * finger-trace it on a canvas, score the path generously into 1-3 stars, and
 * celebrate with TTS praise. Records into the `trazos` skill, awards coins,
 * marks the card complete. audioText is spoken on mount.
 */
export function TracingPlayer() {
  const navigate = useNavigate()
  const profile = useProfileStore((s) => s.activeProfile) ?? 'leo'
  const card = usePlayerStore((s) => s.card)
  const chapterId = usePlayerStore((s) => s.chapterId)
  const returnTo = usePlayerStore((s) => s.returnTo)
  const clearActiveCard = usePlayerStore((s) => s.clearActiveCard)
  const recordAttempt = useProgressStore((s) => s.recordAttempt)
  const markCardComplete = useProgressStore((s) => s.markCardComplete)
  const addCoins = useProgressStore((s) => s.addCoins)

  const chapter = chapterById(chapterId)

  const exercise = useMemo<Exercise | null>(() => {
    if (!card?.subskill) return null
    const gen = getGenerator(card.subskill)
    if (!gen) return null
    return gen.generate(createRng(card.generatorSeed), card.difficulty ?? 1, flavorFromChapter(chapter))
  }, [card, chapter])

  const [points, setPoints] = useState<StrokePoint[]>([])
  const [stars, setStars] = useState<number | null>(null)
  const [canvasKey, setCanvasKey] = useState(0)
  const startedAt = useRef(Date.now())
  const finalized = useRef(false)

  useEffect(() => {
    if (exercise?.audioText) speak(exercise.audioText, 'es-ES')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [exercise?.id])

  if (!card || !exercise || !exercise.trace) return <NoCard />

  const glyph = exercise.trace.glyph
  const guide = exercise.trace.strokes
  // For mirror-prone glyphs, show a faint "wrong way" ghost to compare against.
  const ghost = isMirrorProne(glyph) ? guide.map(mirrorStroke) : undefined

  const exit = () => {
    clearActiveCard()
    navigate(returnTo)
  }

  const finish = () => {
    const result = traceScore(guide, points)
    setStars(result.stars)
    speak(praiseFor(result.stars), 'es-ES')
    if (!finalized.current) {
      finalized.current = true
      recordAttempt(profile, {
        dateISO: todayISO(),
        cardType: card.cardType,
        subskill: card.subskill ?? 'letras',
        // A trace always "counts" as a genuine attempt; 1+ stars is a success.
        correct: result.stars >= 1,
        hintsUsed: 0,
        ms: Date.now() - startedAt.current,
        difficulty: exercise.difficulty,
      })
      markCardComplete(profile, todayISO(), card.cardType)
      addCoins(profile, CARD_COINS)
    }
  }

  const retry = () => {
    setStars(null)
    setPoints([])
    finalized.current = false
    // Force the canvas to reset by remounting via key (see below).
    setCanvasKey((k) => k + 1)
  }

  return (
    <Shell>
      <div className="mx-auto max-w-md pt-1">
        <PlayerHeader chapter={chapter} onExit={exit} />

        <Card accent="#f59e0b">
          <IntroRow
            emoji="✍️"
            title={`Escribe ${glyph}`}
            subtitle="Sigue la flecha verde con el dedo"
            accent="#fef3c7"
            right={<SpeakButton text={exercise.audioText ?? exercise.prompt.text} tone="peach" size="lg" />}
          />

          <div className="mt-2 flex flex-col items-center">
            {/* The giant glyph the child copies, with the finger canvas over the guide. */}
            <div className="relative">
              <span
                className="pointer-events-none absolute -top-2 right-2 text-6xl opacity-10 select-none"
                aria-hidden
              >
                {glyph}
              </span>
              <TracingCanvas key={canvasKey} guide={guide} ghost={ghost} onChange={setPoints} size={300} />
            </div>

            {stars === null ? (
              <Button
                variant="primary"
                size="lg"
                onClick={finish}
                disabled={points.length === 0}
                className="mt-4 w-full"
              >
                ¡Ya está! ✨
              </Button>
            ) : (
              <div className="mt-3 w-full">
                <Celebration emoji={stars >= 1 ? '⭐' : '💪'} line={praiseFor(stars)} />
                <div className="mt-1 flex flex-col gap-2">
                  <Button variant="soft" size="lg" onClick={retry} className="w-full">
                    Otra vez 🔁
                  </Button>
                  <Button variant="primary" size="lg" onClick={exit} className="w-full">
                    Seguir →
                  </Button>
                </div>
              </div>
            )}
          </div>
        </Card>
      </div>
    </Shell>
  )
}
