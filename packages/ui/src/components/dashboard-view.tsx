import { useId, type CSSProperties, type ReactNode, type Ref } from 'react'
import { styled, Text, View } from '@tamagui/core'
import { Card } from './card'
import { EmptyState } from './empty-state'
import { warnMissingName, type ViewState } from '../internal/data-view'

// ============================================================================
// DashboardView — the CODEC Dashboard shell (fe-codec-dashboard S1).
// "A grid of integration blocks" — the 2nd archetype shell (decomposition.md:30
// §1.2). COMPOSES blocks the consumer supplies via a `renderBlock` render-prop;
// it is NOT a block renderer (the 11 `standalone` block widgets ship elsewhere).
// Presentational, state-as-prop (BR-2); @vida/ui is Tamagui-only (no @vida/core/
// @vida/types), so `CellSize` is a LOCAL union and block state reuses the
// intra-package `ViewState` canon (the gallery-view precedent).
// Spec: docs/specs/components/ui-2-platform-views/dashboard-view.md.
//
// NON-GENERIC: the shell holds no block data (`renderBlock` owns each block's
// body), so there is no <T> to erase → a plain component + React-19 ref-as-prop.
//
// TERMINAL-STATE OWNERSHIP (the pinned seam-contract rule): a block is consumer
// CONTENT, not a self-stated component, so the SHELL owns the generic loading/
// empty/error states uniformly and calls `renderBlock` only for `success`.
// Per-block `blockLoading`/`blockEmpty`/`blockError` are optional overrides.
// This EXTENDS Collection's shell-owned-empty to all three generic states.
// ============================================================================

/** The cell span — a LOCAL intent-size union (no @vida/core/@vida/types dep). Resolved to an RN-safe flex cell by SPAN. */
export type CellSize = 'sm' | 'md' | 'lg' | 'full'

/** A placed block descriptor. `state` reuses the intra-package `ViewState` canon (≡ the renderer-state union). */
export interface DashboardBlock {
  /** Stable id (a block_instances id). REQUIRED — the React key + a11y hooks. */
  id: string
  /** The cell header label. */
  title: string
  /** The span (EC-1/EC-6) — the app resolves it from the placement (a block_instances.config attr) + passes it. */
  size: CellSize
  /** This block's OWN terminal state (EC-3) — the app derives via the 8-state machine + passes it (BR-2). */
  state: ViewState
  /** The ⋯ block-action SLOT (a Menu trigger etc.) — the shell renders the slot in the header, not a menu. */
  action?: ReactNode
}

type Density = 'compact' | 'default' | 'spacious'

export interface DashboardViewProps {
  /** The dashboard name — a string so it can name the region (aria-labelledby) + render as the heading. */
  title: string
  /** The placed blocks (order = grid order). Empty → the teaching empty-dashboard state (EC-5). */
  blocks: readonly DashboardBlock[]
  /** Renders ONE block's SUCCESS body (the shell owns loading/empty/error) — keeps the shell agnostic of the 11 block
   *  shapes AND free of any @vida/core type. */
  renderBlock: (block: DashboardBlock) => ReactNode
  /** OPTIONAL empty-DASHBOARD override (default = a teaching-invitation EmptyState). */
  empty?: ReactNode
  /** OPTIONAL add-affordance rendered inside the empty-dashboard state. */
  emptyAction?: ReactNode
  /** OPTIONAL per-block skeleton override (default = generic skeleton rows). A chart/timeline block may want its own. */
  blockLoading?: (block: DashboardBlock) => ReactNode
  /** OPTIONAL per-block empty override (default = a compact teaching message). */
  blockEmpty?: (block: DashboardBlock) => ReactNode
  /** OPTIONAL per-block error override (default = a calm role="status" message). */
  blockError?: (block: DashboardBlock) => ReactNode
  /** Grid gap. Default 'default'. */
  density?: Density
  /** Accessible name for the region (defaults to the visible title via aria-labelledby). */
  'aria-label'?: string
  'aria-labelledby'?: string
  /** React-19 ref-as-prop → the region element. */
  ref?: Ref<HTMLDivElement>
}

// ── the span → RN-safe flex cell (the gallery-view weightStyle precedent) ───────────────────────────────
// `flexShrink:1` EXPLICIT (Tamagui/RNW defaults it to 0 → a `flexBasis > viewport` cell can't shrink = 375 overflow).
// `minWidth` = a mobile-safe FLOOR (all < 375 content width, EC-8). `maxWidth` = the CAP that stops a lone non-`full`
// cell growing to full width (EC-6); `full` has no cap → it fills the row. Layout numbers, not tokens (the gallery/tabs
// style={} precedent).
const SPAN: Record<CellSize, CSSProperties> = {
  sm: { flexGrow: 1, flexShrink: 1, flexBasis: '25%', minWidth: 200, maxWidth: 360 },
  md: { flexGrow: 2, flexShrink: 1, flexBasis: '42%', minWidth: 280, maxWidth: 520 },
  lg: { flexGrow: 3, flexShrink: 1, flexBasis: '60%', minWidth: 320, maxWidth: 760 },
  full: { flexGrow: 4, flexShrink: 1, flexBasis: '100%', minWidth: 280 },
}

// ── styled hosts (unnamed → base theme; no sub-theme — the LV-3 convention) ──────────────────────────────
const DashboardRoot = styled(View, { flexDirection: 'column', gap: '$12', width: '100%' })
const Grid = styled(View, {
  flexDirection: 'row',
  flexWrap: 'wrap',
  variants: {
    // Density = the grid GAP via the $space scale (the gallery/V1/Card scale).
    density: {
      compact: { gap: '$8' },
      default: { gap: '$12' },
      spacious: { gap: '$24' },
    },
  } as const,
  defaultVariants: { density: 'default' },
})
const Cell = styled(View, {})
const SkeletonRow = styled(View, {
  height: 14,
  borderRadius: '$sm',
  backgroundColor: '$colorSurfaceSecondary',
  marginBottom: 8,
})

// The per-cell header — block title + the ⋯ action slot (EC-2).
function CellHeader({ title, action }: { title: string; action?: ReactNode }) {
  return (
    <View flexDirection="row" alignItems="center" justifyContent="space-between" width="100%" gap="$8">
      <Text fontFamily="$display" fontSize="$subheading" color="$colorTextPrimary">
        {title}
      </Text>
      {action}
    </View>
  )
}

// The shell-owned generic terminal states (EC-3) — overridable per block.
function BlockBody({
  block,
  renderBlock,
  blockLoading,
  blockEmpty,
  blockError,
}: Pick<DashboardViewProps, 'renderBlock' | 'blockLoading' | 'blockEmpty' | 'blockError'> & { block: DashboardBlock }) {
  switch (block.state) {
    case 'loading':
      return (
        blockLoading?.(block) ?? (
          <View aria-busy="true">
            <SkeletonRow width="80%" />
            <SkeletonRow width="60%" />
            <SkeletonRow width="70%" />
          </View>
        )
      )
    case 'empty':
      return (
        blockEmpty?.(block) ?? (
          <Text fontSize="$small" color="$colorTextMuted">
            Nothing here yet.
          </Text>
        )
      )
    case 'error':
      return (
        blockError?.(block) ?? (
          // Calm, polite error (the internal/data-view `Message` precedent: muted text + role="status", NOT the danger
          // red — the role carries the semantics, and $colorSignalDanger fails AA 4.5 in light, the known ds-2 M4 fix).
          <View role="status">
            <Text fontSize="$small" color="$colorTextMuted">
              Couldn’t load this block.
            </Text>
          </View>
        )
      )
    case 'success':
      return <>{renderBlock(block)}</>
  }
}

// A plain component — non-generic (the shell holds no block data). React 19 spreads `ref` as a prop (no forwardRef).
export function DashboardView({
  title,
  blocks,
  renderBlock,
  empty,
  emptyAction,
  blockLoading,
  blockEmpty,
  blockError,
  density = 'default',
  'aria-label': ariaLabel,
  'aria-labelledby': ariaLabelledby,
  ref,
}: DashboardViewProps) {
  // The visible heading names the region when no explicit name is given (the data-view accessible-name convention).
  const titleId = useId()
  const resolvedLabelledby = ariaLabelledby ?? (ariaLabel == null ? titleId : undefined)
  if (process.env.NODE_ENV !== 'production') warnMissingName('DashboardView', ariaLabel, resolvedLabelledby)

  return (
    <DashboardRoot ref={ref} role="region" aria-label={ariaLabel} aria-labelledby={resolvedLabelledby}>
      <Text id={titleId} fontFamily="$display" fontSize="$heading" color="$colorTextPrimary">
        {title}
      </Text>

      {blocks.length === 0 ? (
        // Empty dashboard → a teaching invitation, never a blank (EC-5). Consumer override wins.
        (empty ?? (
          <EmptyState title="Your dashboard is empty">
            <Text fontSize="$body" color="$colorTextMuted">
              Add blocks to see your day at a glance.
            </Text>
            {emptyAction}
          </EmptyState>
        ))
      ) : (
        <Grid density={density}>
          {blocks.map((block) => (
            // className + data-size = the Visual-Gate / test measurement hook (the calendar-view `.vida-cal-*` precedent).
            <Cell key={block.id} className="vida-dash-cell" data-size={block.size} style={SPAN[block.size]}>
              <Card header={<CellHeader title={block.title} action={block.action} />} headerDivider padding="default">
                <BlockBody
                  block={block}
                  renderBlock={renderBlock}
                  blockLoading={blockLoading}
                  blockEmpty={blockEmpty}
                  blockError={blockError}
                />
              </Card>
            </Cell>
          ))}
        </Grid>
      )}
    </DashboardRoot>
  )
}
