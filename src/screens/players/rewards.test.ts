import { describe, expect, it, beforeEach } from 'vitest'
import { coinsForCard, awardCardCoins, refreshGemsAndDetectLevelUp, CARD_COINS, CHALLENGE_BONUS_COINS } from './rewards'
import { useProgressStore } from '../../state/progressStore'
import type { Attempt } from '../../types/progress'

function resetProfile(profile: 'aira' | 'leo') {
  useProgressStore.setState((state) => ({
    profiles: {
      ...state.profiles,
      [profile]: {
        attempts: [],
        gems: {},
        streak: { count: 0, lastDayISO: '', graceUsed: 0 },
        stickers: [],
        passportStamps: [],
        diaryEntries: [],
        coins: 0,
        consumedContent: {},
        unlockedTreasures: [],
        completedCards: {},
      },
    },
  }))
}

describe('coin economy', () => {
  it('pays a flat CARD_COINS per card and a bonus for challenge cards', () => {
    expect(coinsForCard(false)).toBe(CARD_COINS)
    expect(coinsForCard(true)).toBe(CARD_COINS + CHALLENGE_BONUS_COINS)
  })

  it('awardCardCoins credits the profile', () => {
    resetProfile('aira')
    awardCardCoins('aira', false)
    expect(useProgressStore.getState().profiles.aira.coins).toBe(CARD_COINS)
    awardCardCoins('aira', true)
    expect(useProgressStore.getState().profiles.aira.coins).toBe(CARD_COINS * 2 + CHALLENGE_BONUS_COINS)
  })
})

describe('refreshGemsAndDetectLevelUp', () => {
  beforeEach(() => resetProfile('aira'))

  it('returns null and initializes gem progress when there is no level-up', () => {
    const event = refreshGemsAndDetectLevelUp('aira')
    expect(event).toBeNull()
    // gems get materialized at level 0
    expect(useProgressStore.getState().profiles.aira.gems.calculo?.level).toBe(0)
  })

  it('levels up a gem once it clears accuracy + volume thresholds', () => {
    // 14 correct, no-hints, difficulty-1 attempts on a calculo subskill → level 0→1.
    const attempts: Attempt[] = Array.from({ length: 14 }, (_, i) => ({
      dateISO: `2026-07-${String(i + 1).padStart(2, '0')}`,
      cardType: 'problema',
      subskill: 'tablas',
      correct: true,
      hintsUsed: 0,
      ms: 1000,
      difficulty: 1,
    }))
    useProgressStore.setState((state) => ({
      profiles: { ...state.profiles, aira: { ...state.profiles.aira, attempts } },
    }))
    const event = refreshGemsAndDetectLevelUp('aira')
    expect(event).not.toBeNull()
    expect(event!.skillId).toBe('calculo')
    expect(event!.fromLevel).toBe(0)
    expect(event!.newLevel).toBe(1)
    expect(useProgressStore.getState().profiles.aira.gems.calculo.level).toBe(1)
  })
})
