import type { Rng } from '../../lib/rng'
import type { ChapterFlavorLite, Strategy, StrategyStep } from '../../types/exercise'

/** The pedagogical context a template belongs to (drives subskill routing). */
export type ProblemContext = 'dinero' | 'tiempo' | 'medida' | 'reparto' | 'compra'

/** A fully bound problem instance: statement tokens + data highlight + answer + worked strategies. */
export interface BoundProblem {
  /** The statement split into tap-able tokens; `tokens.join(' ')` reconstructs the prompt text. */
  tokens: string[]
  /** Indices into `tokens` of the NUMBER tokens actually needed to solve it. */
  relevantIndices: number[]
  /** Index into `tokens` of the irrelevant NUMBER token, when a trap was injected. */
  trapIndex?: number
  /** The canonical numeric answer. */
  answer: number
  /** Worked solving paths; `strategies[0]` is the primary 5-phase Innovamat scaffold. */
  strategies: Strategy[]
  /** "¿para qué sirve?" real-world hook for this context. */
  microlesson: string
}

/** Options passed to `bind`, chiefly whether the caller wants a trap datum injected. */
export interface BindOptions {
  injectTrap: boolean
}

/** A parameterized word-problem shape that binds to concrete numbers + flavor on demand. */
export interface ProblemTemplate {
  id: string
  /** Which subskill contexts this template can serve. */
  contexts: ProblemContext[]
  /** Number of computation steps. */
  steps: 1 | 2
  /** Whether this template can inject a contextually-plausible irrelevant datum. */
  supportsTrap: boolean
  /** Inclusive difficulty bounds this template is sensible for. */
  difficultyRange: [number, number]
  /** Binds the template to concrete numbers and flavor, producing a ready-to-render problem. */
  bind(rng: Rng, difficulty: number, flavor: ChapterFlavorLite, opts: BindOptions): BoundProblem
}

// ---------------------------------------------------------------------------
// Tokenization helpers
// ---------------------------------------------------------------------------

/**
 * A statement is assembled from string pieces. A "number piece" carries the
 * numeric value that a `relevantIndices`/`trapIndex` should point at; when
 * emitted it becomes its own single token so the highlight index is exact.
 * Everything else is plain prose that gets split on spaces into tokens.
 */
export type Piece =
  | { kind: 'text'; text: string }
  | { kind: 'num'; value: number; role: 'relevant' | 'trap'; display?: string; suffix?: string }

/** A plain-prose piece (split into tokens on spaces). */
export function t(text: string): Piece {
  return { kind: 'text', text }
}

/**
 * A relevant NUMBER piece — its token index lands in `relevantIndices`. An
 * optional `display` overrides the rendered text (e.g. a clock "9:30" for a
 * value of 570 minutes); an optional `suffix` (e.g. "." or ",") attaches
 * trailing punctuation to the SAME token so the prose reads "…17:30." not
 * "…17:30 .". Highlight indices still point at the number token itself.
 */
export function num(value: number, extra?: { display?: string; suffix?: string }): Piece {
  return { kind: 'num', value, role: 'relevant', display: extra?.display, suffix: extra?.suffix }
}

/** A trap NUMBER piece — its token index lands in `trapIndex`. Supports the same display/suffix options as `num`. */
export function trap(value: number, extra?: { display?: string; suffix?: string }): Piece {
  return { kind: 'num', value, role: 'trap', display: extra?.display, suffix: extra?.suffix }
}

/**
 * Rolls a trap value in [min, max] that does NOT collide with any of the real
 * input values `avoid`. A trap datum that numerically equals one of the
 * numbers the child must actually use would be genuinely confusing (she can't
 * tell which "88" matters), so we reroll until it's distinct. Falls back to
 * `max + 1` after a bounded number of tries in the unlikely event the whole
 * range is taken.
 */
export function rollTrap(rng: Rng, min: number, max: number, avoid: number[]): number {
  const forbidden = new Set(avoid)
  for (let i = 0; i < 30; i++) {
    const v = rng.int(min, max)
    if (!forbidden.has(v)) return v
  }
  let v = max + 1
  while (forbidden.has(v)) v++
  return v
}

/** The result of assembling pieces into tokens with tracked highlight indices. */
export interface Tokenized {
  tokens: string[]
  relevantIndices: number[]
  trapIndex?: number
}

/**
 * Assembles `pieces` into a flat token array, splitting text pieces on spaces
 * and emitting each number piece as its own token while recording which token
 * index each relevant/trap number landed on. Empty text pieces contribute no
 * tokens (so callers can concatenate freely without producing double spaces).
 */
export function assemble(pieces: Piece[]): Tokenized {
  const tokens: string[] = []
  const relevantIndices: number[] = []
  let trapIndex: number | undefined

  for (const piece of pieces) {
    if (piece.kind === 'text') {
      const parts = piece.text.split(' ').filter((p) => p.length > 0)
      tokens.push(...parts)
    } else {
      const idx = tokens.length
      const rendered = (piece.display ?? String(piece.value)) + (piece.suffix ?? '')
      tokens.push(rendered)
      if (piece.role === 'relevant') relevantIndices.push(idx)
      else trapIndex = idx
    }
  }

  return { tokens, relevantIndices, trapIndex }
}

// ---------------------------------------------------------------------------
// Flavor helpers (natural fallbacks when a chapter lacks a slot)
// ---------------------------------------------------------------------------

/** Capitalizes the first letter of `s`, leaving the rest untouched. */
export function capitalizeFirst(s: string): string {
  if (s.length === 0) return s
  return s[0].toUpperCase() + s.slice(1)
}

/** Two distinct price items, falling back to neutral pairs. */
export function twoPriceItems(rng: Rng, flavor: ChapterFlavorLite): [string, string] {
  if (flavor.priceItems.length >= 2) {
    const shuffled = rng.shuffle(flavor.priceItems)
    return [shuffled[0], shuffled[1]]
  }
  return ['recuerdo', 'postal']
}

/**
 * Curated, flavor-neutral "openable venue" phrases (singular, with article),
 * for templates whose sentence needs a place that plausibly *opens and
 * closes* or that you *visit*. The chapter flavor landmarks are unreliable
 * for this — many are objects ("la maleta grande") or transport ("el vuelo
 * SQ387") that can't "abrir a las 9:00" and would read absurdly. These
 * venues read naturally in every chapter of a Southeast-Asia trip.
 */
const VENUES = ['el museo', 'el acuario', 'el parque de atracciones', 'el mercado', 'la tienda de recuerdos', 'el templo', 'el zoo']

/** A generic openable/visitable venue phrase (always grammatical, flavor-neutral). */
export function venue(rng: Rng): string {
  return rng.pick(VENUES)
}

/**
 * Currency handling. Rupias (Rp) are in the millions in real life, which is
 * absurd for a 9-year-old's arithmetic, so for Rp chapters we switch the
 * money story to euros paid "con la tarjeta" — one clean, documented approach
 * (see task spec). Every other symbol (€, S$, RM) is used directly. Returns
 * the symbol to render AND an optional lead-in clause explaining the euro
 * switch, so callers can splice it in naturally.
 */
export function moneySymbol(flavor: ChapterFlavorLite): { symbol: string; euroSwitch: boolean } {
  if (flavor.currencySymbol === 'Rp') {
    return { symbol: '€', euroSwitch: true }
  }
  return { symbol: flavor.currencySymbol, euroSwitch: false }
}

// ---------------------------------------------------------------------------
// The 5 Innovamat solving phases
// ---------------------------------------------------------------------------

/** Inputs for building the primary 5-phase strategy scaffold. */
export interface PhaseInput {
  /** "datos" phase: the known facts, already worded (e.g. "Cada entrada cuesta 8 €."). */
  datos: string
  /** "plan" phase: what's asked + which operation helps (e.g. "Nos preguntan el total; multiplicamos."). */
  plan: string
  /** "calculo" phase: the arithmetic lines, each a parseable "N op M = P" claim. */
  calculo: string[]
  /** "comprobar" phase: a REAL sanity check (magnitude or inverse op). */
  comprobar: string
  /** When a trap datum is present, the datum text to call out in "entender" (e.g. "las 9:00 de apertura"). */
  trapCallout?: string
}

/**
 * Builds the primary strategy: the 5 Innovamat phases in fixed order —
 * entender, datos, plan, cálculo, comprobar. The `entender` step calls out a
 * trap datum explicitly when one is present, training Aira to separate
 * relevant from irrelevant data (her weakest area per the school report).
 */
export function buildPhaseStrategy(input: PhaseInput): Strategy {
  const entenderText =
    input.trapCallout !== undefined
      ? `¿Qué está pasando? Léelo otra vez con calma. ¡Ojo! El dato de ${input.trapCallout} no lo necesitamos para responder.`
      : '¿Qué está pasando? Léelo otra vez con calma.'

  const steps: StrategyStep[] = [
    { text: entenderText },
    { text: `¿Qué sabemos? ${input.datos}` },
    { text: `¿Qué nos preguntan y qué operación nos ayuda? ${input.plan}` },
    ...input.calculo.map((line) => ({ text: line })),
    { text: `¿Tiene sentido? ${input.comprobar}` },
  ]

  return { id: 'fases', name: 'Los 5 pasos para resolver', steps }
}

/** Assembles a `BoundProblem` from its parts (thin helper to keep templates terse). */
export function boundProblem(
  tokenized: Tokenized,
  answer: number,
  strategies: Strategy[],
  microlesson: string,
): BoundProblem {
  return {
    tokens: tokenized.tokens,
    relevantIndices: tokenized.relevantIndices,
    trapIndex: tokenized.trapIndex,
    answer,
    strategies,
    microlesson,
  }
}
