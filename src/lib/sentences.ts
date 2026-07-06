/**
 * Splits a paragraph into sentences for sentence-by-sentence dictation replay.
 * Terminal punctuation (. ! ? …) stays attached to the sentence it ends, and a
 * run of terminal marks (e.g. "!?") counts as one boundary. Trailing text with
 * no terminal punctuation is kept as a final sentence rather than dropped.
 */
export function splitSentences(text: string): string[] {
  const trimmed = text.trim()
  if (trimmed.length === 0) return []
  const matches = trimmed.match(/[^.!?…]+(?:[.!?…]+|$)/g)
  if (!matches) return [trimmed]
  return matches.map((s) => s.trim()).filter(Boolean)
}
