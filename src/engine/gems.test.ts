import { describe, expect, it } from 'vitest'
import { checkLevelUp, gemProgress, gemVisual, LEVELS, levelFloor } from './gems'
import type { Attempt, GemState } from '../types/progress'

function attempt(overrides: Partial<Attempt> = {}): Attempt {
  return {
    dateISO: '2026-07-16',
    cardType: 'mc',
    subskill: 'tablas',
    correct: true,
    hintsUsed: 0,
    ms: 1000,
    difficulty: 1,
    ...overrides,
  }
}

function gem(overrides: Partial<GemState> = {}): GemState {
  return { skillId: 'calculo', level: 0, progress: 0, ...overrides }
}

describe('LEVELS', () => {
  it('maps level numbers to the expected names in order', () => {
    expect(LEVELS[0]).toBe('piedra')
    expect(LEVELS[1]).toBe('cuarzo')
    expect(LEVELS[2]).toBe('ambar')
    expect(LEVELS[3]).toBe('esmeralda')
    expect(LEVELS[4]).toBe('rubi')
    expect(LEVELS[5]).toBe('diamante')
    expect(LEVELS[6]).toBe('opalo')
  })
})

describe('levelFloor', () => {
  it('maps each level to its required minimum difficulty', () => {
    expect(levelFloor(1)).toBe(1) // cuarzo
    expect(levelFloor(2)).toBe(1) // ambar
    expect(levelFloor(3)).toBe(2) // esmeralda
    expect(levelFloor(4)).toBe(3) // rubi
    expect(levelFloor(5)).toBe(4) // diamante
    expect(levelFloor(6)).toBe(5) // opalo
  })
})

describe('gemVisual', () => {
  it('returns the emoji + Spanish name for each level', () => {
    expect(gemVisual(0)).toEqual({ emoji: '⚪', name: 'Piedra' })
    expect(gemVisual(1)).toEqual({ emoji: '🔹', name: 'Cuarzo' })
    expect(gemVisual(2)).toEqual({ emoji: '🟠', name: 'Ámbar' })
    expect(gemVisual(3)).toEqual({ emoji: '🟢', name: 'Esmeralda' })
    expect(gemVisual(4)).toEqual({ emoji: '🔴', name: 'Rubí' })
    expect(gemVisual(5)).toEqual({ emoji: '💎', name: 'Diamante' })
    expect(gemVisual(6)).toEqual({ emoji: '🌈', name: 'Ópalo' })
  })
})

describe('checkLevelUp', () => {
  it('levels up from piedra to cuarzo when both accuracy and volume qualify', () => {
    // 20 attempts, all correct-no-hints (100% accuracy), all at difficulty >= levelFloor(1)=1.
    const attempts = Array.from({ length: 20 }, () =>
      attempt({ subskill: 'tablas', correct: true, hintsUsed: 0, difficulty: 2 }),
    )
    const result = checkLevelUp(gem({ level: 0 }), attempts, 'calculo', 'aira')
    expect(result).toEqual({ leveledUp: true, newLevel: 1, skillId: 'calculo' })
  })

  it('pools attempts across all subskills of the skill', () => {
    const attempts = [
      ...Array.from({ length: 10 }, () =>
        attempt({ subskill: 'tablas', correct: true, hintsUsed: 0, difficulty: 2 }),
      ),
      ...Array.from({ length: 10 }, () =>
        attempt({ subskill: 'mental', correct: true, hintsUsed: 0, difficulty: 2 }),
      ),
    ]
    const result = checkLevelUp(gem({ level: 0 }), attempts, 'calculo', 'aira')
    expect(result?.leveledUp).toBe(true)
  })

  it('does not level up when accuracy is below 80% even with enough volume at depth', () => {
    // 12 correct at depth 1 (qualify for volume), but overall accuracy over 20 is low.
    const attempts = [
      ...Array.from({ length: 12 }, () =>
        attempt({ subskill: 'tablas', correct: true, hintsUsed: 0, difficulty: 1 }),
      ),
      ...Array.from({ length: 8 }, () => attempt({ subskill: 'tablas', correct: false, difficulty: 1 })),
    ]
    // accuracy = 12/20 = 60% < 80%
    const result = checkLevelUp(gem({ level: 0 }), attempts, 'calculo', 'aira')
    expect(result).toBeNull()
  })

  it('does not level up when accuracy qualifies but fewer than 12 attempts reach the depth floor', () => {
    // 20 attempts, all correct, but only 5 at difficulty >= 1... wait floor for cuarzo is 1, so use
    // esmeralda's floor (2) by starting from cuarzo (level 1): needs difficulty >= 2, only give 5.
    const attempts = [
      ...Array.from({ length: 5 }, () =>
        attempt({ subskill: 'tablas', correct: true, hintsUsed: 0, difficulty: 2 }),
      ),
      ...Array.from({ length: 15 }, () =>
        attempt({ subskill: 'tablas', correct: true, hintsUsed: 0, difficulty: 1 }),
      ),
    ]
    // accuracy = 100% but only 5 attempts at difficulty >= levelFloor(2)=1... this actually floor(2)=1 too.
    // Use a gem at level 2 (ambar) -> next level esmeralda(3) needs floor=2.
    const result = checkLevelUp(gem({ level: 2 }), attempts, 'calculo', 'aira')
    expect(result).toBeNull()
  })

  it('correct-with-hints counts as 0.5 toward accuracy (same as mastery scoring)', () => {
    // 20 attempts: 16 correct-no-hints (1.0) + 4 correct-with-hints (0.5) = (16 + 2)/20 = 90%
    const attempts = [
      ...Array.from({ length: 16 }, () =>
        attempt({ subskill: 'tablas', correct: true, hintsUsed: 0, difficulty: 1 }),
      ),
      ...Array.from({ length: 4 }, () =>
        attempt({ subskill: 'tablas', correct: true, hintsUsed: 1, difficulty: 1 }),
      ),
    ]
    const result = checkLevelUp(gem({ level: 0 }), attempts, 'calculo', 'aira')
    expect(result?.leveledUp).toBe(true)
  })

  it('never levels down: with a null result the caller keeps the existing level (checkLevelUp never returns a decrease)', () => {
    const attempts = Array.from({ length: 20 }, () => attempt({ subskill: 'tablas', correct: false }))
    const result = checkLevelUp(gem({ level: 3 }), attempts, 'calculo', 'aira')
    expect(result).toBeNull()
  })

  it('returns null when already at the max level (opalo)', () => {
    const attempts = Array.from({ length: 20 }, () =>
      attempt({ subskill: 'tablas', correct: true, hintsUsed: 0, difficulty: 5 }),
    )
    const result = checkLevelUp(gem({ level: 6 }), attempts, 'calculo', 'aira')
    expect(result).toBeNull()
  })

  it('only considers the most recent 20 skill-pooled attempts', () => {
    const stale = Array.from({ length: 30 }, () => attempt({ subskill: 'tablas', correct: false, difficulty: 1 }))
    const recent = Array.from({ length: 20 }, () =>
      attempt({ subskill: 'tablas', correct: true, hintsUsed: 0, difficulty: 2 }),
    )
    const result = checkLevelUp(gem({ level: 0 }), [...stale, ...recent], 'calculo', 'aira')
    expect(result?.leveledUp).toBe(true)
  })
})

describe('gemProgress', () => {
  it('returns 0 with no attempts', () => {
    expect(gemProgress(gem({ level: 0 }), [], 'calculo', 'aira')).toBe(0)
  })

  it('returns 1 for opalo regardless of attempts', () => {
    expect(gemProgress(gem({ level: 6 }), [], 'calculo', 'aira')).toBe(1)
  })

  it('blends accuracy and volume ratios, capped at 1 each', () => {
    // 6 qualifying attempts (volume ratio 6/12=0.5), all correct (accuracy ratio 1.0 capped)
    // min(1, 0.5) = 0.5
    const attempts = Array.from({ length: 6 }, () =>
      attempt({ subskill: 'tablas', correct: true, hintsUsed: 0, difficulty: 2 }),
    )
    expect(gemProgress(gem({ level: 0 }), attempts, 'calculo', 'aira')).toBeCloseTo(0.5)
  })

  it('returns 1 when both accuracy and volume fully qualify', () => {
    const attempts = Array.from({ length: 12 }, () =>
      attempt({ subskill: 'tablas', correct: true, hintsUsed: 0, difficulty: 2 }),
    )
    expect(gemProgress(gem({ level: 0 }), attempts, 'calculo', 'aira')).toBe(1)
  })
})
