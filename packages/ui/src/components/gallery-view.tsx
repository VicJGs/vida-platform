import { useMemo, type CSSProperties, type ReactElement, type ReactNode, type Ref } from 'react'
import { styled, View } from '@tamagui/core'
import { type ViewState, Message, resolveDataViewState } from '../internal/data-view'

// UI-2 · V2 · gallery-view — the renderer for the `gallery` VIEW_LAYOUT. Implements
// docs/specs/components/ui-2-platform-views/v2-gallery-view.md. **V1's data-view spine with a responsive GRID**
// instead of a vertical stack — same generics, same four rendered terminal states, same role="list"/listitem
// semantics, same dev-warns (reuses `ViewState` from ./list-view — intra-package, no second copy).
// - Grid (GV-2): flexDirection row + flexWrap wrap; each tile flexGrow:1 + flexBasis/minWidth:minTileWidth (the
//   enforced FLOOR — flexBasis alone would collapse under flexShrink) + maxWidth:minTileWidth*2. Wraps to a single
//   column at 375 with the default 200 (gallery ≈ list on mobile — expected). Sizing via style={} per tabs precedent.
// - Cover-field degradation is the VIEW ENGINE's (ADR-007:62-64), not this renderer — gallery-view lays out whatever
//   renderItem returns. No sub-theme, no motion, no new dep (base tokens on an unnamed host).
// NOTE: the terminal-state switch + Message + dev-guards mirror list-view (2nd use). Extract a shared
// internal/data-view helper at the 3rd consumer (V3 timeline) — rule of three, under its own gate.

type Density = 'compact' | 'default' | 'spacious'

export interface GalleryViewProps<T> {
  /** The tiles. Empty + state='success' self-heals to the empty render + dev-warns. */
  items: readonly T[]
  /** Renders one tile's CONTENT (gallery-view owns the role="listitem" grid cell). Typically a Card with a cover. */
  renderItem: (item: T, index: number) => ReactNode
  /** Stable key per tile (a UUIDv7 id). REQUIRED — never an index. */
  getKey: (item: T, index: number) => string
  /** Resolved state (the app derives via deriveTerminalState + passes it — BR-2). Default 'success'. */
  state?: ViewState
  /** Slot for the empty state (else a default). */
  empty?: ReactNode
  /** Slot for the error state (else a default). */
  error?: ReactNode
  /** Skeleton tile count while loading. Default 6. */
  loadingCount?: number
  /** Min tile width (px) — the enforced FLOOR (minWidth + flexBasis); tiles grow to [min, 2·min] + wrap. Default 200. */
  minTileWidth?: number
  /** Grid gap. Default 'default'. */
  density?: Density
  /** React 19 ref-as-prop → the container element. */
  ref?: Ref<HTMLDivElement>
  /** Accessible name for the grid (required in list/loading states — dev-warns if absent). */
  'aria-label'?: string
  'aria-labelledby'?: string
}

// ── styled hosts (unnamed → base theme; no sub-theme) ───────────────────────────────────────────────────
const GalleryRoot = styled(View, {
  flexDirection: 'row',
  flexWrap: 'wrap',
  variants: {
    // Density = the grid GAP via the $space scale (the V1/Card scale).
    density: {
      compact: { gap: '$8' },
      default: { gap: '$12' },
      spacious: { gap: '$24' },
    },
  } as const,
  defaultVariants: { density: 'default' },
})

// Grid cell — sizing is per-instance (depends on minTileWidth) → applied via style={tileStyle} (tabs precedent).
const GalleryTile = styled(View, {})

// A static placeholder tile — aspect-locked (tracks the grown width, no jump on load); no shimmer (B12-safe).
const SkeletonTile = styled(View, {
  backgroundColor: '$colorSurfaceSecondary',
  borderRadius: '$md',
})

// A plain GENERIC function component — preserves <T> (forwardRef would erase it). React 19 spreads `ref` as a prop.
export function GalleryView<T>({
  items,
  renderItem,
  getKey,
  state = 'success',
  empty,
  error,
  loadingCount = 6,
  minTileWidth = 200,
  density = 'default',
  ref,
  ...rest
}: GalleryViewProps<T>): ReactElement {
  const r = rest as Record<string, unknown>
  // Shared spine (internal/data-view): role + effectiveEmpty + the LV-7 + accessible-name dev-warns.
  const { role, effectiveEmpty } = resolveDataViewState({
    state,
    itemCount: items.length,
    ariaLabel: r['aria-label'] as string | undefined,
    ariaLabelledby: r['aria-labelledby'] as string | undefined,
    name: 'GalleryView',
  })

  // Per-tile flex sizing — style object (layout params, not tokens; tabs `style={indicatorStyle}` precedent).
  const tileStyle = useMemo<CSSProperties>(
    () => ({ flexGrow: 1, flexBasis: minTileWidth, minWidth: minTileWidth, maxWidth: minTileWidth * 2 }),
    [minTileWidth],
  )
  const skeletonStyle = useMemo<CSSProperties>(() => ({ ...tileStyle, aspectRatio: 3 / 2 }), [tileStyle])

  let body: ReactNode
  if (state === 'loading') {
    body = Array.from({ length: loadingCount }, (_, i) => (
      <SkeletonTile key={`skeleton-${i}`} role="listitem" aria-hidden style={skeletonStyle} />
    ))
  } else if (state === 'error') {
    body = error ?? <Message>Couldn&rsquo;t load.</Message>
  } else if (effectiveEmpty) {
    body = empty ?? <Message>Nothing here yet.</Message>
  } else {
    body = items.map((item, i) => (
      <GalleryTile key={getKey(item, i)} role="listitem" style={tileStyle}>
        {renderItem(item, i)}
      </GalleryTile>
    ))
  }

  return (
    // Computed role/aria-busy AFTER {...rest} so state wins (N1, card precedent).
    <GalleryRoot ref={ref} {...rest} role={role} aria-busy={state === 'loading' ? true : undefined} density={density}>
      {body}
    </GalleryRoot>
  )
}
