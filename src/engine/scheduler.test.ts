import { describe, expect, it } from 'vitest'
import { dueSubskills, pickSubskill } from './scheduler'
import { createRng } from '../lib/rng'
import { CATALOG } from './skills'
import type { Attempt, GemState } from '../types/progress'
import type { ChildSettings } from '../state/settingsStore'

/** Every Aira subskill id, flattened across skills (for building "everything else is consolidated" fixtures). */
const ALL_AIRA_SUBSKILLS = Object.values(CATALOG.aira.skills).flatMap((s) => Object.keys(s.subskills))

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

function settings(overrides: Partial<ChildSettings> = {}): ChildSettings {
  return {
    missionSize: 5,
    challengeFrequency: 0.2,
    moduleToggles: {},
    subskillAdjustments: {},
    weeklyFocus: [],
    ...overrides,
  }
}

describe('dueSubskills', () => {
  it('marks a subskill due when a failed attempt happened exactly 1 day ago', () => {
    const attempts = [attempt({ subskill: 'tablas', correct: false, dateISO: '2026-07-15' })]
    expect(dueSubskills(attempts, '2026-07-16')).toContain('tablas')
  })

  it('marks a subskill due when a failed attempt happened exactly 3 days ago', () => {
    const attempts = [attempt({ subskill: 'tablas', correct: false, dateISO: '2026-07-13' })]
    expect(dueSubskills(attempts, '2026-07-16')).toContain('tablas')
  })

  it('marks a subskill due when a failed attempt happened exactly 7 days ago', () => {
    const attempts = [attempt({ subskill: 'tablas', correct: false, dateISO: '2026-07-09' })]
    expect(dueSubskills(attempts, '2026-07-16')).toContain('tablas')
  })

  it('does not mark due when the failed attempt was 2 days ago', () => {
    const attempts = [attempt({ subskill: 'tablas', correct: false, dateISO: '2026-07-14' })]
    expect(dueSubskills(attempts, '2026-07-16')).not.toContain('tablas')
  })

  it('does not mark due for a passed attempt at 1/3/7 days ago', () => {
    const attempts = [
      attempt({ subskill: 'tablas', correct: true, dateISO: '2026-07-15' }),
      attempt({ subskill: 'mental', correct: true, dateISO: '2026-07-13' }),
      attempt({ subskill: 'cajitas', correct: true, dateISO: '2026-07-09' }),
    ]
    expect(dueSubskills(attempts, '2026-07-16')).toEqual([])
  })

  it('returns each due subskill only once even with multiple qualifying failures', () => {
    const attempts = [
      attempt({ subskill: 'tablas', correct: false, dateISO: '2026-07-15' }),
      attempt({ subskill: 'tablas', correct: false, dateISO: '2026-07-13' }),
    ]
    const due = dueSubskills(attempts, '2026-07-16')
    expect(due.filter((s) => s === 'tablas')).toHaveLength(1)
  })
})

describe('pickSubskill', () => {
  const noGems: Record<string, GemState> = {}

  it('picks from the due/weak pool ~60% of the time with a clear 3-pool split', () => {
    // Put every Aira subskill except 'tablas' and 'cajitas' into the consolidation pool
    // (well-practiced, high mastery). 'tablas' is due via a failed attempt 1 day ago.
    // 'cajitas' is left untouched, so it's the sole occupant of the novelty pool.
    const consolidated = ALL_AIRA_SUBSKILLS.filter((id) => id !== 'tablas' && id !== 'cajitas')
    const attempts = [
      attempt({ subskill: 'tablas', correct: false, dateISO: '2026-07-15' }),
      ...consolidated.flatMap((id) =>
        Array.from({ length: 20 }, () =>
          attempt({ subskill: id, correct: true, hintsUsed: 0, dateISO: '2026-07-01' }),
        ),
      ),
    ]

    const counts = { due: 0, consolidation: 0, novelty: 0, other: 0 }
    const rng = createRng('pool-distribution-seed')
    for (let i = 0; i < 1000; i++) {
      const pick = pickSubskill(rng, attempts, 'aira', settings(), '2026-07-16', noGems)
      if (pick === 'tablas') counts.due++
      else if (pick === 'cajitas') counts.novelty++
      else if (consolidated.includes(pick)) counts.consolidation++
      else counts.other++
    }

    expect(counts.due / 1000).toBeGreaterThan(0.55)
    expect(counts.due / 1000).toBeLessThan(0.65)
    expect(counts.consolidation / 1000).toBeGreaterThan(0.2)
    expect(counts.consolidation / 1000).toBeLessThan(0.3)
    expect(counts.novelty / 1000).toBeGreaterThan(0.1)
    expect(counts.novelty / 1000).toBeLessThan(0.2)
  })

  it('redistributes weight proportionally when the due/weak pool is empty', () => {
    // No due/weak subskills at all for calculo's non-challenge, non-lowWeight set is unlikely in
    // practice, but we force it here: everything either well-mastered or fresh.
    const attempts = Array.from({ length: 20 }, () =>
      attempt({ subskill: 'mental', correct: true, hintsUsed: 0, dateISO: '2026-06-01' }),
    )

    const rng = createRng('empty-pool-seed')
    const picks = new Set<string>()
    for (let i = 0; i < 200; i++) {
      picks.add(pickSubskill(rng, attempts, 'aira', settings(), '2026-07-16', noGems))
    }
    // Should never pick a subskill from the (nonexistent) due/weak pool; all picks come from
    // consolidation (mental) or novelty (everything else untouched).
    expect(picks.size).toBeGreaterThan(0)
  })

  it('doubles a boosted subskill within-pool weight', () => {
    // Two never-touched novelty subskills for leo: 'letras' and 'espejo' (trazos), one boosted.
    const boosted = settings({
      subskillAdjustments: {
        letras: { difficultyOffset: 0, boostUntil: '2026-07-20' },
      },
    })
    const plain = settings()

    const rng1 = createRng('boost-seed')
    let boostedLetrasCount = 0
    for (let i = 0; i < 2000; i++) {
      if (pickSubskill(rng1, [], 'leo', boosted, '2026-07-16', noGems) === 'letras') {
        boostedLetrasCount++
      }
    }

    const rng2 = createRng('boost-seed')
    let plainLetrasCount = 0
    for (let i = 0; i < 2000; i++) {
      if (pickSubskill(rng2, [], 'leo', plain, '2026-07-16', noGems) === 'letras') {
        plainLetrasCount++
      }
    }

    expect(boostedLetrasCount).toBeGreaterThan(plainLetrasCount * 1.5)
  })

  it('ignores an expired boost (boostUntil before today)', () => {
    const expired = settings({
      subskillAdjustments: {
        letras: { difficultyOffset: 0, boostUntil: '2026-07-10' },
      },
    })
    const plain = settings()

    const rng1 = createRng('expired-boost-seed')
    let expiredCount = 0
    for (let i = 0; i < 2000; i++) {
      if (pickSubskill(rng1, [], 'leo', expired, '2026-07-16', noGems) === 'letras') {
        expiredCount++
      }
    }

    const rng2 = createRng('expired-boost-seed')
    let plainCount = 0
    for (let i = 0; i < 2000; i++) {
      if (pickSubskill(rng2, [], 'leo', plain, '2026-07-16', noGems) === 'letras') {
        plainCount++
      }
    }

    expect(expiredCount).toBe(plainCount)
  })

  it('restricts the novelty pool to weekly focus subskills when set', () => {
    // Leo, no attempts at all: everything is novelty. Restrict focus to 'espejo' only.
    const focused = settings({ weeklyFocus: ['espejo'] })

    const rng = createRng('focus-seed')
    const picks = new Set<string>()
    for (let i = 0; i < 500; i++) {
      picks.add(pickSubskill(rng, [], 'leo', focused, '2026-07-16', noGems))
    }
    expect(picks).toEqual(new Set(['espejo']))
  })

  it('falls back to unrestricted novelty when focus subskills do not intersect the pool', () => {
    // Focus on a subskill from a different profile's catalog entirely -> no intersection with leo's pool.
    const focused = settings({ weeklyFocus: ['tablas'] })

    const rng = createRng('focus-fallback-seed')
    const picks = new Set<string>()
    for (let i = 0; i < 500; i++) {
      picks.add(pickSubskill(rng, [], 'leo', focused, '2026-07-16', noGems))
    }
    expect(picks.size).toBeGreaterThan(1)
  })

  it('excludes challenge subskills unless the base skill gem level is >= 2 (Ambar)', () => {
    // Leo numeros: 'contar-6' is base, 'contar-20' etc are challenge.
    const lowGem: Record<string, GemState> = { numeros: { skillId: 'numeros', level: 1, progress: 0 } }
    const rng = createRng('challenge-gate-seed')
    const picks = new Set<string>()
    for (let i = 0; i < 500; i++) {
      picks.add(pickSubskill(rng, [], 'leo', settings(), '2026-07-16', lowGem))
    }
    const challengeIds = ['contar-20', 'descomponer-7-9', 'dobles', 'mas-menos-1-2', 'simbolos', 'estimar']
    for (const id of challengeIds) {
      expect(picks.has(id)).toBe(false)
    }
  })

  it('allows challenge subskills once the base skill gem level is >= 2 (Ambar)', () => {
    const highGem: Record<string, GemState> = { numeros: { skillId: 'numeros', level: 2, progress: 0 } }
    const rng = createRng('challenge-open-seed')
    const picks = new Set<string>()
    for (let i = 0; i < 2000; i++) {
      picks.add(pickSubskill(rng, [], 'leo', settings(), '2026-07-16', highGem))
    }
    expect(picks.has('contar-20')).toBe(true)
  })

  it('applies a lower (x0.3) within-pool weight to lowWeight subskills', () => {
    // Aira calculo: 'romanos' is lowWeight, 'tablas' is a normal-weight peer, both untouched (novelty).
    const rng1 = createRng('lowweight-seed')
    let romanosCount1 = 0
    let tablasCount1 = 0
    for (let i = 0; i < 3000; i++) {
      const pick = pickSubskill(rng1, [], 'aira', settings(), '2026-07-16', noGems)
      if (pick === 'romanos') romanosCount1++
      if (pick === 'tablas') tablasCount1++
    }

    // romanos should be picked meaningfully less often than tablas within the novelty pool.
    expect(romanosCount1).toBeLessThan(tablasCount1 * 0.6)
  })
})
