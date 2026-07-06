import { describe, expect, it } from 'vitest'
import './index'
import { getGenerator, listRegistered } from '../framework'

describe('aira generators index', () => {
  it('registers mult-1cifra, mult-2cifras, tablas, and cajitas on import', () => {
    expect(new Set(listRegistered())).toEqual(new Set(['mult-1cifra', 'mult-2cifras', 'tablas', 'cajitas']))
  })

  it('each registered generator is retrievable by its own subskill id', () => {
    for (const id of ['mult-1cifra', 'mult-2cifras', 'tablas', 'cajitas']) {
      const gen = getGenerator(id)
      expect(gen).toBeDefined()
      expect(gen?.subskill).toBe(id)
    }
  })
})
