import type { CardDescriptor } from '../engine/dayComposer'
import type { Chapter } from '../content/schemas'
import { getGenerator, flavorFromChapter } from '../generators/framework'
import '../generators/aira'
import '../generators/leo'
import { createRng } from '../lib/rng'
import { curiosityById, diaryPromptById, episodeById, jokeById, cuentoLeoById } from '../content/loader'

/** Truncates a teaser to a comfortable one-liner. */
function clip(text: string, max = 90): string {
  const t = text.trim()
  return t.length <= max ? t : t.slice(0, max - 1).trimEnd() + '…'
}

/**
 * A one-line teaser for a day card, derived from the resolved content or a
 * materialized exercise — so the daily page previews the ACTUAL problem/joke/
 * fact the child will get, not a generic label.
 */
export function cardTeaser(card: CardDescriptor, chapter: Chapter): string {
  switch (card.cardType) {
    case 'problema':
    case 'contar': {
      if (!card.subskill) return 'Un reto de números te espera.'
      const gen = getGenerator(card.subskill)
      if (!gen) return 'Un reto de números te espera.'
      const ex = gen.generate(createRng(card.generatorSeed), card.difficulty ?? 1, flavorFromChapter(chapter))
      return clip(ex.prompt.text)
    }
    case 'dictado': {
      const ref = card.contentRef
      if (ref?.jokeId) {
        const joke = jokeById(ref.jokeId)
        const text = joke?.text[card.language ?? 'es'] ?? joke?.text.es ?? joke?.text.ca
        return text ? `Hoy toca chiste: ${clip(text, 60)}` : 'Hoy toca un chiste para escribir.'
      }
      if (ref?.episodeId) {
        const found = episodeById(ref.seriesId, ref.episodeId)
        return found ? clip(`«${found.episode.title}» — escúchalo y escríbelo sin faltas.`) : 'Un dictado nuevo te espera.'
      }
      return 'Un dictado nuevo te espera.'
    }
    case 'sabias-que': {
      const cur = card.contentRef?.curiosityId ? curiosityById(card.contentRef.curiosityId) : undefined
      return cur ? clip(cur.text.es) : 'Un dato curioso del mundo.'
    }
    case 'diario': {
      const dp = card.contentRef?.promptId ? diaryPromptById(card.contentRef.promptId) : undefined
      return dp ? clip(dp.text.es) : 'Escribe algo sobre tu día.'
    }
    case 'trazos':
      return 'Repasa la letra o el número de hoy con el dedo.'
    case 'english':
      return 'Toca la imagen correcta al oír la palabra.'
    case 'sorpresa-rotatoria': {
      if (card.subskill === 'cuento') {
        const cuento = card.contentRef?.cuentoId ? cuentoLeoById(card.contentRef.cuentoId) : undefined
        return cuento ? clip(cuento.title) : 'Un cuento con audio.'
      }
      return 'Cada día algo distinto: patrones, formas, puzles…'
    }
    default:
      return ''
  }
}

/**
 * The player route a card should open. Aira's math/dictado/sabías-que/diario
 * cards each have a real player; Leo's players (trazos/contar/english/cuento)
 * land in Task 5.6 and still route to the ComingSoon stub.
 */
export function playerRouteFor(card: CardDescriptor): string {
  switch (card.cardType) {
    case 'problema':
      return '/jugar/problema'
    case 'contar':
      return card.subskill ? '/jugar/problema' : '/jugar/proximamente'
    case 'dictado':
      return '/jugar/dictado'
    case 'sabias-que':
      return '/jugar/sabias-que'
    case 'diario':
      return '/jugar/diario'
    default:
      // Leo players (trazos, english, cuento…) land in later tasks.
      return '/jugar/proximamente'
  }
}
