import { useMemo, useRef } from 'react'
import { useNavigate } from 'react-router'
import { CHAPTERS } from '../../content/chapters'
import { chapterForDate } from '../../engine/dayComposer'
import { getContentBundle, englishReadingById } from '../../content/loader'
import { createRng } from '../../lib/rng'
import { todayISO } from '../../lib/clock'
import { useProfileStore } from '../../state/profileStore'
import { useProgressStore } from '../../state/progressStore'
import { usePlayerStore } from '../../state/playerStore'
import { Shell } from '../../components/Shell'
import { NoCard, PlayerHeader, CARD_COINS } from './playerChrome'
import { QuizRound } from './QuizRound'
import { recordQuizAttempt } from './recordQuiz'
import { englishReadingQuizItems, geographyQuizItem, mundoQuizItem, type QuizItem } from './quizItems'

/**
 * Generic 4-choice quiz route. Resolves the active card into a short round of
 * quiz items: an english-reading (contentRef.readingId → its literal +
 * reflexiva questions) or a topic-recognition round drawn from geography /
 * mundo facts (by card.subskill's owning skill). Each answer records against
 * the right gem; finishing marks the card complete and awards coins. Reused by
 * free training via QuizRound directly (this route is the daily/standalone entry).
 */
export function QuizPlayer() {
  const navigate = useNavigate()
  const profile = useProfileStore((s) => s.activeProfile) ?? 'aira'
  const card = usePlayerStore((s) => s.card)
  const chapterId = usePlayerStore((s) => s.chapterId)
  const returnTo = usePlayerStore((s) => s.returnTo)
  const clearActiveCard = usePlayerStore((s) => s.clearActiveCard)
  const markCardComplete = useProgressStore((s) => s.markCardComplete)
  const markConsumed = useProgressStore((s) => s.markConsumed)
  const addCoins = useProgressStore((s) => s.addCoins)
  const startedAt = useRef(Date.now())
  const finalized = useRef(false)

  const chapter = useMemo(
    () => (chapterId ? CHAPTERS.find((c) => c.id === chapterId) : undefined) ?? chapterForDate(CHAPTERS, todayISO()),
    [chapterId],
  )

  const resolved = useMemo(() => {
    const ref = card?.contentRef
    const rng = createRng(card?.generatorSeed ?? 'quiz')
    if (ref?.readingId) {
      const reading = englishReadingById(ref.readingId)
      if (reading) return { items: englishReadingQuizItems(reading), title: `Reading · ${reading.title}`, consume: reading.id }
    }
    const bundle = getContentBundle()
    const skill = card?.subskill
    if (skill === 'espacio' || skill === 'como-funciona') {
      const items = (bundle.mundo ?? []).map((m) => mundoQuizItem(rng, m)).filter((x): x is QuizItem => x !== null)
      return { items: rng.shuffle(items).slice(0, 5), title: 'Mundo', consume: undefined }
    }
    const items = (bundle.geography ?? []).map((g) => geographyQuizItem(rng, g)).filter((x): x is QuizItem => x !== null)
    return { items: rng.shuffle(items).slice(0, 5), title: 'Geografía', consume: undefined }
  }, [card])

  if (!card || resolved.items.length === 0) return <NoCard />

  const exit = () => {
    clearActiveCard()
    navigate(returnTo)
  }

  const onAnswer = (item: QuizItem, correct: boolean) => {
    recordQuizAttempt(profile, item, correct, startedAt.current)
  }

  const onDone = () => {
    if (!finalized.current) {
      finalized.current = true
      if (resolved.consume) markConsumed(profile, 'englishReadings', resolved.consume)
      markCardComplete(profile, todayISO(), card.cardType)
      addCoins(profile, CARD_COINS)
    }
    exit()
  }

  return (
    <Shell>
      <div className="mx-auto max-w-md pt-1">
        <PlayerHeader chapter={chapter} onExit={exit} />
        <QuizRound items={resolved.items} title={resolved.title} onAnswer={onAnswer} onDone={onDone} />
      </div>
    </Shell>
  )
}
