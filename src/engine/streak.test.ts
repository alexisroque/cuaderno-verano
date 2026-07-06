import { describe, expect, it } from 'vitest'
import { advanceStreak } from './streak'
import type { Streak } from '../types/progress'

function streak(overrides: Partial<Streak> = {}): Streak {
  return { count: 0, lastDayISO: '', graceUsed: 0, ...overrides }
}

describe('advanceStreak', () => {
  it('starts a streak at 1 on the first completed day', () => {
    const { streak: result, bonusCoins } = advanceStreak(streak(), '2026-07-01', true)
    expect(result).toEqual({ count: 1, lastDayISO: '2026-07-01', graceUsed: 0 })
    expect(bonusCoins).toBe(0)
  })

  it('does not start or change a streak on an incomplete day', () => {
    const before = streak()
    const { streak: result, bonusCoins } = advanceStreak(before, '2026-07-01', false)
    expect(result).toEqual(before)
    expect(bonusCoins).toBe(0)
  })

  it('extends the streak by 1 on a consecutive completed day', () => {
    const day1 = advanceStreak(streak(), '2026-07-01', true)
    const day2 = advanceStreak(day1.streak, '2026-07-02', true)
    expect(day2.streak).toEqual({ count: 2, lastDayISO: '2026-07-02', graceUsed: 0 })
  })

  it('accumulates across many consecutive days', () => {
    let state = streak()
    let dateISO = '2026-07-01'
    for (let i = 0; i < 5; i++) {
      const result = advanceStreak(state, dateISO, true)
      state = result.streak
      dateISO = dateISO.slice(0, 8) + String(Number(dateISO.slice(8)) + 1).padStart(2, '0')
    }
    expect(state.count).toBe(5)
  })

  it('is idempotent for a second completion recorded the same day', () => {
    const day1 = advanceStreak(streak(), '2026-07-01', true)
    const sameDayAgain = advanceStreak(day1.streak, '2026-07-01', true)
    expect(sameDayAgain.streak).toEqual(day1.streak)
    expect(sameDayAgain.bonusCoins).toBe(0)
  })

  it('consumes one grace day when exactly one day is missed', () => {
    const day1 = advanceStreak(streak(), '2026-07-01', true)
    // 2026-07-02 missed entirely; check in on 2026-07-03 (gap of 2 days, 1 day missed)
    const day3 = advanceStreak(day1.streak, '2026-07-03', true)
    expect(day3.streak.count).toBe(2)
    expect(day3.streak.graceUsed).toBe(1)
    expect(day3.streak.lastDayISO).toBe('2026-07-03')
  })

  it('consumes two grace days when two consecutive days are missed', () => {
    const day1 = advanceStreak(streak(), '2026-07-01', true)
    // 07-02 and 07-03 missed; check in 07-04 (gap of 3, 2 days missed)
    const day4 = advanceStreak(day1.streak, '2026-07-04', true)
    expect(day4.streak.count).toBe(2)
    expect(day4.streak.graceUsed).toBe(2)
  })

  it('resets to 0 when missing beyond the available grace (3+ days missed with no prior grace spent)', () => {
    const day1 = advanceStreak(streak(), '2026-07-01', true)
    // 07-02, 07-03, 07-04 missed (3 days); check in 07-05 (gap of 4)
    const day5 = advanceStreak(day1.streak, '2026-07-05', true)
    expect(day5.streak.count).toBe(1)
    expect(day5.streak.graceUsed).toBe(0)
    expect(day5.streak.lastDayISO).toBe('2026-07-05')
  })

  it('resets to 0 when grace budget is already exhausted and another day is missed', () => {
    // Spend both grace days across two separate 1-day lapses, then miss a 3rd time.
    let state = advanceStreak(streak(), '2026-07-01', true).streak
    state = advanceStreak(state, '2026-07-03', true).streak // 1 missed day, graceUsed=1
    state = advanceStreak(state, '2026-07-05', true).streak // 1 missed day, graceUsed=2
    expect(state.graceUsed).toBe(2)

    // Now miss another single day with no grace left.
    const after = advanceStreak(state, '2026-07-07', true)
    expect(after.streak.count).toBe(1)
    expect(after.streak.graceUsed).toBe(0)
  })

  it('resets graceUsed to 0 once the streak extends 7 consecutive real days', () => {
    let state = advanceStreak(streak(), '2026-07-01', true).streak
    state = advanceStreak(state, '2026-07-03', true).streak // grace spent: 1
    expect(state.graceUsed).toBe(1)

    // 6 more consecutive real days: 07-04 .. 07-09 (count goes 2 -> 8, 7 consecutive real days)
    const days = ['2026-07-04', '2026-07-05', '2026-07-06', '2026-07-07', '2026-07-08', '2026-07-09']
    for (const d of days) {
      state = advanceStreak(state, d, true).streak
    }
    expect(state.count).toBe(8)
    expect(state.graceUsed).toBe(0)
  })

  it('awards no coin bonus for non-milestone days', () => {
    const { bonusCoins } = advanceStreak(streak({ count: 1, lastDayISO: '2026-07-01' }), '2026-07-02', true)
    expect(bonusCoins).toBe(0)
  })

  it('awards 5 coins when crossing the 3-day milestone', () => {
    const { bonusCoins } = advanceStreak(streak({ count: 2, lastDayISO: '2026-07-01' }), '2026-07-02', true)
    expect(bonusCoins).toBe(5)
  })

  it('awards 10 coins when crossing the 7-day milestone', () => {
    const { bonusCoins } = advanceStreak(streak({ count: 6, lastDayISO: '2026-07-01' }), '2026-07-02', true)
    expect(bonusCoins).toBe(10)
  })

  it('awards 20 coins when crossing the 14-day milestone', () => {
    const { bonusCoins } = advanceStreak(streak({ count: 13, lastDayISO: '2026-07-01' }), '2026-07-02', true)
    expect(bonusCoins).toBe(20)
  })

  it('awards 50 coins when crossing the 30-day milestone', () => {
    const { bonusCoins } = advanceStreak(streak({ count: 29, lastDayISO: '2026-07-01' }), '2026-07-02', true)
    expect(bonusCoins).toBe(50)
  })

  it('awards no bonus when a streak resets even if the old count was high', () => {
    const lapsed = streak({ count: 10, lastDayISO: '2026-07-01', graceUsed: 0 })
    // Miss 3+ days -> resets to 1, not a milestone.
    const { bonusCoins, streak: result } = advanceStreak(lapsed, '2026-07-10', true)
    expect(result.count).toBe(1)
    expect(bonusCoins).toBe(0)
  })
})
