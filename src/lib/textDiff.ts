/**
 * Word-level diff between a dictation reference and the child's typed text,
 * tuned for Catalan/Spanish self-correction. The point of the whole exercise
 * is that accents matter, so a word that matches the reference *ignoring*
 * accents but differs *with* them is flagged distinctly as `accent` (soft,
 * encouraging) rather than lumped in with real misspellings.
 *
 * Alignment is a classic word-level LCS so a dropped or inserted word doesn't
 * cascade into a wall of red — surrounding words still line up as `ok`.
 */

/** Per-word verdict. `accent` = right letters, wrong/absent accent. */
export type WordStatus = 'ok' | 'accent' | 'misspelled' | 'missing' | 'extra'

export interface WordDiff {
  status: WordStatus
  /** The reference word this slot corresponds to (undefined for `extra`). */
  reference?: string
  /** The child's word in this slot (undefined for `missing`). */
  typed?: string
}

export interface TextDiff {
  words: WordDiff[]
  /** Count of everything that isn't `ok` (accent slips included). */
  errorCount: number
  /** Subset of errorCount that are accent-only slips. */
  accentCount: number
  /** Errors that are outright spelling/missing/extra (excludes accent slips). */
  spellingCount: number
}

export interface DiffOptions {
  /** When false (default) "El" matches "el". */
  caseSensitive?: boolean
  /** When true (default) trailing/leading punctuation is ignored in matching. */
  punctuationTolerant?: boolean
}

const DEFAULTS: Required<DiffOptions> = {
  caseSensitive: false,
  punctuationTolerant: true,
}

/** Splits text into word tokens on whitespace, dropping empties. */
function tokenize(text: string): string[] {
  return text.trim().split(/\s+/).filter(Boolean)
}

/** Removes diacritics via NFD, so "història" -> "historia", "cafè" -> "cafe". */
function stripAccents(word: string): string {
  return word.normalize('NFD').replace(/[̀-ͯ]/g, '')
}

/**
 * Punctuation stripped when `punctuationTolerant`. We keep the Catalan
 * geminate middot (·, l·l) and the apostrophe INSIDE the word so that
 * "col·legi" vs "collegi" and "l'amic" vs "lamic" register as real spelling
 * differences — only *edge* punctuation (commas, periods, quotes) is trimmed.
 */
function trimEdgePunctuation(word: string): string {
  return word.replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}·']+$/gu, '')
}

/** Canonical form used for equality: casing + edge punctuation folded per options. */
function normalize(word: string, opts: Required<DiffOptions>): string {
  let w = word
  if (opts.punctuationTolerant) w = trimEdgePunctuation(w)
  if (!opts.caseSensitive) w = w.toLowerCase()
  return w
}

/** Classifies an aligned reference/typed pair that isn't an exact normalized match. */
function classifyPair(refNorm: string, typedNorm: string): WordStatus {
  if (refNorm === typedNorm) return 'ok'
  // Same letters once accents are removed -> it's an accent slip, not a misspelling.
  if (stripAccents(refNorm) === stripAccents(typedNorm)) return 'accent'
  return 'misspelled'
}

/**
 * Word-level LCS on the normalized tokens. Returns the aligned diff. The DP
 * table is O(n·m) which is fine for a 25-45 word dictation.
 */
function alignLcs(refTokens: string[], typedTokens: string[], opts: Required<DiffOptions>): WordDiff[] {
  const refN = refTokens.map((w) => normalize(w, opts))
  const typedN = typedTokens.map((w) => normalize(w, opts))
  const n = refN.length
  const m = typedN.length

  // dp[i][j] = LCS length of refN[i..] and typedN[j..]
  const dp: number[][] = Array.from({ length: n + 1 }, () => new Array<number>(m + 1).fill(0))
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      dp[i][j] = refN[i] === typedN[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1])
    }
  }

  const out: WordDiff[] = []
  let i = 0
  let j = 0
  while (i < n && j < m) {
    if (refN[i] === typedN[j]) {
      out.push({ status: 'ok', reference: refTokens[i], typed: typedTokens[j] })
      i++
      j++
    } else if (dp[i + 1][j] >= dp[i][j + 1]) {
      // The reference word can't be matched ahead cheaply — treat as substitution
      // if the typed side is also stuck, otherwise a missing word.
      if (dp[i + 1][j] === dp[i][j + 1] && i < n && j < m) {
        out.push({ status: classifyPair(refN[i], typedN[j]), reference: refTokens[i], typed: typedTokens[j] })
        i++
        j++
      } else {
        out.push({ status: 'missing', reference: refTokens[i] })
        i++
      }
    } else {
      out.push({ status: 'extra', typed: typedTokens[j] })
      j++
    }
  }
  while (i < n) {
    out.push({ status: 'missing', reference: refTokens[i] })
    i++
  }
  while (j < m) {
    out.push({ status: 'extra', typed: typedTokens[j] })
    j++
  }
  return out
}

/** Diffs `typed` against `reference` at word level. See module docs. */
export function diffText(reference: string, typed: string, options: DiffOptions = {}): TextDiff {
  const opts = { ...DEFAULTS, ...options }
  const words = alignLcs(tokenize(reference), tokenize(typed), opts)

  let accentCount = 0
  let spellingCount = 0
  for (const w of words) {
    if (w.status === 'accent') accentCount++
    else if (w.status !== 'ok') spellingCount++
  }
  return { words, errorCount: accentCount + spellingCount, accentCount, spellingCount }
}

/**
 * A gentle "did she get it?" threshold for marking the card correct. We forgive
 * a little (dictation is hard): correct when there are no hard spelling errors
 * and at most one accent slip per ~8 reference words. This keeps the reward
 * loop encouraging while still treating repeated real errors as "not yet".
 */
export function isCorrectEnough(diff: TextDiff): boolean {
  const refWords = diff.words.filter((w) => w.status !== 'extra').length || 1
  const accentBudget = Math.max(1, Math.round(refWords / 8))
  return diff.spellingCount === 0 && diff.accentCount <= accentBudget
}
