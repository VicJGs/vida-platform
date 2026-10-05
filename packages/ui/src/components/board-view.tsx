import { type CSSProperties, type ReactElement, type ReactNode, type Ref, useId } from 'react'
import { styled, Text, View } from '@tamagui/core'
import { type ViewState, Message, resolveDataViewState, warnMissingName } from '../internal/data-view'

// ViewState is the shared spine type (internal/data-view). Re-export so the barrel line can carry it if needed.
export type { ViewState }

// UI-2 · V9 · board-view — the renderer for the `board` VIEW_LAYOUT (packages/types VIEW_LAYOUT). Implements
// docs/specs/components/ui-2-platform-views/v9-board-view.md. A grouped-column (kanban) grid: PRE-GROUPED columns,
// each a titled list of cards. The LAST canonical view-mode renderer — completes the 7-member spine.
// - READ-ONLY LENS (BV-1): renders already-grouped data; it does NOT group/filter/sort/write. The grouping is
//   provider-delegated (ADR-007 §3.3 — the renderer receives `groups`, never a `groupBy`); card interactivity is the
//   consumer's `renderCard` (LV-5). The interactive move (drag-to-move across columns) is a Capability (ADR-008,
//   INT-2), homed away (interpretation O1) — hence NO onItemMove/drag/write props.
// - HYBRID spine reuse (BV-3): a column IS a list → each column reuses `resolveDataViewState` (the list-view path:
//   role="list"/"status" + per-column empty). The BOARD level diverges (the table/calendar path): it owns
//   loading (skeleton columns) / error (role="status") / board-empty (no groups → role="status") directly, NOT
//   through resolveDataViewState [FACT: seam-contract.md:90-91; interpretation R4; slice-map S2].
// - state is a PROP, not derived (BR-2, the package→app boundary): the app derives via the 8-state machine and
//   passes it; @vida/ui is a package and cannot import an app. ViewState is the LOCAL union (no @vida/core edge).
// - React 19 `ref`-as-prop: a generic forwardRef erases <T>, so a plain generic function + ref prop (list-view B2).
// - No sub-theme (BV-6): borders/skeleton/text use DIRECT semantic tokens; dimension props use the token scale,
//   never a sub-theme key (DEF-U8-h). No motion in V9.

/** One PRE-GROUPED column (the provider groups — ADR-007 §3.3; BoardView never does). */
export interface BoardGroup<T> {
  /** The group-by value (provider-resolved). React key per column — any string. */
  id: string
  /** Column header content (the group title). Also the column list's accessible name (aria-labelledby). */
  title: ReactNode
  /** This column's cards — already filtered + sorted upstream (the View Engine). Count is `items.length`. */
  items: readonly T[]
}

type Density = 'compact' | 'default' | 'spacious'

export interface BoardViewProps<T> {
  /** The columns — already grouped/filtered/sorted upstream. Board-empty = `groups.length === 0`. */
  groups: readonly BoardGroup<T>[]
  /** Renders one card's CONTENT (BoardView owns the role="listitem" wrapper). Compose an interactive Card here when a
   *  card is clickable (the LV-5 boundary — the renderer doesn't re-solve interactivity). `group` is passed for context. */
  renderCard: (item: T, group: BoardGroup<T>) => ReactNode
  /** Stable key per card (a UUIDv7 id). REQUIRED — never an index. */
  getKey: (item: T) => string
  /** Resolved BOARD-level state (the app derives + passes it — BR-2). Default 'success'. */
  state?: ViewState
  /** Slot for the board-empty state (no groups) — else a default Message. */
  empty?: ReactNode
  /** Slot for the board error state — else a default Message. */
  error?: ReactNode
  /** Between-card GAP within a column (the list-view density scale). Default 'default'. */
  density?: Density
  /** React 19 ref-as-prop → the container element. */
  ref?: Ref<HTMLDivElement>
  /** Accessible name for the board (required when the group renders — dev-warns if absent). */
  'aria-label'?: string
  'aria-labelledby'?: string
}

// Fixed skeleton shape (loading is data-independent — no `loadingCount` prop in the seam contract; the table-view
// skeleton precedent: skeletons ignore real data so loading never depends on `groups` being present).
const SKELETON_COLUMNS = 3
const SKELETON_CARDS = 3
// Column width — a LAYOUT number (the table `minWidth`/gallery `style=` precedent), not a token. Fixed so the board
// scrolls horizontally rather than crushing columns at 375 (BV-5).
const COLUMN_WIDTH = 280

// ── styled hosts (unnamed → base theme; no sub-theme, BV-6) ─────────────────────────────────────────────
const BoardRoot = styled(View, { flexDirection: 'column' })
// A row of columns; gap via the $space scale. alignItems:flex-start so columns size to their own content height.
const ScrollRow = styled(View, { flexDirection: 'row', gap: '$16', alignItems: 'flex-start' })
// A bordered column (reads unmistakably as a kanban column; a 1px border has no AA fill-contrast concern). Fixed
// width + no grow/shrink → the board scrolls. borderRadius via the token scale (DEF-U8-h).
const ColumnEl = styled(View, {
  flexDirection: 'column',
  width: COLUMN_WIDTH,
  flexGrow: 0,
  flexShrink: 0,
  gap: '$12',
  padding: '$12',
  borderWidth: 1,
  borderColor: '$colorBorderDefault',
  borderRadius: '$lg',
})
const ColumnHeader = styled(View, {
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: '$8',
  paddingBottom: '$8',
  borderBottomWidth: 1,
  borderColor: '$colorBorderDefault',
})
const ColumnBody = styled(View, {
  flexDirection: 'column',
  variants: {
    // Density = the between-card GAP via the $space scale (the list-view scale, BV-8).
    density: {
      compact: { gap: '$8' },
      default: { gap: '$12' },
      spacious: { gap: '$24' },
    },
  } as const,
  defaultVariants: { density: 'default' },
})
// A static placeholder bar — no shimmer (B12 / reduced-motion safe, the UX-4 §3.1 recipe); $md radius via the scale.
const SkeletonCard = styled(View, {
  height: '$48',
  borderRadius: '$md',
  backgroundColor: '$colorSurfaceSecondary',
})
const SkeletonHead = styled(View, {
  height: '$12',
  width: '60%',
  borderRadius: '$md',
  backgroundColor: '$colorSurfaceSecondary',
})

// Web horizontal scroll for the 375 baseline (BV-5): the fixed-width columns scroll rather than crushing.
const SCROLL_X: CSSProperties = { overflowX: 'auto', maxWidth: '100%' }

// A plain GENERIC function component — preserves <T> (forwardRef would erase it). React 19 spreads `ref` as a prop.
export function BoardView<T>({
  groups,
  renderCard,
  getKey,
  state = 'success',
  empty,
  error,
  density = 'default',
  ref,
  ...rest
}: BoardViewProps<T>): ReactElement {
  const r = rest as Record<string, unknown>
  // Stable per-instance id prefix for the column-header→column-list aria-labelledby wiring (collision-free across
  // multiple boards on a page; list/table don't need it, but board labels N lists so it does).
  const baseId = useId()

  // board-empty self-heals (the LV-2 self-heal): success with no groups renders the empty state (BV-4).
  const boardEmpty = state === 'empty' || (state === 'success' && groups.length === 0)

  // A name is required when the GROUP region renders (loading + non-empty success), not for the status terminal
  // states (error/board-empty). Board diverges from the list spine at the board level, so it fires warnMissingName
  // directly (the table-view TV-3 precedent) rather than via resolveDataViewState.
  if (state === 'loading' || (state === 'success' && !boardEmpty))
    warnMissingName('BoardView', r['aria-label'] as string | undefined, r['aria-labelledby'] as string | undefined)

  // ── error → a status message (not the group) ──────────────────────────────────────────────────────────
  if (state === 'error') {
    return (
      <BoardRoot ref={ref} {...rest} role="status">
        {error ?? <Message>Couldn&rsquo;t load.</Message>}
      </BoardRoot>
    )
  }

  // ── board-empty → a status region (no columns to keep — the list-view empty model, NOT the table designed grid) ──
  if (boardEmpty) {
    return (
      <BoardRoot ref={ref} {...rest} role="status">
        {empty ?? <Message>Nothing here yet.</Message>}
      </BoardRoot>
    )
  }

  // ── loading → skeleton columns (headerless, data-independent) ─────────────────────────────────────────
  if (state === 'loading') {
    return (
      <BoardRoot ref={ref} {...rest} role="group" aria-busy={true}>
        <View style={SCROLL_X}>
          <ScrollRow>
            {Array.from({ length: SKELETON_COLUMNS }, (_, i) => (
              <ColumnEl key={`skeleton-col-${i}`} aria-hidden>
                <ColumnHeader>
                  <SkeletonHead />
                </ColumnHeader>
                <ColumnBody density={density}>
                  {Array.from({ length: SKELETON_CARDS }, (_, j) => (
                    <SkeletonCard key={`skeleton-card-${j}`} />
                  ))}
                </ColumnBody>
              </ColumnEl>
            ))}
          </ScrollRow>
        </View>
      </BoardRoot>
    )
  }

  // ── success → the columns ─────────────────────────────────────────────────────────────────────────────
  // Computed role/aria AFTER {...rest} so state wins (N1, the list/table precedent).
  return (
    <BoardRoot ref={ref} {...rest} role="group">
      <View style={SCROLL_X}>
        <ScrollRow>
          {groups.map((group, index) => {
            // DOM id must be valid → key off the index (group.id may contain spaces/arbitrary chars). group.id is
            // still the React key (any string allowed).
            const headerId = `${baseId}-h-${index}`
            // Derive each column's effective state from its own item count. An empty kanban column is LEGITIMATE while
            // the board is 'success' — passing 'success' + 0 items would trip resolveDataViewState's "pass state=empty"
            // dev-warn, so the board derives 'empty' here (mirrors how the app derives the board's state — BR-2).
            const colState: ViewState = group.items.length === 0 ? 'empty' : 'success'
            const { role, effectiveEmpty } = resolveDataViewState({
              state: colState,
              itemCount: group.items.length,
              ariaLabelledby: headerId,
              name: 'BoardView',
            })
            return (
              <ColumnEl key={group.id}>
                <ColumnHeader>
                  <Text id={headerId} color="$colorTextPrimary" fontSize="$small" fontWeight="600">
                    {group.title}
                  </Text>
                  {/* Per-group count — derived from items.length (seam-contract §B; not a passed prop). */}
                  <Text color="$colorTextMuted" fontSize="$caption">
                    {group.items.length}
                  </Text>
                </ColumnHeader>
                <ColumnBody role={role} aria-labelledby={headerId} density={density}>
                  {effectiveEmpty ? (
                    // Per-column empty → the list-shaped status region (resolveDataViewState role="status").
                    <Message>Nothing here yet.</Message>
                  ) : (
                    group.items.map((item) => (
                      <View key={getKey(item)} role="listitem">
                        {renderCard(item, group)}
                      </View>
                    ))
                  )}
                </ColumnBody>
              </ColumnEl>
            )
          })}
        </ScrollRow>
      </View>
    </BoardRoot>
  )
}
