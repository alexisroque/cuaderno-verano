/**
 * Build-time generator for the offline geography maps.
 *
 * Reads a Natural Earth (world-atlas 50m) TopoJSON, projects EXACTLY the
 * countries/regions each map needs with a projection fitted to that region,
 * and emits a static `src/content/maps.generated.ts` file of pre-projected SVG
 * `<path>` data. d3-geo / topojson-client are therefore DEV-ONLY: nothing is
 * fetched or projected at runtime, the app just renders the committed paths.
 *
 * Run: `npx tsx scripts/gen-maps.ts` (also wired as `npm run gen:maps`).
 * The source TopoJSON is cached at scripts/.ne-countries-50m.json.
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { geoMercator, geoNaturalEarth1, geoPath, type GeoProjection } from 'd3-geo'
import { feature } from 'topojson-client'
import type { Feature, FeatureCollection, Geometry } from 'geojson'

const SRC_50 = 'scripts/.ne-countries-50m.json'
const SRC_110 = 'scripts/.ne-countries-110m.json'
const OUT = 'src/content/maps.generated.ts'

for (const s of [SRC_50, SRC_110]) {
  if (!existsSync(s)) {
    console.error(`Missing ${s}. Download world-atlas first:\n  curl -s -o ${SRC_50} https://cdn.jsdelivr.net/npm/world-atlas@2/countries-50m.json\n  curl -s -o ${SRC_110} https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json`)
    process.exit(1)
  }
}

function loadWorld(src: string): FeatureCollection<Geometry, { name: string }> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const topo = JSON.parse(readFileSync(src, 'utf8')) as any
  return feature(topo, topo.objects.countries) as unknown as FeatureCollection<Geometry, { name: string }>
}

// 50m: detailed geometry for the named/highlighted regions (small islands like
// Singapore need it). 110m: coarse geometry for context/base layers and the
// whole world map, keeping the bundle small.
const world = loadWorld(SRC_50)
const worldCoarse = loadWorld(SRC_110)

/** Round path coords to `dp` decimals to keep the bundle small (viewBox is fixed per map). */
function quantize(d: string, dp = 1): string {
  return d.replace(/-?\d+\.\d+/g, (n) => {
    const r = Number.parseFloat(n).toFixed(dp)
    return r.replace(/\.?0+$/, '') || '0'
  })
}

interface RegionDef {
  /** Stable region id used as the SVG path id and referenced from geography.json. */
  regionId: string
  /** Natural Earth country name(s) whose geometry make up this region. */
  neNames: string[]
}

interface MapDef {
  mapId: string
  width: number
  height: number
  projection: (features: Feature[], w: number, h: number, pad: number) => GeoProjection
  pad: number
  /** Named, tappable regions (countries) we care about. */
  regions: RegionDef[]
  /** Context-only countries drawn faintly (not tappable), for recognizability. */
  context: string[]
}

function mercatorFit(features: Feature[], w: number, h: number, pad: number): GeoProjection {
  const fc: FeatureCollection = { type: 'FeatureCollection', features }
  return geoMercator().fitExtent([[pad, pad], [w - pad, h - pad]], fc)
}
function naturalEarthFit(features: Feature[], w: number, h: number, pad: number): GeoProjection {
  const fc: FeatureCollection = { type: 'FeatureCollection', features }
  return geoNaturalEarth1().fitExtent([[pad, pad], [w - pad, h - pad]], fc)
}

const MAPS: MapDef[] = [
  {
    mapId: 'sudeste-asiatico',
    width: 480,
    height: 560,
    projection: mercatorFit,
    pad: 14,
    regions: [
      { regionId: 'singapur', neNames: ['Singapore'] },
      { regionId: 'malasia', neNames: ['Malaysia'] },
      { regionId: 'indonesia', neNames: ['Indonesia'] },
      { regionId: 'tailandia', neNames: ['Thailand'] },
      { regionId: 'vietnam', neNames: ['Vietnam'] },
      { regionId: 'filipinas', neNames: ['Philippines'] },
      { regionId: 'camboya', neNames: ['Cambodia'] },
      { regionId: 'laos', neNames: ['Laos'] },
      { regionId: 'myanmar', neNames: ['Myanmar'] },
      { regionId: 'brunei', neNames: ['Brunei'] },
    ],
    context: ['China', 'India', 'Bangladesh', 'Papua New Guinea', 'Australia', 'Taiwan', 'Sri Lanka'],
  },
  {
    mapId: 'europa',
    width: 520,
    height: 560,
    projection: mercatorFit,
    pad: 12,
    regions: [
      { regionId: 'espana', neNames: ['Spain'] },
      { regionId: 'francia', neNames: ['France'] },
      { regionId: 'italia', neNames: ['Italy'] },
      { regionId: 'portugal', neNames: ['Portugal'] },
      { regionId: 'alemania', neNames: ['Germany'] },
      { regionId: 'reino-unido', neNames: ['United Kingdom'] },
      { regionId: 'grecia', neNames: ['Greece'] },
      { regionId: 'irlanda', neNames: ['Ireland'] },
      { regionId: 'paises-bajos', neNames: ['Netherlands'] },
      { regionId: 'belgica', neNames: ['Belgium'] },
      { regionId: 'suiza', neNames: ['Switzerland'] },
      { regionId: 'austria', neNames: ['Austria'] },
      { regionId: 'polonia', neNames: ['Poland'] },
      { regionId: 'suecia', neNames: ['Sweden'] },
      { regionId: 'noruega', neNames: ['Norway'] },
      { regionId: 'dinamarca', neNames: ['Denmark'] },
    ],
    // Western/Central Europe context only. Far-eastern countries (Russia,
    // Ukraine, Turkey, the Baltics) are deliberately excluded so the projection
    // frames the countries the child actually taps at a readable size, instead
    // of zooming out to fit the whole continent.
    context: [
      'Morocco', 'Algeria', 'Tunisia', 'Finland',
      'Czechia', 'Slovakia', 'Hungary', 'Romania', 'Serbia', 'Croatia', 'Bosnia and Herz.',
      'Slovenia', 'Luxembourg',
    ],
  },
  {
    mapId: 'mundo',
    width: 720,
    height: 380,
    projection: naturalEarthFit,
    pad: 4,
    regions: [
      { regionId: 'espana-m', neNames: ['Spain'] },
      { regionId: 'brasil', neNames: ['Brazil'] },
      { regionId: 'eeuu', neNames: ['United States of America'] },
      { regionId: 'canada', neNames: ['Canada'] },
      { regionId: 'china', neNames: ['China'] },
      { regionId: 'india', neNames: ['India'] },
      { regionId: 'australia', neNames: ['Australia'] },
      { regionId: 'egipto', neNames: ['Egypt'] },
      { regionId: 'rusia', neNames: ['Russia'] },
      { regionId: 'argentina', neNames: ['Argentina'] },
      { regionId: 'japon', neNames: ['Japan'] },
      { regionId: 'sudafrica', neNames: ['South Africa'] },
      { regionId: 'indonesia-m', neNames: ['Indonesia'] },
    ],
    context: [], // world map draws every country as its base layer
  },
]

function findIn(fc: FeatureCollection<Geometry, { name: string }>, names: string[]): Feature[] {
  const out: Feature[] = []
  for (const n of names) {
    const f = fc.features.find((x) => x.properties?.name === n)
    if (!f) {
      console.warn(`WARN: country not found: "${n}"`)
      continue
    }
    out.push(f as Feature)
  }
  return out
}
/** Detailed geometry (50m) for highlighted regions. */
const findFeatures = (names: string[]) => findIn(world, names)
/** Coarse geometry (110m) for context/base layers; falls back to 50m for tiny nations. */
const findCoarse = (names: string[]): Feature[] =>
  names.map((n) => {
    const c = worldCoarse.features.find((x) => x.properties?.name === n)
    if (c) return c as Feature
    const d = world.features.find((x) => x.properties?.name === n)
    if (!d) console.warn(`WARN: country not found (coarse+detail): "${n}"`)
    return d as Feature
  }).filter(Boolean)

interface GenRegion {
  regionId: string
  d: string
  /** Projected label anchor (path centroid) for optional map labels. */
  cx: number
  cy: number
}
interface GenMap {
  mapId: string
  width: number
  height: number
  /** Faint base layer: all context countries as one path. */
  baseD: string
  regions: GenRegion[]
}

const generated: GenMap[] = []

for (const map of MAPS) {
  const isWorld = map.mapId === 'mundo'
  // The world map uses coarse (110m) geometry throughout to stay small; the
  // regional maps use detailed (50m) geometry for the tappable countries and
  // coarse geometry for the faint context landmass.
  const pickRegion = isWorld ? findCoarse : findFeatures

  // Features used to FIT the projection: named regions + context, so the camera
  // frames the whole scene, not just the highlighted countries.
  const regionFeatures = map.regions.flatMap((r) => pickRegion(r.neNames))
  const contextNames = isWorld
    ? worldCoarse.features.map((f) => f.properties!.name).filter((n) => !map.regions.some((r) => r.neNames.includes(n)))
    : map.context
  const contextFeatures = findCoarse(contextNames)
  const fitFeatures = isWorld ? worldCoarse.features.slice() : [...regionFeatures, ...contextFeatures]

  const projection = map.projection(fitFeatures, map.width, map.height, map.pad)
  const path = geoPath(projection)

  const regions: GenRegion[] = map.regions.map((r) => {
    const fc: FeatureCollection = { type: 'FeatureCollection', features: pickRegion(r.neNames) }
    const d = quantize(path(fc) ?? '')
    const [cx, cy] = path.centroid(fc)
    return { regionId: r.regionId, d, cx: Math.round(cx), cy: Math.round(cy) }
  })

  const baseFc: FeatureCollection = { type: 'FeatureCollection', features: contextFeatures }
  const baseD = quantize(path(baseFc) ?? '')

  generated.push({ mapId: map.mapId, width: map.width, height: map.height, baseD, regions })
}

const header = `/**
 * AUTO-GENERATED by scripts/gen-maps.ts — DO NOT EDIT BY HAND.
 * Pre-projected SVG path data for the offline geography maps. Regenerate with
 * \`npm run gen:maps\`. Coordinates are already projected into each map's fixed
 * viewBox (0 0 width height); the renderer only draws these paths — no d3-geo,
 * no GeoJSON and no network at runtime.
 */

export interface MapRegionGeometry {
  /** Region id, matching a geography.json country's \`regionId\`. */
  regionId: string
  /** Pre-projected SVG path data (fill-rule: evenodd for multi-polygons). */
  d: string
  /** Label anchor (projected path centroid). */
  cx: number
  cy: number
}

export interface MapGeometry {
  mapId: string
  width: number
  height: number
  /** Faint, non-interactive context landmass (neighbouring countries). */
  baseD: string
  regions: MapRegionGeometry[]
}

export const MAP_GEOMETRIES: Record<string, MapGeometry> = ${JSON.stringify(
  Object.fromEntries(generated.map((g) => [g.mapId, g])),
  null,
  2,
)}
`

writeFileSync(OUT, header)
const bytes = Buffer.byteLength(header)
console.log(`Wrote ${OUT} (${(bytes / 1024).toFixed(1)} KB) with maps: ${generated.map((g) => `${g.mapId}[${g.regions.length}]`).join(', ')}`)
