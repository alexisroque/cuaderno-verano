import { useId } from 'react'
import { mapGeometry, type MapGeometry } from '../../content/maps'

export type RegionStatus = 'idle' | 'correct' | 'wrong'

interface SvgMapProps {
  mapId: string
  /** Region ids that are valid tap targets. When omitted, every region is tappable. */
  tappable?: string[]
  /** Region highlighted as the "question" (que-pais / capitals) — drawn in accent. */
  highlightRegionId?: string
  /** Per-region feedback tint after a tap, keyed by regionId. */
  status?: Record<string, RegionStatus>
  /** Show country name labels over each region (used in "explore"/reveal states). */
  showLabels?: boolean
  /** Called with the tapped region id. */
  onTapRegion?: (regionId: string) => void
  /** Accessible names per region (regionId → country name) for aria-labels. */
  regionNames?: Record<string, string>
}

const COLORS = {
  sea: '#dceff7',
  land: '#f3e9df', // faint context countries
  landStroke: '#e4d3c4',
  region: '#f7d9c4', // tappable country, resting
  regionStroke: '#d98363',
  highlight: '#ffd93d',
  highlightStroke: '#e0a800',
  correct: '#a7d9b0',
  correctStroke: '#3f7d55',
  wrong: '#f6b8ae',
  wrongStroke: '#c0392b',
  label: '#5b4a43',
}

/** Minimum on-screen area (px²) below which we add an enlarged invisible hit target. */
const SMALL_AREA = 900

function regionFill(id: string, highlightRegionId: string | undefined, status: RegionStatus): string {
  if (status === 'correct') return COLORS.correct
  if (status === 'wrong') return COLORS.wrong
  if (id === highlightRegionId) return COLORS.highlight
  return COLORS.region
}
function regionStroke(id: string, highlightRegionId: string | undefined, status: RegionStatus): string {
  if (status === 'correct') return COLORS.correctStroke
  if (status === 'wrong') return COLORS.wrongStroke
  if (id === highlightRegionId) return COLORS.highlightStroke
  return COLORS.regionStroke
}

/**
 * Renders one offline map (SE Asia / Europe / World) from committed, pre-projected
 * SVG paths. Faint context countries form the base; the named regions are the
 * kawaii-tinted, tappable countries. Each tappable region is a `<path role="button">`
 * with a country aria-label and keyboard focus; tiny countries (e.g. Singapur) get an
 * enlarged transparent circle over their centroid so small fingers can still hit them.
 *
 * Pure presentational: it holds no game state — the MapPlayer owns highlight,
 * per-region status and tap handling.
 */
export function SvgMap({
  mapId,
  tappable,
  highlightRegionId,
  status = {},
  showLabels = false,
  onTapRegion,
  regionNames = {},
}: SvgMapProps) {
  const geo: MapGeometry | undefined = mapGeometry(mapId)
  const clipId = useId()
  if (!geo) return null

  const canTap = (id: string) => !tappable || tappable.includes(id)

  return (
    <svg
      viewBox={`0 0 ${geo.width} ${geo.height}`}
      role="group"
      aria-label={`Mapa: ${mapId}`}
      preserveAspectRatio="xMidYMid meet"
      style={{
        width: '100%',
        height: 'auto',
        maxHeight: '100%',
        display: 'block',
        margin: '0 auto',
        touchAction: 'manipulation',
      }}
    >
      <defs>
        <clipPath id={clipId}>
          <rect x="0" y="0" width={geo.width} height={geo.height} rx="18" />
        </clipPath>
      </defs>

      <g clipPath={`url(#${clipId})`}>
        {/* Sea background */}
        <rect x="0" y="0" width={geo.width} height={geo.height} fill={COLORS.sea} />

        {/* Faint context landmass (neighbours) — not interactive. */}
        {geo.baseD && <path d={geo.baseD} fill={COLORS.land} stroke={COLORS.landStroke} strokeWidth={0.6} fillRule="evenodd" />}

        {/* Tappable / highlighted regions. */}
        {geo.regions.map((r) => {
          const st = status[r.regionId] ?? 'idle'
          const interactive = !!onTapRegion && canTap(r.regionId)
          const name = regionNames[r.regionId] ?? r.regionId
          return (
            <path
              key={r.regionId}
              id={`region-${r.regionId}`}
              data-region={r.regionId}
              d={r.d}
              fill={regionFill(r.regionId, highlightRegionId, st)}
              stroke={regionStroke(r.regionId, highlightRegionId, st)}
              strokeWidth={0.9}
              strokeLinejoin="round"
              fillRule="evenodd"
              role={interactive ? 'button' : undefined}
              tabIndex={interactive ? 0 : undefined}
              aria-label={interactive ? `Tocar ${name}` : name}
              onClick={interactive ? () => onTapRegion!(r.regionId) : undefined}
              onKeyDown={
                interactive
                  ? (e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault()
                        onTapRegion!(r.regionId)
                      }
                    }
                  : undefined
              }
              style={{
                cursor: interactive ? 'pointer' : 'default',
                transition: 'fill .15s ease-out',
                outline: 'none',
              }}
            />
          )
        })}

        {/* Enlarged invisible hit targets for tiny countries (e.g. Singapur). */}
        {onTapRegion &&
          geo.regions
            .filter((r) => canTap(r.regionId) && pathArea(r.d, geo) < SMALL_AREA)
            .map((r) => (
              <circle
                key={`hit-${r.regionId}`}
                cx={r.cx}
                cy={r.cy}
                r={16}
                fill="transparent"
                role="button"
                tabIndex={0}
                aria-label={`Tocar ${regionNames[r.regionId] ?? r.regionId}`}
                onClick={() => onTapRegion(r.regionId)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    onTapRegion(r.regionId)
                  }
                }}
                style={{ cursor: 'pointer', outline: 'none' }}
              />
            ))}

        {/* Labels (reveal / explore). */}
        {showLabels &&
          geo.regions.map((r) => (
            <text
              key={`lbl-${r.regionId}`}
              x={r.cx}
              y={r.cy}
              textAnchor="middle"
              dominantBaseline="middle"
              fontSize={geo.width > 600 ? 9 : 11}
              fontWeight={800}
              fill={COLORS.label}
              pointerEvents="none"
              style={{ paintOrder: 'stroke', stroke: '#fff', strokeWidth: 2.5, strokeLinejoin: 'round' }}
            >
              {regionNames[r.regionId] ?? ''}
            </text>
          ))}
      </g>
    </svg>
  )
}

/**
 * Rough bounding-box area of a path's coordinates, used only to decide whether a
 * region is "tiny" and needs an enlarged hit target. Cheap and geometry-free:
 * scans the numbers in the path data for their x/y extent.
 */
function pathArea(d: string, _geo: MapGeometry): number {
  const nums = d.match(/-?\d+(?:\.\d+)?/g)
  if (!nums || nums.length < 4) return 0
  let minX = Infinity
  let maxX = -Infinity
  let minY = Infinity
  let maxY = -Infinity
  for (let i = 0; i + 1 < nums.length; i += 2) {
    const x = Number.parseFloat(nums[i])
    const y = Number.parseFloat(nums[i + 1])
    if (x < minX) minX = x
    if (x > maxX) maxX = x
    if (y < minY) minY = y
    if (y > maxY) maxY = y
  }
  return (maxX - minX) * (maxY - minY)
}
