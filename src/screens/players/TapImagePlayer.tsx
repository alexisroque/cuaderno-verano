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
import { SceneVisual } from '../../components/visuals/GridFigure'
import { NoCard, PlayerHeader, IntroRow } from './playerChrome'
import { awardCardCoins } from './rewards'
import { useCelebrations } from './useCelebrations'
import { buildEnglishExercise, type EnglishTapExercise } from './englishExercise'
import { EnglishTiles, EspejoTiles, LogicTiles } from './TapImageTiles'

function chapterById(chapterId: string | null) {
  return (chapterId ? CHAPTERS.find((c) => c.id === chapterId) : undefined) ?? chapterForDate(CHAPTERS, todayISO())
}

/**
 * Leo's "tap the image" player (spec §5.6). Three shapes of round:
 *  - english → hear an English word, tap the matching picture;
 *  - espejo  → tap the correctly-written glyph, options rendered FROM STROKES
 *              (never the leaky label like "3 (espejo)");
 *  - logic   → formas/clasificar/posiciones/simetria/patrones, tap the right
 *              emoji tile.
 * Records into the matching skill, awards coins, marks the card complete.
 */
export function TapImagePlayer() {
  const navigate = useNavigate()
  const profile = useProfileStore((s) => s.activeProfile) ?? 'leo'
  const card = usePlayerStore((s) => s.card)
  const chapterId = usePlayerStore((s) => s.chapterId)
  const returnTo = usePlayerStore((s) => s.returnTo)
  const clearActiveCard = usePlayerStore((s) => s.clearActiveCard)
  const recordAttempt = useProgressStore((s) => s.recordAttempt)
  const markCardComplete = useProgressStore((s) => s.markCardComplete)
  const { overlays, celebrateCorrect, settleAttempt } = useCelebrations()

  const chapter = chapterById(chapterId)
  const isEnglish = card?.cardType === 'english'

  // English rounds are content-built (no generator); everything else materializes an Exercise.
  const english = useMemo<EnglishTapExercise | null>(
    () => (isEnglish && card ? buildEnglishExercise(createRng(card.generatorSeed), card.subskill) : null),
    [isEnglish, card],
  )
  const exercise = useMemo<Exercise | null>(() => {
    if (isEnglish || !card?.subskill) return null
    const gen = getGenerator(card.subskill)
    if (!gen) return null
    return gen.generate(createRng(card.generatorSeed), card.difficulty ?? 1, flavorFromChapter(chapter))
  }, [isEnglish, card, chapter])

  const [wrongId, setWrongId] = useState<string | null>(null)
  const [solved, setSolved] = useState(false)
  const attempts = useRef(0)
  const startedAt = useRef(Date.now())
  const finalized = useRef(false)

  const promptAudio = isEnglish ? english?.target.audioText : exercise?.audioText ?? exercise?.prompt.text
  const audioLang = isEnglish ? 'en-GB' : 'es-ES'

  useEffect(() => {
    if (promptAudio) speak(promptAudio, audioLang)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [english?.target.id, exercise?.id])

  if (!card || (!english && !exercise)) return <NoCard />

  // Skill mapping for the attempt record.
  const subskillForRecord = card.subskill ?? (isEnglish ? 'animales' : 'formas')

  const exit = () => {
    clearActiveCard()
    navigate(returnTo)
  }

  const solve = () => {
    setSolved(true)
    setWrongId(null)
    speak(isEnglish ? 'Yes! Very good!' : '¡Muy bien, Leo!', isEnglish ? 'en-GB' : 'es-ES')
    if (!finalized.current) {
      finalized.current = true
      recordAttempt(profile, {
        dateISO: todayISO(),
        cardType: card.cardType,
        subskill: subskillForRecord,
        correct: attempts.current === 1,
        hintsUsed: attempts.current - 1,
        ms: Date.now() - startedAt.current,
        difficulty: exercise?.difficulty ?? 1,
      })
      markCardComplete(profile, todayISO(), card.cardType)
      awardCardCoins(profile, card.challenge)
      if (attempts.current === 1) celebrateCorrect()
      settleAttempt(profile)
    }
  }

  const wrong = (id: string) => {
    setWrongId(id)
    speak(isEnglish ? 'Try again!' : '¡Casi! Escucha otra vez.', isEnglish ? 'en-GB' : 'es-ES')
  }

  const pick = (id: string, correct: boolean) => {
    if (solved) return
    attempts.current += 1
    if (correct) solve()
    else wrong(id)
  }

  return (
    <Shell>
      {overlays}
      <div className="mx-auto max-w-md pt-1">
        <PlayerHeader chapter={chapter} onExit={exit} />

        <Card accent={isEnglish ? '#8b5cf6' : '#ec4899'}>
          <IntroRow
            emoji={isEnglish ? '🗣️' : '🧩'}
            title={isEnglish ? 'English' : 'La sorpresa'}
            subtitle={isEnglish ? 'Listen and tap the picture' : 'Escucha y toca'}
            accent={isEnglish ? '#ede9fe' : '#fce7f3'}
            right={
              promptAudio ? (
                <SpeakButton
                  text={promptAudio}
                  lang={audioLang}
                  tone={isEnglish ? 'sky' : 'peach'}
                  size="lg"
                  label={isEnglish ? 'Listen' : 'Escuchar'}
                />
              ) : undefined
            }
          />

          {/* The word to find (English) shown big; or the Spanish prompt for logic rounds. */}
          {isEnglish ? (
            <p className="mt-1 text-center text-3xl font-black" style={{ color: '#6d28d9' }}>
              {english!.target.word}
            </p>
          ) : (
            exercise!.prompt.visual?.kind === 'scene' && (
              <div className="mt-2 flex justify-center">
                <SceneVisual actors={exercise!.prompt.visual.actors} />
              </div>
            )
          )}
        </Card>

        {!solved ? (
          <Card className="mt-4">
            {wrongId && (
              <p className="mb-3 text-center text-base font-bold" style={{ color: '#c26a4c' }}>
                {isEnglish ? 'Try again! 👂' : '¡Casi! Inténtalo otra vez 👆'}
              </p>
            )}
            {isEnglish ? (
              <EnglishTiles english={english!} wrongId={wrongId} onPick={pick} />
            ) : card.subskill === 'espejo' ? (
              <EspejoTiles exercise={exercise!} wrongId={wrongId} onPick={pick} />
            ) : (
              <LogicTiles exercise={exercise!} wrongId={wrongId} onPick={pick} />
            )}
          </Card>
        ) : (
          <Card className="mt-4" accent="var(--mint)">
            <Celebration emoji={isEnglish ? '🎉' : '🌟'} line={isEnglish ? 'Yes!' : '¡Muy bien, Leo!'} />
            <Button variant="primary" size="lg" onClick={exit} className="mt-2 w-full">
              Seguir →
            </Button>
          </Card>
        )}
      </div>
    </Shell>
  )
}
