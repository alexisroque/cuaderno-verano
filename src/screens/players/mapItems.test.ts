import { describe, expect, it } from 'vitest'
import { createRng } from '../../lib/rng'
import {
  buildMapRound,
  capitalItem,
  countriesOnMap,
  dondeEstaItem,
  banderaItem,
  isCorrectTap,
  quePaisItem,
} from './mapItems'
import type { GeographyItem } from '../../content/schemas'

const SEA: GeographyItem[] = [
  { id: 'my', name: 'Malasia', capital: 'Kuala Lumpur', flag: '🇲🇾', continent: 'Asia', mapId: 'sudeste-asiatico', regionId: 'malasia' },
  { id: 'th', name: 'Tailandia', capital: 'Bangkok', flag: '🇹🇭', continent: 'Asia', mapId: 'sudeste-asiatico', regionId: 'tailandia' },
  { id: 'vn', name: 'Vietnam', capital: 'Hanói', flag: '🇻🇳', continent: 'Asia', mapId: 'sudeste-asiatico', regionId: 'vietnam' },
  { id: 'ph', name: 'Filipinas', capital: 'Manila', flag: '🇵🇭', continent: 'Asia', mapId: 'sudeste-asiatico', regionId: 'filipinas' },
]
const EU: GeographyItem[] = [
  { id: 'es', name: 'España', capital: 'Madrid', flag: '🇪🇸', continent: 'Europa', mapId: 'europa', regionId: 'espana' },
]
const ALL = [...SEA, ...EU]

describe('countriesOnMap', () => {
  it('returns only the countries on the given map', () => {
    expect(countriesOnMap(ALL, 'sudeste-asiatico')).toHaveLength(4)
    expect(countriesOnMap(ALL, 'europa').map((c) => c.id)).toEqual(['es'])
    expect(countriesOnMap(ALL, 'nope')).toEqual([])
  })
})

describe('dondeEstaItem / isCorrectTap', () => {
  const item = dondeEstaItem(SEA[0])

  it('names the country in the prompt and is a tap exercise', () => {
    expect(item.prompt).toBe('Toca Malasia en el mapa')
    expect(item.mode).toBe('tap')
    expect(item.subskill).toBe('donde-esta')
  })

  it('is correct only when the tapped region matches the target', () => {
    expect(isCorrectTap(item, 'malasia')).toBe(true)
    expect(isCorrectTap(item, 'tailandia')).toBe(false)
  })
})

describe('quePaisItem', () => {
  it('highlights the target region and offers its name among 4 choices', () => {
    const item = quePaisItem(createRng('s'), SEA[0], SEA)
    expect(item.mode).toBe('pick')
    expect(item.highlightRegionId).toBe('malasia')
    expect(item.choices).toHaveLength(4)
    expect(item.choices![item.correctIdx!]).toBe('Malasia')
    expect(item.subskill).toBe('donde-esta')
  })

  it('is deterministic for the same seed', () => {
    expect(quePaisItem(createRng('x'), SEA[1], SEA)).toEqual(quePaisItem(createRng('x'), SEA[1], SEA))
  })
})

describe('capitalItem', () => {
  it('asks the capital and the correct choice is the true capital', () => {
    const item = capitalItem(createRng('s'), SEA[1], SEA)
    expect(item.prompt).toContain('Tailandia')
    expect(item.choices![item.correctIdx!]).toBe('Bangkok')
    expect(new Set(item.choices).size).toBe(item.choices!.length)
    expect(item.subskill).toBe('capitales')
  })
})

describe('banderaItem', () => {
  it('shows the flag in the prompt and asks the country', () => {
    const item = banderaItem(createRng('s'), SEA[3], SEA)
    expect(item.prompt).toContain('🇵🇭')
    expect(item.choices![item.correctIdx!]).toBe('Filipinas')
    expect(item.subskill).toBe('banderas')
  })
})

describe('buildMapRound', () => {
  it('builds a full round of the requested size for a map', () => {
    const round = buildMapRound(createRng('round'), ALL, 'sudeste-asiatico', 5)
    expect(round).toHaveLength(5)
    expect(round.every((i) => i.mapId === 'sudeste-asiatico')).toBe(true)
  })

  it('exercises multiple subskills across a round', () => {
    const round = buildMapRound(createRng('mix'), ALL, 'sudeste-asiatico', 5)
    const subskills = new Set(round.map((i) => i.subskill))
    expect(subskills.size).toBeGreaterThan(1)
  })

  it('every pick item has a valid 4-choice question; every tap item targets a real country', () => {
    const round = buildMapRound(createRng('valid'), ALL, 'sudeste-asiatico', 8)
    for (const item of round) {
      if (item.mode === 'pick') {
        expect(item.choices).toHaveLength(4)
        expect(item.correctIdx).toBeGreaterThanOrEqual(0)
        expect(item.correctIdx).toBeLessThan(4)
      } else {
        expect(SEA.some((c) => c.regionId === item.target.regionId)).toBe(true)
      }
    }
  })

  it('is deterministic for the same seed', () => {
    const a = buildMapRound(createRng('same'), ALL, 'europa', 5)
    const b = buildMapRound(createRng('same'), ALL, 'europa', 5)
    expect(a).toEqual(b)
  })

  it('returns an empty round for an unknown map', () => {
    expect(buildMapRound(createRng('s'), ALL, 'atlantis', 5)).toEqual([])
  })
})
