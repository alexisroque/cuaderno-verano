import { useState } from 'react'

export interface QuestionLike {
  q: string
  choices: string[]
  correctIdx: number
  kind: 'reflexiva' | 'literal'
}

/**
 * One comprehension question as big choice tiles. Literal questions grade
 * right/wrong; reflexiva questions treat `correctIdx` as the "best" answer but
 * affirm ANY thoughtful choice — the point is thinking, not one rigid truth.
 * Calls `onAnswered(correct)` once, after the child picks.
 */
export function QuestionTiles({
  question,
  onAnswered,
}: {
  question: QuestionLike
  onAnswered: (correct: boolean) => void
}) {
  const [picked, setPicked] = useState<number | null>(null)

  const choose = (idx: number) => {
    if (picked !== null) return
    setPicked(idx)
    onAnswered(idx === question.correctIdx)
  }

  const answered = picked !== null
  const gotBest = picked === question.correctIdx
  const reflexiva = question.kind === 'reflexiva'

  return (
    <div>
      <div className="mb-2 flex items-center gap-2">
        <span
          className="rounded-lg px-2 py-0.5 text-[10px] font-black"
          style={{ background: reflexiva ? '#efe4ef' : 'var(--sky)', color: reflexiva ? '#8b5cf6' : '#2f6690' }}
        >
          {reflexiva ? '💭 Piensa' : '🔍 Busca'}
        </span>
        <p className="text-sm font-extrabold">{question.q}</p>
      </div>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {question.choices.map((c, i) => {
          const isPicked = picked === i
          const isBest = i === question.correctIdx
          let bg = 'var(--peach-soft)'
          let fg = 'var(--ink)'
          if (answered && isBest) {
            bg = 'var(--mint)'
            fg = '#3f7d55'
          } else if (answered && isPicked && !isBest && !reflexiva) {
            bg = '#fde2df'
            fg = '#c0392b'
          }
          return (
            <button
              key={i}
              type="button"
              onClick={() => choose(i)}
              disabled={answered}
              className="min-h-[48px] rounded-2xl px-3 py-2 text-left text-sm font-bold transition-transform active:translate-y-[1px] disabled:active:translate-y-0"
              style={{ background: bg, color: fg }}
            >
              {c}
            </button>
          )
        })}
      </div>
      {answered && (
        <p className="mt-2 text-sm font-bold" style={{ color: '#3f7d55' }}>
          {reflexiva
            ? '¡Buena reflexión! No hay una única respuesta correcta. 💛'
            : gotBest
              ? '¡Correcto! 🌟'
              : '¡Casi! Fíjate en la respuesta en verde.'}
        </p>
      )}
    </div>
  )
}
