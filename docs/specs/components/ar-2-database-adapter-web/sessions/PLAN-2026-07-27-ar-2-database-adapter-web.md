# PLAN — AR-2 DatabaseAdapter + web-adapter   (session: 2026-07-27-ar-2-database-adapter-web · language: TypeScript)
> Executive summary — read to approve the DIRECTION (Approval 1). Technical build detail is in the
> IMPLEMENTATION-PLAN (gate 2). No-Guessing: every claim [FACT: path:line] / [INTERP] / [UNKNOWN].
>
> **Rev 3 (DIRECTION CORRECTED — sync → async).** Rev 2's approved direction (a *synchronous* driver keeping
> `DrizzleDb` `'sync'` so `repository.ts` stays untouched) rested on a FACT that the INSTALLED library falsifies:
> wa-sqlite@1.0.0's public Factory API implements `step`/`prepare_v2`/`reset`/`finalize`/`open_v2` as
> unconditionally `async function` — a synchronous `SqliteDriver` is **impossible** over wa-sqlite regardless of
> WASM build or VFS. `[FACT: node_modules wa-sqlite/src/sqlite-api.js:742-750, 575-599, 503-560]` The corrected
> direction — **async Drizzle proxy** — is what the delivery plan specified for AR-2 all along
> `[FACT: docs/roadmap/m1.0-delivery-plan.md:100 "wa-sqlite/OPFS, async Drizzle proxy"]`; Rev 1/2's sync choice
> was the deviation. This Rev re-enters the §XXVI gate (§XXVIII step 6: re-PLAN from the broken assumption).

## 1. Context & demand
For the app to boot, it must open its local SQLite database on the user's device and hand the data layer a
working, typed connection. Today it can't: the existing adapter (`packages/core/src/db/adapter.ts`) is
**encryption-first** — `open()` requires a SQLCipher passphrase and verifies an encryption key before the DB is
usable. `[FACT: adapter.ts DatabaseConfig.sqlCipher required :122 (pre-C1); initializeConnection hard-calls cipher :276-283 (pre-C2)]`
But M1.0 deliberately **defers all encryption to M3**. `[FACT: ADR-017; delivery plan §5 "SQLCipher→M3"]` And the
web half — the code that opens a SQLite file in the browser — **does not exist** (`apps/web/src/db/` is empty).
`[FACT: apps/web/src/db/ = .gitkeep only]`

So nothing downstream can run: 6 issues (db-6, db-7, ar-5, ar-6, ar-8, ar-9) are blocked on this adapter. AR-2 is
the **root of the M1.0 spine**. `[FACT: delivery plan §5 depends-on graph]`

## 2. What changes and why
**Why:** until the DB can open (unencrypted, in the browser) and hand back a typed Drizzle instance, no module,
substrate, or service can be built or tested. First buildable brick.

**Execution model (CORRECTED — Rev 3):** the web driver is **asynchronous** — wa-sqlite's Factory API is
async-only, so the `SqliteDriver` methods return Promises, and the Drizzle instance is built with
**`drizzle-orm/sqlite-proxy`** (`drizzle(callback)` → `BaseSQLiteDatabase<'async', …>`), the officially-supported
"async Drizzle proxy" the delivery plan named. `[FACT: node_modules drizzle-orm/sqlite-proxy/driver.d.ts —
drizzle(callback: (sql,params,method)=>Promise<{rows}>) : SqliteRemoteDatabase extends BaseSQLiteDatabase<'async'>]`
Execution physically runs in a **Web Worker** (OPFS `FileSystemSyncAccessHandle` exists only in a worker) using
the **sync WASM build** (`dist/wa-sqlite.mjs`) + **`AccessHandlePoolVFS`** (the VFS explicitly written for the
non-Asyncify build). `[FACT: wa-sqlite/src/examples/AccessHandlePoolVFS.js:30-36 "works with the regular SQLite
WebAssembly build, i.e. the one without Asyncify"]`

**Consequence — the "repository.ts untouched" fence dissolves (it was never a doc requirement).** An `'async'`
`DrizzleDb` means `repository.ts` (which consumes it *synchronously* at ~8 sites) needs a bounded, mechanical
`await`-propagation so `@vida/core` keeps compiling. `[FACT: repository.ts:284,297,307-308,315,329-330,341-344,369,373-376,392]`
This is consistent with the delivery plan's own dependency arrow — repository work is **DB-6**, which *depends on*
AR-2. `[FACT: delivery plan §5 DB-6 "depends-on AR-2"]` AR-2 ships the minimal await-propagation to keep the build
green; DB-6 still owns the real encrypt/decrypt seam work. No app code consumes the repository yet, so blast
radius = **3 core files** (`adapter.ts` + `repository.ts` + `migrations/runner.ts` — the last is the async
`getSchemaVersion` consumer the critique caught), zero app cascade. `[FACT: grep — no createRepository() caller in src; runner.ts:42,52]`

**IN:**
1. **`core/src/db/adapter.ts` — async pass.** `DrizzleDb` → `SqliteRemoteDatabase<typeof schema>` (`'async'`);
   `SqliteDriver` methods (`exec/run/query/batch/close`) → return Promises; the shared migration runner
   (`runMigrations`/`getSchemaVersion`/`setSchemaVersion`) + `initializeConnection` + cipher/connection helpers →
   `await` the driver. **C1/C2 logic is preserved** (optional `sqlCipher`; cipher branch skipped when absent) —
   only sync→async is layered on. `createDrizzle(driver)` returns `drizzle(callback, { schema })`.
2. **`core/src/db/repository.ts` — mechanical async-propagation** at the ~8 call sites (methods become async).
3. **`apps/web/src/db/` — the web-adapter:** a **Web Worker** running the sync wa-sqlite build + `AccessHandlePoolVFS`,
   an **async** `SqliteDriver` over wa-sqlite's Factory API, `createDrizzle` via `sqlite-proxy`, `migrate()` wired
   into open. Ships an **in-worker open/query/persist proof** (not the app bridge).
4. **`apps/web` Vite config** — WASM asset + ES-module worker + `optimizeDeps.exclude: ['wa-sqlite']`. Deps already
   declared (`wa-sqlite`, `drizzle-orm`, `vitest`) — `pnpm install` relinked them. `[FACT: apps/web/package.json; install done]`
5. **Tests** — Node contract layer (async proxy callback over installed `better-sqlite3`) + browser OPFS/worker smoke
   (Playwright) OR an explicit verification-deferred note.

**OUT (explicit):**
- Authoring migrations → **DB-7**; FTS5 → **DB-8**; SQLCipher activation → **M3**.
- The full **main-thread ↔ worker application data binding** (how UI code calls the worker DB) → **AR-4/UI-4**.
  AR-2 proves the driver works *inside* the worker; the async proxy callback is co-located in the worker (no
  premature postMessage RPC). `[FACT: delivery plan §5 AR-4 "state + routing"]`
- The encrypt/decrypt **seam** semantics of the repository → **DB-6** (AR-2 only keeps it compiling under async).
- Native mobile/desktop adapters → later.

## 3. Relevant business rules (functional)
- **BR1 [NEW]** — the DB **opens without encryption** in M1.0: no passphrase required to reach a usable DB. `[ADR-017]`
- **BR2 [FACT, preserved]** — the **encryption seam survives**: when a `sqlCipher` config is provided, `open()`
  configures + verifies the cipher; M3 activation is a config change, not a code change. `[ADR-002 §4]`
- **BR3 [FACT]** — the adapter is **platform-agnostic**: `DatabaseAdapter`/`SqliteDriver` is the only contract;
  the web worker impl is one concrete provider. `[ADR-001 §5]`
- **BR4 [FACT]** — `open()` distinguishes **first-run vs reopen** via `exists()`. `[adapter.ts]`
- **BR5 [FACT]** — **migrations run on open** via the shared `runMigrations` (each in a transaction; failure →
  rollback, version unchanged). Empty registry today ⇒ no-op at version 0. `[adapter.ts; runner.ts ALL_MIGRATIONS=[]]`
- **BR6 [FACT]** — data **persists across reloads** via OPFS. `[ADR-001:59]`
- **BR7 [CORRECTED, decided]** — the driver is **asynchronous**: `DrizzleDb` is `'async'` (via `sqlite-proxy`), so
  `repository.ts` becomes async at its call sites. `[Rev 3; wa-sqlite Factory API async :742-750; sqlite-proxy driver.d.ts]`

## 4. Acceptance (functional — gate-1, direction-observable)
- [ ] The adapter opens a DB **with no passphrase** (plain path), and still routes through configure+verify **when a
      `sqlCipher` config is supplied** (seam present).
- [ ] `DrizzleDb` is `'async'` (`SqliteRemoteDatabase`); `@vida/core` `tsc --noEmit` stays green with `repository.ts`
      **async-propagated** (bounded edit, no behavior change beyond await).
- [ ] The web driver is an **async `SqliteDriver`** backed by the sync wa-sqlite build + `AccessHandlePoolVFS` in a
      Web Worker; the Drizzle instance is built with `sqlite-proxy`.
- [ ] The core barrel's adapter/repository exports are unchanged in **shape** (only sync→async on results).
> Build-level DoD (persistence round-trip, failing-migration rollback, full test matrix) lives in the durable
> `_index.md §2` and is proven at gate-2 / implementation.

## 5. Open questions / pending decisions
- [DECIDED, Victor 2026-07-27] Execution model = **async driver + `sqlite-proxy` + Web Worker** (sync WASM build +
  `AccessHandlePoolVFS`). Corrects Rev 1/2's sync choice; aligns to delivery-plan AR-2.
- [DECIDED, Victor 2026-07-27] `repository.ts` async-propagation **rides into AR-2** (keeps core compiling); DB-6
  owns the real seam work.
- [DECIDED, Victor 2026-07-27] Encryption deferral = **optional `sqlCipher` config** seam (C1/C2, already built).
- [RESOLVED by install-check] "async Drizzle proxy" = `drizzle-orm/sqlite-proxy`, installed + first-class → the
  Rev-2 "custom Drizzle sync session" risk (old C6) is **deleted**, and drizzle owns `mapResultRow` internally so
  the old B2 type-gap is moot. `[FACT: sqlite-proxy/driver.d.ts; session.js:7,118]`
- [FOR GATE 2 — bounded] the async migration-runner keeps our **hand-written-SQL** `runMigrations` (ADR-016), NOT
  drizzle's `ProxyMigrator` (drizzle-kit folder format). `[FACT: sqlite-proxy/migrator.d.ts]`

## 6. Approval 1 (direction)
[APPROVED — Victor, 2026-07-27] Rev-3 async direction confirmed (reverses Rev-1/2 sync; adopts the delivery-plan's
async Drizzle proxy; repository.ts async-propagation rides into AR-2). IMPLEMENTATION-PLAN Rev 3 (gate 2) follows.
