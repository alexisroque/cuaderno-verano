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
  /** Tone tints the background (peach/mint/sky), matching the card. */
  tone?: 'peach' | 'mint' | 'sky'
  /**
   * Optional visible caption (e.g. "Escucha" / "Listen"). Renders a wide pill
   * with the word beside the 🔊 icon instead of the round icon-only button —
   * used where tapping to hear is the primary action (Leo, silent-by-default).
   */
  caption?: string
}

const TONE_BG: Record<NonNullable<SpeakButtonProps['tone']>, string> = {
  peach: 'var(--peach-soft)',
  mint: 'var(--mint)',
  sky: 'var(--sky)',
}

/**
 * 🔊 button that reads `text` aloud via the TTS wrapper. Icon-only by default;
 * pass `caption` to render a big labelled pill (the obvious "tap to hear"
 * control now that Leo's screens are silent by default). `lg` is ≥60px so it
 * stays a comfortable child touch target.
 */
export function SpeakButton({
  text,
  lang = 'es-ES',
  size = 'md',
  label = 'Escuchar',
  tone = 'peach',
  className = '',
  caption,
}: SpeakButtonProps) {
  const base = [
    'inline-flex select-none items-center justify-center',
    'shadow-[0_2px_5px_rgba(184,140,120,.18)] transition-transform duration-100 ease-out',
    'active:translate-y-[2px] active:shadow-none',
    'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--peach)]',
  ]

  if (caption) {
    // Labelled pill: min-height ≥60px on lg, generous tap area.
    const pillDim = size === 'lg' ? 'min-h-[64px] gap-2 px-5 text-xl' : 'min-h-[48px] gap-2 px-4 text-base'
    return (
      <button
        type="button"
        aria-label={label}
        onClick={() => speak(text, lang)}
        style={{ background: TONE_BG[tone] }}
        className={[...base, 'rounded-full font-black', pillDim, className].join(' ')}
      >
        <span aria-hidden className={size === 'lg' ? 'text-2xl' : 'text-lg'}>
          🔊
        </span>
        <span style={{ color: 'var(--ink)' }}>{caption}</span>
      </button>
    )
  }

  const dim = size === 'lg' ? 'h-[64px] w-[64px] text-3xl' : 'h-10 w-10 text-lg'
  return (
    <button
      type="button"
      aria-label={label}
      onClick={() => speak(text, lang)}
      style={{ background: TONE_BG[tone] }}
      className={[...base, 'rounded-full', dim, className].join(' ')}
    >
      <span aria-hidden>🔊</span>
    </button>
  )
}
