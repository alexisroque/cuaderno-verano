import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  getPreferredVoice,
  needsBetterVoice,
  pickVoice,
  setVoicePrefsSource,
  speak,
  stopSpeaking,
  voiceQuality,
  voicesAvailable,
  voicesForLang,
  type TtsLang,
} from './tts'

function voice(
  lang: string,
  name: string,
  localService = true,
): SpeechSynthesisVoice {
  return {
    lang,
    name,
    localService,
    default: false,
    voiceURI: name,
  } as SpeechSynthesisVoice
}

/** Installs a fake `speechSynthesis` + `SpeechSynthesisUtterance` on globalThis. */
function installSynth(voices: SpeechSynthesisVoice[]) {
  const spoken: SpeechSynthesisUtterance[] = []
  const cancel = vi.fn()
  const speakFn = vi.fn((u: SpeechSynthesisUtterance) => spoken.push(u))

  ;(globalThis as Record<string, unknown>).speechSynthesis = {
    getVoices: () => voices,
    speak: speakFn,
    cancel,
  }
  ;(globalThis as Record<string, unknown>).SpeechSynthesisUtterance = class {
    text: string
    lang = ''
    rate = 1
    voice: SpeechSynthesisVoice | null = null
    constructor(text: string) {
      this.text = text
    }
  }

  return { spoken, cancel, speakFn }
}

afterEach(() => {
  delete (globalThis as Record<string, unknown>).speechSynthesis
  delete (globalThis as Record<string, unknown>).SpeechSynthesisUtterance
  setVoicePrefsSource(() => ({}))
  vi.restoreAllMocks()
})

describe('pickVoice', () => {
  it('prefers an exact-region local voice over a remote exact match', () => {
    const remote = voice('es-ES', 'Remote Spanish', false)
    const local = voice('es-ES', 'Local Spanish', true)
    expect(pickVoice([remote, local], 'es-ES')).toBe(local)
  })

  it('falls back to a same-language voice when no exact region exists', () => {
    const mexican = voice('es-MX', 'Paulina', true)
    expect(pickVoice([mexican], 'es-ES')).toBe(mexican)
  })

  it('prefers a local same-language voice over a remote one', () => {
    const remote = voice('en-AU', 'Remote English', false)
    const local = voice('en-IN', 'Local English', true)
    expect(pickVoice([remote, local], 'en-US')).toBe(local)
  })

  it('returns undefined when no voice shares the language family', () => {
    expect(pickVoice([voice('fr-FR', 'Amelie')], 'ca-ES')).toBeUndefined()
  })

  it('prefers an enhanced voice over a compact one (same region, both local)', () => {
    const compact = voice('es-ES', 'Mónica (compact)', true)
    const enhanced = voice('es-ES', 'Mónica (Enhanced)', true)
    expect(pickVoice([compact, enhanced], 'es-ES')).toBe(enhanced)
  })

  it('prefers a Siri voice over a plain one', () => {
    const plain = voice('es-ES', 'Mónica', true)
    const siri = voice('es-ES', 'Siri Voz 1', true)
    expect(pickVoice([plain, siri], 'es-ES')).toBe(siri)
  })

  it('falls back to a compact voice when it is the only option', () => {
    const compact = voice('ca-ES', 'Català compact', true)
    expect(pickVoice([compact], 'ca-ES')).toBe(compact)
  })

  it('lets quality beat exact region: enhanced es-MX over compact es-ES', () => {
    const compactExact = voice('es-ES', 'Mónica compact', true)
    const enhancedFamily = voice('es-MX', 'Paulina Enhanced', true)
    expect(pickVoice([compactExact, enhancedFamily], 'es-ES')).toBe(enhancedFamily)
  })

  it('at equal quality, exact region beats same-family', () => {
    const family = voice('es-MX', 'Paulina', true)
    const exact = voice('es-ES', 'Mónica', true)
    expect(pickVoice([family, exact], 'es-ES')).toBe(exact)
  })

  it('at equal quality and region, local beats remote', () => {
    const remote = voice('es-ES', 'Remote', false)
    const local = voice('es-ES', 'Local', true)
    expect(pickVoice([remote, local], 'es-ES')).toBe(local)
  })

  it('breaks ties deterministically by voiceURI (stable across reloads)', () => {
    const b = voice('es-ES', 'Bruno', true)
    const a = voice('es-ES', 'Alba', true)
    expect(pickVoice([b, a], 'es-ES')).toBe(a)
    expect(pickVoice([a, b], 'es-ES')).toBe(a)
  })
})

describe('voiceQuality', () => {
  it('classifies enhanced/siri/neural as high', () => {
    expect(voiceQuality(voice('es-ES', 'Mónica Enhanced'))).toBe('high')
    expect(voiceQuality(voice('es-ES', 'Siri Voice'))).toBe('high')
  })
  it('classifies compact/eloquence/espeak as low', () => {
    expect(voiceQuality(voice('es-ES', 'Mónica compact'))).toBe('low')
    expect(voiceQuality(voice('es-ES', 'eSpeak es'))).toBe('low')
  })
  it('classifies a plain voice as neutral', () => {
    expect(voiceQuality(voice('es-ES', 'Mónica'))).toBe('neutral')
  })
})

describe('voicesForLang', () => {
  it('returns only the family, best-first', () => {
    const compact = voice('es-ES', 'Mónica compact', true)
    const enhanced = voice('es-ES', 'Mónica Enhanced', true)
    const english = voice('en-US', 'Samantha', true)
    const sorted = voicesForLang([compact, english, enhanced], 'es')
    expect(sorted).toEqual([enhanced, compact])
  })
})

describe('needsBetterVoice', () => {
  it('is true when no voice exists for the family', () => {
    expect(needsBetterVoice([voice('es-ES', 'Mónica')], 'ca')).toBe(true)
  })
  it('is true when the best available voice is robotic', () => {
    expect(needsBetterVoice([voice('ca-ES', 'Català compact')], 'ca')).toBe(true)
  })
  it('is false when an enhanced voice is available', () => {
    const voices = [voice('ca-ES', 'Català compact'), voice('ca-ES', 'Català Enhanced')]
    expect(needsBetterVoice(voices, 'ca')).toBe(false)
  })
})

describe('getPreferredVoice', () => {
  it('uses the persisted voiceURI when that voice is still installed', () => {
    const chosen = voice('es-ES', 'Mónica compact', true)
    const better = voice('es-ES', 'Mónica Enhanced', true)
    // Even though `better` scores higher, the explicit preference wins.
    expect(getPreferredVoice([chosen, better], 'es-ES', { es: chosen.voiceURI })).toBe(chosen)
  })

  it('falls back to pickVoice when the preferred voice is gone', () => {
    const better = voice('es-ES', 'Mónica Enhanced', true)
    expect(getPreferredVoice([better], 'es-ES', { es: 'Not Installed' })).toBe(better)
  })

  it('falls back to pickVoice when no preference is set', () => {
    const better = voice('es-ES', 'Mónica Enhanced', true)
    const compact = voice('es-ES', 'Mónica compact', true)
    expect(getPreferredVoice([compact, better], 'es-ES', {})).toBe(better)
  })
})

describe('speak', () => {
  it('cancels the previous utterance before speaking a new one', () => {
    const { cancel, speakFn } = installSynth([voice('es-ES', 'Mónica')])
    speak('Hola', 'es-ES')
    expect(cancel).toHaveBeenCalledTimes(1)
    expect(speakFn).toHaveBeenCalledTimes(1)
  })

  it('sets a gentle kid rate, the requested lang, and the chosen voice', () => {
    const chosen = voice('ca-ES', 'Català local', true)
    const { spoken } = installSynth([voice('es-ES', 'Mónica'), chosen])
    speak('Bon dia', 'ca-ES')
    expect(spoken).toHaveLength(1)
    expect(spoken[0].lang).toBe('ca-ES')
    expect(spoken[0].rate).toBeCloseTo(0.9)
    expect(spoken[0].voice).toBe(chosen)
    expect(spoken[0].text).toBe('Bon dia')
  })

  it('speaks even when no matching voice is installed (lets the OS decide)', () => {
    const { spoken } = installSynth([voice('fr-FR', 'Amelie')])
    speak('Hello', 'en-US')
    expect(spoken).toHaveLength(1)
    expect(spoken[0].voice).toBeNull()
  })

  it('honours the registered voice preference when the voice is installed', () => {
    const compact = voice('es-ES', 'Mónica compact', true)
    const chosen = voice('es-ES', 'Mónica Enhanced', true)
    const { spoken } = installSynth([compact, chosen])
    setVoicePrefsSource(() => ({ es: compact.voiceURI }))
    speak('Hola', 'es-ES')
    expect(spoken[0].voice).toBe(compact)
  })

  it('accepts an explicit prefs override (used by the preview button)', () => {
    const a = voice('es-ES', 'Voz A', true)
    const b = voice('es-ES', 'Voz B', true)
    const { spoken } = installSynth([a, b])
    speak('Hola', 'es-ES', { es: b.voiceURI })
    expect(spoken[0].voice).toBe(b)
  })

  it('does nothing for blank text', () => {
    const { speakFn, cancel } = installSynth([voice('es-ES', 'Mónica')])
    speak('   ', 'es-ES')
    expect(speakFn).not.toHaveBeenCalled()
    expect(cancel).not.toHaveBeenCalled()
  })

  it('is a safe no-op when speechSynthesis is absent', () => {
    expect(() => speak('Hola', 'es-ES' as TtsLang)).not.toThrow()
  })
})

describe('stopSpeaking', () => {
  it('cancels current speech when available', () => {
    const { cancel } = installSynth([])
    stopSpeaking()
    expect(cancel).toHaveBeenCalledTimes(1)
  })

  it('is a safe no-op when speechSynthesis is absent', () => {
    expect(() => stopSpeaking()).not.toThrow()
  })
})

describe('voicesAvailable', () => {
  it('reports true only for language families with an installed voice', () => {
    installSynth([voice('es-ES', 'Mónica'), voice('en-GB', 'Daniel')])
    expect(voicesAvailable()).toEqual({ es: true, ca: false, en: true })
  })

  it('reports all-false when synthesis is unavailable', () => {
    expect(voicesAvailable()).toEqual({ es: false, ca: false, en: false })
  })
})
