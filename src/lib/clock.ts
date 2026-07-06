// This is the ONLY file allowed to call `new Date()`.
// All other code must go through `todayISO()` (or receive a date as a
// parameter) so behavior stays deterministic and testable.

/** Today's local date as YYYY-MM-DD. */
export function todayISO(): string {
  return new Date().toLocaleDateString('sv-SE')
}
