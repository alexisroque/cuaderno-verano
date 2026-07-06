/**
 * Deterministic seeded random number generator.
 *
 * Uses xmur3 to hash the string seed into a 32-bit integer, then feeds that
 * into mulberry32 as the PRNG state. Both algorithms are small, well-known
 * public-domain generators suitable for deterministic, non-cryptographic use
 * (e.g. reproducible daily activities keyed by date + kid id).
 */
export interface Rng {
  /** Next pseudo-random float in [0, 1). */
  next(): number
  /** Random integer in [min, max], inclusive on both ends. */
  int(min: number, max: number): number
  /** Random element from a non-empty array. */
  pick<T>(arr: T[]): T
  /** New array with the same elements in a deterministic random order. Does not mutate input. */
  shuffle<T>(arr: T[]): T[]
  /** True with probability p (0 = never, 1 = always). */
  chance(p: number): boolean
}

/** xmur3 string hash: turns an arbitrary string seed into a 32-bit integer state. */
function xmur3(seed: string): () => number {
  let h = 1779033703 ^ seed.length
  for (let i = 0; i < seed.length; i++) {
    h = Math.imul(h ^ seed.charCodeAt(i), 3432918353)
    h = (h << 13) | (h >>> 19)
  }
  return () => {
    h = Math.imul(h ^ (h >>> 16), 2246822507)
    h = Math.imul(h ^ (h >>> 13), 3266489909)
    h ^= h >>> 16
    return h >>> 0
  }
}

/** mulberry32 PRNG: fast, deterministic, good-enough distribution for gameplay use. */
function mulberry32(state: number): () => number {
  let a = state
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export function createRng(seed: string): Rng {
  const seedFn = xmur3(seed)
  const next = mulberry32(seedFn())

  return {
    next,
    int(min: number, max: number): number {
      return Math.floor(next() * (max - min + 1)) + min
    },
    pick<T>(arr: T[]): T {
      return arr[this.int(0, arr.length - 1)]
    },
    shuffle<T>(arr: T[]): T[] {
      const result = [...arr]
      for (let i = result.length - 1; i > 0; i--) {
        const j = this.int(0, i)
        ;[result[i], result[j]] = [result[j], result[i]]
      }
      return result
    },
    chance(p: number): boolean {
      return next() < p
    },
  }
}
