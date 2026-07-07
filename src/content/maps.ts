import { MAP_GEOMETRIES, type MapGeometry, type MapRegionGeometry } from './maps.generated'
import type { GeographyItem } from './schemas'

export { MAP_GEOMETRIES }
export type { MapGeometry, MapRegionGeometry }

/** All map ids that have committed geometry, in a stable display order. */
export const MAP_IDS = ['sudeste-asiatico', 'europa', 'mundo'] as const
export type MapId = (typeof MAP_IDS)[number]

/** Human-facing metadata for each map (title, emoji, one-line hint). */
export const MAP_META: Record<string, { title: string; emoji: string; blurb: string }> = {
  'sudeste-asiatico': { title: 'Sudeste asiático', emoji: '🌴', blurb: 'Los países de vuestro viaje' },
  europa: { title: 'Europa', emoji: '🏰', blurb: 'Nuestro continente' },
  mundo: { title: 'El mundo', emoji: '🌍', blurb: 'Continentes y países grandes' },
}

/** Returns the geometry for a map id, or undefined if unknown. */
export function mapGeometry(mapId: string): MapGeometry | undefined {
  return MAP_GEOMETRIES[mapId]
}

/** The region geometry for a `(mapId, regionId)` pair, or undefined. */
export function regionGeometry(mapId: string, regionId: string): MapRegionGeometry | undefined {
  return MAP_GEOMETRIES[mapId]?.regions.find((r) => r.regionId === regionId)
}

/**
 * Asserts every geography item references a real region path on a real map.
 * Called once at content-load time so a content edit that names a region the
 * generated geometry doesn't have fails loudly instead of rendering a country
 * with no tappable shape. Returns the items unchanged for chaining.
 */
export function assertGeographyRegions(items: GeographyItem[]): GeographyItem[] {
  for (const item of items) {
    const map = MAP_GEOMETRIES[item.mapId]
    if (!map) {
      throw new Error(`geography "${item.id}": unknown mapId "${item.mapId}" (have: ${MAP_IDS.join(', ')})`)
    }
    if (!map.regions.some((r) => r.regionId === item.regionId)) {
      throw new Error(`geography "${item.id}": region "${item.regionId}" not found on map "${item.mapId}"`)
    }
  }
  return items
}
