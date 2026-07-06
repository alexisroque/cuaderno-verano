import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router'
import { CHAPTERS } from '../../content/chapters'
import { chapterForDate } from '../../engine/dayComposer'
import { diaryPromptById } from '../../content/loader'
import { todayISO } from '../../lib/clock'
import { useProfileStore } from '../../state/profileStore'
import { useProgressStore } from '../../state/progressStore'
import { usePlayerStore } from '../../state/playerStore'
import { Shell } from '../../components/Shell'
import { Card } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { Celebration } from '../../components/Celebration'
import { NoCard, PlayerHeader, IntroRow, CARD_COINS } from './playerChrome'

const AUTOSAVE_MS = 1200

/**
 * Aira's "Mi diario" card (Task 5.5): shows the day's writing prompt, offers a
 * textarea that autosaves as a draft DiaryEntry (debounced), and on "Guardar"
 * commits the entry, records an `escritura`/diario attempt (always correct —
 * the diario gem progresses by consistency, not correctness) and awards coins.
 * Entries are retrievable from progress for the collection screen (Task 5.8).
 */
export function DiaryPlayer() {
  const navigate = useNavigate()
  const profile = useProfileStore((s) => s.activeProfile) ?? 'aira'
  const card = usePlayerStore((s) => s.card)
  const chapterId = usePlayerStore((s) => s.chapterId)
  const returnTo = usePlayerStore((s) => s.returnTo)
  const clearActiveCard = usePlayerStore((s) => s.clearActiveCard)
  const recordAttempt = useProgressStore((s) => s.recordAttempt)
  const markCardComplete = useProgressStore((s) => s.markCardComplete)
  const addDiaryEntry = useProgressStore((s) => s.addDiaryEntry)
  const addCoins = useProgressStore((s) => s.addCoins)

  const chapter = useMemo(
    () => (chapterId ? CHAPTERS.find((c) => c.id === chapterId) : undefined) ?? chapterForDate(CHAPTERS, todayISO()),
    [chapterId],
  )

  const promptId = card?.contentRef?.promptId
  const prompt = promptId ? diaryPromptById(promptId) : undefined

  // Seed the textarea from any existing entry for this prompt today (resume a draft).
  const existing = useProgressStore((s) =>
    s.profiles[profile].diaryEntries.find((e) => e.dateISO === todayISO() && e.promptId === promptId),
  )
  const [text, setText] = useState(existing?.text ?? '')
  const [saved, setSaved] = useState(false)
  const [autosaved, setAutosaved] = useState(false)
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  // Debounced autosave of the in-progress draft.
  useEffect(() => {
    if (!promptId) return
    if (timer.current) clearTimeout(timer.current)
    if (text.trim().length === 0) return
    timer.current = setTimeout(() => {
      addDiaryEntry(profile, { dateISO: todayISO(), promptId, text: text.trim() })
      setAutosaved(true)
    }, AUTOSAVE_MS)
    return () => {
      if (timer.current) clearTimeout(timer.current)
    }
  }, [text, promptId, profile, addDiaryEntry])

  if (!card || !prompt || !promptId) return <NoCard />

  const exit = () => {
    clearActiveCard()
    navigate(returnTo)
  }

  const save = () => {
    if (timer.current) clearTimeout(timer.current)
    addDiaryEntry(profile, { dateISO: todayISO(), promptId, text: text.trim() })
    recordAttempt(profile, {
      dateISO: todayISO(),
      cardType: 'diario',
      subskill: 'diario',
      correct: true,
      hintsUsed: 0,
      ms: 0,
      difficulty: 1,
    })
    markCardComplete(profile, todayISO(), 'diario')
    addCoins(profile, CARD_COINS)
    setSaved(true)
  }

  if (saved) {
    return (
      <Shell>
        <div className="mx-auto max-w-md pt-1">
          <PlayerHeader chapter={chapter} onExit={exit} />
          <Card accent="#8b5cf6">
            <Celebration emoji="📔" line="¡Guardado en tu diario!" />
            <p className="text-center text-sm" style={{ color: 'var(--ink-soft)' }}>
              Cada día que escribes, tu gema de Escritura crece un poquito. 💜
            </p>
            <Button variant="primary" onClick={exit} className="mt-4 w-full">
              Seguir →
            </Button>
          </Card>
        </div>
      </Shell>
    )
  }

  return (
    <Shell>
      <div className="mx-auto max-w-md pt-1">
        <PlayerHeader chapter={chapter} onExit={exit} />

        <Card accent="#8b5cf6">
          <IntroRow emoji="📔" title="Mi diario" subtitle="Hoy escribes sobre…" accent="#efe4ef" />
          <p className="rounded-2xl p-3 text-base leading-relaxed" style={{ background: 'var(--bg)' }}>
            {prompt.text.es}
          </p>
        </Card>

        <Card className="mt-4">
          <label className="mb-2 block text-sm font-bold" htmlFor="diario">
            Escribe lo que quieras ✍️
          </label>
          <textarea
            id="diario"
            value={text}
            onChange={(e) => {
              setText(e.target.value)
              setAutosaved(false)
            }}
            rows={7}
            className="w-full resize-none rounded-2xl p-3 text-base leading-relaxed focus:outline-2 focus:outline-[var(--peach)]"
            style={{ background: 'var(--bg)', color: 'var(--ink)' }}
            placeholder="Querido diario…"
          />
          <div className="mt-3 flex items-center justify-between gap-3">
            <span className="text-xs" style={{ color: 'var(--ink-soft)' }} aria-live="polite">
              {autosaved ? 'Guardado automático ✓' : text.trim() ? 'Escribiendo…' : ''}
            </span>
            <Button variant="primary" onClick={save} disabled={text.trim().length === 0}>
              Guardar 💾
            </Button>
          </div>
        </Card>
      </div>
    </Shell>
  )
}
