import { describe, it, expect } from 'vitest'
import { splitSentences } from './sentences'

describe('splitSentences', () => {
  it('splits on terminal punctuation, keeping it attached', () => {
    expect(splitSentences('El gat dorm. La gossa corre!')).toEqual(['El gat dorm.', 'La gossa corre!'])
  })

  it('treats an ellipsis as a single boundary', () => {
    expect(splitSentences('Espera… ja arribo.')).toEqual(['Espera…', 'ja arribo.'])
  })

  it('handles a question and trailing text without terminal punctuation', () => {
    expect(splitSentences('Qui hi ha? Ningú respon')).toEqual(['Qui hi ha?', 'Ningú respon'])
  })

  it('returns the whole string when there is no terminal punctuation', () => {
    expect(splitSentences('només una frase')).toEqual(['només una frase'])
  })

  it('ignores empty trailing fragments and whitespace', () => {
    expect(splitSentences('Hola.   ')).toEqual(['Hola.'])
  })
})
