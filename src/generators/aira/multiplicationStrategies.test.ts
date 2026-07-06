import { describe, expect, it } from 'vitest'
import { computeSplit, placeValueSplit } from './multiplicationStrategies'

describe('placeValueSplit', () => {
  it('splits a 3-digit number into its nonzero place-value components', () => {
    expect(placeValueSplit(445)).toEqual([400, 40, 5])
  })

  it('splits 267 into [200, 60, 7]', () => {
    expect(placeValueSplit(267)).toEqual([200, 60, 7])
  })

  it('drops zero place values (e.g. 108 -> [100, 8], not [100, 0, 8])', () => {
    expect(placeValueSplit(108)).toEqual([100, 8])
  })

  it('a bare tens number stays a single chunk (40 -> [40])', () => {
    expect(placeValueSplit(40)).toEqual([40])
  })

  it('a single digit stays a single chunk (7 -> [7])', () => {
    expect(placeValueSplit(7)).toEqual([7])
  })

  it('every returned chunk is a nonzero place-value component (single nonzero digit + zeros)', () => {
    for (const n of [445, 267, 108, 999, 1001, 4005, 23, 900, 40, 7]) {
      const chunks = placeValueSplit(n)
      for (const chunk of chunks) {
        expect(chunk).not.toBe(0)
        const digits = String(Math.abs(chunk))
        expect(digits.slice(1)).toMatch(/^0*$/)
      }
    }
  })

  it('chunks always sum back to the original number', () => {
    for (const n of [445, 267, 108, 999, 1001, 4005, 23, 900, 40, 7, 0]) {
      const chunks = placeValueSplit(n)
      expect(chunks.reduce((acc, c) => acc + c, 0)).toBe(n)
    }
  })
})

describe('computeSplit', () => {
  it('splits the larger operand and multiplies each chunk by the other', () => {
    const split = computeSplit(445, 9)
    expect(split.splitOperand).toBe(445)
    expect(split.otherOperand).toBe(9)
    expect(split.chunks).toEqual([400, 40, 5])
    expect(split.parts).toEqual([3600, 360, 45])
    expect(split.total).toBe(4005)
  })

  it('falls back to splitting the other operand when both are single digits... actually splits whichever has >1 chunk', () => {
    const split = computeSplit(6, 7)
    // Both single-digit: no operand has more than one place-value chunk, so
    // it just keeps a >= b as-is with a trivial 1-chunk split.
    expect(split.chunks.length).toBe(1)
    expect(split.total).toBe(42)
  })

  it('when the larger-or-equal operand is single-digit but the other is multi-digit, splits the multi-digit one', () => {
    const split = computeSplit(4, 27)
    expect(split.splitOperand).toBe(27)
    expect(split.otherOperand).toBe(4)
    expect(split.chunks).toEqual([20, 7])
    expect(split.total).toBe(108)
  })

  it('parts always sum to total', () => {
    for (const [a, b] of [
      [445, 9],
      [267, 3],
      [4, 27],
      [6, 7],
      [799, 8],
      [99, 99],
    ]) {
      const split = computeSplit(a, b)
      expect(split.parts.reduce((acc, p) => acc + p, 0)).toBe(split.total)
      expect(split.total).toBe(a * b)
    }
  })
})
