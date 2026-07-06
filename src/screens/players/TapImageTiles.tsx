import type { Exercise } from '../../types/exercise'
import { speak } from '../../lib/tts'
import { StrokePreview } from '../../components/visuals/StrokePreview'
import { BigChoiceTiles } from './BigChoiceTiles'
import type { EnglishTapExercise } from './englishExercise'

/** English: 4 big picture tiles; each speaks its own word on tap, grades against the target. */
export function EnglishTiles({
  english,
  wrongId,
  onPick,
}: {
  english: EnglishTapExercise
  wrongId: string | null
  onPick: (id: string, correct: boolean) => void
}) {
  return (
    <div className="grid grid-cols-2 gap-3">
      {english.options.map((u) => {
        const isWrong = wrongId === u.id
        return (
          <button
            key={u.id}
            type="button"
            onClick={() => {
              speak(u.word, 'en-GB')
              onPick(u.id, u.id === english.target.id)
            }}
            className="flex min-h-[100px] items-center justify-center rounded-3xl text-6xl transition-transform active:translate-y-[2px]"
            style={{
              background: isWrong ? '#fde2d6' : '#ede9fe',
              boxShadow: isWrong ? 'inset 0 0 0 3px #f4a988' : '0 3px 0 #d6ccf5',
            }}
            aria-label={u.word}
          >
            <span aria-hidden>{u.emoji}</span>
          </button>
        )
      })}
    </div>
  )
}

/**
 * Espejo: renders each option AS A DRAWN GLYPH from its strokes (via
 * StrokePreview), NEVER the choice.label — a label like "3 (espejo)" would name
 * the mirrored option and leak the answer to a reading-capable UI. The correct
 * option is the one whose choiceId is 'correct' (see leo/tracing.ts).
 */
export function EspejoTiles({
  exercise,
  wrongId,
  onPick,
}: {
  exercise: Exercise
  wrongId: string | null
  onPick: (id: string, correct: boolean) => void
}) {
  const visual = exercise.prompt.visual
  if (visual?.kind !== 'mirror-pair') return null
  return (
    <div className="grid grid-cols-2 gap-4">
      {visual.options.map((o) => {
        const isWrong = wrongId === o.choiceId
        return (
          <button
            key={o.choiceId}
            type="button"
            onClick={() => onPick(o.choiceId, o.choiceId === 'correct')}
            className="flex min-h-[130px] items-center justify-center rounded-3xl p-4 transition-transform active:translate-y-[2px]"
            style={{
              background: isWrong ? '#fde2d6' : 'var(--card)',
              boxShadow: isWrong ? 'inset 0 0 0 3px #f4a988' : '0 3px 0 #f2cdb4, inset 0 0 0 2px var(--peach-soft)',
            }}
            aria-label="Opción de trazo"
          >
            <StrokePreview strokes={o.strokes} size={90} />
          </button>
        )
      })}
    </div>
  )
}

/** Logic rounds: big emoji/label tiles from the exercise's choices. */
export function LogicTiles({
  exercise,
  wrongId,
  onPick,
}: {
  exercise: Exercise
  wrongId: string | null
  onPick: (id: string, correct: boolean) => void
}) {
  const correctId = exercise.answer.kind === 'choice' ? exercise.answer.correctId : ''
  return (
    <BigChoiceTiles
      choices={exercise.choices ?? []}
      wrongId={wrongId}
      onPick={(id) => onPick(id, id === correctId)}
    />
  )
}
