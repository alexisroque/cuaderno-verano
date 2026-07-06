import { describe, expect, it } from 'vitest'
import { addDays, daysBetween } from './dates'

describe('addDays', () => {
  it('adds positive days within the same month', () => {
    expect(addDays('2026-07-01', 5)).toBe('2026-07-06')
  })

  it('adds days across a month boundary', () => {
    expect(addDays('2026-07-30', 3)).toBe('2026-08-02')
  })

  it('adds days across a year boundary', () => {
    expect(addDays('2026-12-30', 3)).toBe('2027-01-02')
  })

  it('subtracts days with a negative amount', () => {
    expect(addDays('2026-07-05', -3)).toBe('2026-07-02')
  })

  it('subtracts across a month boundary', () => {
    expect(addDays('2026-08-02', -3)).toBe('2026-07-30')
  })

  it('handles n=0 as a no-op', () => {
    expect(addDays('2026-07-05', 0)).toBe('2026-07-05')
  })

  it('handles leap-year Feb 29 correctly', () => {
    expect(addDays('2028-02-28', 1)).toBe('2028-02-29')
    expect(addDays('2028-02-29', 1)).toBe('2028-03-01')
  })
})

describe('daysBetween', () => {
  it('returns 0 for the same date', () => {
    expect(daysBetween('2026-07-05', '2026-07-05')).toBe(0)
  })

  it('returns a positive count when b is after a', () => {
    expect(daysBetween('2026-07-01', '2026-07-06')).toBe(5)
  })

  it('returns a negative count when b is before a', () => {
    expect(daysBetween('2026-07-06', '2026-07-01')).toBe(-5)
  })

  it('counts across a month boundary', () => {
    expect(daysBetween('2026-07-30', '2026-08-02')).toBe(3)
  })

  it('counts across a year boundary', () => {
    expect(daysBetween('2026-12-30', '2027-01-02')).toBe(3)
  })
})
