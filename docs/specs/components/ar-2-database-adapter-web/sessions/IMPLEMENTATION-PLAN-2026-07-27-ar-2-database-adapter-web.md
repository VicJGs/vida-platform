# IMPLEMENTATION-PLAN — AR-2 DatabaseAdapter + web-adapter (session: 2026-07-27-ar-2-database-adapter-web · language: TypeScript)

> Gate 2 — read to catch a wrong/missing/destructive step BEFORE code. Self-sufficient; each step cites the PLAN
> rule it satisfies. No-Guessing: [FACT: path:line] / [INTERP] / [UNKNOWN]. **[VERIFY]** = build-time check against
> installed library `.d.ts` — never guess an API.
>
> **Rev 3 (DIRECTION CORRECTED — sync → async).** wa-sqlite@1.0.0's Factory API is async-only
> `[FACT: sqlite-api.js:742-750,575-599,503-560]` → a sync driver is impossible → adopt the delivery-plan's
> **async Drizzle proxy** (`drizzle-orm/sqlite-proxy`, installed + first-class). This DELETES Rev-2's C6 (custom
> sync session — the "one real risk") and the B2 mapResultRow type-gap (drizzle's proxy owns `mapResultRow`
> internally `[FACT: sqlite-proxy/session.js:7,118]`). New central detail = the proxy callback's **positional-array
> row contract** (step A5/W2). C1/C2 (sqlCipher optional + cipher branch) are already committed to the working tree
> and are preserved — they only get async-wrapped in the A-pass.

## 1. Contexto completo

- **Approved direction (gate 1, Rev 3):** async `SqliteDriver`; `DrizzleDb` = `SqliteRemoteDatabase<typeof schema>`
  (`'async'`) built via `drizzle-orm/sqlite-proxy`; execution in a Web Worker (sync WASM build + `AccessHandlePoolVFS`);
  `repository.ts` async-propagated to keep `@vida/core` compiling. `[PLAN §2/§6, Victor 2026-07-27]`
- **Current code (baseline, FACT):**
  - `adapter.ts` — post-C1/C2: `DatabaseConfig.sqlCipher?` optional `[adapter.ts:117-124]`; `initializeConnection`
    branches on `config.sqlCipher` `[adapter.ts:281-295]`; `DrizzleDb = BaseSQLiteDatabase<'sync',void,typeof schema>`
    `[adapter.ts:23]` (← A1 flips to async); `SqliteDriver` methods are **sync** `[adapter.ts:48-63]` (← A2 flips);
    `runMigrations` is `async` but calls `driver.run` sync `[adapter.ts:181-210]`; `getSchemaVersion`/`setSchemaVersion`
    sync `[adapter.ts:150-171]`.
  - `repository.ts` — consumes `DrizzleDb` sync at 8 sites: `create` `[:284]`, `findById` `[:297]`, `findAll`
    `[:307-308]`, `findWhere` `[:315]`, `count` `[:329-330]`, `update` `[:340-344,369,372-376]`, `hardDelete` `[:392]`;
    `del` calls `update`/`hardDelete` `[:383-389]`; the `Repository<T>` interface method sigs are sync `[:46-... ]`. No
    `createRepository(` caller exists in src → zero downstream cascade. `[FACT: grep]`
  - `apps/web/src/db/` = `.gitkeep` only; `vite.config.ts` present; deps declared + relinked (`pnpm install` done). `[FACT]`
- **Verified installed-library facts:**
  - wa-sqlite@1.0.0 Factory API async: `step`/`prepare_v2`/`reset`/`finalize`/`open_v2`/`close`/`changes` all
    `async function`; row-extraction (`row`,`column`,`column_names`,`column_*`) is sync. `[FACT: sqlite-api.js:742-750,575,599,503,560,467,247; 691,255,359]`
  - `AccessHandlePoolVFS`: `new AccessHandlePoolVFS(directoryPath)` then `await vfs.isReady` (NO `static create`).
    For the non-Asyncify (sync) WASM build. `[FACT: examples/AccessHandlePoolVFS.js:36,55-63; :30-34]`
  - `drizzle-orm/sqlite-proxy`: `drizzle(callback[, batchCallback], config)` → `SqliteRemoteDatabase<TSchema>` (extends
    `BaseSQLiteDatabase<'async',SqliteRemoteResult,TSchema>`); `callback:(sql,params,method:'run'|'all'|'values'|'get')
=> Promise<{rows:any[]}>`. Proxy session maps positional rows via `mapResultRow` internally. `[FACT: sqlite-proxy/driver.d.ts; session.js:7,107-132]`
  - `drizzle-orm/sqlite-proxy` migrator = `ProxyMigrator(migrationQueries:string[])` (drizzle-kit folder format) —
    **NOT used**; AR-2 keeps the hand-written-SQL `runMigrations` (ADR-016). `[FACT: sqlite-proxy/migrator.d.ts]`
  - `better-sqlite3@12.8.0` installed → Node contract stand-in (positional via `.prepare(sql).raw().all(params)`). `[FACT]`
- **Durable docs:** `docs/infrastructure/database-layer/current-*` — refreshed by `[C]`; §4/§5 promote there (§XXIX).

## 2. Escopo de mudanças

**IN:** `core/src/db/adapter.ts` (async pass A1–A5) · `core/src/db/repository.ts` (async-propagation R1) ·
`core/src/db/migrations/runner.ts` (async-propagation R2) · `apps/web/vite.config.ts` (W1) ·
`apps/web/src/db/{web-driver.ts, worker.ts, web-adapter.ts, index.ts, web-adapter.test.ts}` (W2–W5).

| NÃO se faz (OUT)                                              | Por quê                                                       |
| ------------------------------------------------------------- | ------------------------------------------------------------- |
| author migrations · FTS5 · activate SQLCipher                 | DB-7 · DB-8 · M3                                              |
| repository encrypt/decrypt **seam** semantics                 | DB-6 — AR-2 only async-propagates to keep it compiling        |
| main↔worker app data binding (React calls DB via postMessage) | AR-4/UI-4 — AR-2's proxy callback is co-located IN the worker |
| native adapters                                               | later                                                         |
| drizzle `ProxyMigrator` / drizzle-kit                         | ADR-016 hand-written SQL runner is retained                   |

## 3. Mudanças exatas

### A1 — `adapter.ts`: `DrizzleDb` → async proxy type

- **op:** add `import { drizzle, type SqliteRemoteDatabase } from 'drizzle-orm/sqlite-proxy'`; replace
  `export type DrizzleDb = BaseSQLiteDatabase<'sync',void,typeof schema>` → `export type DrizzleDb =
SqliteRemoteDatabase<typeof schema>`. Drop the now-unused `BaseSQLiteDatabase` import if nothing else needs it.
- **satisfies:** BR7 · **[VERIFY]** `SqliteRemoteDatabase<typeof schema>` accepts our `schema` barrel as `TSchema`.
  **[NIT — critic]** the barrel currently exports zero tables, so drizzle's relational builder (`db.query.*`) is
  unusable — irrelevant here since repository uses only `db.select/insert/update/delete`. `[FACT: schema/index.ts]`
  `drizzle(cb, {schema})` binds overload 1 (`config`), NOT the batchCallback overload (`{schema}` is not a function). `[VERIFIED: driver.d.ts two overloads]`

### A2 — `adapter.ts`: `SqliteDriver` async + positional `values`

- **op:** methods return Promises: `exec(...):Promise<RawQueryResult>`, `run(...):Promise<void>`,
  `query<T>(...):Promise<T[]>` (**object rows** — internal: migrations, schema version), `batch(...):Promise<void>`,
  `close():Promise<void>`. **ADD** `values(sql:string, params?:unknown[]):Promise<unknown[][]>` — **positional-array
  rows** for the ORM proxy path (drizzle indexes by position). `Migration.up` already `void|Promise<void>` — keep.
- **satisfies:** BR7 + PLAN §2 IN-1 · **why two shapes:** `getSchemaVersion` reads `rows[0].value` (object) `[:152-156]`;
  the proxy needs positional arrays `[sqlite-proxy example]`. One method can't serve both.

### A3 — `adapter.ts`: async-ify migration runner + helpers

- **op:** `await` every driver call: `runMigrations` (`await driver.run('BEGIN…')`/`up`/`COMMIT`/`ROLLBACK`) `[:193-205]`;
  `getSchemaVersion`→`async`, `await driver.query` `[:150-161]`; `setSchemaVersion`→`async`, `await driver.run` `[:166-171]`;
  `configureSqlCipher`/`configureConnection`/`verifyCipherKey`→`async`, `await driver.run/query` `[:220-266]`.
- **satisfies:** BR5 · **verify:** `runMigrations` still: empty registry ⇒ no-op v0; failure ⇒ ROLLBACK, version unchanged.

### A4 — `adapter.ts`: `initializeConnection` async (preserve C1/C2 branch)

- **op:** `export async function initializeConnection(...)` — `if (config.sqlCipher) { await configureSqlCipher(...);
await verifyCipherKey(...) }`; `await configureConnection(...)`. Logic identical to committed C1/C2, only awaited. `[:281-295]`
- **satisfies:** BR1/BR2.

### A5 — `adapter.ts`: `createDrizzle` via sqlite-proxy (shared helper) — **central step**

- **op:** implement `createDrizzle(driver): DrizzleDb` as `return drizzle(async (sql, params, method) => {
if (method === 'run') { await driver.run(sql, params); return { rows: [] } }
const values = await driver.values(sql, params);   // unknown[][] — positional arrays
return { rows: method === 'get' ? values[0] : values } }, { schema })`.
  **⚠ [VERIFIED — critic REVISE 1] the `get` shape:** drizzle's `mapGetResult(rows)` does `const row = rows;
mapResultRow(fields, row, …)` — it treats the callback's `rows` value as **one flat positional row**, NOT an
  array-of-rows (contrast `mapAllResult` which does `rows.map(...)`). So `get` must return `{ rows: values[0] }`
  (the flat first row, or `undefined` when empty — `mapGetResult`'s `if (!row) return undefined` handles the
  empty case correctly). Returning `values.slice(0,1)` (`[[…]]`) would make every column read `undefined`.
  `[FACT: sqlite-proxy/session.js:134-162 (get→mapGetResult), :107-124 (all→mapAllResult→rows.map), utils.js mapResultRow indexes row[i]]`
  `drizzle()` is **sync-returning** (only the callback is async) → `createDrizzle` stays a sync method. Expose it as a
  shared `createDrizzleProxy(driver)` so every platform adapter reuses the mapping (web-adapter's `createDrizzle`
  delegates here — W4).
- **satisfies:** BR3/BR7 + `createDrizzle` contract · **verify:** `db.select().from(fixture).all()` and `.get()` both
  return correctly-shaped typed rows (proven by the W5 Node test that drives THIS shared helper); `tsc` green; `DrizzleDb` is `'async'`.

### R1 — `repository.ts`: mechanical async-propagation

- **op:** make all 8 methods `async` and `await` the drizzle calls (`await db.insert…run()`, `await db.select…all()`)
  — **11 terminal call sites** `[:284,297,307,308,315,329,330,344,369,376,392]`; `del` → `await update(...)` /
  `await hardDelete(...)` `[:383-389]`; update the `Repository<T>` interface `[:46-...]` so each method returns
  `Promise<…>`. No behavior change beyond await. `create`/`update` re-reads (`:286,378`) use `decryptRow` on the
  encrypted local object, not a drizzle read — unaffected.
- **satisfies:** PLAN §2 IN-2 · **verify:** `@vida/core` `tsc --noEmit` green; encrypt/decrypt logic byte-identical.

### R2 — `migrations/runner.ts`: async-propagation [VERIFIED — critic REVISE 2, missed consumer]

- **op:** `currentVersion(driver)` → `async … : Promise<number>` with `return await getSchemaVersion(driver)` `[runner.ts:42-44]`;
  `needsMigration(driver)` → `async … : Promise<boolean>` with `return (await currentVersion(driver)) < LATEST_VERSION` `[runner.ts:52-54]`.
  `migrate` is already async `[runner.ts:35]`; `LATEST_VERSION`/`listMigrations` unaffected. Both are re-exported via
  `index.ts` `[:63-65]` → their public signatures change **sync→async only** (no name/param change).
- **satisfies:** keeps `@vida/core` compiling under the async `getSchemaVersion` (A3) · **verify:** part of the checkpoint tsc.

### ░ CHECKPOINT (after A1–A5 + R1 + R2) ░

- **op:** `pnpm --filter @vida/core typecheck`. **Gate:** green, with the async flip contained to **3 files** —
  `adapter.ts` + `repository.ts` + `migrations/runner.ts` (corrected from the pre-critique "2 files" claim). Proves
  the async contract closes in core before any web code. (Mirror of Rev-2's C1/C2 checkpoint.)

### W1 — `apps/web/vite.config.ts`

- **op:** `optimizeDeps.exclude: ['wa-sqlite']`; ensure `.wasm` served (Vite serves from `assetsInclude`/public or
  `?url`); `worker: { format: 'es' }`. No package.json additions (declared + relinked — N1). No COOP/COEP (N4 —
  `AccessHandlePoolVFS` uses no SharedArrayBuffer). `[FACT: examples/AccessHandlePoolVFS.js]`
- **[VERIFY]** the sync build entry `wa-sqlite/dist/wa-sqlite.mjs` + `wa-sqlite/src/examples/AccessHandlePoolVFS.js`
  import specifiers resolve under Vite ESM worker bundling.

### W2 — `apps/web/src/db/web-driver.ts` (async `SqliteDriver` over wa-sqlite)

- **op:** implement the A2 interface over wa-sqlite's Factory API (all awaited): prepare via
  `str_new`→`prepare_v2`→`bind_collection`→loop `step`===`SQLITE_ROW`→`row()`; `finalize`. `query` zips
  `column_names()` + `row()` → **object** rows; `values` returns raw `row()` **positional** arrays; `run`/`exec`
  execute + report `changes()`/`last_insert_rowid`; `batch` iterates statements; `close` → `sqlite3.close(db)`.
- **[NIT — critic]** prefer delegating to wa-sqlite's built-in helpers where they fit — `sqlite3.run(db,sql,params)`
  `[sqlite-api.js:445]`, `sqlite3.execWithParams`→`{rows,columns}` `[:455]`, and the `sqlite3.statements(db,sql)`
  async iterator `[:722]` — to avoid hand-managing `str_new` pointer lifetimes. Keep the manual path only where a
  helper doesn't expose positional `row()` output.
- **satisfies:** BR7 · **verify:** `SELECT 1` returns a row; `run` reports changes.

### W3 — `apps/web/src/db/worker.ts` (Web Worker bootstrap + in-worker proof)

- **op:** `import SQLiteESMFactory from 'wa-sqlite/dist/wa-sqlite.mjs'` → `const module = await SQLiteESMFactory()`
  → `const sqlite3 = SQLite.Factory(module)` → `const vfs = new AccessHandlePoolVFS('/vida')` → `await vfs.isReady`
  → `sqlite3.vfs_register(vfs, true)` → `const db = await sqlite3.open_v2(dbName)` → build web-driver (W2) →
  `await initializeConnection(driver, config)` (plain — no sqlCipher) → `const drizzle = createDrizzle(driver)` →
  `await runMigrations(driver, ALL_MIGRATIONS)` (no-op v0). Minimal `postMessage` protocol (`open|exec|query|close`)
  as the in-worker proof surface. `[wa-sqlite type example :284-300]`
- **satisfies:** §2 IN-3, BR4/BR5/BR6 · **[VERIFY]** the worker imports the `@vida/core` `schema` barrel under Vite.

### W4 — `apps/web/src/db/web-adapter.ts` (`DatabaseAdapter` impl)

- **op:** `open` (build driver over the open handle; `await initializeConnection` — cipher-free in M1.0),
  `migrate` (`runMigrations`), `createDrizzle` (delegate to core `createDrizzleProxy` — A5), `exists`/`destroy`
  (OPFS `navigator.storage.getDirectory()` — worker context). Runs inside the worker (OPFS is worker-only).
- **satisfies:** BR1/BR2/BR4/BR5/BR6 · **verify:** first-run creates; reopen detects existing; destroy removes.

### W5 — barrel + tests

- `index.ts` re-exports the web factory. **Tests split by env (N2/N3):**
  - **Node contract (Vitest + better-sqlite3):** build a better-sqlite3-backed **`SqliteDriver`** (async methods
    wrapping sync calls; `values` = `db.prepare(sql).raw().all(params)`, `run` = `.run(params)`) and feed it to the
    **real shared `createDrizzleProxy` (A5)** — [VERIFIED — critic REVISE 3] the test MUST exercise the shared helper,
    not a parallel hand-written callback, or it won't cover the A5 `get`/`all` shapes. Then a throwaway `sqliteTable`
    fixture + raw `CREATE TABLE` + `app_state` bootstrap → `createRepository` CRUD round-trip
    (create→findById→findAll→update→delete); `runMigrations` no-op at v0; a fixture failing migration rolls back.
    **[NIT]** note the BigInt divergence — wa-sqlite `column` promotes >2^53 to BigInt, better-sqlite3 truncates to
    Number; harmless for M1.0 field types (TEXT ids, ms timestamps, cents all < 2^53) but documented.
  - **OPFS/worker wiring:** minimal real-browser **Playwright** smoke (open→write→reopen→read) OR explicit
    **verification-deferred note** — `FileSystemSyncAccessHandle` is browser-worker-only (jsdom can't cover it).
- **satisfies:** §6 · **verify:** Node contract green; worker smoke persists (or deferred-note recorded).

## 4. Regras de negócio (técnicas) — PROMOVE → current-business-rules.md

- **[NEW]** BR1 open without `sqlCipher` ⇒ plain DB. `[A4]` · **[FACT]** BR2 config present ⇒ configure+verify (M3). `[A4]`
- **[CORRECTED]** BR7 web driver **async**; `DrizzleDb` `'async'` via `sqlite-proxy`; `repository.ts` async. `[A1/A2/A5/R1]`
- **[FACT]** BR5 migrate on open; empty registry ⇒ no-op v0; failure ⇒ rollback. `[A3; runner.ts]`
- **[FACT]** BR6 OPFS persistence across reload. `[W3]`

## 5. Contrato / estrutura — PROMOVE → current-spec.md

- `DatabaseConfig.sqlCipher?` optional. `SqliteDriver` async + positional `values()`. `DrizzleDb =
SqliteRemoteDatabase<typeof schema>` (`'async'`). Web `DatabaseAdapter`: `open` (plain M1.0), `createDrizzle` via
  `sqlite-proxy`, `migrate`, `exists`, `destroy`. Execution: sync wa-sqlite build + `AccessHandlePoolVFS` in a Web
  Worker; the proxy callback is co-located in the worker. New topology under `apps/web/src/db/`.

## 6. Aceitação & verificação

- [ ] Open fresh DB **no passphrase**; `createRepository` create→read-back a fixture row → reopen → still present. `[W4/W5]`
- [ ] `@vida/core` + `@vida/web` `tsc --noEmit` green; `DrizzleDb` is `'async'`; `repository.ts` async-propagated. `[A1/R1]`
- [ ] Seam unit: `sqlCipher` present ⇒ configure/verify; absent ⇒ skipped. `[A4]`
- [ ] `migrate()` no-op at v0; fixture failing migration rolls back (with `app_state` bootstrapped). `[A3/W5]`
- [ ] Core barrel `adapter`/`repository`/`runner` exports change **sync→async only** (Promise-wrapped results; no
      name/param changes). `[A1/A2/R2]`
- [ ] **[C]** `database-layer` current-\* refreshed; **[L]** `apps/web/src/db/CLAUDE.md`. `[§XXIX]`

## 7. Gates cleared

- /critique: Rev 3 → **REVISE** (independent adversarial critic, 2026-07-27): (1) A5 `get` shape wrong, (2) missed
  `runner.ts` consumer / blast-radius understated, (3) Node test must drive the real shared proxy — **all 3 fixed in
  this Rev**; NITs (W2 built-ins, BigInt note, exports-shape wording, zero-table barrel) folded in. Verified against
  source before accepting.
- /preflight: Rev 3 — folded into the pre-build critique (scope/acceptance/destructive audit clean).
- Aprovação 1 (direção, Rev 3 async): Victor · 2026-07-27 ✅ (PLAN §6)
- Aprovação 2 (liberado p/ implementar): Victor · 2026-07-27 ✅
- POST-IMPL critique (independent, actual code): **SHIP** · 2026-07-27 — 0 blocking, 4 NITs (NIT-1 update-race guard
  APPLIED; NIT-4 layer-doc CREATED; NIT-2 exec forward-surface + NIT-3 count(\*)-at-scale = noted, no action). Verified
  vs installed source. Full typecheck 10/10 · AR-2 tests 6/6 · lint clean.

## 8. Rollback / risco

- **Riskiest steps (Rev 3):** **A5/W2** (proxy callback ⟷ positional-row contract — the `get` flat-row shape was the
  critic's REVISE-1 catch, now pinned to `session.js:134-162`; mitigated further by the W5 Node test driving the real
  `createDrizzleProxy`) and **W3/W5 test env** (OPFS-sync-handle is browser-worker-only — mitigated by the
  Node/better-sqlite3 contract split + a browser smoke). Rev-2's C6 custom-session risk is **gone** (official proxy).
  If `sqlite-proxy` proves unworkable → escalate (do not hand-roll a session).
- **Rollback:** the `adapter.ts`/`repository.ts`/`runner.ts` async flip is revertable (git); `apps/web/src/db/` is new;
  no migrations, no data-model change → nothing destructive. **Checkpoint** after A1–A5+R1+R2 gates core before the web side.
