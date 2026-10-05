import { type CSSProperties, type ReactElement, type ReactNode, type Ref } from 'react'
import { styled, Text, View } from '@tamagui/core'
import { type ViewState, Message, warnMissingName } from '../internal/data-view'

// ViewState is the shared spine type (internal/data-view). Re-export so the barrel line can carry it if needed.
export type { ViewState }

// UI-2 · V8 · table-view — the renderer for the `table` VIEW_LAYOUT (packages/types VIEW_LAYOUT). Implements
// docs/specs/components/ui-2-platform-views/v8-table-view.md. A columnar grid: caller-declared columns × rows.
// - READ-ONLY LENS (TV-1): renders resolved+sorted rows; it does NOT sort/filter/group/write. Sort TOGGLE is the
//   Collection shell's (TV-5 — the renderer only reflects `column.sort` via aria-sort); row interactivity is the
//   consumer's `column.render` (LV-5). A view is a read-only lens; interaction-that-writes is a Capability
//   (quality-bar §4.3; ADR-007:94; ADR-008). Hence NO onSortChange/onRowClick/write props.
// - role="table" DIVERGENCE (TV-3, the calendar-view precedent): reuses the spine PIECES (ViewState, Message,
//   warnMissingName, ref-prop, base tokens) but NOT resolveDataViewState — a grid's empty is a DESIGNED row, not a
//   role="status" message.
// - state is a PROP, not derived (BR-2, the package→app boundary): the app derives via UX-4 deriveTerminalState and
//   passes it; @vida/ui is a package and cannot import an app. ViewState is the LOCAL union (no @vida/core edge).
// - React 19 `ref`-as-prop: a generic forwardRef erases <T>, so a plain generic function + ref prop (list-view B2).
// - No sub-theme (TV-9): borders/skeleton/text use BASE semantic tokens; dimension props use the token scale, never a
//   sub-theme key (DEF-U8-h). No motion in V8 (TV-10).

export interface Column<T> {
  key: string
  header: ReactNode
  /** Renders one cell's CONTENT (table-view owns the role="cell" wrapper). Compose an interactive control here when a
   *  cell is clickable (the LV-5 boundary — the renderer doesn't re-solve interactivity). */
  render: (item: T, index: number) => ReactNode
  /** Fixed column width — a LAYOUT number/string via style= (the tabs/gallery precedent), not a token. Omit → grows. */
  width?: number | string
  align?: 'start' | 'center' | 'end'
  /** DISPLAY-only: the view's current sort for this column → aria-sort on the columnheader. The renderer does NOT
   *  toggle sort (that's the Collection shell, TV-5); it only reflects the resolved sort. */
  sort?: 'asc' | 'desc' | null
}

type Density = 'compact' | 'default' | 'spacious'

export interface TableViewProps<T> {
  /** The rows — already filtered + sorted upstream (the View Engine). */
  items: readonly T[]
  /** The column set (header + per-cell render). */
  columns: readonly Column<T>[]
  /** Stable key per row (a UUIDv7 id). REQUIRED — never an index. */
  getKey: (item: T, index: number) => string
  /** Resolved state (the app derives via deriveTerminalState + passes it — BR-2). Default 'success'. */
  state?: ViewState
  /** Slot for the empty state (else a designed empty row). */
  empty?: ReactNode
  /** Slot for the error state (else a default Message). */
  error?: ReactNode
  /** Skeleton row count while loading. Default 5. */
  loadingCount?: number
  /** Cell vertical rhythm (a table is contiguous — padding, not an inter-row gap, TV-8). Default 'default'. */
  density?: Density
  /** React 19 ref-as-prop → the container element. */
  ref?: Ref<HTMLDivElement>
  /** Accessible name for the table (required when the grid renders — dev-warns if absent). */
  'aria-label'?: string
  'aria-labelledby'?: string
}

// ── styled hosts (unnamed → base theme; no sub-theme, TV-9) ─────────────────────────────────────────────
const TableRoot = styled(View, { flexDirection: 'column' })
// minWidth forces the 375 horizontal scroll (TV-6) rather than crushing columns.
const Grid = styled(View, { flexDirection: 'column', minWidth: 560 })
const HeadRow = styled(View, {
  flexDirection: 'row',
  borderBottomWidth: 1,
  borderColor: '$colorBorderDefault',
})
const BodyRow = styled(View, {
  flexDirection: 'row',
  borderBottomWidth: 1,
  borderColor: '$colorBorderDefault',
})
const SkeletonBar = styled(View, {
  height: '$12',
  borderRadius: '$md',
  backgroundColor: '$colorSurfaceSecondary',
  flexGrow: 1,
})

// Density → cell vertical padding via the $space scale (TV-8; the list-view density scale, applied as padding).
const DENSITY_PAD = { compact: '$8', default: '$12', spacious: '$24' } as const
const ALIGN_ITEMS = { start: 'flex-start', center: 'center', end: 'flex-end' } as const
const ARIA_SORT = { asc: 'ascending', desc: 'descending' } as const

// Web horizontal scroll for the 375 baseline (TV-6): the 560-min grid scrolls rather than crushing columns.
const SCROLL_X: CSSProperties = { overflowX: 'auto', maxWidth: '100%' }

// Shared per-cell layout (header + body): grow to fill, floor at minWidth, or a fixed width override (TV-7).
function cellLayout<T>(col: Column<T>, pad: string): Record<string, unknown> {
  const base: Record<string, unknown> = {
    paddingVertical: pad,
    paddingHorizontal: '$12',
    alignItems: ALIGN_ITEMS[col.align ?? 'start'],
    justifyContent: 'center',
  }
  if (col.width != null) return { ...base, width: col.width, flexGrow: 0, flexShrink: 0 }
  return { ...base, flexGrow: 1, flexBasis: 0, minWidth: 120 }
}

// A plain GENERIC function component — preserves <T> (forwardRef would erase it). React 19 spreads `ref` as a prop.
export function TableView<T>({
  items,
  columns,
  getKey,
  state = 'success',
  empty,
  error,
  loadingCount = 5,
  density = 'default',
  ref,
  ...rest
}: TableViewProps<T>): ReactElement {
  const r = rest as Record<string, unknown>
  const pad = DENSITY_PAD[density]

  // A name is required whenever the GRID renders (loading + success/empty), not for the error status message. Table
  // diverges from the list spine (TV-3), so it does NOT call resolveDataViewState — it fires warnMissingName directly,
  // exactly as calendar-view does. (Empty is a designed row, never a success-with-items contradiction to warn on.)
  if (state !== 'error')
    warnMissingName('TableView', r['aria-label'] as string | undefined, r['aria-labelledby'] as string | undefined)

  // ── error → a status message (not the grid) ─────────────────────────────────────────────────────────
  if (state === 'error') {
    return (
      <TableRoot ref={ref} {...rest} role="status">
        {error ?? <Message>Couldn&rsquo;t load.</Message>}
      </TableRoot>
    )
  }

  const loading = state === 'loading'
  // An empty success grid self-heals to the designed empty row (the LV-2 self-heal, TV-4).
  const effectiveEmpty = state === 'empty' || (state === 'success' && items.length === 0)

  return (
    <TableRoot ref={ref} {...rest} role="table" aria-busy={loading ? true : undefined}>
      <View style={SCROLL_X}>
        <Grid>
          <HeadRow role="row">
            {columns.map((col) => (
              <View
                key={col.key}
                role="columnheader"
                aria-sort={col.sort ? ARIA_SORT[col.sort] : 'none'}
                {...cellLayout(col, pad)}
              >
                <Text fontSize="$caption" color="$colorTextMuted" fontWeight="600">
                  {col.header}
                </Text>
              </View>
            ))}
          </HeadRow>

          {loading ? (
            Array.from({ length: loadingCount }, (_, i) => (
              <BodyRow key={`skeleton-${i}`} role="row" aria-hidden>
                {columns.map((col) => (
                  <View key={col.key} {...cellLayout(col, pad)}>
                    <SkeletonBar />
                  </View>
                ))}
              </BodyRow>
            ))
          ) : effectiveEmpty ? (
            // A DESIGNED empty row spanning the grid (NOT a role="status" message — the calendar divergence, TV-4).
            <BodyRow role="row">
              <View role="cell" aria-colspan={columns.length} flexGrow={1} paddingVertical={pad} paddingHorizontal="$12">
                {empty ?? <Message>Nothing here yet.</Message>}
              </View>
            </BodyRow>
          ) : (
            items.map((item, i) => (
              <BodyRow key={getKey(item, i)} role="row">
                {columns.map((col) => (
                  <View key={col.key} role="cell" {...cellLayout(col, pad)}>
                    {col.render(item, i)}
                  </View>
                ))}
              </BodyRow>
            ))
          )}
        </Grid>
      </View>
    </TableRoot>
  )
}
