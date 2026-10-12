// ============================================================================
// useCollection — the first live Collection consumer hook (fe-notes-and-pages #27, S1).
// The CLAUDE.md convention realized: owns the view-config (current layout + the
// view-config write callbacks) and maps the engine output → CollectionView chrome via
// the shipped, pure `toCollectionChrome`. GENERIC (no module data) — the consumer
// supplies `resolved` (the data leg) + `renderView` (the per-layout renderers).
//
// DATA LEG DEFERRED (D2): the live `useQuery(['views','resolve',viewId]) → ViewEngine.resolve`
// + `ViewsService` write-through is BLOCKED today (worker-RPC Drizzle `values` seam throws;
// no composition root). So M1 owns layout as LOCAL state + no-op view-config writes; the
// swap to live is drop-in (replace `setLayout` with `views.updateView(...).then(refetch)` and
// feed `resolved` from React Query) — ZERO signature change. Mirrors the home ProviderRead precedent.
// ============================================================================
import { useState } from 'react'
import type { ResolvedView } from '@vida/core'
import type { ViewLayout } from '@vida/types'
import { toCollectionChrome, type SavedViewLike, type CollectionChromeProps } from './adapter'

export interface UseCollection {
  /** The current (locally-held in M1) layout. */
  layout: ViewLayout
  /** Map a resolved data set → the CollectionView chrome props (count·state·layout·layouts·sort·filter). */
  chromeFor: (resolved: ResolvedView) => CollectionChromeProps
  /** CollectionView `onLayoutChange` — M1: local state; live: `views.updateView(viewId,{layout}).then(refetch)`. */
  onLayoutChange: (next: ViewLayout) => void
  /** View-config entry points — logic deferred to the View Engine / filter+sort editors (S2 chrome of CollectionView). */
  onFilter: () => void
  onSort: () => void
  onNewView: () => void
}

export function useCollection(viewId: string, availableLayouts: readonly ViewLayout[]): UseCollection {
  const [layout, setLayout] = useState<ViewLayout>(availableLayouts[0] ?? 'list')
  const view: SavedViewLike = { id: viewId, layout, availableLayouts, filter: null, sort: null }
  return {
    layout,
    chromeFor: (resolved) => toCollectionChrome(view, resolved),
    onLayoutChange: setLayout,
    onFilter: () => {},
    onSort: () => {},
    onNewView: () => {},
  }
}
