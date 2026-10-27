# apps/web/src/collection — SavedView ↔ Collection adapter (fe-codec-collection S3)

The `apps/web` plane of the CODEC Collection shell: how a module drives `@vida/ui`'s `CollectionView` from the
`@vida/core` canon. The ONLY place `@vida/core` (`ResolvedView` / `ViewsService`) meets the presentational shell — the
Tamagui-only boundary forbids this in `@vida/ui` (BR-2; the fe-codec-patterns 8-state split precedent).

## What this ships (type + convention — NOT a live hook)

`adapter.ts`:

- **`toCollectionChrome(view, resolved)`** — pure: maps a `ResolvedView` (`{rows,groups,state,degraded}`) + a
  `SavedViewLike` → the `CollectionChromeProps` the shell owns (`layout·layouts·state·count·sortLabel·filterActive`).
- **`bindViewConfigWrites(views)`** — pure binding over `ViewsService`: `onLayoutChange(viewId,next)` → `updateView(id,
{layout})`, `onNewView(sourceId)` → `cloneView(id,null)`. **View-config writes, NOT entity writes** (ADR-007; H2).
- **`createCollectionAdapter(views)`** — assembles both; `isFilterActive` / `sortLabelOf` derivations.

## Why no `useCollection(viewId)` hook here (H4 — grep-before-net-new)

No M1.2.1 Collection consumer is **built** yet — later units #20/#21/#25 + modules #27+ depend on it but ship after #4
(grep clean today). So, exactly like fe-codec-patterns **`ProviderRead`** ("type+convention, not a hook — no built
consumer"), the live data hook is deferred to the FIRST consumer. This slice ships the pure, tested pieces + this
convention; it wires nothing live.

## The convention — how the FIRST consumer wires it (the hook to build then)

```ts
// at the first module ② track (e.g. fe-notes-and-pages #27):
function useCollection(viewId: string) {
  const views = useViewsService()
  const adapter = useMemo(() => createCollectionAdapter(views), [views])
  // React Query → ViewEngine.resolve(viewId) (NOT shipped in S3 — the deferred data leg)
  const { data: view } = useSavedView(viewId)
  const { data: resolved } = useQuery(['views','resolve',viewId], () => engine.resolve(viewId))
  return { adapter, view, resolved }
}
// render:
<CollectionView
  {...adapter.toChrome(view, resolved)}
  onLayoutChange={(l) => adapter.onLayoutChange(view.id, l).then(refetch)}
  onFilter={openFilterEditor}  onSort={openSortControl}
  onNewView={() => adapter.onNewView(view.id)}
  renderView={(layout, state) => renderModuleRenderer(layout, state, resolved)} // the module's per-layout renderers
/>
```

`renderView` is the MODULE's — it builds the right `@vida/ui` renderer (`TableView columns=…`, `BoardView groups=…`, …)
from `resolved.rows`/`resolved.groups` with the module's real props. `state` is the engine's terminal state (or re-derived
via the 8-state machine) passed as a prop (BR-2).

## Verify

`pnpm --filter @vida/web test -- collection` (pure, env node).
