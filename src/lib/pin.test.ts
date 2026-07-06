import { describe, expect, it } from 'vitest'
import { hashPin, verifyPin, RECOVERY_QUESTION, RECOVERY_ANSWER } from './pin'

describe('hashPin / verifyPin', () => {
  it('does not store the plaintext pin', () => {
    const hash = hashPin('1234')
    expect(hash).not.toContain('1234')
  })

  it('verifies a correct pin against its hash', () => {
    const hash = hashPin('4821')
    expect(verifyPin('4821', hash)).toBe(true)
  })

  it('rejects a wrong pin', () => {
    const hash = hashPin('4821')
    expect(verifyPin('0000', hash)).toBe(false)
  })

  it('is deterministic for the same pin', () => {
    expect(hashPin('1111')).toBe(hashPin('1111'))
  })

  it('produces different hashes for different pins', () => {
    expect(hashPin('1234')).not.toBe(hashPin('1235'))
  })
})

describe('recovery math question', () => {
  it('has an answer consistent with the question', () => {
    // The question is a fixed arithmetic string; the answer must match it.
    // 7 × 8 + 5 = 61
    expect(RECOVERY_QUESTION).toContain('7')
    expect(RECOVERY_ANSWER).toBe(61)
  })
})
