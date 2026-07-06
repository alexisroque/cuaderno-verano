import { describe, expect, it } from 'vitest'
import { rollSurprise } from './surprises'
import { createRng } from '../lib/rng'
import { CATALOG } from './skills'

/** A gem-with-progress record for every skill in a profile's catalog, all at level 0/progress 0. */
function gemsAtZero(profile: 'aira' | 'leo'): Array<{ skillId: string; level: number; progress: number }> {
  return Object.keys(CATALOG[profile].skills).map((skillId) => ({ skillId, level: 0, progress: 0 }))
}

describe('rollSurprise', () => {
  it('returns null or a Surprise with a valid kind', () => {
    const rng = createRng('2026-07-16:aira:surprise')
    const result = rollSurprise(rng, gemsAtZero('aira'), 'aira')
    if (result !== null) {
      expect(['desafio', 'relampago', 'gema-doble', 'invitado', 'cofre-mejorado']).toContain(result.kind)
    }
  })

  it('fires on ~30% of days over a year (one independent rng per day, seeded by date+profile+"surprise")', () => {
    let hits = 0
    for (let i = 0; i < 365; i++) {
      const dateISO = `2026-${String(1 + Math.floor(i / 30)).padStart(2, '0')}-${String(1 + (i % 28)).padStart(2, '0')}`
      const rng = createRng(`${dateISO}:aira:surprise`)
      // give at least one challenge-eligible gem so desafio's mass isn't redistributed away
      const gems = gemsAtZero('aira').map((g) => (g.skillId === 'calculo' ? { ...g, level: 2 } : g))
      const result = rollSurprise(rng, gems, 'aira')
      if (result !== null) hits++
    }
    const rate = hits / 365
    expect(rate).toBeGreaterThan(0.25)
    expect(rate).toBeLessThan(0.35)
  })

  it('never fires more than one event per day (rollSurprise returns a single Surprise, not an array)', () => {
    const rng = createRng('2026-07-20:aira:surprise')
    const result = rollSurprise(rng, gemsAtZero('aira'), 'aira')
    // type-level guarantee: result is Surprise | null, never an array. Just exercise the call.
    expect(Array.isArray(result)).toBe(false)
  })

  it('never rolls desafio when no skill with challenge subskills has gem level >= 2, but total event rate stays ~30%', () => {
    let hits = 0
    let desafios = 0
    for (let i = 0; i < 365; i++) {
      const dateISO = `2026-${String(1 + Math.floor(i / 30)).padStart(2, '0')}-${String(1 + (i % 28)).padStart(2, '0')}`
      const rng = createRng(`${dateISO}:aira:surprise`)
      const result = rollSurprise(rng, gemsAtZero('aira'), 'aira')
      if (result !== null) {
        hits++
        if (result.kind === 'desafio') desafios++
      }
    }
    expect(desafios).toBe(0)
    const rate = hits / 365
    expect(rate).toBeGreaterThan(0.25)
    expect(rate).toBeLessThan(0.35)
  })

  it('allows desafio once at least one skill with challenge subskills has gem level >= 2', () => {
    let desafios = 0
    for (let i = 0; i < 365; i++) {
      const dateISO = `2026-${String(1 + Math.floor(i / 30)).padStart(2, '0')}-${String(1 + (i % 28)).padStart(2, '0')}`
      const rng = createRng(`${dateISO}:aira:surprise`)
      const gems = gemsAtZero('aira').map((g) => (g.skillId === 'calculo' ? { ...g, level: 2 } : g))
      const result = rollSurprise(rng, gems, 'aira')
      if (result?.kind === 'desafio') desafios++
    }
    expect(desafios).toBeGreaterThan(0)
  })

  it('gema-doble picks the weakest gem: lowest level, tie-broken by lowest progress', () => {
    const gems = [
      { skillId: 'calculo', level: 3, progress: 0.9 },
      { skillId: 'problemas', level: 1, progress: 0.5 },
      { skillId: 'ortografia', level: 1, progress: 0.2 }, // weakest: same level as problemas, lower progress
      { skillId: 'escritura', level: 4, progress: 0.1 },
    ]
    // Search across many seeds for one that lands on gema-doble, and confirm it always
    // targets 'ortografia' (the weakest by level then progress) regardless of seed.
    let found = false
    for (let i = 0; i < 500; i++) {
      const rng = createRng(`gema-doble-seed-${i}`)
      const result = rollSurprise(rng, gems, 'aira')
      if (result?.kind === 'gema-doble') {
        found = true
        expect(result.skillId).toBe('ortografia')
      }
    }
    expect(found).toBe(true)
  })

  it('gema-doble is never chosen when there are no gems to pick a weakest from (empty gems array)', () => {
    let gemaDobles = 0
    for (let i = 0; i < 500; i++) {
      const rng = createRng(`no-gems-seed-${i}`)
      const result = rollSurprise(rng, [], 'aira')
      if (result?.kind === 'gema-doble') gemaDobles++
    }
    expect(gemaDobles).toBe(0)
  })

  describe('challengeFrequency modulates the desafio rate', () => {
    const unlockedGems = () => gemsAtZero('aira').map((g) => (g.skillId === 'calculo' ? { ...g, level: 2 } : g))

    function countDesafios(challengeFrequency: number | undefined): number {
      const gems = unlockedGems()
      let desafios = 0
      for (let i = 0; i < 365; i++) {
        const dateISO = `2026-${String(1 + Math.floor(i / 30)).padStart(2, '0')}-${String(1 + (i % 28)).padStart(2, '0')}`
        const rng = createRng(`${dateISO}:aira:surprise`)
        const result = rollSurprise(rng, gems, 'aira', challengeFrequency)
        if (result?.kind === 'desafio') desafios++
      }
      return desafios
    }

    it('higher challengeFrequency yields more desafio days than lower', () => {
      expect(countDesafios(0.5)).toBeGreaterThan(countDesafios(0.1))
    })

    it('challengeFrequency 0 never rolls desafio, but total event rate stays ~30%', () => {
      const gems = unlockedGems()
      let hits = 0
      let desafios = 0
      for (let i = 0; i < 365; i++) {
        const dateISO = `2026-${String(1 + Math.floor(i / 30)).padStart(2, '0')}-${String(1 + (i % 28)).padStart(2, '0')}`
        const rng = createRng(`${dateISO}:aira:surprise`)
        const result = rollSurprise(rng, gems, 'aira', 0)
        if (result !== null) {
          hits++
          if (result.kind === 'desafio') desafios++
        }
      }
      expect(desafios).toBe(0)
      const rate = hits / 365
      expect(rate).toBeGreaterThan(0.25)
      expect(rate).toBeLessThan(0.35)
    })

    it('omitting challengeFrequency keeps the original equal-weight behavior (baseline 0.2 matches undefined)', () => {
      const gems = unlockedGems()
      let desafiosUndefined = 0
      let desafiosBaseline = 0
      for (let i = 0; i < 365; i++) {
        const dateISO = `2026-${String(1 + Math.floor(i / 30)).padStart(2, '0')}-${String(1 + (i % 28)).padStart(2, '0')}`
        if (rollSurprise(createRng(`${dateISO}:aira:surprise`), gems, 'aira')?.kind === 'desafio') desafiosUndefined++
        if (rollSurprise(createRng(`${dateISO}:aira:surprise`), gems, 'aira', 0.2)?.kind === 'desafio') desafiosBaseline++
      }
      expect(desafiosUndefined).toBe(desafiosBaseline)
    })
  })
})
