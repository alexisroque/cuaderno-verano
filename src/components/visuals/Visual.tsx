import type { VisualSpec } from '../../types/exercise'
import { RectangleModel } from './RectangleModel'
import { NumberLine } from './NumberLine'
import { BoxesVisual } from './BoxesVisual'
import { DotGrid } from './DotGrid'
import { EmojiCount, CompareGroups } from './EmojiCount'
import { GridFigure, SceneVisual } from './GridFigure'
import { StrokePreview } from './StrokePreview'

/**
 * Renders any {@link VisualSpec} by kind. `none` renders nothing. `mirror-pair`
 * is intentionally NOT rendered here as a bare glyph list — it's an answer
 * choice set (see leo/tracing.ts) and is rendered by the espejo player from its
 * choices, never inline as a prompt visual, so leaking the mirrored option is
 * impossible. If one reaches here it renders both options side by side (for a
 * strategy/solution reveal, where showing the answer is fine).
 */
export function Visual({ spec }: { spec?: VisualSpec }) {
  if (!spec || spec.kind === 'none') return null

  switch (spec.kind) {
    case 'rectangle-model':
      return <RectangleModel rows={spec.rows} colsSplit={spec.colsSplit} />
    case 'number-line':
      return <NumberLine from={spec.from} to={spec.to} jumps={spec.jumps} />
    case 'boxes':
      return <BoxesVisual groups={spec.groups} perGroup={spec.perGroup} remainder={spec.remainder} />
    case 'dot-grid':
      return <DotGrid n={spec.n} />
    case 'emoji-count':
      return <EmojiCount emoji={spec.emoji} count={spec.count} rows={spec.rows} />
    case 'compare-groups':
      return <CompareGroups left={spec.left} right={spec.right} />
    case 'grid-figure':
      return <GridFigure cells={spec.cells} />
    case 'scene':
      return <SceneVisual actors={spec.actors} />
    case 'mirror-pair':
      return (
        <div className="flex gap-4">
          {spec.options.map((o) => (
            <StrokePreview key={o.choiceId} strokes={o.strokes} />
          ))}
        </div>
      )
  }
}
