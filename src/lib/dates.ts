/**
 * Pure date-arithmetic helpers over YYYY-MM-DD strings.
 *
 * This file constructs `Date` objects from explicit numeric input via
 * `Date.UTC(...)` — it never reads the system clock (no bare `new Date()`
 * with no arguments, no `Date.now()`). That keeps it inside the project's
 * determinism rule ("no Math.random/Date.now/new Date outside
 * src/lib/clock.ts"): the exception here is that `Date.UTC` is used purely
 * as a calendar calculator over caller-supplied numbers, not as a source of
 * "now". All arithmetic is done in UTC so it's immune to local timezone/DST
 * shifts.
 */

function parseISO(dateISO: string): { year: number; month: number; day: number } {
  const [year, month, day] = dateISO.split('-').map(Number)
  return { year, month, day }
}

function toISO(utcMillis: number): string {
  const d = new Date(utcMillis)
  const year = d.getUTCFullYear()
  const month = String(d.getUTCMonth() + 1).padStart(2, '0')
  const day = String(d.getUTCDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

/** Returns the date `n` days after `dateISO` (n may be negative to go backwards). */
export function addDays(dateISO: string, n: number): string {
  const { year, month, day } = parseISO(dateISO)
  const millis = Date.UTC(year, month - 1, day + n)
  return toISO(millis)
}

/** Number of days from `a` to `b` (positive if `b` is after `a`, negative if before). */
export function daysBetween(a: string, b: string): number {
  const pa = parseISO(a)
  const pb = parseISO(b)
  const millisA = Date.UTC(pa.year, pa.month - 1, pa.day)
  const millisB = Date.UTC(pb.year, pb.month - 1, pb.day)
  const msPerDay = 24 * 60 * 60 * 1000
  return Math.round((millisB - millisA) / msPerDay)
}
