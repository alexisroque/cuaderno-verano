import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router'
import { CHAPTERS } from '../../content/chapters'
import { chapterForDate } from '../../engine/dayComposer'
import { cuentoLeoById } from '../../content/loader'
import { todayISO } from '../../lib/clock'
import { speak } from '../../lib/tts'
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

function chapterById(chapterId: string | null) {
  return (chapterId ? CHAPTERS.find((c) => c.id === chapterId) : undefined) ?? chapterForDate(CHAPTERS, todayISO())
}

/** Keyword → decorative emoji map so each story page shows a big picture cue. */
const KEYWORD_EMOJI: [RegExp, string][] = [
  [/mango|fruta/i, '🥭'], [/plátano|platano/i, '🍌'], [/manzana/i, '🍎'], [/miel/i, '🍯'],
  [/tortug/i, '🐢'], [/tigre/i, '🐯'], [/orangut|mono/i, '🐒'], [/oso/i, '🐻'],
  [/pez|peces/i, '🐠'], [/pájaro|pajaro|ave/i, '🐦'], [/elefante/i, '🐘'], [/serpiente|culebra/i, '🐍'],
  [/mar|ola|agua|nada/i, '🌊'], [/playa|arena/i, '🏖️'], [/árbol|arbol|rama|selva|bosque/i, '🌳'],
  [/flor/i, '🌺'], [/mamá|mama|abraz/i, '🤗'], [/feliz|content|ríe|rie|alegr/i, '😊'],
  [/nariz/i, '👃'], [/río|rio/i, '🏞️'], [/sol/i, '☀️'], [/casa/i, '🏠'],
]

/** Picks a big illustration emoji for a sentence from keywords (falls back to a book). */
function emojiForSentence(sentence: string): string {
  for (const [re, emoji] of KEYWORD_EMOJI) if (re.test(sentence)) return emoji
  return '📖'
}

/**
 * Leo's audio cuento (spec §5.6): resolves the rotating "sorpresa" cuento from
 * content, shows one big illustration emoji per sentence and speaks it (auto on
 * page change) with a "siguiente" + replay, then poses the ONE comprehension
 * question as big spoken choice tiles. Records a gentle attempt into the
 * `lectura`-flavored `cuento` subskill, awards coins, marks the card complete.
 */
export function CuentoPlayer() {
  const navigate = useNavigate()
  const profile = useProfileStore((s) => s.activeProfile) ?? 'leo'
  const card = usePlayerStore((s) => s.card)
  const chapterId = usePlayerStore((s) => s.chapterId)
  const returnTo = usePlayerStore((s) => s.returnTo)
  const clearActiveCard = usePlayerStore((s) => s.clearActiveCard)
  const recordAttempt = useProgressStore((s) => s.recordAttempt)
  const markCardComplete = useProgressStore((s) => s.markCardComplete)
  const markConsumed = useProgressStore((s) => s.markConsumed)
  const { overlays, celebrateCorrect, settleAttempt } = useCelebrations()

  const chapter = chapterById(chapterId)
  const cuento = useMemo(() => (card?.contentRef?.cuentoId ? cuentoLeoById(card.contentRef.cuentoId) : undefined), [card])

  // page: 0..sentences-1 = story pages; then the question; then done.
  const [page, setPage] = useState(0)
  const [wrongIdx, setWrongIdx] = useState<number | null>(null)
  const [phase, setPhase] = useState<'story' | 'question' | 'done'>('story')
  const attempts = useRef(0)
  const startedAt = useRef(Date.now())
  const finalized = useRef(false)

  const sentence = cuento?.sentences[page]

  // Auto-speak each story page as it appears.
  useEffect(() => {
    if (phase === 'story' && sentence) speak(sentence, 'es-ES')
    if (phase === 'question' && cuento) speak(cuento.question.q, 'es-ES')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, phase, cuento?.id])

  if (!card || !cuento) return <NoCard />

  const exit = () => {
    clearActiveCard()
    navigate(returnTo)
  }

  const finalize = () => {
    if (finalized.current) return
    finalized.current = true
    recordAttempt(profile, {
      dateISO: todayISO(),
      cardType: card.cardType,
      subskill: 'cuento',
      correct: true, // a gentle attempt — listening to a story always "counts".
      hintsUsed: Math.max(0, attempts.current - 1),
      ms: Date.now() - startedAt.current,
      difficulty: 1,
    })
    markConsumed(profile, 'cuentosLeo', cuento.id)
    markCardComplete(profile, todayISO(), card.cardType)
    awardCardCoins(profile, card.challenge)
    settleAttempt(profile)
  }

  const nextPage = () => {
    if (page + 1 < cuento.sentences.length) setPage(page + 1)
    else setPhase('question')
  }

  const answer = (idx: number) => {
    if (phase !== 'question') return
    attempts.current += 1
    speak(cuento.question.choices[idx], 'es-ES')
    if (idx === cuento.question.correctIdx) {
      finalize()
      setPhase('done')
      setWrongIdx(null)
      if (attempts.current === 1) celebrateCorrect()
      speak('¡Muy bien, Leo!', 'es-ES')
    } else {
      setWrongIdx(idx)
      speak('¡Casi! Escucha el cuento otra vez.', 'es-ES')
    }
  }

  return (
    <Shell>
      {overlays}
      <div className="mx-auto max-w-md pt-1">
        <PlayerHeader chapter={chapter} onExit={exit} />

        <Card accent="#ec4899">
          <IntroRow
            emoji="📚"
            title={cuento.title}
            subtitle="Un cuento con audio"
            accent="#fce7f3"
            right={
              phase === 'story' && sentence ? (
                <SpeakButton text={sentence} tone="peach" size="lg" />
              ) : phase === 'question' ? (
                <SpeakButton text={cuento.question.q} tone="peach" size="lg" />
              ) : undefined
            }
          />

          {phase === 'story' && sentence && (
            <div className="mt-2 flex flex-col items-center">
              <div className="text-8xl" aria-hidden>
                {emojiForSentence(sentence)}
              </div>
              <p className="mt-3 text-center text-lg font-bold leading-snug" style={{ color: 'var(--ink)' }}>
                {sentence}
              </p>
              <div className="mt-1 text-xs" style={{ color: 'var(--ink-soft)' }}>
                {page + 1} / {cuento.sentences.length}
              </div>
            </div>
          )}

          {phase === 'question' && (
            <p className="mt-2 text-center text-xl font-black" style={{ color: '#9d174d' }}>
              {cuento.question.q}
            </p>
          )}

          {phase === 'done' && <Celebration emoji="🎉" line="¡Muy bien, Leo!" />}
        </Card>

        {phase === 'story' && (
          <Button variant="primary" size="lg" onClick={nextPage} className="mt-4 w-full">
            {page + 1 < cuento.sentences.length ? 'Siguiente →' : 'La pregunta →'}
          </Button>
        )}

        {phase === 'question' && (
          <Card className="mt-4">
            {wrongIdx !== null && (
              <p className="mb-3 text-center text-base font-bold" style={{ color: '#c26a4c' }}>
                ¡Casi! Escucha otra vez 👂
              </p>
            )}
            <div className="grid grid-cols-1 gap-3">
              {cuento.question.choices.map((choice, idx) => {
                const isWrong = wrongIdx === idx
                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => answer(idx)}
                    className="flex min-h-[64px] items-center justify-center gap-2 rounded-3xl px-4 py-3 text-lg font-black transition-transform active:translate-y-[2px]"
                    style={{
                      background: isWrong ? '#fde2d6' : 'var(--peach-soft)',
                      color: isWrong ? '#c26a4c' : 'var(--ink)',
                      boxShadow: isWrong ? 'inset 0 0 0 3px #f4a988' : '0 3px 0 #f2cdb4',
                    }}
                  >
                    <span aria-hidden>🔊</span>
                    {choice}
                  </button>
                )
              })}
            </div>
          </Card>
        )}

        {phase === 'done' && (
          <Button variant="primary" size="lg" onClick={exit} className="mt-4 w-full">
            Seguir →
          </Button>
        )}
      </div>
    </Shell>
  )
}
