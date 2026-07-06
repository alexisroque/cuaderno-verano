import { describe, expect, it } from 'vitest'
import { subskillStats, dailyActivity, weakestSubskills } from './analytics'
import type { Attempt } from '../types/progress'

function attempt(overrides: Partial<Attempt> = {}): Attempt {
  return {
    dateISO: '2026-07-16',
    cardType: 'mc',
    subskill: 'tablas',
    correct: true,
    hintsUsed: 0,
    ms: 5000,
    difficulty: 2,
    ...overrides,
  }
}

describe('subskillStats', () => {
  it('returns an empty array when there are no attempts', () => {
    expect(subskillStats([], 'aira')).toEqual([])
  })

  it('computes accuracy and volume per subskill', () => {
    const attempts: Attempt[] = [
      attempt({ subskill: 'tablas', correct: true, hintsUsed: 0 }),
      attempt({ subskill: 'tablas', correct: false }),
      attempt({ subskill: 'mult-2cifras', correct: true, hintsUsed: 0 }),
    ]
    const stats = subskillStats(attempts, 'aira')
    const tablas = stats.find((s) => s.subskillId === 'tablas')
    const mult = stats.find((s) => s.subskillId === 'mult-2cifras')
    expect(tablas).toBeDefined()
    expect(tablas!.volume).toBe(2)
    expect(tablas!.accuracy).toBeCloseTo(0.5)
    expect(mult!.volume).toBe(1)
    expect(mult!.accuracy).toBeCloseTo(1)
  })

  it('treats a hinted-correct attempt as half credit (hint-aware)', () => {
    const attempts: Attempt[] = [
      attempt({ subskill: 'tablas', correct: true, hintsUsed: 2 }),
      attempt({ subskill: 'tablas', correct: true, hintsUsed: 0 }),
    ]
    const stats = subskillStats(attempts, 'aira')
    // (0.5 + 1) / 2 = 0.75
    expect(stats[0].accuracy).toBeCloseTo(0.75)
  })

  it('carries the owning skill and the last-seen date', () => {
    const attempts: Attempt[] = [
      attempt({ subskill: 'tablas', dateISO: '2026-07-10' }),
      attempt({ subskill: 'tablas', dateISO: '2026-07-14' }),
    ]
    const stats = subskillStats(attempts, 'aira')
    expect(stats[0].skill).toBe('calculo')
    expect(stats[0].lastSeen).toBe('2026-07-14')
  })

  it('only counts attempts within the window when one is given', () => {
    const attempts: Attempt[] = [
      attempt({ subskill: 'tablas', dateISO: '2026-06-01', correct: false }),
      attempt({ subskill: 'tablas', dateISO: '2026-07-15', correct: true }),
    ]
    // window ends 2026-07-16, 14 days → only 2026-07-15 counts
    const stats = subskillStats(attempts, 'aira', { todayISO: '2026-07-16', days: 14 })
    expect(stats[0].volume).toBe(1)
    expect(stats[0].accuracy).toBeCloseTo(1)
  })

  it('ignores attempts whose subskill is not in the profile catalog', () => {
    const attempts: Attempt[] = [attempt({ subskill: 'does-not-exist' })]
    expect(subskillStats(attempts, 'aira')).toEqual([])
  })
})

describe('dailyActivity', () => {
  it('produces one row per day in the window, most recent last', () => {
    const rows = dailyActivity([], {}, 3, '2026-07-16')
    expect(rows.map((r) => r.dateISO)).toEqual(['2026-07-14', '2026-07-15', '2026-07-16'])
  })

  it('rolls up cards done from completedCards', () => {
    const completed = { '2026-07-16': ['problema', 'dictado'], '2026-07-15': ['diario'] }
    const rows = dailyActivity([], completed, 3, '2026-07-16')
    expect(rows.find((r) => r.dateISO === '2026-07-16')!.cardsDone).toBe(2)
    expect(rows.find((r) => r.dateISO === '2026-07-15')!.cardsDone).toBe(1)
    expect(rows.find((r) => r.dateISO === '2026-07-14')!.cardsDone).toBe(0)
  })

  it('sums attempt time into minutes and computes daily accuracy', () => {
    const attempts: Attempt[] = [
      attempt({ dateISO: '2026-07-16', ms: 60000, correct: true, hintsUsed: 0 }),
      attempt({ dateISO: '2026-07-16', ms: 60000, correct: false }),
    ]
    const rows = dailyActivity(attempts, {}, 1, '2026-07-16')
    const today = rows[0]
    expect(today.minutes).toBe(2)
    expect(today.accuracy).toBeCloseTo(0.5)
  })

  it('clamps a single absurdly long attempt so an idle tab does not inflate minutes', () => {
    const attempts: Attempt[] = [attempt({ dateISO: '2026-07-16', ms: 60 * 60 * 1000 })]
    const rows = dailyActivity(attempts, {}, 1, '2026-07-16')
    // one attempt clamped to at most 5 minutes
    expect(rows[0].minutes).toBeLessThanOrEqual(5)
  })

  it('reports accuracy null on a day with no graded attempts', () => {
    const rows = dailyActivity([], { '2026-07-16': ['diario'] }, 1, '2026-07-16')
    expect(rows[0].accuracy).toBeNull()
  })
})

describe('weakestSubskills', () => {
  it('returns the n lowest-accuracy subskills that have data', () => {
    const attempts: Attempt[] = [
      attempt({ subskill: 'tablas', correct: false }),
      attempt({ subskill: 'tablas', correct: false }),
      attempt({ subskill: 'mult-2cifras', correct: true, hintsUsed: 0 }),
      attempt({ subskill: 'mental', correct: true, hintsUsed: 2 }),
    ]
    const weak = weakestSubskills(attempts, 'aira', 2)
    expect(weak).toHaveLength(2)
    expect(weak[0].subskillId).toBe('tablas') // 0% accuracy
    expect(weak[1].subskillId).toBe('mental') // 50% (hinted)
  })

  it('never returns more than the number of subskills with data', () => {
    const attempts: Attempt[] = [attempt({ subskill: 'tablas', correct: false })]
    expect(weakestSubskills(attempts, 'aira', 5)).toHaveLength(1)
  })

  it('breaks ties by volume so a broadly-sampled weakness outranks a one-off', () => {
    const attempts: Attempt[] = [
      attempt({ subskill: 'tablas', correct: false }),
      attempt({ subskill: 'mental', correct: false }),
      attempt({ subskill: 'mental', correct: false }),
    ]
    const weak = weakestSubskills(attempts, 'aira', 1)
    expect(weak[0].subskillId).toBe('mental')
  })
})
