# apps/web/src/command-bar — Command-bar contract layer

**Owning issue:** UX-2 Command bar + Search (LIF-91) · **Owning ADRs:** ADR-006/007 (nav), ADR-018 §3.6 (layer-doc homes).
Full interaction model: `docs/core/architecture/command-bar-and-search.md`.

## What lives here
The typed **contract + derivation logic** for the `⌘K` global launcher — the source of truth the UI-4 render host
consumes. Central data/logic, **no chrome**.

- `types.ts` — `Command`, `CommandProvider`, `CommandRunContext`, `CommandHistoryEntry` (v1 shape), `SearchResult`,
  `SearchProvider`, `SearchStatus` (7 terminal states), `CommandKeybind` + `resolveKeybind`.
- `nav-commands.ts` — `deriveNavCommands(map?, surfaces?, prefs?)`: navigation commands derived from `../nav/module-map`;
  `prefs` (the user's module visibility + names, preferences-rescope R5) run the map through `../nav/nav-prefs`
  `applyNavPrefs` — hidden → no command, renamed → the custom label, the id (`nav:<routePath>`) unchanged.
- `frecency.ts` — `rankByFrecency()`: pure pinned-first, recency-weighted ranking (`now` injected).
- `search-provider.ts` — `stubSearchProvider`: the DB-8 seam (returns `search-unavailable` until FTS5 lands).
- `registry.ts` — `createCommandRegistry()` + `createNavProvider(prefs?)` (R5; `navProvider` = no prefs) +
  `shellActionsProvider` ("Toggle sidebar" seed).
- (ephemeral open/query/mode store lives at `../stores/command-bar-ui-store.ts` — the AR-4 store pattern.)

## Rules (do not violate)
- **Data/logic, not chrome.** No JSX, no components, no layout. Rendering is UI-4; layout is UX-3.
- **No unbuilt-system imports.** FTS5 (DB-8/M1.4) is UNBUILT — a typed **seam** here; search is a stub. History is
  typed to the v1 shape; it is LIVE since preferences-rescope R5 (read: `preferences/preferences-queries`
  `commandHistoryQuery`; write: `preferences/command-history` — the host wires both, this layer stays pure).
- **Nav is derived, never duplicated.** Navigation commands come from `module-map.ts`; do not re-list modules or
  assume `'/'+key` (routePath is UX-facing — relationships→/people). Carry `visibleWhen`; the host filters by flag.
- **Run-dispatch rule.** Navigation commands act via injected `CommandRunContext.navigate` (router is UI-4-injected);
  action commands call the global Zustand store directly (`useAppShellUIStore.getState()`). Intentional asymmetry.
- **Seed actions = already-built shell state only** (Toggle sidebar). No theme toggle (no theme store yet).
- **No barrel** (`index.ts`) — import specific files (STANDARDS §XX).
- **All search terminal states are explicit + fail-loud** — `search-unavailable` is a real state, never a blank.
