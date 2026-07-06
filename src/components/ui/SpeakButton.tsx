import { speak, type TtsLang } from '../../lib/tts'
import type { UiSize } from './Button'

interface SpeakButtonProps {
  /** Text read aloud on tap. */
  text: string
  lang?: TtsLang
  size?: UiSize
  /** Accessible label; defaults to a Spanish "listen" hint. */
  label?: string
  className?: string
  /** Tone tints the round background (peach/mint/sky), matching the card. */
  tone?: 'peach' | 'mint' | 'sky'
}

const TONE_BG: Record<NonNullable<SpeakButtonProps['tone']>, string> = {
  peach: 'var(--peach-soft)',
  mint: 'var(--mint)',
  sky: 'var(--sky)',
}

/** Round 🔊 button that reads `text` aloud via the TTS wrapper. */
export function SpeakButton({
  text,
  lang = 'es-ES',
  size = 'md',
  label = 'Escuchar',
  tone = 'peach',
  className = '',
}: SpeakButtonProps) {
  const dim = size === 'lg' ? 'h-14 w-14 text-2xl' : 'h-10 w-10 text-lg'
  return (
    <button
      type="button"
      aria-label={label}
      onClick={() => speak(text, lang)}
      style={{ background: TONE_BG[tone] }}
      className={[
        'inline-flex select-none items-center justify-center rounded-full',
        'shadow-[0_2px_5px_rgba(184,140,120,.18)] transition-transform duration-100 ease-out',
        'active:translate-y-[2px] active:shadow-none',
        'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--peach)]',
        dim,
        className,
      ].join(' ')}
    >
      <span aria-hidden>🔊</span>
    </button>
  )
}
