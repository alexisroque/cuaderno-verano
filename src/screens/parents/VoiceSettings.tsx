import { useEffect, useState } from 'react'
import { useSettingsStore } from '../../state/settingsStore'
import {
  getLiveVoices,
  speak,
  voicesForLang,
  waitForVoices,
  type TtsLang,
  type VoiceLangFamily,
} from '../../lib/tts'

/** The three languages the parent can pick a dictation voice for. */
const LANGS: { family: VoiceLangFamily; label: string; tts: TtsLang; sample: string }[] = [
  { family: 'ca', label: 'Català', tts: 'ca-ES', sample: 'Hola! Sóc la veu que llegirà els dictats.' },
  { family: 'es', label: 'Español', tts: 'es-ES', sample: '¡Hola! Soy la voz que leerá los dictados.' },
  { family: 'en', label: 'English', tts: 'en-US', sample: 'Hello! I will read the stories to you.' },
]

/** Human label for a voice option: name + an offline marker when local. */
function voiceLabel(v: SpeechSynthesisVoice): string {
  return v.localService ? `${v.name} (sin conexión)` : v.name
}

function LangPicker({
  family,
  label,
  tts,
  sample,
  voices,
}: {
  family: VoiceLangFamily
  label: string
  tts: TtsLang
  sample: string
  voices: SpeechSynthesisVoice[]
}) {
  const chosen = useSettingsStore((s) => s.voicePrefs[family])
  const setVoicePref = useSettingsStore((s) => s.setVoicePref)
  const options = voicesForLang(voices, family)

  return (
    <div className="rounded-2xl px-4 py-3" style={{ background: 'var(--bg)' }}>
      <div className="mb-2 flex items-center justify-between gap-3">
        <span className="text-sm font-extrabold" style={{ color: 'var(--ink)' }}>
          {label}
        </span>
        <button
          type="button"
          onClick={() => speak(sample, tts, { [family]: chosen })}
          disabled={options.length === 0}
          className="min-h-[40px] rounded-full px-4 text-sm font-bold text-white transition-transform active:translate-y-[1px] disabled:opacity-40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--navy)]"
          style={{ background: 'var(--peach)', boxShadow: '0 3px 0 #d98363' }}
        >
          Probar 🔊
        </button>
      </div>

      {options.length === 0 ? (
        <p className="text-xs" style={{ color: 'var(--ink-soft)' }}>
          No hay ninguna voz de este idioma instalada.
        </p>
      ) : (
        <select
          value={chosen ?? ''}
          onChange={(e) => setVoicePref(family, e.target.value === '' ? undefined : e.target.value)}
          aria-label={`Voz para ${label}`}
          className="min-h-[44px] w-full rounded-xl px-3 text-sm font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--navy)]"
          style={{ background: 'var(--card)', color: 'var(--ink)' }}
        >
          <option value="">Automática (la mejor disponible)</option>
          {options.map((v) => (
            <option key={v.voiceURI} value={v.voiceURI}>
              {voiceLabel(v)}
            </option>
          ))}
        </select>
      )}
    </div>
  )
}

/**
 * "Voz" section of the parent panel: per-language voice picker + preview.
 * Persists the choice (settingsStore), previews with the selected voice, and
 * explains how to download a natural Siri/enhanced voice when the list only
 * offers a robotic one. Handles the async voice list (iOS/Safari populate it
 * after a `voiceschanged` event) via `waitForVoices`.
 */
export function VoiceSettings() {
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>(() => getLiveVoices())

  useEffect(() => {
    let alive = true
    void waitForVoices().then(() => {
      if (alive) setVoices(getLiveVoices())
    })
    return () => {
      alive = false
    }
  }, [])

  return (
    <section
      className="p-5"
      style={{ background: 'var(--card)', borderRadius: 'var(--r-card)', boxShadow: '0 6px 18px rgba(184,140,120,.12)' }}
    >
      <h3 className="text-base font-extrabold" style={{ color: 'var(--ink)' }}>
        Voz de los dictados
      </h3>
      <p className="mt-1 mb-4 text-xs" style={{ color: 'var(--ink-soft)' }}>
        Elige la voz que leerá cada idioma y pruébala. Las voces «sin conexión» funcionan sin
        internet.
      </p>

      <div className="flex flex-col gap-3">
        {LANGS.map((l) => (
          <LangPicker key={l.family} {...l} voices={voices} />
        ))}
      </div>

      <p className="mt-4 text-xs leading-relaxed" style={{ color: 'var(--ink-soft)' }}>
        ¿Solo aparece una voz robótica? En el iPad: Ajustes → Accesibilidad → Contenido hablado →
        Voces → [idioma] → elige una voz «Mejorada» o de Siri → Descargar. Al volver aquí aparecerá
        en la lista.
      </p>
    </section>
  )
}
