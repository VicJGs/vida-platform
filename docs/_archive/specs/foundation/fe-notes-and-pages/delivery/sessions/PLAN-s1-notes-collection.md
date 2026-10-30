# PLAN — S1 · Notes Collection + `/notes` route (fe-notes-and-pages ②)

> §XXVI g1 forward spec (Approval 1 target). Legs **NOT-48 · NOT-49**. EC MUSTs **EC-1 · EC-2 · EC-3 · EC-22**.
> All claims `[FACT: path]` / `[INTERP]` / `[DECISION]`. The No-Guessing Principle binds.

## 1. Scope

The `/notes` Top view: a multi-layout collection of note pages (List · Gallery · Calendar · Neural), 8-state, with the
view-config chrome entry points (Filter · Sort · + new-view). First `CollectionView` consumer in apps/web (grep-clean).

## 2. Data resolution (D2) — STUB the data leg, build the seam LIVE

`[FACT]` Live notes data is BLOCKED today: the worker-RPC Drizzle proxy's `exec/values/batch` throw a seam error
(deferred to UI-3 entity-CRUD) [FACT: apps/web/src/db — driver.query/run live, values throws; memory
[[visual-gate-catches-worker-rpc-bugs-unit-tests-bypass]]]; no service-composition root (`useDb`/`useViewsService`)
exists [FACT: grounding]; `NotesService` needs `spaces/backlinks/registry` not instantiated [FACT: ① seam-contract].
`[DECISION]` S1 mirrors the **home `useHomeWidgets` ProviderRead precedent** [FACT: apps/web/src/home/home-dashboard.tsx]:

- Build `apps/web/src/collection/use-collection.ts` → `useCollection(viewId)` returning `{ view, resolved, chrome }`.
  **M1 default**: `resolved = { rows: [], groups: [], state: 'empty', degraded: [] }` (honest — no notes yet); `view` =
  a `DEFAULT_NOTES_VIEW` (layout `list`, layouts `[list,gallery,calendar,graph]`).
- **Read unconditionally at the top** (Rules of Hooks) so the live swap is drop-in: later wraps
  `useQuery(['views','resolve',viewId], () => engine.resolve(view))` + `NotesService.listPages()` — ZERO signature
  change [FACT: collection/CLAUDE.md "the hook to build then"]. The live swap + provider registration is the DATA-PLANE
  slice (homed later; blocked on the Drizzle-proxy `values` seam + composition root).
- COMPOSE the shipped `createCollectionAdapter(views)` / `toCollectionChrome` (pure, tested) [FACT: collection/adapter.ts]
  for the chrome mapping; S1 does NOT re-derive chrome.

## 3. Component contract (Step 4 /contract)

```
apps/web/src/notes/notes-surface.tsx   — NotesSurface (the /notes page; composes CollectionView + useCollection + renderView)
apps/web/src/notes/note-renderers.tsx  — renderNotesView(layout, state, rows): the per-layout @vida/ui renderer + note cards
apps/web/src/collection/use-collection.ts — useCollection(viewId) seam (M1 default; live swap deferred)
routes.tsx                              — add lazy `/notes` (the /graph precedent)
```

- `NotesSurface` renders `<CollectionView {...chrome} onLayoutChange onFilter onSort onNewView renderView />`.
- `renderNotesView(layout, state, rows)`:
  - `list` → `ListView` (note row card: icon + title + excerpt + type·updated; favorite = `Card status='warm'` + Star)
  - `gallery` → `GalleryView` (cover tile + title)
  - `calendar` → `CalendarView` (getDate = page updated/journal_date; chip = icon + title)
  - `graph` → `NeuralGraph` nodes/edges from links → **`empty` terminal** (AR-8 deferred; `empty` slot = teaching EmptyState)
  - ALL icons = **Lucide** tinted by theme token (EC-22); every spacing a 4pt token; colors semantic tokens only.
- Layout availability (NOT-48): offer `[list, gallery, calendar, graph]` (surface-map:48 Notes top). Renderers hard-coded
  (saved-view SELECTION primitive deferred — ADR-007 design-pass).

## 4. States (8-state, state-as-prop — BR-2)

`loading` (skeletons, per renderer) · `empty` (teaching "No notes yet") · `error` (calm role=status) · `success` (rows).
M1 live default = `empty`. The Visual Gate demonstrates every state by driving a **dev-only sample set** through
`renderNotesView` (proves the renderers) — the sample set is NOT shipped as live data (honest; state-as-prop).

## 5. Seams / deferred (degrade-never-crash)

- Graph data-prep → AR-8 → `empty` terminal NOW (NOT-49). FTS/search is S7, not here. Live data → data-plane slice.

## 6. EC MUSTs for the S1 Visual Gate

- **EC-1** — the 4 layouts (List·Gallery·Calendar·Neural) render + switch live via the switcher.
- **EC-2** — each layout honors loading·empty·error·success.
- **EC-3** — the Neural layout renders the `empty`/"being prepared" terminal (no crash).
- **EC-22** — every glyph is a Lucide icon tinted by a theme token.

## 7. Tests + Visual Gate

- Unit (Vitest + Testing Library, env jsdom): `use-collection` default shape; `renderNotesView` picks the right renderer
  per layout + threads state; `notes-surface` renders chrome + switcher + empty. Reuse the collection adapter tests.
- Blocking **Visual Gate** (Brave, real app via onboarding → `/notes`; memory [[apps-web-visual-gate-drive-real-app]]):
  every layout × {light|dark} × {375·768·1440} + §XIV a11y (axe 0) + the EC MUSTs; sample set drives success/loading/error.
- Gates: `pnpm --filter @vida/web typecheck` 0 · eslint 0 · tests green · `/component-audit` · `/critique` SHIP.

## 8. Build order (Step 7)

types → `use-collection` seam (default) → `note-renderers` (per-layout + states) → `notes-surface` (compose) →
`/notes` route → tests → Visual Gate.

## 9. Open for Approval 1

- Confirm **STUB data leg** (M1 default empty, live swap deferred to the data-plane slice) vs forcing live now
  (blocked by the Drizzle-proxy `values` seam — would expand S1 into building the whole notes data plane).
- Confirm layout set `[list, gallery, calendar, graph]` for the Notes top view.
