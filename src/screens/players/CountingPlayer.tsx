import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router'
import type { Exercise } from '../../types/exercise'
import { getGenerator, flavorFromChapter } from '../../generators/framework'
import '../../generators/leo'
import { createRng } from '../../lib/rng'
import { todayISO } from '../../lib/clock'
import { CHAPTERS } from '../../content/chapters'
import { chapterForDate } from '../../engine/dayComposer'
import { speak } from '../../lib/tts'
import { useProfileStore } from '../../state/profileStore'
import { useProgressStore } from '../../state/progressStore'
import { usePlayerStore } from '../../state/playerStore'
import { Shell } from '../../components/Shell'
import { Card } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { SpeakButton } from '../../components/ui/SpeakButton'
import { Celebration } from '../../components/Celebration'
import { CompareGroups } from '../../components/visuals/EmojiCount'
import { BoxesVisual } from '../../components/visuals/BoxesVisual'
import { Visual } from '../../components/visuals/Visual'
import { NoCard, PlayerHeader, IntroRow, CARD_COINS } from './playerChrome'
import { BigChoiceTiles } from './BigChoiceTiles'

function chapterById(chapterId: string | null) {
  return (chapterId ? CHAPTERS.find((c) => c.id === chapterId) : undefined) ?? chapterForDate(CHAPTERS, todayISO())
}

/**
 * Number-spelled counting words (0-20) so a tapped emoji counts aloud in
 * Spanish rather than reading a digit the child can't decode.
 */
const NUMBER_WORDS = [
  'cero', 'uno', 'dos', 'tres', 'cuatro', 'cinco', 'seis', 'siete', 'ocho', 'nueve', 'diez',
  'once', 'doce', 'trece', 'catorce', 'quince', 'dieciséis', 'diecisiete', 'dieciocho', 'diecinueve', 'veinte',
]

/**
 * Leo's counting/number-sense player (spec §5.6): renders the exercise's
 * VisualSpec (emoji-count → big tappable emojis that bounce + count aloud when
 * tapped; compare-groups & boxes rendered too), then big answer tiles. Correct
 * → celebration + praise; wrong → gentle "¡Casi! Cuéntalos otra vez" retry.
 * Records into the `numeros` skill, awards coins, marks the card complete.
 */
export function CountingPlayer() {
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

  const [wrongPick, setWrongPick] = useState<string | null>(null)
  const [solved, setSolved] = useState(false)
  const attempts = useRef(0)
  const startedAt = useRef(Date.now())
  const finalized = useRef(false)

  useEffect(() => {
    if (exercise?.audioText) speak(exercise.audioText, 'es-ES')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [exercise?.id])

  if (!card || !exercise || exercise.answer.kind !== 'choice') return <NoCard />

  const correctId = exercise.answer.correctId
  const visual = exercise.prompt.visual

  const exit = () => {
    clearActiveCard()
    navigate(returnTo)
  }

  const pick = (id: string) => {
    if (solved) return
    attempts.current += 1
    if (id === correctId) {
      setSolved(true)
      setWrongPick(null)
      speak('¡Muy bien, Leo!', 'es-ES')
      if (!finalized.current) {
        finalized.current = true
        recordAttempt(profile, {
          dateISO: todayISO(),
          cardType: card.cardType,
          subskill: card.subskill ?? 'contar-6',
          correct: attempts.current === 1,
          hintsUsed: attempts.current - 1,
          ms: Date.now() - startedAt.current,
          difficulty: exercise.difficulty,
        })
        markCardComplete(profile, todayISO(), card.cardType)
        addCoins(profile, CARD_COINS)
      }
    } else {
      setWrongPick(id)
      speak('¡Casi! Cuéntalos otra vez.', 'es-ES')
    }
  }

  return (
    <Shell>
      <div className="mx-auto max-w-md pt-1">
        <PlayerHeader chapter={chapter} onExit={exit} />

        <Card accent="#10b981">
          <IntroRow
            emoji="🔢"
            title="Contar"
            subtitle="Mira y toca la respuesta"
            accent="var(--mint)"
            right={<SpeakButton text={exercise.audioText ?? exercise.prompt.text} tone="mint" size="lg" />}
          />

          <div className="mt-2 flex justify-center">
            <CountVisual visual={visual} />
          </div>
        </Card>

        {!solved ? (
          <Card className="mt-4">
            {wrongPick && (
              <p className="mb-3 text-center text-base font-bold" style={{ color: '#c26a4c' }}>
                ¡Casi! Cuéntalos otra vez 👆
              </p>
            )}
            <BigChoiceTiles choices={exercise.choices ?? []} wrongId={wrongPick} onPick={pick} />
          </Card>
        ) : (
          <Card className="mt-4" accent="var(--mint)">
            <Celebration emoji="🌟" line="¡Muy bien, Leo!" />
            <Button variant="primary" size="lg" onClick={exit} className="mt-2 w-full">
              Seguir →
            </Button>
          </Card>
        )}
      </div>
    </Shell>
  )
}

/**
 * Renders the counting visual. `emoji-count` gets the tappable-bounce-and-
 * count-aloud treatment (Leo's core "toca para contar" gesture); other kinds
 * fall back to the shared Visual renderer.
 */
function CountVisual({ visual }: { visual: Exercise['prompt']['visual'] }) {
  if (visual?.kind === 'emoji-count') {
    return <TappableEmojiCount emoji={visual.emoji} count={visual.count} rows={visual.rows} />
  }
  if (visual?.kind === 'compare-groups') {
    return <CompareGroups left={visual.left} right={visual.right} />
  }
  if (visual?.kind === 'boxes') {
    return <BoxesVisual groups={visual.groups} perGroup={visual.perGroup} remainder={visual.remainder} />
  }
  return <Visual spec={visual} />
}

/** Big emojis that bounce and count aloud (1, 2, 3…) as the child taps each one. */
function TappableEmojiCount({ emoji, count, rows }: { emoji: string; count: number; rows?: number }) {
  const [bounced, setBounced] = useState<number | null>(null)
  const perRow = rows ? Math.ceil(count / rows) : Math.min(count, 5)

  const tap = (i: number) => {
    setBounced(i)
    const word = i + 1 <= 20 ? NUMBER_WORDS[i + 1] : String(i + 1)
    speak(word, 'es-ES')
  }

  return (
    <div
      className="inline-grid justify-items-center gap-2"
      style={{ gridTemplateColumns: `repeat(${Math.max(1, Math.min(perRow, 5))}, 1fr)` }}
      aria-label={`${count} ${emoji}`}
    >
      {Array.from({ length: count }, (_, i) => (
        <button
          key={i}
          type="button"
          onClick={() => tap(i)}
          className="flex h-14 w-14 items-center justify-center rounded-2xl text-4xl transition-transform active:scale-90"
          style={{
            background: bounced === i ? 'var(--mint)' : 'transparent',
            transform: bounced === i ? 'scale(1.15)' : undefined,
          }}
          aria-label={`Contar ${i + 1}`}
        >
          <span aria-hidden>{emoji}</span>
        </button>
      ))}
    </div>
  )
}
