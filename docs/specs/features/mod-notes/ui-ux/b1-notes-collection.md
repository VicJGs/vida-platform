<!-- Entity Delivery Flow · TRACK B (UI/UX Build Flow) · slice B1 · Notes & Pages.
     §XXVI unit spec (gate-1 = this SPEC → ░Doc Gate░). Grounded in delivery/{slice-map,seam-contract,envision,
     interpretation,baseline}.md + the shipped @vida/ui / apps/web code cites below. No-Guessing: every claim is
     [FACT: path:line], [INTERP: from fact], or a flagged ⚠ boundary resolved at THIS gate — never an open decision. -->

# B1 — /notes route + 4 baseline renderers  (MOD-notes ② · slice B1)

## 0. Source model
Code-first interim per `docs/specs/foundation/frontend-source-of-truth.md` (community Figma file built later via the
Figma MCP scripter, NOT Tokens Studio; release-gated M4). No hi-fi mock is the source of truth — the **vision source**
is `delivery/envision.md` (the approved greybox checkpoints EC-4/EC-5) + the shipped `@vida/ui` primitives.
*(Throughout, `delivery/` = `docs/features/notes-and-pages/delivery/`; other cites are repo-root-relative.)* No new
design token is introduced by B1 (it composes UI-1/UI-2 tokens only — §5). `[FACT: frontend-source-of-truth.md; REPO.md:33]`

## 1. Context & scope
B1 opens **TRACK B (② UI)**. It replaces the AR-4 `<h2>Notes</h2>` placeholder (`apps/web/src/app/notes/index.tsx`)
with the **Notes collection surface** — the route that hosts the four hard-coded baseline renderers
(List / Gallery / Calendar / Neural, from `@vida/ui`) and the four terminal states, and that stands up the **first
per-module data-plane wiring** in the app (the `NotesService` singleton + a React-Query read hook). Every later ②
slice (B2–B7) reuses this wiring. `[FACT: slice-map.md:30; seam-contract.md:37]`

**In scope (EC-4, EC-5 — envision.md:28-29):**
- **Route:** replace the AR-4 stub with the real `NotesRoute` default export (still lazy via `routes.tsx`'s
  `lazyRouteComponent(() => import('./app/notes'))` — the boundary already exists). `[FACT: routes.tsx:53-57; app/notes/index.tsx]`
- **The 4 hard-coded renderers** composed from `@vida/ui`: `ListView` · `GalleryView` · `CalendarView` · `NeuralGraph`
  `[FACT: @vida/ui barrel index.ts:40-46]`, selected by an **ephemeral** view-switcher (§2 BR-B1-3).
- **The 4 terminal states** — `loading` / `empty` / `error` / `success` — derived app-side via
  `deriveTerminalState` and passed as the `state` prop (§2 BR-B1-1). **Empty carries a create-CTA** (EC-5).
- **New Note** affordance (button + the empty-state CTA) → a minimal `createPage({type:'note'})` then navigate to
  `/note/[id]` (the B2 detail stub) (§2 BR-B1-4).
- **Row open** → navigate to `/note/[id]`.
- **The service-wiring seam** (convention-fixed, NOT a decision — §2 BR-B1-5/6): `getNotesService()` module-scope
  singleton + a `useNotesList` React-Query hook.
- **The two app-boot preconditions this seam surfaces** (N1/N2 — §2 BR-B1-7/8): `initVault()` before the first
  write, and a device-local `deviceId` in `app_state`.

**Explicitly OUT (later slices — do NOT build; envision EC map slice-map.md:41-53):**
- Real `@vida/editor` mount + collapsible detail rail + **soft-delete confirm** → **B2** (EC-6/7/11).
- `[[` picker → **B3** (EC-3). Entity-link + backlink/links-out panels → **B4** (EC-2).
- **Neural graph EDGES + node-click fan-out** → **B5** (EC-1). B1's Neural renderer shows **nodes only, `edges={[]}`**
  (§2 BR-B1-9) — the page-link fan-out (`getPageLinksFrom`) is B5's. `[FACT: slice-map.md:34,42]`
- **Create-with-tags** + favorite/archive/tag **filter chrome** → **B6** (EC-8/9). B1 calls `listPages({})`
  (unfiltered live notes); the filter *service* (`listPages({favorite,archived,tag})`) is built (A1/A5) but its UI
  is B6. `[FACT: slice-map.md:35; seam-contract.md:42]`
- Journal `/summary` block + Home entry seam → **B7** (EC-5 journal half). `[FACT: slice-map.md:36]`
- **Saved-view selection / per-type view availability (G3) / view builder** → **MOD-spaces ② (ADR-007)**, deferred.
  B1 hard-codes all 4 renderers with an ephemeral switch; it persists no view. `[FACT: slice-map.md:57; structure-data.md:41 [INTENT — DEFERRED: ADR-007]; envision.md:37-48]`

**Pattern to mirror (read before authoring — same layer):**
- **Route:** `app/graph/index.tsx` (a real lazy route degrading to a view's terminal state:
  `<NeuralGraph nodes={[]} edges={[]} state="empty" />`). `[FACT: app/graph/index.tsx]`
- **Data hook:** `hooks/useSchemaVersion.ts` — its header **declares itself the template**: *"The per-module entity
  hooks (`useTasks`, …) follow this shape in their own waves."* A `useQuery` whose `queryFn` calls a `@vida/core`
  read over the DB client. `[FACT: useSchemaVersion.ts:1-15]`
- **Singleton:** `db/boot.ts` `getDbClient()` (module-scope `??=` memo, StrictMode-safe). `[FACT: db/boot.ts:18-40]`
- **Terminal-state glue:** `state-conventions/terminal-state.ts` `deriveTerminalState(result, isEmpty)`. `[FACT: terminal-state.ts:50-58]`
- **View render contract:** `@vida/ui internal/data-view.tsx` `resolveDataViewState` (role/empty self-heal + dev
  contract-warns; `state` is a PROP, the app derives it). `[FACT: internal/data-view.tsx:38-71; list-view.tsx header]`

## 2. Business rules (invariants B1 must hold)
> Inherits the CORE constitution + `standards/{components,design,engineering}.md`. Every rule complies.

- **BR-B1-1 · Terminal state is derived app-side and passed as a prop (package boundary, BR-2).** `@vida/ui` views
  are pure presentational — `state` is a PROP, never derived inside the package (Tamagui-only deps can't import
  `@vida/core`). The app derives via `deriveTerminalState(query, isEmpty)`, which is **`isPending`-first** (loading
  before empty → no empty-flash; error before data → fail-loud over stale `placeholderData`). `[FACT: terminal-state.ts:50-58; list-view.tsx header "state is a PROP, not derived (BR-2)"]`
- **BR-B1-2 · The four states render distinctly; empty self-heals + carries a create-CTA (EC-5).** A `success`
  state with 0 items self-heals to the empty render and dev-warns — the app MUST pass `state="empty"` (via the
  derivation) `[FACT: internal/data-view.tsx:56-60]`. The empty slot (`empty` prop) MUST contain the **New Note
  create-CTA** (a UI-1 `Button`), not bare copy. `error` renders the view's `error` slot (a `role="status"` region).
  `loading` renders the view's skeleton. `[FACT: list-view.tsx ListViewProps empty/error/loadingCount; envision.md:29]`
- **BR-B1-3 · The view-switch is EPHEMERAL client UI state (Zustand), not a persisted view.** The active renderer
  (`list|gallery|calendar|neural`) is "open view" ephemeral state — a Zustand store, NOT React Query, NOT persisted.
  Saved-view *selection* + per-type availability (G3) is the deferred ADR-007 MOD-spaces system; B1 offers a plain
  in-session toggle over all 4 renderers. `[FACT: structure-data.md:36 "Zustand owns … open view (calendar/list/gallery/neural)"; :41 [INTENT — DEFERRED]; engineering.md §XVII "local UI state stays in useState/Zustand"]`
- **BR-B1-4 · New Note = minimal create + navigate; delete deferred.** New Note (button + empty-CTA) →
  `service.createPage({ type: 'note' })` → `router.navigate({ to: '/note/$id' })`. **Tags on create = B6; the
  confirm-gated soft-delete = B2 (EC-11).** B1's only row action is **open** (navigate). `[FACT: slice-map.md:31,35; envision.md:32,35; seam-contract.md:38 "B1 ← listPages/getPagesByType/getPageByJournalDate"]`
- **BR-B1-5 · The read-hook seam is convention-fixed (NOT a decision).** `useNotesList()` is a `useQuery` (the
  `useSchemaVersion` template it names) → `getNotesService().listPages({})`; query key **`['pages','list']`**
  (the documented `(type|id|entity|journal_date)` keying) `[FACT: structure-data.md:35; engineering.md §XVII key convention]`.
  **No optimistic updates by default (BR-RT-4):** writes invalidate-and-reread (`queryClient.invalidateQueries`),
  the derivation is read-side only. `[FACT: state-conventions/CLAUDE.md "No optimistic updates by default (BR-RT-4)"]`
  React-Query hooks are the documented ② concern. `[FACT: current-spec.md:62 "React-Query hooks → ②"]`
  **Seam subset (explicit, not silent):** B1 binds `listPages({})` ONLY. `getPagesByType`/`getPageByJournalDate`
  (the other B1-tagged seam reads, seam-contract.md:37) are seam-available but **unconsumed** until per-type view
  availability (G3, MOD-spaces) / the B7 journal slice needs them — B1 renders one unfiltered live-notes collection.
- **BR-B1-6 · The service singleton is convention-fixed (N4 construction · `db/boot` memoization).**
  `getNotesService()` is a module-scope memoized singleton (mirrors the `readyPromise ??=` memo in `db/boot`),
  constructing once from the **already-barrel-exported** factories — Notes **composes** the seams, constructs none
  of the DB adapter itself:
  ```ts
  const db = createDrizzle(getDbClient().driver)          // web-adapter.ts:70 → createDrizzleProxy
  const registry = createTaggableTypeRegistry()           // PRE-SEEDED from ENTITY_TYPES (page/note/journal/… + DB-4 domain types) → N3 satisfied, no manual seeding
  const spaces = createSpacesService(db, getDeviceId(), registry)   // SAME registry instance Notes gets
  const backlinks = createBacklinkResolver(db, getDeviceId())
  return createNotesService(db, getDeviceId(), { spaces, backlinks, registry })
  ```
  `[FACT: interpretation.md N4; seam-contract.md:8; db/boot.ts:37 readyPromise??=; web-adapter.ts:70-71; spaces/registry.ts:14-30 seeds from _registry ENTITY_TYPES; spaces/service.ts:63-66 createSpacesService(db,deviceId,registry)]`
  **Factories need no export** — `createNotesService`/`NotesService` (`index.ts:137 export * from './services/notes'`),
  `createSpacesService`/`createTaggableTypeRegistry` (`:117 './foundation/spaces'`), `createBacklinkResolver`
  (`:133 './services/search'`), `createDrizzleProxy`/`uuidv7` (`:66,:98`) are ALL already on the `@vida/core` barrel.
  ⚠ **One genuine flat re-export IS needed (gate-2 BLOCKER, verified):** the **Row types** (`PageRow`/`PageLinkRow`/
  `NoteAttachmentRow`) are only under the `schema` namespace (`index.ts:62 export * as schema`), so `import { PageRow
  }` fails TS2305 → B1 adds `export type { PageRow, … } from './db/schema/notes'` (the seam-contract's ②-facing
  "Returns = Drizzle Rows" surface, `seam-contract.md:12`). This is a REAL missing flat export — distinct from the
  earlier phantom "fold" that wrongly claimed the *factories* weren't exported.
  `[FACT: packages/core/src/index.ts:62,66,98,117,133,137; schema/notes.ts:104,106,108; seam-contract.md:12]`
- **BR-B1-7 · N2 deviceId is a device-local precondition B1 surfaces first (⚠ boundary → resolved minimally here).**
  Every repository write stamps `_sync_device_id` `[FACT: interpretation.md N2; repository.ts:299,426]`, but
  `apps/web` has **no device-id key** (grep: none) — though the **app_state I/O precedent already ships**:
  `onboarding/first-run-repo.ts` does `SELECT/INSERT OR REPLACE … app_state WHERE key=?` over `getDbClient().driver`
  `[FACT: first-run-repo.ts:13,23]`. B1 adds `db/device.ts` mirroring it. **Async/sync split (mirrors
  `ensureDbReady`/`getDbClient`):** `ensureDeviceId(): Promise<string>` — boot-time, reads/gen-once a **UUIDv7** in a
  single `app_state` row + memoizes; `getDeviceId(): string` — the sync accessor the singleton uses (throws if called
  before boot resolves it). This keeps `getNotesService()` synchronous (BR-B1-6). Shared app infra surfaced by the
  first service consumer — minimal, grounded, not a Notes-owned concept; a later module reuses both.
  `[FACT: schema/index.ts:7 "DB-7 app_state (device-local infra)"; app-state.ts:7 "will later hold … device_id"; first-run-repo.ts:12,23 app_state SELECT/INSERT-OR-REPLACE; db/boot.ts:19-20 getDbClient(sync)+:36-37 ensureDbReady(async) split; ADR-003:84 device_id; CLAUDE.md Conventions "PKs: UUIDv7"; interpretation.md N2]`
- **BR-B1-8 · N1 libsodium must be ready before the first write (New Note).** Reads do NOT need an unlocked vault
  (N9 empty-`[E]` → `getVaultKey` dormant), so the *collection read* works pre-unlock; but `createPage` stamps
  `_sync_hash` via `hashContent` → `initVault()` (`sodium.ready`) MUST have run or it throws
  `"Vault not initialized — call initVault() first"` (assert via substring/regex, `vault.ts:31`). B1 calls
  `initVault()` at app boot (after `ensureDbReady`, before the router mounts) — the app-side
  fulfillment of N1. `[FACT: interpretation.md N1/N9; repository.ts:169,340,432; vault.ts:23-33; App.tsx ensureDbReady seam]`
- **BR-B1-9 · Neural renderer in B1 = nodes only.** `NeuralGraph` renders one node per listed page, `edges={[]}`
  (the `getPageLinksFrom` fan-out + node-click nav are **B5**). With 0 pages it degrades to `state="empty"`
  (the `app/graph` precedent). `[FACT: slice-map.md:34,42; app/graph/index.tsx]`
- **BR-B1-10 · Full visual-state + a11y + responsive coverage (standards §VIII/§XIV/§X).** All four states × light/dark
  × 375/768/1440; keyboard-navigable (view-switch = tabs/roving per its primitive; New Note reachable; row open via
  Enter); focus-visible ring on every interactive element; the view region carries an accessible name (the
  `resolveDataViewState` dev-warn is a locked gate). `[FACT: components.md §VIII; engineering.md §XIV; design.md §X; internal/data-view.tsx warnMissingName]`

## 3. Contract (the B1 surface)
```ts
// apps/web/src/app/notes/index.tsx — the route component (default export, lazy-mounted)
export default function NotesRoute(): JSX.Element     // replaces <h2>Notes</h2>

// apps/web/src/app/notes/notes-collection.tsx — the screen (named + default, engineering §XVI)
export function NotesCollection(): JSX.Element         // composes the 4 renderers + view-switch + terminal states

// apps/web/src/app/notes/use-notes-list.ts — the read hook (mirrors useSchemaVersion)
export function useNotesList(): UseQueryResult<PageRow[]>   // queryKey ['pages','list'] → listPages({})

// apps/web/src/app/notes/notes-service.ts — the module-scope service singleton (mirrors db/boot)
export function getNotesService(): NotesService              // ??= createNotesService(db, deviceId, deps)

// apps/web/src/db/device.ts — N2 device-local id (shared app infra, surfaced by B1)
export function ensureDeviceId(): Promise<string>          // boot: read/gen-once a UUIDv7 in app_state (mirrors first-run-repo.ts)
export function getDeviceId(): string                      // sync accessor (throws pre-boot) — keeps getNotesService() sync

// apps/web/src/stores/notes-view-store.ts — ephemeral open-view (Zustand, BR-B1-3)
export type NotesView = 'list' | 'gallery' | 'calendar' | 'neural'
export const useNotesViewStore: UseBoundStore<...>          // { view, setView }
```
- `NotesCollection` derives `state = deriveTerminalState(query, d => d.length === 0)` and fans out to the active
  renderer, passing `items` + `state` + an `empty` slot (the New Note CTA) + an `error` slot.
- Renderer props follow each view's shipped API (`items`/`renderItem`/`getKey` for `ListView`/`GalleryView`; the
  calendar/graph mappers for `CalendarView`/`NeuralGraph`). `[FACT: @vida/ui barrel index.ts:40-46]`

## 4. Acceptance — ░Visual Gate░ (blocking, per slice-map.md:38)
Real browser (chrome-devtools / Brave), **no batching, no owed gate**:
1. **EC-4 MUST:** all four renderers reachable from one `/notes` surface via the view-switch; each renders the
   populated collection; New Note present; a row opens `/note/[id]`.
2. **EC-5 MUST:** each renderer shows `loading` / `empty` / `error` / `success` **distinctly**; the **empty state
   carries a working create-CTA**; a forced query error renders the error region (not a blank).
3. **Matrix:** every state × {light | dark} × {375 · 768 · 1440}; screenshots captured as gate evidence.
4. **§XIV a11y sweep:** keyboard-only walk (Tab order = reading order, view-switch arrow-navigable, Enter opens a
   row, New Note reachable), focus-visible rings, view region has an accessible name, contrast AA. VoiceOver trace
   of the switch + a row.
5. **Data-plane smoke (real DB, catches N1/N2):** with the app booted (`ensureDbReady` + `ensureDeviceId` +
   `initVault`), the collection reads live `pages`; New Note creates a real row (round-trips into the list after
   invalidate); a New Note attempted with libsodium NOT ready reproduces `/Vault not initialized/` (substring) in a
   unit test (guards BR-B1-8).
6. **Gates:** `pnpm --filter @vida/web test` green · root `typecheck` 0 · `eslint` 0 · `/component-audit` +
   `victor:quality-gate-components` + `victor:quality-gate-engineering` PASS.
7. **§XXIX currency:** refresh `notes-and-pages/current-spec.md` (add the ② B1 surface) + this context's docs at gate
   close; commit WITH the code.

## 5. Implementation prompt (built after Approval 1 → IMPLEMENTATION-PLAN g2)
1. `apps/web/src/db/device.ts` — `ensureDeviceId(): Promise<string>` (boot; read/gen-once UUIDv7 in `app_state`,
   mirroring `first-run-repo.ts` I/O + `db/boot` memo) + `getDeviceId(): string` (sync accessor).
2. `apps/web/src/App.tsx` — after `ensureDbReady`, `await ensureDeviceId()` (N2) + `await initVault()` (N1) before
   the router branch; keep the boot gate/Loading surface until all resolve. `[FACT: App.tsx ensureDbReady seam]`
   *(No core-barrel edit — the factories are already exported; see BR-B1-6.)*
3. `apps/web/src/app/notes/notes-service.ts` — `getNotesService()` singleton (memoized construct: `createDrizzle` +
   sync `getDeviceId()` + `createTaggableTypeRegistry()` + `createSpacesService` + `createBacklinkResolver`).
4. `apps/web/src/stores/notes-view-store.ts` — the ephemeral Zustand `open-view` store.
5. `apps/web/src/app/notes/use-notes-list.ts` — `useNotesList` (`useQuery`, key `['pages','list']`).
6. `apps/web/src/app/notes/notes-collection.tsx` — the screen: derive terminal state, render the active renderer,
   the New Note CTA in `empty` + a header New Note button, row-open nav. TS types first → default → all 4 states →
   dark → responsive (375→768→1440).
7. `apps/web/src/app/notes/index.tsx` — replace the `<h2>` with `<NotesCollection/>` (default export retained).
8. Tests (`*.test.tsx`): derivation → each state render; view-switch; New Note create+invalidate; the N1 unit guard.

## 6. Decisions — none open (all doc-fixed at this Doc Gate)
- **The service-wiring seam** (singleton + hook + deps) is fixed by the shipped conventions (`useSchemaVersion`
  self-declared template · `db/boot` memoization · N4 · `current-spec.md:62`). It was **wrongly surfaced as a
  provider-vs-singleton fork in-session (2026-08-25) — Victor drift-catch;** re-grounded to the convention here. No fork.
- **New Note behavior, delete deferral, Neural nodes-only, ephemeral view-switch** are all doc-fixed by the slice-map
  EC map + envision + structure-data (BR-B1-3/4/9), not judgment calls.
- **⚠ boundary (resolved here, flagged for the gate):** `ensureDeviceId`/`getDeviceId` (N2) + boot `initVault()` (N1)
  are **shared app infra** that B1 surfaces as the first service consumer. Minimal grounded fulfillment (an
  `app_state` UUIDv7 mirroring the shipped `first-run-repo.ts` I/O + two boot calls) — NOT a Notes-owned concept; a
  later module reuses both. Doc Gate (2026-08-25) confirmed fulfillment, not invention (`app-state.ts:7` names
  `device_id`; N9 keeps the read path vault-free, so the boot wiring is load-bearing only for the New Note write).
- **⚠ Gate history (2026-08-25):** Doc-Gate killed a **false "⚠ Fold — add barrel exports"** (a one-line-short read of
  `core/index.ts:136` comment missed `:137`; the *factories* are all exported). Gate-2 then found the **inverse, real**
  gap: the Row *types* (`PageRow`…) are namespace-only (`:62`) → B1 adds ONE flat `export type` re-export (build-step 0).
  Net: no factory fold; one genuine Row-type re-export (BR-B1-6).
