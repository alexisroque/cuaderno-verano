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
import { MapRound } from './MapRound'
import { recordQuizAttempt } from './recordQuiz'
import { recordMapAttempt } from './recordMap'
import { englishReadingQuizItems, mundoQuizItem, type QuizItem } from './quizItems'
import { buildMapRound } from './mapItems'
import { MAP_IDS } from '../../content/maps'
import { skillOfSubskill } from '../../engine/skills'

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
    const seed = card?.generatorSeed ?? 'quiz'
    const rng = createRng(seed)
    const bundle = getContentBundle()
    const skill = card?.subskill

    // Geografia subskills → the tap-on-map round (SE Asia / Europe / World).
    if (skill && skillOfSubskill(profile, skill) === 'geografia') {
      const rngMap = createRng(seed)
      const mapId = rngMap.pick(MAP_IDS.slice())
      const mapItems = buildMapRound(rngMap, bundle.geography ?? [], mapId, 5)
      return { kind: 'map' as const, mapItems, mapId, consume: undefined }
    }

    if (ref?.readingId) {
      const reading = englishReadingById(ref.readingId)
      if (reading) return { kind: 'quiz' as const, items: englishReadingQuizItems(reading), title: `Reading · ${reading.title}`, consume: reading.id }
    }
    if (skill === 'espacio' || skill === 'como-funciona') {
      const items = (bundle.mundo ?? []).map((m) => mundoQuizItem(rng, m)).filter((x): x is QuizItem => x !== null)
      return { kind: 'quiz' as const, items: rng.shuffle(items).slice(0, 5), title: 'Mundo', consume: undefined }
    }
    // Fallback: default to a world map round so a stray geografia card never dead-ends.
    const mapItems = buildMapRound(rng, bundle.geography ?? [], 'mundo', 5)
    return { kind: 'map' as const, mapItems, mapId: 'mundo', consume: undefined }
  }, [card, profile])

  const empty = resolved.kind === 'map' ? resolved.mapItems.length === 0 : resolved.items.length === 0
  if (!card || empty) return <NoCard />

  const exit = () => {
    clearActiveCard()
    navigate(returnTo)
  }

  const finish = () => {
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
        {resolved.kind === 'map' ? (
          <MapRound
            items={resolved.mapItems}
            mapId={resolved.mapId}
            onAnswer={(item, correct) => recordMapAttempt(profile, item, correct, startedAt.current)}
            onDone={finish}
          />
        ) : (
          <QuizRound
            items={resolved.items}
            title={resolved.title}
            onAnswer={(item, correct) => recordQuizAttempt(profile, item, correct, startedAt.current)}
            onDone={finish}
          />
        )}
      </div>
    </Shell>
  )
}
