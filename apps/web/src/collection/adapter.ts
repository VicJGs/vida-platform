// ============================================================================
// SavedView ↔ Collection adapter — fe-codec-collection S3 (the apps/web plane).
//
// The documented CONVENTION + the pure pieces a module uses to drive @vida/ui's
// `CollectionView` from the @vida/core canon. This is the ONLY place @vida/core
// (ResolvedView / ViewsService) meets the presentational shell — the Tamagui-only
// boundary forbids this in @vida/ui, so it lives here (BR-2; the fe-codec-patterns
// 8-state split precedent).
//
// SHIPS (buildable + tested NOW): the pure `toCollectionChrome` mapping + the pure
// `bindViewConfigWrites` (ViewsService updateView/cloneView). DOES NOT ship a live
// data hook — no M1.2.1 Collection consumer is BUILT yet (later units #20/#21/#25 +
// modules #27+ depend on it but ship after #4; grep clean). The concrete
// `useCollection(viewId)` hook (React Query → ViewEngine.resolve + these pieces) is
// built at the FIRST consumer — the `ProviderRead` type+convention precedent
// (fe-codec-patterns S5). See ./CLAUDE.md.
// ============================================================================
import type { ResolvedView, ViewFilter, ViewsService } from '@vida/core'
import type { ViewLayout } from '@vida/types'
import type { CollectionViewProps } from '@vida/ui'

/** The saved-view shape a module feeds the adapter (a `views`-row projection + the module's offered layouts). */
export interface SavedViewLike {
  id: string
  /** The persisted current layout (ADR-007 filter × layout × grouping). */
  layout: ViewLayout
  /** The layouts this module offers for this collection (a subset of the 7; order = switcher order). Tasks=12 → O3. */
  availableLayouts: readonly ViewLayout[]
  /** The persisted filter (JSON TEXT upstream) — used only to derive the `filterActive` badge here. */
  filter?: ViewFilter | null
  /** The resolved sort for the DISPLAY label (the engine resolves the actual order). */
  sort?: { field: string; dir: 'asc' | 'desc' } | null
}

/** Is any filter predicate applied? (drives the Filter badge; the filtering LOGIC is the engine's). */
export function isFilterActive(filter?: ViewFilter | null): boolean {
  if (filter == null) return false
  return (
    (filter.tags?.length ?? 0) > 0 ||
    (filter.entity_types?.length ?? 0) > 0 ||
    (filter.predicates != null && Object.keys(filter.predicates).length > 0)
  )
}

/** A basic display label for the current sort, e.g. `due ↑`. A module may override with a human-friendly label. */
export function sortLabelOf(sort?: { field: string; dir: 'asc' | 'desc' } | null): string | undefined {
  if (sort == null) return undefined
  return `${sort.field} ${sort.dir === 'asc' ? '↑' : '↓'}`
}

/** The CollectionView props the adapter OWNS — the chrome + switcher + state. The consumer still supplies `renderView`
 *  (the per-layout renderers with their real props + data) + `onLayoutChange`/`onFilter`/`onSort`/`onNewView`. */
export type CollectionChromeProps = Pick<
  CollectionViewProps,
  'layout' | 'layouts' | 'state' | 'count' | 'sortLabel' | 'filterActive'
>

/** Map the View Engine output + the saved view → the CollectionView chrome props. PURE. `state`/`count` come from the
 *  ResolvedView (the engine's terminal state + rows); `layout`/`layouts`/`sortLabel`/`filterActive` from the saved view. */
export function toCollectionChrome(view: SavedViewLike, resolved: ResolvedView): CollectionChromeProps {
  return {
    layout: view.layout,
    layouts: view.availableLayouts,
    state: resolved.state,
    count: resolved.rows.length,
    sortLabel: sortLabelOf(view.sort),
    filterActive: isFilterActive(view.filter),
  }
}

/** The view-config WRITES (ViewsService) — NOT entity writes. Switching layout persists the saved view; `+` clones it.
 *  A pure binding over ViewsService (testable with a mock); the consumer calls these from CollectionView's callbacks +
 *  re-resolves via its data hook. */
export function bindViewConfigWrites(views: ViewsService) {
  return {
    /** CollectionView `onLayoutChange` → persist the layout (a view-config change, ADR-007). */
    onLayoutChange: (viewId: string, next: ViewLayout): Promise<unknown> => views.updateView(viewId, { layout: next }),
    /** CollectionView `onNewView` (the `+`) → clone the saved view into an independent global copy (ViewsService/xs-views). */
    onNewView: (sourceViewId: string): Promise<unknown> => views.cloneView(sourceViewId, null),
  }
}

/** The full adapter convention — what a module assembles (chrome mapping + the view-config writes). The live data hook
 *  (React Query → ViewEngine.resolve) is added at the first consumer; see ./CLAUDE.md. */
export interface CollectionAdapter {
  toChrome: (view: SavedViewLike, resolved: ResolvedView) => CollectionChromeProps
  onLayoutChange: (viewId: string, next: ViewLayout) => Promise<unknown>
  onNewView: (sourceViewId: string) => Promise<unknown>
}

/** Assemble the adapter from a ViewsService (the pure, no-React half of the convention). */
export function createCollectionAdapter(views: ViewsService): CollectionAdapter {
  return { toChrome: toCollectionChrome, ...bindViewConfigWrites(views) }
}
