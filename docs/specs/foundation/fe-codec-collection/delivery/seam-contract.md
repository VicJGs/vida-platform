# fe-codec-collection — Seam Contract (Decomposition Gate, Step 2)

> The two APIs that keep the planes coherent (BR-2 boundary). **Seam A** = the `@vida/ui` `CollectionView` props (what a
> consumer passes). **Seam B** = the `apps/web` adapter that maps the `@vida/core` canon → Seam A. Proposed here;
> **ratified at `/contract` (Step 4)**. Grounds: interpretation §1–§3 · slice-map S1–S3 · foundation/views/types.ts ·
> list-view/table-view/board-view prop shapes.

## Seam A — `CollectionView` props (`@vida/ui`, presentational; S1 + S2)

```ts
// LOCAL union ≡ @vida/types VIEW_LAYOUT — @vida/ui has NO @vida/types dep (the ViewState-local precedent).
type ViewLayout = 'list' | 'table' | 'board' | 'gallery' | 'calendar' | 'graph' | 'timeline'
// reused from internal/data-view (the renderer-state canon in @vida/ui)
type ViewState = 'loading' | 'empty' | 'error' | 'success'

interface CollectionViewProps {
  // ── identity / chrome (S1 title+count · S2 affordances) ───────────────────────────────
  title: string
  count?: number                              // shown in `success`; rendered as '—' otherwise (honest)
  // ── the view-mode switcher (S1) ───────────────────────────────────────────────────────
  layout: ViewLayout                          // current (CONTROLLED — app owns the state, BR-2)
  layouts: readonly ViewLayout[]              // the AVAILABLE subset; array order = display order in the toolbar
  onLayoutChange: (next: ViewLayout) => void  // a view-config change (app persists via ViewsService — Seam B)
  // ── the dispatch (S1) — consumer supplies the active layout's renderer, so CollectionView stays
  //    agnostic of the 7 differing renderer prop shapes (table→columns, board→groups, graph→nodes…) ──
  renderView: (layout: ViewLayout, state: ViewState) => ReactNode
  state: ViewState                            // threaded into renderView (the app derives via the 8-state machine)
  // ── view-config chrome ENTRY POINTS (S2) — logic is the engine's / ViewsService's, NOT here ──
  onFilter?: () => void                       // opens the filter editor (engine owns filtering)
  filterActive?: boolean                      // a filter is applied → badge
  sortLabel?: ReactNode                       // DISPLAY of the current sort, e.g. 'Due ↑'
  onSort?: () => void                         // opens the sort control
  onNewView?: () => void                      // the '+' — create/clone a SavedView (ViewsService)
  // ── slots + a11y ──────────────────────────────────────────────────────────────────────
  empty?: ReactNode                           // default = the fe-codec-patterns EmptyState (teaching-invitation)
  error?: ReactNode                           // default = internal/data-view Message, role="status"
  'aria-label'?: string                       // names the Collection region + the switcher toolbar
  'aria-labelledby'?: string
  ref?: Ref<HTMLDivElement>                   // React-19 ref-as-prop (no forwardRef)
}
```

**Why `renderView` (render-prop) over a `renderers` map:** the 7 renderers take *different* props (`TableView` needs
`columns`; `BoardView` needs `groups`+`renderCard`; `NeuralGraph` needs `nodes`/`edges`; calendar needs `getDate`). A
render-prop lets the consumer build the right renderer per layout with its real props, keeping `CollectionView` free of
all 7 shapes **and** free of any `@vida/core` type. *(Alt considered: `renderers: Partial<Record<ViewLayout, (s:
ViewState) => ReactNode>>` — map keys = `layouts`. Equivalent; `/contract` picks one. The render-prop is leaner; the map
self-documents availability. Leaning render-prop + deriving `layouts` explicitly.)*

**Contract invariants:** controlled (`layout`/`state` are props; no internal view state) · the switcher is a labeled
`role="toolbar"` with `aria-pressed` (not Tabs) · `onLayoutChange` is the ONLY switch path (a view-config change) ·
entry-point callbacks carry NO logic · degrade-never-crash (every `state` renders) · condense-to-overflow at 375.

> **⚠ OPEN CONTRACT POINT (must be pinned at `/contract`, Step 4) — empty/error OWNERSHIP.** `CollectionView` threads
> `state` into `renderView(layout, state)`, but **every shipped renderer already owns its own 4 states internally** (incl.
> calendar's designed-empty grid) [FACT: list-view.tsx:34-35; calendar-view.tsx — empty folds into the grid]. So the
> `empty?`/`error?` slots and the renderer's own state handling could **double-render**. The contract MUST pin ONE owner:
> **proposed — the RENDERER owns empty/error** (pass `state` through `renderView`; the shell's `empty?`/`error?` are
> OPTIONAL overrides a consumer may inject, defaulting to the renderer's own). This is the only resolution consistent with
> **EC-3** ("calendar keeps its designed grid" — which only holds if calendar owns its empty). Flagged, not silently
> decided; `/contract` ratifies. (Critic NIT-5.)

## Seam B — the SavedView↔Collection adapter (`apps/web`, type + convention; S3)

```ts
// imports @vida/core — lives in apps/web (the Tamagui-only boundary forbids this in @vida/ui)
import type { ResolvedView, ViewFilter, ViewGrouping } from '@vida/core' // foundation/views/types.ts
// a saved view row (ADR-007): filter × layout × grouping/sort, + the module's available layouts
interface SavedViewLike {
  id: string
  layout: ViewLayout
  availableLayouts: readonly ViewLayout[]      // the module declares which of the 7 it offers (Tasks=12 variants → O3)
  filter: ViewFilter
  grouping: ViewGrouping
  sort?: { field: string; dir: 'asc' | 'desc' } | null
}

// THE CONVENTION (shape, not a shipped hook — H4): a module composes this to drive CollectionView.
interface CollectionAdapter {
  // map the engine output + the saved view → the presentational props (minus renderView, which the module supplies)
  toChrome(view: SavedViewLike, resolved: ResolvedView): Pick<CollectionViewProps,
    'layout' | 'layouts' | 'state' | 'count' | 'sortLabel' | 'filterActive'>
  // the view-config writes (ViewsService) — NOT entity writes
  onLayoutChange(viewId: string, next: ViewLayout): Promise<void>  // → ViewsService.update(viewId, { layout }) + re-resolve
  onNewView(sourceViewId: string): Promise<void>                   // → ViewsService.create/cloneView (xs-views)
}
```

**Why type+convention, not a hook (H4):** no *built* consumer of the Collection exists yet — same-milestone M1.2.1 units
#20 `fe-spaces-page` / #21 `fe-sync-log` / #25 `fe-notifications` depend on it, and modules #27+ do too, but ALL ship
after #4 (grep clean today) [FACT: g6-reshape-runbook.md:16-20 + :49,55,59]. The concrete `useCollection(viewId)` hook
(React Query wiring to `ViewEngine.resolve` + `ViewsService`) is built at the FIRST consumer — exactly the `ProviderRead`
resolution (type+convention in M1, hook at first consumer). S3 ships the types + the documented convention + a mapping
test; it wires nothing live.

**Boundary facts:** `state` comes from `ResolvedView.state` (the engine's terminal state) OR is re-derived via the
8-state machine, then passed as a prop (BR-2). `groups`/`rows` from `ResolvedView` feed the module's `renderView` (e.g.
→ `BoardView groups=…`), never `CollectionView` directly. `onLayoutChange`/`onNewView` are **view-config writes**
(`ViewsService`), never entity writes (H2).

## What this contract does NOT cover (homed elsewhere — slice-map "Out of scope")
Filter/sort/group LOGIC (ViewEngine/provider, O1) · entity writes / drag-to-move (Capability, O2) · per-module layout
variants + live data wiring (module ② track, O3) · SavedView persistence/clone engine (ViewsService, O4) · the other
archetype shells (O5).
