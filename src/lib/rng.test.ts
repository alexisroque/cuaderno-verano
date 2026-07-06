import { describe, expect, it } from 'vitest'
import { createRng } from './rng'

describe('createRng', () => {
  it('produces the same sequence across two instances with the same seed', () => {
    const a = createRng('2026-07-16:aira')
    const b = createRng('2026-07-16:aira')

    const seqA = Array.from({ length: 20 }, () => a.next())
    const seqB = Array.from({ length: 20 }, () => b.next())

    expect(seqA).toEqual(seqB)
  })

  it('produces different sequences for different seeds', () => {
    const a = createRng('2026-07-16:aira')
    const b = createRng('2026-07-16:leo')

    const seqA = Array.from({ length: 5 }, () => a.next())
    const seqB = Array.from({ length: 5 }, () => b.next())

    expect(seqA).not.toEqual(seqB)
  })

  it('keeps int(min, max) within inclusive bounds over many draws', () => {
    const rng = createRng('bounds-check')
    for (let i = 0; i < 1000; i++) {
      const value = rng.int(1, 10)
      expect(value).toBeGreaterThanOrEqual(1)
      expect(value).toBeLessThanOrEqual(10)
      expect(Number.isInteger(value)).toBe(true)
    }
  })

  it('pick is deterministic for a given seed', () => {
    const items = ['a', 'b', 'c', 'd', 'e']
    const a = createRng('pick-seed')
    const b = createRng('pick-seed')

    const picksA = Array.from({ length: 10 }, () => a.pick(items))
    const picksB = Array.from({ length: 10 }, () => b.pick(items))

    expect(picksA).toEqual(picksB)
    for (const picked of picksA) {
      expect(items).toContain(picked)
    }
  })

  it('shuffle returns a deterministic permutation without mutating the input', () => {
    const items = [1, 2, 3, 4, 5, 6, 7, 8]
    const original = [...items]

    const a = createRng('shuffle-seed')
    const b = createRng('shuffle-seed')

    const shuffledA = a.shuffle(items)
    const shuffledB = b.shuffle(items)

    expect(items).toEqual(original)
    expect(shuffledA).toEqual(shuffledB)
    expect([...shuffledA].sort()).toEqual([...original].sort())
  })

  it('chance(0) is always false and chance(1) is always true', () => {
    const rng = createRng('chance-seed')

    for (let i = 0; i < 100; i++) {
      expect(rng.chance(0)).toBe(false)
    }
    for (let i = 0; i < 100; i++) {
      expect(rng.chance(1)).toBe(true)
    }
  })

  it('works when methods are destructured (no this-binding required)', () => {
    const { pick, shuffle, int } = createRng('destructure-seed')
    const items = ['a', 'b', 'c']

    expect(items).toContain(pick(items))
    expect([...shuffle(items)].sort()).toEqual([...items].sort())
    expect(Number.isInteger(int(1, 5))).toBe(true)
  })

  it('pick throws on an empty array', () => {
    const rng = createRng('empty-pick-seed')
    expect(() => rng.pick([])).toThrow('pick from empty array')
  })
})
