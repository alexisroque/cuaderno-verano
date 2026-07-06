import { describe, expect, it } from 'vitest'
import { centsToEuroString, decomposeIntoCoins } from './decimalMoneyStrategies'

describe('centsToEuroString', () => {
  it('formats whole and fractional cents correctly', () => {
    expect(centsToEuroString(890)).toBe('8,90')
    expect(centsToEuroString(100)).toBe('1,00')
    expect(centsToEuroString(5)).toBe('0,05')
    expect(centsToEuroString(0)).toBe('0,00')
  })

  it('handles negative amounts', () => {
    expect(centsToEuroString(-250)).toBe('-2,50')
  })
})

describe('decomposeIntoCoins', () => {
  it('sums back to the original amount for a range of values', () => {
    for (const cents of [1, 5, 37, 100, 890, 1234, 9999, 20000]) {
      const coins = decomposeIntoCoins(cents)
      const sum = coins.reduce((a, b) => a + b, 0)
      expect(sum).toBe(cents)
    }
  })

  it('only uses valid euro denominations', () => {
    const valid = new Set([20000, 10000, 5000, 2000, 1000, 500, 200, 100, 50, 20, 10, 5, 2, 1])
    const coins = decomposeIntoCoins(3847)
    for (const c of coins) {
      expect(valid.has(c)).toBe(true)
    }
  })
})
