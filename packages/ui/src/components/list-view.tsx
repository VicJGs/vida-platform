import { type ReactElement, type ReactNode, type Ref } from 'react'
import { styled, View } from '@tamagui/core'
import { type ViewState, Message, resolveDataViewState } from '../internal/data-view'

// ViewState/Message/terminal-state logic now live in internal/data-view (extracted at V3, rule of three); re-export
// ViewState so the barrel (`export { ..., type ViewState } from './list-view'`) is unchanged.
export type { ViewState }

// UI-2 · V1 · list-view — the renderer for the `list` VIEW_LAYOUT (packages/types VIEW_LAYOUT). Implements
// docs/specs/components/ui-2-platform-views/v1-list-view.md. **This unit establishes the shared data-view spine**
// (generic items<T> + renderItem + getKey + the four RENDERED terminal states) that V2–V4 reuse.
// - Pure PRESENTATIONAL: list-view owns layout + role="listitem" semantics + the terminal states; it does NOT own
//   row interactivity (the consumer's `renderItem` composes an interactive Card when a row is clickable — LV-5). This
//   avoids re-solving Card's container-vs-button problem and keeps the spine minimal.
// - state is a PROP, not derived (BR-2, the package→app boundary): the app derives via UX-4's deriveTerminalState and
//   passes it; @vida/ui is a package and cannot import an app. `ViewState` is a LOCAL union (LV-3a) — @vida/ui deps
//   are Tamagui-only, so importing @vida/core's `TerminalState` would be a wrong-direction edge; structural typing
//   makes deriveTerminalState()'s `TerminalState` assignable to `ViewState` with no import.
// - React 19 `ref`-as-prop (B2): a generic forwardRef erases <T>, and list-view is non-interactive, so no forwardRef.
// - No sub-theme (LV-3): dividers/skeleton/message use BASE semantic tokens ($colorBorderDefault /
//   $colorSurfaceSecondary / $colorTextMuted), which resolve on an unnamed styled host. Dimension props use the
//   token scale, never a sub-theme key (DEF-U8-h). No motion in V1 (LV-6).

type Density = 'compact' | 'default' | 'spacious'

export interface ListViewProps<T> {
  /** The rows. Empty + state='success' self-heals to the empty render + dev-warns (LV-7). */
  items: readonly T[]
  /** Renders one row's CONTENT (list-view owns the role="listitem" wrapper). Compose an interactive Card here when
   *  the row is clickable. */
  renderItem: (item: T, index: number) => ReactNode
  /** Stable key per row (a UUIDv7 id). REQUIRED — never an index. */
  getKey: (item: T, index: number) => string
  /** Resolved state (the app derives via deriveTerminalState + passes it — BR-2). Default 'success'. */
  state?: ViewState
  /** Slot for the empty state (else a default). */
  empty?: ReactNode
  /** Slot for the error state (else a default). */
  error?: ReactNode
  /** Skeleton row count while loading. Default 5. */
  loadingCount?: number
  /** Between-row GAP (not per-row padding — a row's inset is its renderItem's, LV-4). Default 'default'. */
  density?: Density
  /** Hairline separators between rows. Default false. */
  dividers?: boolean
  /** React 19 ref-as-prop → the container element (B2). */
  ref?: Ref<HTMLDivElement>
  /** Accessible name for the list (required in list/loading states — dev-warns if absent). */
  'aria-label'?: string
  'aria-labelledby'?: string
}

// ── styled hosts (unnamed → base theme; no sub-theme, LV-3) ─────────────────────────────────────────────
const ListRoot = styled(View, {
  flexDirection: 'column',
  variants: {
    // Density = the between-row GAP via the $space scale (mirrors Card's padding scale), NOT per-row padding (LV-4).
    density: {
      compact: { gap: '$8' },
      default: { gap: '$12' },
      spacious: { gap: '$24' },
    },
  } as const,
  defaultVariants: { density: 'default' },
})

const ListRow = styled(View, {
  variants: {
    // Hairline separator; only the bottom width is set, so borderColor renders only there (LV-4).
    dividers: {
      true: { borderBottomWidth: 1, borderColor: '$colorBorderDefault' },
    },
  } as const,
})

// A static placeholder bar — fixed height (density affects the gap, not the bar, LV-4); no shimmer (B12 / reduced-
// motion safe — the UX-4 §3.1 recipe). $md radius via the token scale (DEF-U8-h).
const SkeletonRow = styled(View, {
  height: '$24',
  borderRadius: '$md',
  backgroundColor: '$colorSurfaceSecondary',
})

// A plain GENERIC function component — preserves <T> (forwardRef would erase it). React 19 spreads `ref` as a prop.
export function ListView<T>({
  items,
  renderItem,
  getKey,
  state = 'success',
  empty,
  error,
  loadingCount = 5,
  density = 'default',
  dividers = false,
  ref,
  ...rest
}: ListViewProps<T>): ReactElement {
  // An empty success list self-heals to the empty render (LV-2); role + body follow the EFFECTIVE state.
  const r = rest as Record<string, unknown>
  // Shared spine (internal/data-view): computes role + effectiveEmpty and fires the LV-7 + accessible-name dev-warns.
  const { role, effectiveEmpty } = resolveDataViewState({
    state,
    itemCount: items.length,
    ariaLabel: r['aria-label'] as string | undefined,
    ariaLabelledby: r['aria-labelledby'] as string | undefined,
    name: 'ListView',
  })

  let body: ReactNode
  if (state === 'loading') {
    body = Array.from({ length: loadingCount }, (_, i) => (
      <ListRow key={`skeleton-${i}`} role="listitem" aria-hidden>
        <SkeletonRow />
      </ListRow>
    ))
  } else if (state === 'error') {
    body = error ?? <Message>Couldn&rsquo;t load.</Message>
  } else if (effectiveEmpty) {
    body = empty ?? <Message>Nothing here yet.</Message>
  } else {
    body = items.map((item, i) => (
      <ListRow key={getKey(item, i)} role="listitem" dividers={dividers}>
        {renderItem(item, i)}
      </ListRow>
    ))
  }

  return (
    // Computed role/aria-busy AFTER {...rest} so state wins (N1, card precedent).
    <ListRoot ref={ref} {...rest} role={role} aria-busy={state === 'loading' ? true : undefined} density={density}>
      {body}
    </ListRoot>
  )
}
