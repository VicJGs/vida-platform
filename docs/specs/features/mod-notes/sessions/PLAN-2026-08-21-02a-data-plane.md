# PLAN: mod-notes ② · unit 02a — the app data plane (gate-1 SPEC)
Status: implemented      <!-- draft → approved(1) → approved(2) → implemented -->
Unit: MOD-notes increment ② (LIF-131, M1.1), sub-unit **②a — data plane**. Profile: add-frontend-component.
Source-repo: /Users/victor/Documents/CODE/vida-platform
No-Guessing: every claim is [FACT: source] / [INTERP: from fact] / [UNKNOWN: needs X].
Session: 2026-08-21-mod-notes-2 (② opens; ① backend done+merged).

<!--
  FORWARD spec — §1–§4 DESCRIPTION, §5 executable PROMPT citing §1–§4. This is the PLAN (Approval-1 artifact
  of the §XXVI gate). ②a is the FIRST of five ② sub-units (a data-plane → b views → c editor → d panels → e search);
  each is its own gated unit. ②a builds NO rendered UI — it is the wiring the rendered units (②b–e) consume.
-->

## 1. Identity
The **app-side data plane** for the Notes module: the wiring in `apps/web` that lets React components read/write
`pages`/`page_links`/`note_attachments` through the ① `@vida/core` `NotesService` against the local SQLite worker —
**with no HTTP** (local-first, BR-RT-3). It is the prerequisite every rendered ② unit (②b views, ②c editor, ②d
panels, ②e search) depends on. `[FACT: m1.1-delivery-plan.md §4:53 "repository/React-Query wiring"; §9:192-194]`

**Why this is a distinct unit (not folded into the route).** The app-facing Drizzle path is a **deferred seam**: the
main-thread client's `exec`/`values`/`batch` **throw** a documented seam error, homed to "module entity-CRUD (UI-3 /
M1.1+)" — i.e. **this wave closes it**. Until closed, no `createRepository`-backed service can touch the DB in the
browser. `[FACT: apps/web/src/db/client.ts:44,154-162; apps/web/src/db/CLAUDE.md "exec/values/batch … deferred seam"; worker.ts:35-37]`

**The four moving parts.**
1. **Close the worker seam** — the main-thread Drizzle proxy needs exactly `driver.run` (writes) + `driver.values`
   (reads, positional arrays); the worker already owns `driver.values` but exposes no `values` op. `[FACT: adapter.ts:182-198 createDrizzleProxy uses only run+values; worker.ts:38-45 protocol lacks 'values'; db/CLAUDE.md web-driver "values() → positional arrays (the ORM proxy path)"]`
2. **A main-thread `DrizzleDb`** — `createDrizzleProxy(getDbClient().driver)`, memoized. `[FACT: adapter.ts:182; boot.ts getDbClient]`
3. **A device id** — `_sync_device_id` needs a stable per-device value; the app has **none** today. `[FACT: grep deviceId apps/web/src → 0 hits; repository.ts:180,299 _sync_device_id]`
4. **Service + React-Query hooks** — construct `NotesService` (mirroring the ① test wiring) + `usePages`/mutation hooks
   on the `useSchemaVersion` pattern. `[FACT: notes-service.test.ts:64-68; hooks/useSchemaVersion.ts]`

**What it is NOT.**
- **Not a rendered UI unit.** No route replacement, no views, no editor, no `[[` picker — those are ②b–②e. `[FACT: the ② decomposition, task file]`
- **Not schema/service authoring.** ① authored `NotesService`; ②a *constructs + exposes* it in the app, adds no service methods. `[FACT: current-spec.md]`
- **Not encryption/vault wiring.** Repos are empty-`[E]` pass-through → the vault key is never fetched (`getVaultKey()` gated on `encryptedFieldSet.size > 0`). No auth/unlock handshake in scope. `[FACT: repository.ts:249-253]`
- **Not `exec`/`batch` closure.** The Drizzle proxy calls only `run`+`values`; `exec`/`batch` stay the documented deferred seam (migrations run worker-side). `[FACT: adapter.ts:185-194; client.ts:154-162]`

## 2. Business Rules
> Inherits the CORE constitution (ZK-1/2/3, LF-1/2/3) + the AR-4 routing/data rules (BR-RT-*). Every rule complies.

- **DP-1 — No HTTP, ever.** Every read/write resolves against the local SQLite worker via the `SqliteDriver` RPC; there is no server data source (the sync server is a ZK blob relay). `[FACT: BR-RT-3; query-client.ts:9-10,21]`
- **DP-2 — Single worker, single client, single db, single service.** The worker, `WorkerDbClient`, main-thread
  `DrizzleDb`, and `NotesService` are each **module-scope memoized singletons** — React 19 StrictMode's double-invoke
  must not spawn duplicates. `[FACT: boot.ts `??=`/`client` memo R5/R9; query-client.ts R5]`
- **DP-3 — Boot gates data.** No hook queries before `ensureDbReady()` resolves (worker open+migrate). `deviceId` is
  resolved **inside** that boot promise so it is available synchronously to every later `getNotesService()` call;
  calling `getDeviceId()`/`getNotesService()` before boot throws (fail-loud, never a silent empty id). `[FACT: App.tsx dbReady gate; boot.ts ensureDbReady]`
- **DP-4 — Device id is stable + device-local + created-once.** `getOrCreateDeviceId()` reads `app_state` for a
  persisted UUIDv7; absent → generate once + persist; it is **never** synced, never re-generated. Mirrors the
  `getSchemaVersion`/`setSchemaVersion` device-local KV idiom (the `first-run-repo` precedent). `[FACT: adapter.ts:210-232 KV idiom; onboarding/first-run-repo.ts]`
- **DP-5 — `values` returns POSITIONAL arrays, never object rows (silent-corruption guard).** The proxy callback
  branches `method==='run'`→`driver.run`; **every other method (`all`/`get`/`values`) falls through to `driver.values`**
  (`adapter.ts:185-194`) — i.e. every `findWhere`/`findById` read the repository issues arrives as `driver.values`. The
  new worker `values` op MUST return `driver.values(sql,params)` (`unknown[][]`, positional) **untouched** — NOT
  `driver.query()` (object rows). Drizzle's `mapResultRow` maps cells by *index*; feed it object rows and every
  multi-column read mis-indexes silently. Object-keyed `query` stays the internal path (migrations/schema-version) only.
  `[FACT: adapter.ts:74-78,185-194; web-driver.ts values() → positional arrays]`
- **DP-8 — Whole TRANSACTIONS are serialized (concurrent-transaction guard) — NOT individual RPCs.** `db.transaction(cb)`
  under sqlite-proxy emits `run('begin')` … `run('commit')` as **separate** RPCs, and every `NotesService` write goes
  through `pageRepo.create` → `db.transaction((tx)=>createInTx(...))` (`repository.ts:349-351`). The single worker
  connection cannot nest `BEGIN`; the worker's `async onmessage` has no serialization (`worker.ts:63`). **A per-RPC FIFO
  queue does NOT fix this** (gate-2 finding): sqlite-proxy issues each transaction's `BEGIN` at the *top* of its async
  body, so two concurrent `create()`s enqueue *both* `BEGIN`s before either's inner `INSERT`/`COMMIT` → the FIFO order
  becomes `A:BEGIN, B:BEGIN, A:INSERT, …` → it *guarantees* the `BEGIN…BEGIN` throw. The correct unit is the whole
  transaction: ②a wraps `db.transaction` in `getDb()` with a **non-reentrant async mutex** (a promise-chain gate on
  transactions only). This is deadlock-free + reads stay concurrent, proven by the code: every write is exactly one
  `db.transaction` (`repository.ts:349`), `createInTx` opens **no nested transaction** (`:326` "No transaction opened
  here" — so the non-reentrant mutex is never re-entered), and reads use plain `db.select().all()` with no transaction
  (`findById:362`/`findAll:372`) so they bypass the mutex (a read slipping mid-transaction is harmless under single-user
  single-connection). `[FACT: repository.ts:349-351 create=db.transaction; :326 createInTx no nested tx; :362,:372 reads are plain select; drizzle-orm/sqlite-proxy session begin/commit as RPCs]`
- **DP-6 — React-Query is the sole read cache.** Reads go through `useQuery`; writes through `useMutation` that
  **invalidate** the affected query keys (never hand-mutate the cache). Query-key convention `['notes', …]`
  (resource-first, per the volatility table). `[FACT: query-client.ts BR-RT-1; standards/engineering.md §XVII React Query]`
- **DP-7 — Terminal-state mapping is centralized.** A hook's `{isLoading,isError,data}` maps to the platform
  `TerminalState` canon via the existing `src/state-conventions/terminal-state.ts` (reuses the `@vida/core` canon by
  TYPE) — ②b–e read `state` off the hook, they do not re-derive it. `[FACT: state-conventions/terminal-state.ts; @vida/core TERMINAL_STATE]`

**Failure behavior (fail loud).** A worker RPC error rejects the pending promise (already wired, MUST-1); a hook
surfaces it as `isError` + the typed error; no `catch` swallows a DB gap. `[FACT: client.ts:79-83 onerror rejects all pending]`

## 3. Contract
New/changed app-layer surface. No `@vida/core` change except (possibly) barrel re-exports (§5 step 5).

**Worker protocol (`apps/web/src/db/worker.ts` — EDIT):**
- ADD `{ id; op: 'values'; sql; params? }` → `driver.values(sql, params)` → `{ id, ok:true, result: unknown[][] }`.
  `exec` stays the `run` alias (AR-2 compat, do not remove). `[FACT: worker.ts:38-45,85-90]`

**Client driver (`apps/web/src/db/client.ts` — EDIT):**
- Implement `driver.values(sql, params)` → `call({op:'values',sql,params})` → `(res.result ?? []) as unknown[][]`.
  Replaces the throwing SEAM stub. `run` already RPCs. `exec`/`batch` remain the deferred throw (unused by the proxy). `[FACT: client.ts:141-163]`
- ADD `'values'` to the client's `RequestBody` union. `[FACT: client.ts:22-28]`
- **NO client-side serialization queue** (gate-2: a per-RPC queue serializes the wrong unit — see DP-8). Serialization
  lives at the transaction boundary in `drizzle.ts`, not here. The client stays a plain correlated-RPC proxy.

**Main-thread Drizzle (`apps/web/src/db/drizzle.ts` — NEW):**
- `getDb(): DrizzleDb` — `createDrizzleProxy(getDbClient().driver)`, memoized singleton (DP-2), **with `.transaction`
  wrapped by a non-reentrant async mutex** (DP-8): a module-scope `txTail` promise-chain gates `db.transaction(cb)` so
  each whole `begin…commit` completes before the next transaction's `begin` — chain-on-settle so a failed transaction
  doesn't stall the gate, and the caller still sees its own rejection. Reads (`db.select`) are NOT wrapped → concurrent.
  Implement via a `Proxy`/wrapper over the base proxy that intercepts only `transaction`. `[FACT: adapter.ts:182; repository.ts:349,362]`

**Device id (`apps/web/src/db/device-id.ts` — NEW):**
- `getOrCreateDeviceId(driver: SqliteDriver): Promise<string>` — read `app_state['device_id']`; absent → a UUIDv7 (the
  platform PK generator; §5 step 4 pins the actual import) + persist; return it. `getDeviceId(): string` — the cached
  value; throws if boot has not run (DP-3). **Structural template = the app-layer sibling `onboarding/first-run-repo.ts`**
  (`readFirstRunComplete`/`writeFirstRunComplete`: `SELECT value FROM app_state WHERE key=?` / `INSERT OR REPLACE`), not
  just the core `adapter.ts` idiom — mirror that file's shape. **Never-synced is structural, not disciplinary:**
  `app_state (key TEXT PK, value TEXT NOT NULL)` has no `_sync_*` columns and is not repository-managed, so a write
  **cannot** enter `sync_queue` (only `createRepository` writes enqueue). Do NOT route device-id through a repo.
  `[FACT: onboarding/first-run-repo.ts; migrations/runner.ts:111 app_state DDL; repository.ts:344 enqueue-on-write; adapter.ts:210-232 KV]`

**Boot (`apps/web/src/db/boot.ts` — EDIT):**
- `ensureDbReady()` additionally awaits `getOrCreateDeviceId(client.driver)` and caches it (DP-3/DP-4). `[FACT: boot.ts ensureDbReady]`

**Notes service accessor (`apps/web/src/services/notes-service.ts` — NEW):**
- `getNotesService(): NotesService` — memoized; builds the ① dep graph over `getDb()` + `getDeviceId()`, mirroring the
  ① test wiring verbatim: `registry = createTaggableTypeRegistry()`; `spaces = createSpacesService(db, deviceId, registry)`;
  `backlinks = createBacklinkResolver(db, deviceId)`; `createNotesService(db, deviceId, { spaces, backlinks, registry })`.
  Module-scoped (shared infra — MOD-journals will reuse it for JR-1). `[FACT: notes-service.test.ts:64-68]`

**React-Query hooks (`apps/web/src/app/notes/hooks.ts` — NEW):**
- Reads: `usePages(filter?)` → `svc.listPages` · `usePage(id)` → `svc.getPage` · `usePagesByType(type)` ·
  `useBacklinks(entityType, entityId)` → `svc.getBacklinks`. Query keys `['notes','list',filter]` / `['notes','page',id]` / etc.
- Mutations + their **invalidation matrix** (DP-6; pinned now so ②b/②c don't reopen ②a):
  - `useCreatePage` → invalidate `['notes','list']` + `['notes','type',type]`
  - `useUpdatePage` → invalidate `['notes','page',id]` **and** `['notes','list']` + `['notes','type']` (title/updated_at surface in list/collection views — the editor autosave path, ②c)
  - `useSoftDeletePage` → invalidate `['notes','page',id]` + `['notes','list']` + `['notes','type']`
  - `useCreatePageLink`/`useRemovePageLink` → invalidate the `['notes','backlinks']` + `['notes','pagelinks']` **prefixes**
    (a link touches both endpoints; the hook can't enumerate every affected entity key, so coarse-but-correct prefix
    invalidation — refine to per-endpoint keys post-M1.0 if measured hot)
  - **No optimistic updates** (BR-RT-4: writes invalidate-and-reread). Each hook = pure RQ over `getNotesService()`, no business logic (① owns it).
- Every read hook returns `{ …query, state }` where `state = deriveTerminalState(query, isEmpty)` — the EXISTING pure
  derivation (`state-conventions/terminal-state.ts:50`), `isPending`-first (RQ v5), with a per-hook entity-shaped
  `isEmpty` (list → `d => d.length === 0`; single → `d => d == null`). Do NOT re-derive or re-declare the four states.
  `[FACT: terminal-state.ts:50 deriveTerminalState(result, isEmpty); state-conventions/CLAUDE.md "isPending-first, no optimistic"]`

**Types.** No new domain types (① + `@vida/types` own them). Hook option/return types are local (not exported — internal). `[FACT: standards/components.md §VII internal types not exported]`

## 4. Acceptance
- [ ] Worker `values` op returns positional `unknown[][]`; client `driver.values` RPCs it (SEAM throw gone); `exec`/`batch` still throw the documented seam.
- [ ] `getDb()` returns a working main-thread `DrizzleDb`; a round-trip `createPage`→`getPage` reads back the row **through the worker** (not an in-memory db).
- [ ] `getOrCreateDeviceId` persists a UUIDv7 in `app_state` once; a second call (and a reload, same DB) returns the SAME id; it is never enqueued for sync.
- [ ] `getDeviceId()`/`getNotesService()` before boot **throw** (DP-3); after `ensureDbReady()` they resolve; all four singletons are single-instance under StrictMode double-mount.
- [ ] `getNotesService()` wires registry+spaces+backlinks+notes exactly as the ① test harness; `createPage` journal-conflict still throws `JournalExistsError` end-to-end (proves the real DB path, not just unit mocks).
- [ ] **Concurrent-transaction safety (DP-8) — proven at the jsdom tier, not only CI.** A `WorkerLike` mock that RECORDS RPC order asserts: for two `Promise.all` mutations, each transaction's `begin…commit` is **contiguous** (no `begin` arrives before the prior transaction's `commit`). This catches the interleave bug locally (the real-worker `Promise.all` e2e is the CI backstop). Reads issued during a transaction are NOT blocked (mutex is transaction-only).
- [ ] **Positional-read correctness (DP-5):** a multi-column `getPage` reads back every column to the right field (guards against the `values`-op-returns-object-rows mis-index).
- [ ] `usePages`/`usePage`/`usePagesByType`/`useBacklinks` read via RQ; mutations invalidate the right keys (re-fetch observed after `useCreatePage`).
- [ ] Each read hook exposes a DP-7 `state` mapping consumable by a `@vida/ui` view's `state` prop (no re-derivation downstream).
- [ ] **Verify** all five ① factories (`createNotesService`/`createSpacesService`/`createBacklinkResolver`/`createTaggableTypeRegistry` + `NotesService` type) resolve from the **`@vida/core` public entry** — they already do via `export *` chains (`index.ts:117,133,137`), so this is a guard against regression, not expected new work.
- [ ] `pnpm --filter @vida/web typecheck` 0 · `pnpm --filter @vida/web test` green (new: seam round-trip, device-id idempotency, boot-gate throw, hook read/invalidate) · `pnpm --filter @vida/web build` succeeds.
- [ ] Data-plane path is proven in a **real browser** via the **existing QA-1 harness**, following the DOCUMENTED
  MOD-* pattern (`e2e/CLAUDE.md`: "per-module persistence specs, reusing `db`"): a persistence spec on the single `db`
  fixture, over the **durable `app_state` table + a probe key** (NOT a throwaway table), proving (a) the `values` seam
  returns POSITIONAL arrays over the real worker (DP-5) and (b) a Drizzle-path write survives a `page.reload()` OPFS
  reopen. Backdoor gains the `values` op (JSON-serializable). **Run locus: runnable locally via the `chrome-devtools`
  MCP (Brave)** (e2e/CLAUDE.md). The DP-8 concurrency proof stays at the jsdom tier (its correct
  home — `drizzle.test.ts`, deterministic). **NOT in scope:** wiring `getNotesService` into the test-only harness — the
  full service-through-rendered-UI round-trip is ②b's Visual Gate (the app boots the real path + renders a page); doing
  it in the harness would need a second worker on the same OPFS pool. (Visual Gate is ②b's; ②a is non-visual.)
- [ ] `/critique` SHIP · engineering gate PASS · `docs/modules/notes/current-*` (or the app-notes context) born/refreshed (D6/§XXIX) citing the wiring.

## 5. Implementation Prompt
Cites §1–§4; done-check = §4. Build order (seam-out, so each step is testable before the next):

1. **Worker `values` op** — `apps/web/src/db/worker.ts`: add the `'values'` case to `WorkerRequest` + the switch,
   returning `{ ok:true, result: await driver.values(sql, params) }`; drop the `SEAM` note for `values` (keep it for
   `batch`). Satisfies DP-5, §3 worker. `[FACT: worker.ts:38-96]`
2. **Client `values`** — `apps/web/src/db/client.ts`: add `'values'` to `RequestBody`; implement `driver.values` →
   `const res = await this.call({op:'values',sql,params}); return (res.result ?? []) as unknown[][]` (leave `exec`/`batch`
   throwing — proxy never calls them). **No serialization queue here** (gate-2: wrong unit). Satisfies §3 client, DP-5.
   `[FACT: client.ts:22-28,141-163]`
3. **`db/drizzle.ts`** (NEW) — `getDb()` memoized `createDrizzleProxy(getDbClient().driver)`, `.transaction` wrapped by a
   non-reentrant async mutex (DP-8): `let txTail=Promise.resolve(); const run=()=>base.transaction(cb); const p=txTail.then(run,run); txTail=p.catch(()=>{}); return p`.
   Wrap via a `Proxy` intercepting only `'transaction'`; reads pass through untouched. **Verified precondition:** the
   repository opens no nested `db.transaction` (`repository.ts:326`), so the non-reentrant mutex never self-deadlocks.
   Satisfies §3 drizzle, DP-2, DP-8. `[FACT: adapter.ts:182; repository.ts:326,349]`
4. **`db/device-id.ts`** (NEW) — mirror `onboarding/first-run-repo.ts`'s app_state read/write shape;
   `getOrCreateDeviceId(driver)` uses **`import { uuidv7 } from '@vida/core'`** (the platform PK generator, already on
   the public barrel — `index.ts:98`; do NOT hand-roll) + `getDeviceId()` (cached, throws pre-boot); **EDIT `db/boot.ts`**
   so `ensureDbReady()` awaits+caches it. Satisfies §3 device, DP-3/DP-4. `[FACT: index.ts:98 exports uuidv7; onboarding/first-run-repo.ts]`
5. **Barrel VERIFY (no edit expected)** — confirm the five ① factories resolve from `@vida/core` root; the critique
   verified they already do via `export *` chains (`index.ts:117,133,137` → sub-barrels). This step is a regression
   guard; only edit `packages/core/src/index.ts` if a re-export is genuinely missing. `[FACT: index.ts:117,133,137 export* chains]`
6. **`services/notes-service.ts`** (NEW) — `getNotesService()` memoized, wiring per §3 (mirror `notes-service.test.ts:64-68`). Satisfies §3 accessor, DP-2.
7. **`app/notes/hooks.ts`** (NEW) — the read + mutation hooks per §3, on the `useSchemaVersion` shape; mutations
   invalidate keys (no optimistic, BR-RT-4); read hooks attach `state = deriveTerminalState(query, isEmpty)`
   (`terminal-state.ts:50`, `isPending`-first, per-hook `isEmpty`). Satisfies §3 hooks, DP-6/DP-7.
8. **Tests** — (a) jsdom units: `apps/web/src/db/*.test.ts` + `app/notes/hooks.test.tsx` (mock `WorkerLike` for the seam
   RPC; mirror `web-adapter.test.ts` + `useSchemaVersion.test.ts`). **Include the DP-8 wire-order test**: a mock that
   records RPC arrival order + asserts `begin…commit` contiguity under `Promise.all` (§4). (b) **Real-browser spec in the
   EXISTING QA-1 harness** `apps/web/e2e/notes-data-plane.spec.ts` — the DOCUMENTED MOD-* persistence spec (`e2e/CLAUDE.md`):
   on the single `db` fixture, over the **durable `app_state` table + a probe key** (NOT a throwaway table), proving the
   `values` seam (positional read-back) + persistence across `page.reload()`. Adds the `values` op to the `window.__vidaDb`
   backdoor (`harness.ts`) — the doc's "UI-3 fills the `values` seam" forward-ref resolves HERE. Do NOT build a new
   harness, do NOT wire `getNotesService` into the harness (a second worker on the same OPFS pool). JSON-serializable
   returns only. **Browser run is runnable locally via the `chrome-devtools` MCP (Brave).** `[FACT: e2e/CLAUDE.md extension-points + persistence-proof gotcha; db-persistence.spec.ts pattern]`
9. **`/document-context`** the app-notes data context — born current-* (D6, §XXIX).

## 6. Open UNKNOWNs / Decisions Needed
- **[RESOLVED — Step-0/1 baseline] Vault gating.** NOT a blocker: empty-`[E]` repos never call `getVaultKey()`
  (`repository.ts:249-253`). No auth/unlock flow needed for ②a. `[FACT]`
- **[RESOLVED — baseline] Which driver methods the seam needs.** Only `run`+`values` (proxy callback, `adapter.ts:185-194`);
  `exec`/`batch` stay deferred. `[FACT]`
- **[DECISION, low-risk] Hooks colocated under `app/notes/` vs shared `src/hooks/`.** Chosen: module-colocated
  (`app/notes/hooks.ts`) — the `useSchemaVersion` singleton lives in `src/hooks/` because it is app-global; per-module
  entity hooks belong with the module (standards §XVI route org, `_components`/private-folder spirit). The **service
  accessor** stays shared (`src/services/`) since MOD-journals reuses it. `[INTERP: standards §XVI + JR-1 reuse]`
- **[FACT — documented mechanism, NOT an unknown] The browser round-trip harness already exists.** `createDrizzleProxy`
  over the RPC driver is proven at the Node contract level (`web-adapter.test.ts` over better-sqlite3) for the row-shape
  mapping; the **real wa-sqlite/OPFS worker** round-trip is exercised by the shipped **QA-1 Playwright harness**
  (`apps/web/e2e/`, `m1.0-delivery-plan.md:179 ✅`). Its `db` fixture (`fixtures.ts`) is a backdoor over the real worker
  via `window.__vidaDb`, and its header names the exact consumers it was built for: *"UI-3 CRUD, **MOD-\* persistence**,
  DB-10 seed, UX-6."* ②a's browser proof is therefore a **routine addition to shipped infra** — a new `*.spec.ts` using
  the existing `db` fixture + a small extension of the `window.__vidaDb` backdoor to the notes path (the backdoor
  currently drives "only shipped ops"). Not an open question about whether it works. `[FACT: apps/web/e2e/fixtures.ts:4-9; db-persistence.spec.ts; m1.0-delivery-plan.md:179 QA-1 ✅]`
- **[RESOLVED IN-PLAN — gate-1 B1 → gate-2 RETHINK → refolded] Concurrent-transaction interleave.** Gate-1 folded a
  client per-RPC serialization queue; **gate-2 proved that WRONG** (empirically) — sqlite-proxy enqueues each
  transaction's `BEGIN` before its inner statements, so a per-RPC FIFO *guarantees* `BEGIN…BEGIN`. Refolded to serialize
  **whole transactions** via a non-reentrant async mutex wrapping `db.transaction` in `drizzle.ts` (DP-8) — deadlock-free
  (repo opens no nested tx, `repository.ts:326`), reads stay concurrent (plain `select`). Provable at the jsdom tier via
  a wire-order-recording mock (§4), not only the local `chrome-devtools` MCP (Brave) browser. `[FACT: repository.ts:326,349,362; drizzle-orm/sqlite-proxy session]`
- **[RESOLVED IN-PLAN — gate-1 B2] `values`-op row shape.** The op must return positional arrays, not object rows, or
  `mapResultRow` mis-indexes silently. Folded: DP-5 made explicit + §4 positional-read acceptance. `[FACT: adapter.ts:185-194]`

## 7. Change Log
| Date | Session | Change |
|------|---------|--------|
| 2026-08-21 | 2026-08-21-mod-notes-2 | initial ②a PLAN draft — post Step-0 baseline + Step-1 pattern read; seam/device/service/hooks scoped; vault + method-set UNKNOWNs resolved to FACT |
| 2026-08-21 | 2026-08-21-mod-notes-2 | gate-1 critique REVISE→folded: **B1** concurrent-transaction interleave → DP-8 client RPC-serialization queue + §4 Promise.all check; **B2** `values`-op positional-array contract made explicit (DP-5) + §4 positional-read check; R1 barrel already complete (verify-only); R2 device-id mirrors `first-run-repo.ts`; R3 never-synced is structural (no `_sync_*`); R4 cite `:180`→cosmetic. |
| 2026-08-21 | 2026-08-21-mod-notes-2 | Victor: the "remaining unknown" is in the docs → the browser round-trip is NOT unknown: the **QA-1 Playwright OPFS/worker harness already exists** (`apps/web/e2e/`, `m1.0-delivery-plan.md:179 ✅`), and `fixtures.ts` names "MOD-* persistence" as a built-for consumer. §6 UNKNOWN → FACT; §4/§5/§8 point ②a's browser proof at the existing `db` fixture + backdoor extension (no new harness). **Zero open UNKNOWNs.** Approval 1 GRANTED. |
| 2026-08-21 | 2026-08-21-mod-notes-2 | **preflight PASSED** (resolved 2 would-be assumptions to FACT): (A1) `deriveTerminalState(query,isEmpty)` already exists (`terminal-state.ts:50`, RQ-v5 `isPending`-first, no optimistic BR-RT-4) → §3/§5.7 pinned; `uuidv7` on `@vida/core` barrel (`index.ts:98`) → §5.4 pinned. (A2) e2e backdoor extension is the DOCUMENTED MOD-* extension point (`e2e/CLAUDE.md`); JSON-serialization ceiling + **browser run is runnable locally via the `chrome-devtools` MCP (Brave)** → §4/§5.8. No open layer gaps. |
| 2026-08-21 | 2026-08-21-mod-notes-2 | **gate-2 critique RETHINK→refolded (the big catch):** the gate-1 DP-8 per-RPC serialization queue was WRONG — it serializes RPCs but INTERLEAVES transactions (sqlite-proxy enqueues each txn's `BEGIN` before its inner statements → FIFO guarantees `BEGIN…BEGIN`; critic reproduced it empirically). Refolded: serialize **whole transactions** via a non-reentrant async mutex wrapping `db.transaction` in `drizzle.ts` (deadlock-free — `createInTx` opens no nested tx, `repository.ts:326`; reads bypass, stay concurrent). Removed the client queue. Added: DP-8 jsdom **wire-order** acceptance (catches interleave without the local `chrome-devtools` MCP browser); R3/R4 cross-key **invalidation matrix** per mutation (so ②b/②c don't reopen ②a). Cites all re-verified clean. Approval 2 GRANTED. |
| 2026-08-21 | 2026-08-21-mod-notes-2 | **IMPLEMENTED §5.1–9.** typecheck 0 · @vida/web **193 tests** (+13: device-id·drizzle DP-8·client `values`·hooks) · ESLint 0 · build ✓. Rebuilt stale `@vida/core` dist (predated ① `services/notes`). |
| 2026-08-21 | 2026-08-21-mod-notes-2 | **Drift Victor caught (not a §XXVIII deviation — my §4 drifted from the docs):** I framed the e2e as a `getNotesService` create→list + `Promise.all` round-trip → phantom two-worker conflict → tried to escalate a fork. `e2e/CLAUDE.md` FIXES it: MOD-* browser proof = "persistence spec reusing `db`" on the **durable `app_state` + probe key** (NOT a throwaway table, NOT service-in-harness). Corrected §4/§5/§8b + `notes-data-plane.spec.ts` to the documented pattern (values-seam positional read-back + reload-persist via `app_state`). DP-8 concurrency stays jsdom (correct tier); full service-through-UI is ②b's Visual Gate. No fork; docs decided. |
| 2026-08-21 | 2026-08-21-mod-notes-2 | **post-impl critique SHIP** (independent): DP-8 mutex correct (binding to base proxy → no re-entry; no-nested-tx precondition verified across the whole NotesService call graph; the wire-order test genuinely fails if the mutex is removed). 3 minor REVISE folded: R1 `useUpdatePage` narrowed to `keys.type(page.type)` (type immutable on update); R2 dropped the unsound `as PageType` cast (query key = `string`); R3 +3 hook invalidation tests (usePage-empty · useUpdatePage · useCreatePageLink). @vida/web **196 tests** green; typecheck 0; ESLint 0. **②a COMPLETE.** |
