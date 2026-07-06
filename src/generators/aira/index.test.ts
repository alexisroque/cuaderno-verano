import { describe, expect, it } from 'vitest'
import './index'
import { getGenerator, listRegistered } from '../framework'

const EXPECTED_SUBSKILLS = [
  'mult-1cifra',
  'mult-2cifras',
  'tablas',
  'cajitas',
  'div-resto',
  'mental',
  'estimacion',
  'patrones-crecimiento',
  'romanos',
  '1-paso',
  '2-pasos',
  'dato-trampa',
  'dinero',
  'tiempo',
  'medida',
]

describe('aira generators index', () => {
  it('registers every Aira generator on import', () => {
    expect(new Set(listRegistered())).toEqual(new Set(EXPECTED_SUBSKILLS))
  })

  it('each registered generator is retrievable by its own subskill id', () => {
    for (const id of EXPECTED_SUBSKILLS) {
      const gen = getGenerator(id)
      expect(gen).toBeDefined()
      expect(gen?.subskill).toBe(id)
    }
  })
})
