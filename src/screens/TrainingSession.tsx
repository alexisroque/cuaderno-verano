import { useMemo, useRef, useState } from 'react'
import type { Chapter } from '../content/schemas'
import type { ProfileId } from '../state/profileStore'
import type { SkillId, SubskillDef } from '../engine/skills'
import { CHALLENGE_GATE_LEVEL, SKILL_META, subskillsForSkill } from '../engine/skills'
import { pickSubskill } from '../engine/scheduler'
import { getContentBundle } from '../content/loader'
import { createRng } from '../lib/rng'
import { todayISO } from '../lib/clock'
import { useProgressStore } from '../state/progressStore'
import { useSettingsStore } from '../state/settingsStore'
import { Card } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { useCelebrations } from './players/useCelebrations'
import { GeneratorRound } from './players/GeneratorRound'
import { QuizRound } from './players/QuizRound'
import { mundoQuizItem, englishReadingQuizItems, type QuizItem } from './players/quizItems'
import { recordQuizAttempt } from './players/recordQuiz'

/**
 * Content-driven skills whose "exercises" are quiz items rather than generators.
 * `geografia` is intentionally NOT here: it has its own tap-on-map flow
 * (MapTraining), routed directly from FreeTraining.
 */
const QUIZ_SKILLS = new Set<SkillId>(['mundo', 'english', 'lectura'])

/** Spanish display name for a skill. */
function skillName(profile: ProfileId, skill: SkillId): string {
  return (SKILL_META[profile] as Record<string, { name: string }>)[skill]?.name ?? skill
}

/** Builds a fresh 5-item quiz round for a content skill, seeded by `seed`. */
function quizItemsForSkill(skill: SkillId, seed: string): QuizItem[] {
  const rng = createRng(seed)
  const bundle = getContentBundle()
  let items: QuizItem[] = []
  if (skill === 'mundo') items = (bundle.mundo ?? []).map((m) => mundoQuizItem(rng, m)).filter(Boolean) as QuizItem[]
  else items = (bundle.englishReadings ?? []).flatMap((r) => englishReadingQuizItems(r))
  // english reading items feed english+lectura; keep whichever matches the picked skill.
  if (skill === 'english') items = items.filter((i) => i.skill === 'english')
  if (skill === 'lectura') items = items.filter((i) => i.skill === 'lectura')
  return rng.shuffle(items).slice(0, 5)
}

/**
 * The endless free-training loop for one chosen skill. Repeatedly picks a
 * subskill (restricted to `skill`, honoring the challenge gate) and renders
 * either a GeneratorRound (math/tracing/logic) or a QuizRound (content skills),
 * recording each answer against the right gem and surfacing manga bursts /
 * gem level-ups. A running tally + a "Ya está" exit summary bound the session.
 */
export function TrainingSession({
  profile,
  skill,
  chapter,
  leo,
  onExit,
}: {
  profile: ProfileId
  skill: SkillId
  chapter: Chapter
  leo: boolean
  onExit: () => void
}) {
  const settings = useSettingsStore((s) => s.children[profile])
  const recordAttempt = useProgressStore((s) => s.recordAttempt)
  const { overlays, celebrateCorrect, settleAttempt } = useCelebrations()

  const [round, setRound] = useState(0)
  const [answered, setAnswered] = useState(0)
  const [correct, setCorrect] = useState(0)
  const [ended, setEnded] = useState(false)
  const startedAt = useRef(Date.now())

  const isQuiz = QUIZ_SKILLS.has(skill)

  // Pick the subskill for this round (generator skills only).
  const subskill = useMemo(() => {
    if (isQuiz) return undefined
    const gems = useProgressStore.getState().profiles[profile].gems
    const attempts = useProgressStore.getState().profiles[profile].attempts
    return pickSubskill(createRng(`train:${skill}:${round}`), attempts, profile, settings, todayISO(), gems, {
      skillFilter: [skill],
    })
  }, [isQuiz, skill, round, profile, settings])

  const quizItems = useMemo(() => (isQuiz ? quizItemsForSkill(skill, `train:${skill}:${round}`) : []), [isQuiz, skill, round])

  const difficulty = useMemo(() => {
    if (!subskill) return 1
    const def = subskillsForSkill(profile, skill).find((d) => d.id === subskill)
    return def ? def.difficultyRange[0] + 1 : 1
  }, [subskill, profile, skill])

  const recordOne = (sub: string, ok: boolean, diff: number) => {
    recordAttempt(profile, {
      dateISO: todayISO(),
      cardType: 'entrenamiento',
      subskill: sub,
      correct: ok,
      hintsUsed: 0,
      ms: Date.now() - startedAt.current,
      difficulty: diff,
    })
    startedAt.current = Date.now()
    setAnswered((n) => n + 1)
    if (ok) setCorrect((n) => n + 1)
    settleAttempt(profile)
  }

  if (ended) {
    return (
      <Card accent="var(--mint)">
        <div className="py-3 text-center">
          <div className="text-5xl" aria-hidden>
            🎉
          </div>
          <p className="mt-2 text-xl font-black">
            {correct} de {answered} correctas
          </p>
          <p className="mt-1 text-sm" style={{ color: 'var(--ink-soft)' }}>
            ¡Buen entrenamiento! Tu gema de {skillName(profile, skill)} ha crecido un poco.
          </p>
          <Button variant="primary" size={leo ? 'lg' : 'md'} onClick={onExit} className="mt-4 w-full">
            Volver →
          </Button>
        </div>
      </Card>
    )
  }

  return (
    <>
      {overlays}
      <div className="mb-3 flex items-center justify-between">
        <span className="text-sm font-bold" style={{ color: 'var(--ink-soft)' }}>
          Aciertos: {correct}/{answered}
        </span>
        <Button variant="soft" onClick={() => setEnded(true)}>
          Ya está ✓
        </Button>
      </div>

      {isQuiz ? (
        quizItems.length > 0 ? (
          <QuizRound
            key={round}
            items={quizItems}
            title={skillName(profile, skill)}
            onAnswer={onQuizAnswer}
            onDone={() => setRound((r) => r + 1)}
          />
        ) : (
          <EmptySkill onExit={onExit} />
        )
      ) : (
        <GeneratorRound
          key={round}
          subskill={subskill ?? 'mental'}
          difficulty={difficulty}
          seed={`train:${skill}:${round}`}
          chapter={chapter}
          leo={leo}
          onAnswer={recordOne}
          onNext={() => setRound((r) => r + 1)}
          onCorrect={celebrateCorrect}
        />
      )}
    </>
  )

  // Quiz answers: record the attempt (reflexiva-aware), update the local tally,
  // then refresh gems / maybe pop a manga burst.
  function onQuizAnswer(item: QuizItem, ok: boolean) {
    recordQuizAttempt(profile, item, ok, startedAt.current)
    startedAt.current = Date.now()
    setAnswered((n) => n + 1)
    if (ok) setCorrect((n) => n + 1)
    if (ok && item.question.kind !== 'reflexiva') celebrateCorrect()
    settleAttempt(profile)
  }
}

/** Unlocked challenge subskills exist? (used by the grid to badge 🚀 skills). */
export function hasUnlockedChallenge(profile: ProfileId, skill: SkillId): boolean {
  const level = useProgressStore.getState().profiles[profile].gems[skill]?.level ?? 0
  if (level < CHALLENGE_GATE_LEVEL) return false
  const defs = subskillsForSkill(profile, skill) as SubskillDef[]
  return defs.some((d) => d.challenge)
}

function EmptySkill({ onExit }: { onExit: () => void }) {
  return (
    <Card>
      <p className="text-sm" style={{ color: 'var(--ink-soft)' }}>
        Esta gema aún no tiene ejercicios para entrenar.
      </p>
      <Button variant="primary" onClick={onExit} className="mt-3 w-full">
        Elegir otra →
      </Button>
    </Card>
  )
}
