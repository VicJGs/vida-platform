# PLAN — AR-2 DatabaseAdapter + web-adapter   (session: 2026-07-27-ar-2-database-adapter-web · language: TypeScript)
> Executive summary — read to approve the DIRECTION (Approval 1). Not the technical build detail (that is the
> IMPLEMENTATION-PLAN, gate 2). No-Guessing: every claim [FACT]/[INTERP]/[UNKNOWN].
> Rev 2 (post-critique REVISE): sync/async fork RESOLVED (sync + Web Worker, Victor 2026-07-27); async-proxy
> miscite corrected; adapter change re-scoped from "rebuild" to targeted; acceptance tightened to gate-1 level.

## 1. Context & demand
For the app to boot, it must open its local SQLite database on the user's device and hand the data layer a
working, typed connection. Today it can't: the existing adapter (`packages/core/src/db/adapter.ts`) is
**encryption-first** — `open()` requires a SQLCipher passphrase and verifies an encryption key before the DB is
usable. `[FACT: adapter.ts open()/configureSqlCipher/verifyCipherKey; DatabaseConfig.sqlCipher required :117-129]`
But M1.0 deliberately **defers all encryption to M3**. `[FACT: ADR-017; delivery plan §5 "SQLCipher→M3"]` And the
web half — the code that actually opens a SQLite file in the browser — **does not exist**
(`apps/web/src/db/` is empty). `[FACT: apps/web/src/db/ = .gitkeep only]`

So nothing downstream can run: 6 issues (db-6, db-7, ar-5, ar-6, ar-8, ar-9) are blocked on this adapter. AR-2
is the **root of the M1.0 spine**. `[FACT: Linear blocked-by graph]`

## 2. What changes and why
**Why:** until the DB can open (unencrypted, in the browser) and hand back a typed Drizzle instance, no module,
substrate, or service can be built or tested. First buildable brick.

**Execution model (DECIDED — Victor 2026-07-27):** the web driver is **synchronous** — wa-sqlite's *synchronous*
build + `OPFSCoopSyncVFS`, running in a **Web Worker**. This keeps `DrizzleDb` at its current `'sync'` kind, so
the existing `repository.ts` (which consumes a sync `DrizzleDb`) is **untouched** and the AR-2 ⊥ DB-6 scope fence
holds. `[FACT: wa-sqlite docs — sync build + OPFSCoopSyncVFS "all synchronous methods… don't return Promises", must run in a Web Worker]`
`[FACT: adapter.ts:23 DrizzleDb = BaseSQLiteDatabase<'sync', …>; repository.ts consumes it synchronously]`

**IN:**
1. **Targeted change to `core/src/db/adapter.ts`** — make `DatabaseConfig.sqlCipher` **optional**; `open()` opens
   a plain DB when it's absent, and configures+verifies the cipher when present (the untouched M3 path). **Keep**
   the interface shapes (`DatabaseAdapter`, `SqliteDriver` — **sync**, `Migration`) and the encryption-agnostic
   helpers (`runMigrations`, `getSchemaVersion`, `setSchemaVersion`, `configureConnection`) **as-is**. This is a
   narrow edit, not a rewrite. `[Victor D1/D2, 2026-07-27]`
2. **Build the web-adapter** — `apps/web/src/db/`: a **Web Worker** running the sync wa-sqlite build +
   `OPFSCoopSyncVFS`, implementing the **sync** `SqliteDriver`/`DatabaseAdapter`, wiring `migrate()` into the open
   sequence. Ships a **minimal worker bootstrap** sufficient to open/query/persist inside the worker (a proof).
3. **Add `wa-sqlite`** dep + Vite WASM-asset + worker wiring in `apps/web`. Sync build for M1.0 (SQLCipher-bundled
   build is an M3 swap). `[INTERP: ADR-001:59 "custom WASM build with SQLCipher bundled" — deferred to M3]`
4. **Adapter unit/integration tests** — open (plain), reopen, persist, migrate no-op, seam-when-config-present.

**OUT (explicit):**
- `repository.ts` — **not edited**; it stays sync (the decision above is what makes that possible). Its
  vault-decoupling/pass-through is **DB-6**. `[FACT: delivery plan §5 DB-6]`
- Authoring migrations → **DB-7**; FTS5 → **DB-8**; SQLCipher activation → **M3**.
- The full **main-thread ↔ worker application data binding** (how UI code calls the worker DB) → **AR-4/UI-4**
  (app shell/state). AR-2 proves the driver works *inside* the worker; it does not wire the whole app to it.
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
- **BR7 [NEW, decided]** — the driver is **synchronous**: `DrizzleDb` stays `'sync'`, so the sync `repository.ts`
  contract is preserved and untouched. Web async lives only at the worker boundary (an app-shell concern, later).
  `[Victor 2026-07-27; wa-sqlite OPFSCoopSyncVFS]`

## 4. Acceptance (functional — gate-1, direction-observable)
- [ ] The adapter opens a DB **with no passphrase** (plain path), and still routes through configure+verify **when a
      `sqlCipher` config is supplied** (seam present).
- [ ] `DrizzleDb` remains `'sync'`; `@vida/core` `tsc --noEmit` stays green **with `repository.ts` unedited**.
- [ ] The web driver is a **sync `SqliteDriver`** backed by wa-sqlite + `OPFSCoopSyncVFS` in a Web Worker.
- [ ] The core barrel's adapter exports are unchanged in shape (no consumer/type breakage).
> Build-level DoD (persistence round-trip, failing-migration rollback, full test matrix) lives in the durable
> `_index.md §2` and is proven at gate-2 / implementation — not a gate-1 direction criterion.

## 5. Open questions / pending decisions
- [DECIDED, Victor 2026-07-27] Execution model = **sync driver + Web Worker** (OPFSCoopSyncVFS). Scope fence with
  DB-6 holds; `repository.ts` untouched.
- [DECIDED, Victor 2026-07-27] Encryption deferral = **optional `sqlCipher` config** seam.
- [CORRECTED CITE] "async Drizzle proxy" appears **only** in the delivery-plan table (m1.0-delivery-plan.md:100),
  **not** in ADR-001 (grep: no "proxy"/"async" in ADR-001). It is an **unratified roadmap phrasing**; AR-2
  deliberately does **not** adopt it (stays sync). If a future need forces async, it earns its own ADR. `[FACT: grep ADR-001]`
- [FOR GATE 2 — bounded] exactly how much main↔worker bridge AR-2 ships vs AR-4: recommend AR-2 delivers the
  worker + an in-worker open/query/persist proof; the app-facing async binding is AR-4/UI-4. Not blocking Approval 1.

## 6. Approval 1 (direction)
[APPROVED — Victor, 2026-07-27] Direction approved. IMPLEMENTATION-PLAN (gate 2 = build) follows.
Post-approval verification (feeds gate 2): Drizzle's public `sqlite-proxy` is **async-only**; a `'sync'`
`DrizzleDb` over a custom driver requires a **custom Drizzle sync session** (the `expo-sqlite`/`better-sqlite3`
pattern: `new SQLiteDatabase("sync", dialect, session, schema)` with sync `run/all/get/values`). This is AR-2's
central build step + main risk. `[FACT: context7 drizzle-orm-docs — sqlite-proxy async; expo-sqlite driver "sync"]`
