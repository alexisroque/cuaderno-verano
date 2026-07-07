import { useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router'
import { CHAPTERS } from '../../content/chapters'
import { chapterForDate } from '../../engine/dayComposer'
import { episodeById, jokeById } from '../../content/loader'
import { todayISO } from '../../lib/clock'
import { speak, voicesAvailable, type TtsLang } from '../../lib/tts'
import { splitSentences } from '../../lib/sentences'
import { diffText, isCorrectEnough, type TextDiff } from '../../lib/textDiff'
import { subskillForDictation, ruleFeedbackLine, focusBannerText } from '../../lib/ruleFeedback'
import { subskillLabel } from '../../engine/skills'
import { useProfileStore } from '../../state/profileStore'
import { useProgressStore } from '../../state/progressStore'
import { usePlayerStore } from '../../state/playerStore'
import { Shell } from '../../components/Shell'
import { Card } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { Celebration } from '../../components/Celebration'
import { NoCard, PlayerHeader, IntroRow } from './playerChrome'
import { awardCardCoins } from './rewards'
import { useCelebrations } from './useCelebrations'
import { DiffReview } from './DiffReview'

/** Card language ('ca'|'es') -> BCP-47 tag the TTS wrapper speaks. */
function ttsLang(lang: 'ca' | 'es'): TtsLang {
  return lang === 'ca' ? 'ca-ES' : 'es-ES'
}

/**
 * Aira's dictation loop (spec §5.2 / Task 5.5): resolve the day's episode (or a
 * joke) from the card contentRef, replay it sentence-by-sentence, let her type
 * it, then self-correct with a word-level diff that flags accent slips apart
 * from real misspellings. Closes with the episode's wow-fact + next-episode
 * hook. Falls back to an "adult reads it" mode when no Catalan voice exists.
 */
export function DictationPlayer() {
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

  const [text, setText] = useState('')
  const [diff, setDiff] = useState<TextDiff | null>(null)
  const startedAt = useRef(Date.now())
  const recorded = useRef(false)

  const chapter = useMemo(
    () => (chapterId ? CHAPTERS.find((c) => c.id === chapterId) : undefined) ?? chapterForDate(CHAPTERS, todayISO()),
    [chapterId],
  )

  const resolved = useMemo(() => {
    const ref = card?.contentRef
    const lang = card?.language ?? 'es'
    if (ref?.episodeId) {
      const found = episodeById(ref.seriesId, ref.episodeId)
      if (found)
        return {
          kind: 'episode' as const,
          seriesTitle: found.series.title,
          seriesEmoji: found.series.emoji,
          order: found.episode.order,
          title: found.episode.title,
          reference: found.episode.dictation[lang],
          factExtra: found.episode.factExtra[lang],
          hook: found.episode.hook,
          consumeId: found.episode.id,
          focus: found.episode.focus,
          lang,
        }
    }
    if (ref?.jokeId) {
      const joke = jokeById(ref.jokeId)
      const jokeText = joke?.text[lang] ?? joke?.text.es ?? joke?.text.ca
      if (jokeText)
        return {
          kind: 'joke' as const,
          seriesTitle: 'Chiste para escribir',
          seriesEmoji: '😄',
          order: 0,
          title: 'Un chiste',
          reference: jokeText,
          factExtra: '',
          hook: '',
          consumeId: joke!.id,
          focus: undefined,
          lang,
        }
    }
    return null
  }, [card])

  if (!card || !resolved) return <NoCard />

  const sentences = splitSentences(resolved.reference)
  const lang = ttsLang(resolved.lang)
  const voiceMissing = resolved.lang === 'ca' ? !voicesAvailable().ca : !voicesAvailable().es

  const exit = () => {
    clearActiveCard()
    navigate(returnTo)
  }

  const submit = () => {
    const d = diffText(resolved.reference, text)
    setDiff(d)
    if (recorded.current) return
    recorded.current = true
    const correct = isCorrectEnough(d)
    recordAttempt(profile, {
      dateISO: todayISO(),
      cardType: 'dictado',
      subskill: subskillForDictation(resolved.focus, d, resolved.lang),
      correct,
      hintsUsed: 0,
      ms: Date.now() - startedAt.current,
      difficulty: 2,
    })
    const poolKey = resolved.kind === 'joke' ? 'jokes' : 'episodes'
    markConsumed(profile, poolKey, resolved.consumeId)
    markCardComplete(profile, todayISO(), 'dictado')
    awardCardCoins(profile, card.challenge)
    if (correct) celebrateCorrect()
    settleAttempt(profile)
  }

  return (
    <Shell>
      {overlays}
      <div className="mx-auto max-w-md pt-1">
        <PlayerHeader chapter={chapter} onExit={exit} />

        <Card accent="#3b82f6">
          <IntroRow
            emoji={resolved.seriesEmoji}
            title={resolved.seriesTitle}
            subtitle={resolved.kind === 'episode' ? `Episodio ${resolved.order} · ${resolved.title}` : '¡A escribir!'}
            accent="var(--sky)"
          />

          {resolved.focus && (
            <div
              className="mt-3 flex items-center gap-2 rounded-2xl px-3 py-2.5 text-sm font-extrabold"
              style={{ background: '#eaf3fb', color: '#2f6690' }}
            >
              <span aria-hidden>✏️</span>
              {focusBannerText(resolved.focus, subskillLabel(resolved.focus))}
            </div>
          )}

          {voiceMissing ? (
            <div className="rounded-2xl p-3 text-sm" style={{ background: 'var(--bg)' }}>
              <p className="mb-2 font-bold">🗣️ Que un adulto te lo lea</p>
              <p className="mb-2" style={{ color: 'var(--ink-soft)' }}>
                Tu tablet no tiene la voz en {resolved.lang === 'ca' ? 'catalán' : 'castellano'} instalada, así que aquí
                está el dictado para leerlo en voz alta:
              </p>
              <p className="leading-relaxed">{resolved.reference}</p>
            </div>
          ) : (
            <div className="space-y-2">
              <p className="text-sm font-bold">Escucha frase a frase 👂</p>
              {sentences.map((s, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => speak(s, lang)}
                  className="flex min-h-[44px] w-full items-center gap-2 rounded-2xl px-3 py-2 text-left text-sm font-bold transition-transform active:translate-y-[1px]"
                  style={{ background: 'var(--sky)', color: '#2f6690' }}
                >
                  <span aria-hidden>🔊</span> Frase {i + 1}
                </button>
              ))}
              <Button variant="soft" onClick={() => speak(resolved.reference, lang)} className="w-full">
                🔊 Escuchar todo
              </Button>
            </div>
          )}
        </Card>

        {!diff ? (
          <Card className="mt-4">
            <label className="mb-2 block text-sm font-bold" htmlFor="dictado">
              Escribe lo que oyes ✍️
            </label>
            <textarea
              id="dictado"
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={5}
              className="w-full resize-none rounded-2xl p-3 text-base leading-relaxed focus:outline-2 focus:outline-[var(--peach)]"
              style={{ background: 'var(--bg)', color: 'var(--ink)' }}
              placeholder="Escribe aquí…"
            />
            <Button variant="primary" onClick={submit} disabled={text.trim().length === 0} className="mt-3 w-full">
              Ya está, ¡corrígelo! ✅
            </Button>
          </Card>
        ) : (
          <div className="mt-4 space-y-4">
            <Card accent={isCorrectEnough(diff) ? 'var(--mint)' : '#3b82f6'}>
              {isCorrectEnough(diff) ? (
                <Celebration emoji="🌟" line={diff.errorCount === 0 ? '¡Perfecto!' : '¡Muy bien!'} />
              ) : (
                <p className="mb-1 text-sm font-extrabold">Casi… mira las palabras marcadas:</p>
              )}
              <DiffReview diff={diff} />
              {resolved.focus && ruleFeedbackLine(resolved.focus, diff, resolved.lang) && (
                <p className="mt-3 rounded-2xl px-3 py-2 text-sm font-bold" style={{ background: '#eaf3fb', color: '#2f6690' }}>
                  {ruleFeedbackLine(resolved.focus, diff, resolved.lang)}
                </p>
              )}
              <p className="mt-3 text-xs" style={{ color: 'var(--ink-soft)' }}>
                <span style={{ color: '#3f7d55' }}>■</span> bien&nbsp;&nbsp;
                <span style={{ color: '#d98363' }}>■</span> acento&nbsp;&nbsp;
                <span style={{ color: '#c0392b' }}>■</span> a repasar
              </p>
            </Card>

            {resolved.factExtra && (
              <Card accent="var(--sun)">
                <p className="text-sm font-extrabold">💡 ¿Sabías que…?</p>
                <p className="mt-1 text-sm leading-relaxed">{resolved.factExtra}</p>
              </Card>
            )}
            {resolved.hook && (
              <Card accent="var(--peach)">
                <p className="text-sm font-extrabold">🔜 Próximamente</p>
                <p className="mt-1 text-sm leading-relaxed">{resolved.hook}</p>
              </Card>
            )}

            <Button variant="primary" onClick={exit} className="w-full">
              Seguir →
            </Button>
          </div>
        )}
      </div>
    </Shell>
  )
}
