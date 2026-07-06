import type { Rng } from '../lib/rng'

/**
 * A single point in a trace stroke, normalized to a 0..1 box (top-left
 * origin). See `src/lib/strokes.ts` for the authored stroke data and the
 * `strokesFor` lookup.
 */
export interface StrokePoint {
  x: number
  y: number
}

/** One continuous pen-down-to-pen-up path, as an ordered polyline of normalized points. */
export type Stroke = StrokePoint[]

/**
 * Visual aid attached to a prompt or a strategy step. `'none'` means no
 * visual is rendered — kept explicit (rather than making `visual` always
 * optional) so generators can be deliberate about opting out.
 */
export type VisualSpec =
  | { kind: 'rectangle-model'; rows: number; colsSplit: number[] }
  | { kind: 'number-line'; from: number; to: number; jumps: { from: number; to: number; label: string }[] }
  | { kind: 'boxes'; groups: number; perGroup: number; remainder?: number }
  | { kind: 'emoji-count'; emoji: string; count: number; rows?: number }
  | { kind: 'compare-groups'; left: { emoji: string; count: number }; right: { emoji: string; count: number } }
  | { kind: 'scene'; actors: { emoji: string; row: number; col: number }[] } // small spatial layout on an implicit grid, row 0 = top, col 0 = left
  // Two renderings of the same glyph (one true, one mirrored) for the espejo generator.
  // UI MUST render mirror-pair options from `strokes` here, NEVER from the corresponding
  // `choice.label` (see src/generators/leo/tracing.ts) — labels like "3 (espejo)" name which
  // option is mirrored and would leak the answer if shown to the child before grading.
  | { kind: 'mirror-pair'; options: { choiceId: string; strokes: Stroke[] }[] }
  | { kind: 'grid-figure'; cells: [number, number][] } // filled cells of a grid
  | { kind: 'dot-grid'; n: number } // n×n square
  | { kind: 'none' }

/** One step of a worked strategy: a Spanish-language explanation plus an optional visual. */
export interface StrategyStep {
  text: string
  visual?: VisualSpec
}

/** One named way to solve an exercise (Innovamat teaches several strategies per operation). */
export interface Strategy {
  id: string
  name: string
  steps: StrategyStep[]
}

/** A selectable option for choice/multi answers. */
export interface Choice {
  id: string
  label: string
}

/** The canonical correct answer for an exercise, in one of several shapes. */
export type Answer =
  | { kind: 'number'; value: number }
  | { kind: 'text'; value: string; accept?: string[] }
  | { kind: 'choice'; correctId: string }
  | { kind: 'multi'; correctIds: string[] }

/** A fully materialized exercise instance, ready to render and grade. */
export interface Exercise {
  id: string
  subskill: string
  difficulty: number
  prompt: { text: string; visual?: VisualSpec }
  answer: Answer
  choices?: Choice[]
  dataHighlight?: { relevantIndices: number[]; trapIndex?: number; tokens: string[] }
  strategies: Strategy[] // >= 1 (Leo exercises may use a single gentle step, since a 4yo doesn't read multi-step strategies)
  microlesson?: string // "¿para qué sirve?" real-world hook
  challenge?: boolean
  /**
   * Spanish TTS script for non-reading kids (Leo). Optional because Aira
   * exercises read their own prompt text; consumed by the Phase 5 audio
   * player.
   */
  audioText?: string
  /**
   * Glyph + stroke data for tracing exercises (Leo `trazos` subskills).
   * Consumed by the Phase 5 TracingPlayer.
   */
  trace?: { glyph: string; strokes: Stroke[] }
}

/** The subset of a Chapter's flavor a generator needs, decoupled from the full Chapter/content schema. */
export interface ChapterFlavorLite {
  placeName: string
  currency?: string
  /** Short symbol for math prompts, e.g. "€", "S$", "RM", "Rp". */
  currencySymbol: string
  /** Ready-to-insert locative phrase, lowercase start, e.g. "en Singapur", "durante el vuelo". */
  placePhrase: string
  /** Singular, lowercase, interpolation-safe noun phrases natural after "cada" (>= 4 per chapter). */
  priceItems: string[]
  landmarks: string[]
  animals: string[]
  foods: string[]
}

/** A pure exercise generator for one subskill: (rng, difficulty, flavor) -> Exercise. */
export interface Generator {
  subskill: string
  generate(rng: Rng, difficulty: number, flavor: ChapterFlavorLite): Exercise
}
