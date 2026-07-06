import { describe, expect, it } from 'vitest'
import { masteryFor, suggestedDifficulty } from './mastery'
import type { Attempt } from '../types/progress'
import type { SubskillDef } from './skills'

function attempt(overrides: Partial<Attempt> = {}): Attempt {
  return {
    dateISO: '2026-07-16',
    cardType: 'mc',
    subskill: 'tablas',
    correct: true,
    hintsUsed: 0,
    ms: 1000,
    difficulty: 2,
    ...overrides,
  }
}

function def(overrides: Partial<SubskillDef> = {}): SubskillDef {
  return {
    id: 'tablas',
    skill: 'calculo',
    difficultyRange: [1, 5],
    ...overrides,
  }
}

describe('masteryFor', () => {
  it('returns undefined when there are no attempts for the subskill', () => {
    expect(masteryFor([], 'tablas')).toBeUndefined()
    expect(masteryFor([attempt({ subskill: 'other' })], 'tablas')).toBeUndefined()
  })

  it('scores an all-correct-no-hints run as 1', () => {
    const attempts = Array.from({ length: 5 }, () => attempt({ correct: true, hintsUsed: 0 }))
    expect(masteryFor(attempts, 'tablas')).toBe(1)
  })

  it('scores an all-wrong run as 0', () => {
    const attempts = Array.from({ length: 5 }, () => attempt({ correct: false }))
    expect(masteryFor(attempts, 'tablas')).toBe(0)
  })

  it('scores a correct-with-hints attempt as 0.5', () => {
    const attempts = [attempt({ correct: true, hintsUsed: 2 })]
    expect(masteryFor(attempts, 'tablas')).toBe(0.5)
  })

  it('averages mixed outcomes correctly', () => {
    const attempts = [
      attempt({ correct: true, hintsUsed: 0 }), // 1
      attempt({ correct: true, hintsUsed: 1 }), // 0.5
      attempt({ correct: false }), // 0
      attempt({ correct: true, hintsUsed: 0 }), // 1
    ]
    // (1 + 0.5 + 0 + 1) / 4 = 0.625
    expect(masteryFor(attempts, 'tablas')).toBeCloseTo(0.625)
  })

  it('ignores attempts for other subskills', () => {
    const attempts = [
      attempt({ subskill: 'tablas', correct: true, hintsUsed: 0 }),
      attempt({ subskill: 'mental', correct: false }),
      attempt({ subskill: 'tablas', correct: false }),
    ]
    expect(masteryFor(attempts, 'tablas')).toBeCloseTo(0.5)
  })

  it('only considers the most recent 20 attempts for the subskill (fewer is fine)', () => {
    // 25 wrong attempts, then 20 correct: only the last 20 (all correct) should count.
    const wrong = Array.from({ length: 25 }, () => attempt({ correct: false }))
    const right = Array.from({ length: 20 }, () => attempt({ correct: true, hintsUsed: 0 }))
    const attempts = [...wrong, ...right]

    expect(masteryFor(attempts, 'tablas')).toBe(1)
  })

  it('order matters: trailing window follows array order, not sorted by date', () => {
    const attempts = [
      attempt({ correct: false }),
      attempt({ correct: false }),
      attempt({ correct: true, hintsUsed: 0 }),
    ]
    // last 2 in array order: [false, true] => (0 + 1) / 2 = 0.5
    const lastTwoWindow = attempts.slice(-2)
    expect(masteryFor(lastTwoWindow, 'tablas')).toBeCloseTo(0.5)
  })

  it('with fewer than 20 attempts, averages over all of them', () => {
    const attempts = [
      attempt({ correct: true, hintsUsed: 0 }),
      attempt({ correct: false }),
      attempt({ correct: false }),
    ]
    expect(masteryFor(attempts, 'tablas')).toBeCloseTo(1 / 3)
  })
})

describe('suggestedDifficulty', () => {
  it('starts at difficultyRange[0] when there are no attempts', () => {
    expect(suggestedDifficulty([], def({ difficultyRange: [2, 5] }))).toBe(2)
  })

  it('stays at the current level when the judge window has fewer than 3 samples (1-2 attempts)', () => {
    // A single attempt at difficulty 3: even though it's correct, 1 sample is not
    // enough signal to move the level.
    const oneAttempt = [attempt({ difficulty: 3, correct: true, hintsUsed: 0 })]
    expect(suggestedDifficulty(oneAttempt, def({ difficultyRange: [1, 5] }))).toBe(3)

    const twoAttempts = Array.from({ length: 2 }, () =>
      attempt({ difficulty: 3, correct: true, hintsUsed: 0 }),
    )
    expect(suggestedDifficulty(twoAttempts, def({ difficultyRange: [1, 5] }))).toBe(3)
  })

  it('rises by 1 when accuracy at the current level is >= 85% over >= 3 attempts at that level', () => {
    const threeAttempts = Array.from({ length: 3 }, () =>
      attempt({ difficulty: 2, correct: true, hintsUsed: 0 }),
    )
    expect(suggestedDifficulty(threeAttempts, def({ difficultyRange: [1, 5] }))).toBe(3)
  })

  it('rises by 1 when accuracy at the current level is >= 85% over the last 10 attempts at that level', () => {
    const attempts = Array.from({ length: 10 }, () =>
      attempt({ difficulty: 2, correct: true, hintsUsed: 0 }),
    )
    expect(suggestedDifficulty(attempts, def({ difficultyRange: [1, 5] }))).toBe(3)
  })

  it('caps the rise at difficultyRange max', () => {
    const attempts = Array.from({ length: 10 }, () =>
      attempt({ difficulty: 5, correct: true, hintsUsed: 0 }),
    )
    expect(suggestedDifficulty(attempts, def({ difficultyRange: [1, 5] }))).toBe(5)
  })

  it('drops by 1 when accuracy at the current level is < 60% over the last 10 attempts at that level', () => {
    // 3 correct-no-hints (1.0 each) + 7 wrong (0) = 3/10 = 30% < 60%
    const attempts = [
      ...Array.from({ length: 3 }, () => attempt({ difficulty: 3, correct: true, hintsUsed: 0 })),
      ...Array.from({ length: 7 }, () => attempt({ difficulty: 3, correct: false })),
    ]
    expect(suggestedDifficulty(attempts, def({ difficultyRange: [1, 5] }))).toBe(2)
  })

  it('floors the drop at difficultyRange min', () => {
    const attempts = Array.from({ length: 10 }, () => attempt({ difficulty: 1, correct: false }))
    expect(suggestedDifficulty(attempts, def({ difficultyRange: [1, 5] }))).toBe(1)
  })

  it('stays the same when accuracy is between 60% and 85%', () => {
    // 7 correct-no-hints + 3 wrong = 7/10 = 70%
    const attempts = [
      ...Array.from({ length: 7 }, () => attempt({ difficulty: 3, correct: true, hintsUsed: 0 })),
      ...Array.from({ length: 3 }, () => attempt({ difficulty: 3, correct: false })),
    ]
    expect(suggestedDifficulty(attempts, def({ difficultyRange: [1, 5] }))).toBe(3)
  })

  it('only judges the last 10 attempts at the current level (older ones outside the window are ignored)', () => {
    // 10 wrong attempts at level 3 long ago, then 10 correct attempts at level 3 recently.
    // Current level = last attempt's difficulty = 3. Judge window = last 10 AT level 3
    // in array order, which is the recent correct batch => rises to 4.
    const attempts = [
      ...Array.from({ length: 10 }, () => attempt({ difficulty: 3, correct: false })),
      ...Array.from({ length: 10 }, () => attempt({ difficulty: 3, correct: true, hintsUsed: 0 })),
    ]
    expect(suggestedDifficulty(attempts, def({ difficultyRange: [1, 5] }))).toBe(4)
  })

  it('ignores attempts at a different difficulty than the current level when judging', () => {
    // Current level = last attempt's difficulty = 2. Prior attempts at difficulty 4 must not
    // pollute the judge window for level 2.
    const attempts = [
      ...Array.from({ length: 10 }, () => attempt({ difficulty: 4, correct: false })),
      ...Array.from({ length: 3 }, () => attempt({ difficulty: 2, correct: true, hintsUsed: 0 })),
    ]
    // judge window: just the 3 level-2 attempts, accuracy 1.0 >= 0.85 => rises to 3
    expect(suggestedDifficulty(attempts, def({ difficultyRange: [1, 5] }))).toBe(3)
  })

  it('clamps an out-of-range current level (e.g. from stale data) back into difficultyRange', () => {
    const attempts = [attempt({ difficulty: 99, correct: true, hintsUsed: 0 })]
    expect(suggestedDifficulty(attempts, def({ difficultyRange: [1, 5] }))).toBe(5)
  })
})
