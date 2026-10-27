# IMPLEMENTATION-PLAN — notes-rescope R2 · Mode memory

> §XXVI **gate 2** (rev 1, 2026-10-27) for the approved `PLAN-R2-mode-memory.md` (rev 4, Approval 1: Victor 2026-10-27).
> `/preflight` **PASSED**; its 3 assumptions are resolved in §0. Each step: tests first → red → implement → green.
> A divergence = §XXVIII (STOP). Worktree `.claude/worktrees/notes-rescope` @ `8722d19`, Node 24, suites run alone.

## 0. Gate-2 refinements (to be critiqued here)

- **R-1 · Driver source.** Read and write through `(await ensureDbReady()).driver`, not the synchronous `getDbClient()`:
  readiness parity with `composition-root.ts:119`. `ensureDbReady` returns the `WorkerDbClient` `[FACT: db/boot.ts:36]`.
- **R-2 · `NoteEntityView` keeps a default store.** New optional prop `modeStore?: EntityModeStore`; the default is a
  module-level `createInMemoryEntityModeStore('tabbed')` (today's behaviour), so the existing tests and `?sample` are
  unchanged. `NoteEntity` passes the `app_state` store on the live path.
- **R-3 · The override is per mount.** `const [override, setOverride] = useState<FacetMode | null>(null)`;
  `mode = override ?? modeStore.readMode(type, id)`. `key={id}` on `NoteEntityView` already resets it per page
  `[FACT: note-entity.tsx (key={id})]`.
- **R-4 · A toggle made while the read is in flight survives the read (keeps G3 "the cache IS the map" true).** FACT
  (query-core 5.101.4): a resolving fetch calls `setData(data)` unconditionally (`build/modern/query.js:300`), so rows
  read before the write would replace a `setQueryData` made during the fetch. That leaves the cache stale (Tabbed) while
  the DB holds Merged, and the next mount of that page (navigate away and back) opens in the wrong mode. Fix: a
  module-level `sessionWrites: Map<key, FacetMode>` that `persist` fills, and the `queryFn` returns
  `{ ...rowsFromDb, ...Object.fromEntries(sessionWrites) }` **after** its await. Not `cancelQueries` (it would revert to
  pending and drop the other rows). `__resetEntityModes()` (test-only, says so in its comment) clears it; `mode-memory.test.tsx`
  calls it in `afterEach`, with a fresh `QueryClient` per test. `sessionWrites` is per tab and per load (a reload clears it);
  that sentence joins PLAN G11 on Approval 2.
- **R-5 · Signature + names.** `createAppStateEntityModeStore(rows, defaultFor, persist)` takes `defaultFor` as a
  parameter because the adapter must not import notes code (PLAN G3 showed `(rows, persist)`); the hook is
  `useEntityModeStore` (PLAN G3 called it `useEntityModes()`). Same behaviour.

## 1. Build steps

### Step 1 — core accessor (test A1)
- `packages/core/src/db/app-state.ts`:
  ```ts
  export const ENTITY_MODE_PREFIX = 'entity_mode:'
  export const entityModeKey = (entityType: string, entityId: string) => `${ENTITY_MODE_PREFIX}${entityType}:${entityId}`
  readAppState(driver, key)      // SELECT value FROM app_state WHERE key = ?  → rows[0]?.value ?? null
  readAppStatePrefix(driver, p)  // SELECT key, value FROM app_state WHERE substr(key, 1, length(?)) = ?   [p, p]
  writeAppState(driver, key, v)  // INSERT OR REPLACE INTO app_state (key, value) VALUES (?, ?)
  deleteAppState(driver, key)    // DELETE FROM app_state WHERE key = ?
  ```
  Header in the `adapter.ts` KV idiom style; a comment states why the prefix query is not LIKE and that it binds the
  prefix twice.
- `packages/core/src/index.ts`: export the six names beside `getSchemaVersion`/`setSchemaVersion`.
- `packages/core/src/db/tests/app-state.test.ts`: **copy** the better-sqlite3 driver helper
  (`migrations-runner.test.ts:32`; it isn't exported, and each test file holds its own copy). On a `:memory:` DB call
  `ensureInfra(driver)` (`migrations/runner.ts:109`), which is what creates `app_state`; `runMigrations` does not. Then
  cover the A1 cases.
- `pnpm --filter @vida/core build` (apps/web consumes the core dist).

### Step 2 — per-type defaults + the app_state store (tests B2, B3)
- `apps/web/src/notes/mode-defaults.ts`: `registerModeDefault(type: string, mode: FacetMode)`,
  `defaultModeFor(type): FacetMode` (fallback `'tabbed'`); registers `note` → `'tabbed'`; header names the RIDE owners.
- `apps/web/src/entity/adapter.ts`:
  ```ts
  export function createAppStateEntityModeStore(
    rows: Readonly<Record<string, string>> | undefined,
    defaultFor: (entityType: string) => FacetMode,
    persist: (key: string, mode: FacetMode) => void,
  ): EntityModeStore
  ```
  `readMode` = `rows?.[entityModeKey(t,id)]` if it's `'merged'|'tabbed'`, else `defaultFor(t)`; `persistMode` =
  `persist(entityModeKey(t,id), mode)`. The `EntityModeStore` doc comment is rewritten (storage resolved: `app_state`,
  R2). `createInMemoryEntityModeStore` stays.
- Tests: `adapter.test.ts` gets B2 (valid / unknown / missing row; persist called once with the key); `mode-defaults.test.ts`
  gets B3.

### Step 3 — the preload + the page (tests B4, B5)
- `apps/web/src/notes/use-entity-modes.ts` → `useEntityModeStore(enabled: boolean): EntityModeStore`:
  - `useQuery({ queryKey: ['app_state','entity_mode'], queryFn: async () => Object.fromEntries((await
    readAppStatePrefix((await ensureDbReady()).driver, ENTITY_MODE_PREFIX)).map(r => [r.key, r.value])), enabled,
    staleTime: Infinity, retry: false, retryOnMount: false })`; on error, `console.error` once (an effect keyed on
    `query.error`).
  - `persist(key, mode)`: `sessionWrites.set(key, mode)` (R-4); `qc.setQueryData(KEY, (old) => ({ ...(old ?? {}), [key]:
    mode }))`; then `void ensureDbReady().then(c => writeAppState(c.driver, key, mode)).catch(e => notifyError('remember
    this page’s layout', e))`.
  - The `queryFn` merges `sessionWrites` over the rows it read, after its await (R-4).
  - `useMemo(() => { const persist = …; return createAppStateEntityModeStore(query.data, defaultModeFor, persist) },
    [query.data, qc])`, with `persist` defined inside, so the deps are honest.
- `notes/note-entity.tsx`:
  - `NoteEntity`: at the top, before any early return, `const sample = devFlagActive('sample')` (the existing helper,
    `note-entity.tsx:37`; `devSampleActive` in `use-note-entity.ts` is private) and `const modeStore =
    useEntityModeStore(!sample)`; render `<NoteEntityView key={id} page={page} modeStore={sample ? undefined :
    modeStore} />`. The loading ladder is unchanged (G4).
  - `NoteEntityView({ page, modeStore = referenceStore })`: `override` state (R-3); `mode = override ??
    modeStore.readMode(page.type, page.id)`; `onModeChange(next)` → `modeStore.persistMode(page.type, page.id, next)` then
    `setOverride(next)` (in the handler, G7).
  - Header and comments updated (G13).
- Tests in a new `notes/mode-memory.test.tsx` (B4 + B5), copying the `read-retry.test.tsx:28-41` scaffolding:
  - mock `../db/composition-root` with `getServices().notes.getPage` (and `writePageContent`);
  - mock `@tanstack/react-router` `getRouteApi` with a **mutable id** (for "navigate → read count flat");
  - mock `../db/boot`: `ensureDbReady` → a fake driver whose `query` records calls and returns rows (or a deferred
    promise), and whose `run` records writes. The real `@vida/core` accessors run against it (dist; Step 1 builds).
  The cases are PLAN §4 B4 (the write-failure case also asserts: navigate away and back → still Merged for the session),
  **plus** (R-4): toggle while pending → rows without the key arrive → navigate to another note
  and back → still Merged, and the cache holds `merged`.
- `notes/read-retry.test.tsx`: add the same `../db/boot` mock (a driver returning no rows), so `NoteEntity` never reaches
  the real `ensureDbReady` → `new Worker` in jsdom.

### Step 4 — docs (G10, G12, G13; currency)
- `docs/core/decisions/ADR-006-spaces-foundation-universal-tags.md`: an `**Amended:** 2026-10-27 (notes-rescope R2) —
  §3.6 per-instance facet-mode memory …` line after `**Amends:**` (line 9), and **`**3.6 Per-instance facet-mode memory
  (Amendment · 2026-10-27 · notes-rescope R2).**`** after 3.5, before "What this decision does NOT do". Content per
  PLAN G12, worded with "seeded default while loading".
- `slice-map.md` R5 bullet: the transactional `entity_mode` delete (G10). `business-rules.md` NP-9 list: "+ its
  `app_state` `entity_mode` row".
- Stale headers per G13: `entity/adapter.ts`, `entity/CLAUDE.md`, `note-entity.tsx`, `docs/specs/foundation/fe-codec-entity-facet/delivery/seam-contract.md:86`.
- Currency: `docs/modules/notes/current-*` BR-SUR-5 → app_state memory, plus a BR-R2-1…7 section.

### Step 5 — live leg + Visual Gate + gates
- `apps/web/e2e/notes-mode-memory.spec.ts` (PLAN §4 C). Seed two notes through the harness; `bootAt(page, '/')`; open
  note 1 → Merged → wait 1 s → **`bootAt(page, '/notes/<id1>')`** (a hard navigation re-runs the first-run gate) →
  polling `expect`: the Merged button `aria-pressed="true"` and no `tablist` "Entity facets" (`entity-view.tsx:174-178,198`;
  the default shows first, then the page settles in Merged); note 2 → Tabbed; harness read-back `entity_mode:note:<id1>`
  = `merged`.
- Visual Gate: the R1 script with a merged-after-reload case added; compare against R1's shots.
- `pnpm typecheck` · `pnpm lint` · core `db/tests/app-state` + the web suite (alone) · `/critique`.

## 2. Files
New: `core/src/db/app-state.ts` + `db/tests/app-state.test.ts` · `web/src/notes/{mode-defaults, use-entity-modes}.ts` +
`mode-defaults.test.ts` + `mode-memory.test.tsx` · `e2e/notes-mode-memory.spec.ts`. Changed: `core/src/index.ts` ·
`entity/adapter.ts` (+test, CLAUDE.md) · `notes/note-entity.tsx` · `notes/read-retry.test.tsx` (boot mock) · docs per
Step 4. Untouched: `@vida/ui`, `@vida/types`, `@vida/editor`.

## 3. Risks
- **A visible switch after load** is the slice's stated behaviour (seeded default while loading), not a defect. The page
  re-renders once when the rows arrive.
- **Worker RPC:** one extra local read per session. Concurrent load is the known suite flake (run suites alone).

## 4. Change log
- rev 1 (2026-10-27) — drafted after preflight PASSED.
- rev 2 (2026-10-27) — gate-2 critique r1 **REVISE** (2 blocking, verified): (1) a toggle during the in-flight read was
  overwritten in the cache (`query.js:300` `setData`) → R-4 `sessionWrites` merged in the queryFn, plus a test; (2)
  `devSampleActive` is private and `sample` undefined → `devFlagActive('sample')` at the top of `NoteEntity`. Folded: the
  test scaffolding (router/getPage/boot mocks), the `read-retry` boot mock, the core test via `ensureInfra` + copied driver
  helper, `persist` inside `useMemo`, the e2e `bootAt` + polling assertions, R-5 names, the full seam-contract path.
- rev 3 (2026-10-27) — critique r2 **SHIP**; folded: `__resetEntityModes` in `afterEach`, the write-failure navigate-back
  assertion, the G11 per-tab/per-load sentence.
- **APPROVED by Victor (Approval 2) on 2026-10-27.**

## 5. Build record
- Steps 1–4 tests-first, green: core `app-state` 4/4 (+ migrations-runner 10/10 total) · web 906/906 (122 files) · tsc 0 ·
  lint 0 errors. Live (Brave, real OPFS): `e2e/notes-mode-memory.spec.ts` ✓ (Merged survives a reload; the second note keeps
  Tabbed; read-back `merged`; a mere open writes nothing) + R0/R1 specs still green. Visual Gate `.playwright-mcp/r2-live/`
  7/7 (axe 0 light/dark; one chip; no overflow/overlap), identical to R1.
- **Observed, not R2's (recorded):** the EntityView facet `Tabs` receives `aria-label="Entity facets"` but the rendered
  `role="tablist"` carries no accessible name in the a11y tree — a pre-existing `@vida/ui` Tabs labelling gap (the e2e
  asserts through the Merged/Tabbed `aria-pressed` instead). Sibling fix for `@vida/ui` Tabs; not in R2's file list.
- Test-only timeout: `mode-memory.test.tsx` 20 s (full-page renders with navigations; the R1 read-retry precedent).
- **Visual Gate ACCEPTED by Victor on 2026-10-27.** R2 done.
