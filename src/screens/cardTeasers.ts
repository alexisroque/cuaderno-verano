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

/** Logic subskills (rotating "sorpresa") that are tap-the-emoji rounds. */
const TAP_IMAGE_LOGIC = new Set(['patrones', 'formas', 'simetria', 'clasificar', 'posiciones'])

/**
 * The player route a card should open, dispatching by card type AND subskill:
 *  - Aira: problema/dictado/sabías-que/diario each have their own player.
 *  - Leo (Task 5.6): trazos → Tracing (letras/numeros-trazo) or TapImage
 *    (espejo, which must render options from strokes); contar → Counting;
 *    english → TapImage; sorpresa-rotatoria → Cuento (cuento) or TapImage
 *    (the logic rounds).
 */
export function playerRouteFor(card: CardDescriptor): string {
  switch (card.cardType) {
    case 'problema':
      return '/jugar/problema'
    case 'contar':
      // Aira has no `contar` slot; for Leo this is the counting/number-sense player.
      return card.subskill ? '/jugar/contar' : '/jugar/proximamente'
    case 'dictado':
      return '/jugar/dictado'
    case 'sabias-que':
      return '/jugar/sabias-que'
    case 'diario':
      return '/jugar/diario'
    case 'trazos':
      // espejo is a mirror-discrimination TAP task (options drawn from strokes),
      // not a finger-trace — everything else in trazos is a real trace.
      return card.subskill === 'espejo' ? '/jugar/tocar-imagen' : '/jugar/trazos'
    case 'english':
      return '/jugar/tocar-imagen'
    case 'sorpresa-rotatoria':
      if (card.subskill === 'cuento') return '/jugar/cuento'
      if (card.subskill && TAP_IMAGE_LOGIC.has(card.subskill)) return '/jugar/tocar-imagen'
      return '/jugar/proximamente'
    default:
      return '/jugar/proximamente'
  }
}
