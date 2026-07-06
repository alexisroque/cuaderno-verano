import { afterEach, describe, expect, it, vi } from 'vitest'
import { pickVoice, speak, stopSpeaking, voicesAvailable, type TtsLang } from './tts'

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
