import type { TextDiff } from './textDiff'
import { ruleLang, type SubskillId } from '../engine/skills'

/**
 * Rule-focused dictation feedback + attempt classification.
 *
 * A dictation can either be RULE-FOCUSED (the episode carries a `focus` rule
 * id, e.g. `ca-b-v`) or CULTURAL (an untagged story dictation). This module
 * covers both:
 *
 *  - `subskillForDictation(focus, diff)`: which ortografia rule to RECORD the
 *    attempt under. A focus-tagged dictation always records under its own
 *    rule. An untagged dictation is bucketed by its dominant error class into
 *    the nearest rule (documented mapping below), so cultural dictations still
 *    feed the heatmap's spelling view — biased toward accents, since accents
 *    are the whole point of Catalan/Spanish dictation practice.
 *
 *  - `ruleFeedbackLine(focus, lang, diff)`: a short, encouraging, rule-aware
 *    line shown after submit, alongside the word diff, for focus dictations.
 */

/**
 * Untagged (cultural) dictation → the ortografia rule its attempt is recorded
 * under. Kept deliberately simple and documented (per spec):
 *  - dominant error class is real spelling (more misspelled/missing/extra than
 *    accent slips) → a general accents-language bucket for that dictation's
 *    language (we can't tell WHICH letter-rule was missed from the diff alone,
 *    so we attribute it to the most-practised general rule: accents);
 *  - otherwise (accent-dominant or clean) → the accents rule for the language.
 * Either way an untagged dictation lands on the language's accents rule, which
 * is the safest general bucket — the rule-FOCUSED dictations are what give the
 * heatmap its per-rule precision.
 */
export function subskillForDictation(focus: SubskillId | undefined, _diff: TextDiff, lang: 'ca' | 'es'): SubskillId {
  if (focus) return focus
  // General bucket for cultural dictations: the language's accents/tildes rule.
  return lang === 'ca' ? 'ca-accents' : 'es-tildes'
}

/** Rule-aware encouragement, keyed by rule id, in the rule's own language. */
const RULE_LINES: Record<SubskillId, { good: string; retry: string }> = {
  'ca-accents': {
    good: 'Molt bé amb els accents i la dièresi! 🎯',
    retry: "Fixa't en els accents: recorda on cau la força de cada paraula.",
  },
  'ca-b-v': {
    good: 'Genial! Has distingit molt bé la b i la v. ✍️',
    retry: 'Repassa la b i la v: sonen igual, però no s\'escriuen igual.',
  },
  'ca-essa': {
    good: 'Molt bé amb la essa sorda i la sonora! 🐝',
    retry: "Torna a mirar les esses (s, ss, c, ç, z): quina sona forta i quina fluixa?",
  },
  'ca-ela-geminada': {
    good: 'Perfecte amb la ela geminada (l·l)! 🔤',
    retry: 'Recorda el puntet volat de la l·l, com a "col·legi" o "il·lusió".',
  },
  'ca-apostrof': {
    good: "Molt bé amb l'apòstrof! 👏",
    retry: "Mira l'apòstrof: davant de vocal sovint escrivim l', d', s'…",
  },
  'ca-h-muda': {
    good: 'Genial! Has recordat la hac muda. 🤫',
    retry: 'La hac no sona, però hi és: repassa paraules com "haver" o "home".',
  },
  'ca-g-j': {
    good: 'Molt bé amb la g i la j! 🎯',
    retry: 'Repassa la g i la j segons la vocal que ve després.',
  },
  'ca-r-rr': {
    good: 'Perfecte amb la r i la rr! 🐯',
    retry: 'Mira la r i la rr: quan sona forta entre vocals, en van dues.',
  },
  'ca-majuscules': {
    good: 'Molt bé amb les majúscules! 🔠',
    retry: 'Recorda les majúscules a principi de frase i als noms propis.',
  },
  'es-b-v': {
    good: '¡Muy bien distinguiendo la b y la v! ✍️',
    retry: 'Repasa la b y la v: suenan igual, pero no se escriben igual.',
  },
  'es-h': {
    good: '¡Genial! Has recordado la hache. 🤫',
    retry: 'La hache no suena, pero está: repasa palabras como "hola" o "hacer".',
  },
  'es-g-j': {
    good: '¡Muy bien con la g y la j! 🎯',
    retry: 'Repasa la g y la j según la vocal que viene después.',
  },
  'es-ll-y': {
    good: '¡Perfecto con la ll y la y! 🌟',
    retry: 'Mira la ll y la y: en algunas palabras suenan casi igual.',
  },
  'es-tildes': {
    good: '¡Muy bien colocando las tildes! 🎯',
    retry: 'Fíjate en las tildes: recuerda dónde recae la fuerza de la palabra.',
  },
  'es-mayusculas': {
    good: '¡Muy bien con las mayúsculas! 🔠',
    retry: 'Recuerda las mayúsculas al empezar la frase y en los nombres propios.',
  },
}

/**
 * A short encouraging, rule-specific line for a focus dictation, chosen by
 * whether she got the dictation clean enough. Returns undefined for untagged
 * (cultural) dictations, whose review keeps the generic word-diff legend only.
 * `lang` overrides the rule's inferred language when the episode pins one.
 */
export function ruleFeedbackLine(
  focus: SubskillId | undefined,
  diff: TextDiff,
  _lang?: 'ca' | 'es',
): string | undefined {
  if (!focus) return undefined
  const lines = RULE_LINES[focus]
  if (!lines) return undefined
  // "Clean enough" on the rule: no hard spelling errors and few accent slips.
  const clean = diff.spellingCount === 0 && diff.accentCount <= 1
  return clean ? lines.good : lines.retry
}

/** The banner headline for a focus dictation: "Avui treballem…" (ca) / "Hoy trabajamos…" (es). */
export function focusBannerText(focus: SubskillId, label: string): string {
  return ruleLang(focus) === 'ca' ? `Avui treballem: ${label}` : `Hoy trabajamos: ${label}`
}
