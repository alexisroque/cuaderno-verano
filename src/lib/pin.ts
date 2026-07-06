/**
 * Parent-gate PIN hashing. This is a kid-lock, not a security boundary:
 * the only threat model is a 5- and 9-year-old poking at their own iPad, so
 * a fast non-cryptographic hash (FNV-1a, salted with a fixed constant) is
 * enough. What matters is that the plaintext PIN never lands in IndexedDB.
 */

const SALT = 'cuaderno-verano::padres::v1'

/** FNV-1a 32-bit hash, returned as an 8-char hex string. */
function fnv1a(input: string): string {
  let hash = 0x811c9dc5
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i)
    // 32-bit FNV prime multiply, kept in Uint32 range.
    hash = Math.imul(hash, 0x01000193) >>> 0
  }
  return hash.toString(16).padStart(8, '0')
}

/** Hashes a PIN for storage. Same PIN → same hash (deterministic, salted). */
export function hashPin(pin: string): string {
  return fnv1a(`${SALT}::${pin}`)
}

/** True when `pin` hashes to `storedHash`. */
export function verifyPin(pin: string, storedHash: string): boolean {
  return hashPin(pin) === storedHash
}

/** Fixed recovery challenge shown when a parent forgets the PIN (§8 gate). */
export const RECOVERY_QUESTION = '7 × 8 + 5'
export const RECOVERY_ANSWER = 61
