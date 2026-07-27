# IMPLEMENTATION-PLAN — AR-2 DatabaseAdapter + web-adapter   (session: 2026-07-27-ar-2-database-adapter-web · language: TypeScript)
> Gate 2 — read to catch a wrong/missing/destructive step BEFORE code. Self-sufficient; each step cites the PLAN
> rule it satisfies. No-Guessing: [FACT: path:line] / [INTERP] / [UNKNOWN]. **[VERIFY]** = build-time check against
> installed library `.d.ts` — never guess an API.
> Rev 2 (post-critique REVISE): corrected against the INSTALLED packages — VFS = `AccessHandlePoolVFS` (not the
> docs' `OPFSCoopSyncVFS`, absent in wa-sqlite@1.0.0); reference driver = `sql-js/session.js` (positional arrays);
> `mapResultRow` type-gap handled; deps already declared (prereq = `pnpm install`); test via better-sqlite3 stand-in.

## 1. Contexto completo
- **Approved direction (gate 1):** sync driver + Web Worker; `DrizzleDb` stays `'sync'`; `repository.ts` untouched;
  optional `sqlCipher` seam. `[PLAN §6, Victor 2026-07-27]`
- **Current code (baseline, FACT):** `adapter.ts` — `DatabaseConfig.sqlCipher` **required** `[adapter.ts:122]`;
  `initializeConnection` hard-calls `configureSqlCipher`+`verifyCipherKey`+`configureConnection` `[adapter.ts:276-283]`;
  `DrizzleDb = BaseSQLiteDatabase<'sync',void,typeof schema>` `[adapter.ts:23]`; `getSchemaVersion` catches the
  missing-`app_state` case → 0 `[adapter.ts:150-161]`. `repository.ts` imports only the `DrizzleDb` type +
  consumes it sync — **unedited it still compiles** once `sqlCipher` is optional & `'sync'` kept. `[repository.ts]`
- **Schema reality (FACT, from critique):** the `@vida/core` `schema` barrel exports **column helpers + `_registry`/
  `_shared` only — ZERO tables**. So tests cannot write through "the real schema"; they use a throwaway fixture. `[schema/index.ts]`
- **apps/web (FACT):** Vite + React; `apps/web/src/db/` empty; `package.json` **already declares** `wa-sqlite@^1.0.0`,
  `drizzle-orm@^0.45.1`, `@vida/core`, `vitest` — but wa-sqlite is in the lockfile **not linked** (stale) → `pnpm install` needed. `[apps/web/package.json]`
- **Verified installed-library facts (critique inspected node_modules):**
  - wa-sqlite@1.0.0 ships **`AccessHandlePoolVFS`** (sync `xRead`/`xWrite`; async `create()` + `isReady` bootstrap;
    no SharedArrayBuffer → **no COOP/COEP needed**). `OPFSCoopSyncVFS` does **NOT** exist here. `OriginPrivateFileSystemVFS` is async (Asyncify) — unusable. `[node_modules wa-sqlite/src/examples/]`
  - drizzle-orm@0.45.1 **publicly exports** `SQLiteSession`, `SQLitePreparedQuery`, `SQLiteSyncDialect`,
    `BaseSQLiteDatabase` from `sqlite-core` — constructible by user code (proven by installed `better-sqlite3`,
    `sql-js`, `expo-sqlite` drivers). `[node_modules drizzle-orm/sqlite-core]`
  - `mapResultRow` is a **runtime** export of `drizzle-orm` but **absent from `utils.d.ts`** → a direct typed import
    fails strict `tsc`. `[node_modules drizzle-orm/utils.d.ts]`
  - Correct sync-driver blueprint for a WASM engine returning **positional arrays** = **`sql-js/session.js`**
    (`values()` → arrays + `normalizeFieldValue` + `mapResultRow`). NOT expo-sqlite (object rows). `[node_modules drizzle-orm/sql-js]`
- **Durable docs:** `docs/infrastructure/database-layer/current-*` — refreshed by `[C]`; §4/§5 promote there (§XXIX).

## 2. Escopo de mudanças
**IN:** `packages/core/src/db/adapter.ts` (optional seam) · `apps/web/vite.config.ts` (WASM/worker) ·
`apps/web/src/db/{worker.ts, sync-driver.ts, drizzle-sync-session.ts, web-adapter.ts, index.ts, web-adapter.test.ts}`.
**Prereq:** `pnpm install` (relink wa-sqlite@1.0.0).

| NÃO se faz (OUT) | Por quê |
|---|---|
| edit `repository.ts` | DB-6; sync decision keeps it compiling unedited |
| author migrations · FTS5 · activate SQLCipher | DB-7 · DB-8 · M3 |
| full main↔worker app data binding (React calls DB) | AR-4/UI-4 — AR-2 ships an in-worker proof only |
| native adapters | later |

## 3. Mudanças exatas

### C1 — `adapter.ts`: `sqlCipher` optional
- **locate:** `sqlCipher: SqlCipherConfig` in `interface DatabaseConfig` `[adapter.ts:122]` · **op:** replace →
  `sqlCipher?: SqlCipherConfig  // absent in M1.0 (plain DB); present activates encryption at M3`
- **satisfies:** BR1/BR2 · **verify:** `@vida/core` `tsc --noEmit` green, repository.ts untouched.

### C2 — `adapter.ts`: branch `initializeConnection`
- **locate:** `initializeConnection` body `[adapter.ts:276-283]` · **op:** wrap cipher calls in
  `if (config.sqlCipher) { configureSqlCipher(driver, config.sqlCipher); verifyCipherKey(driver) }`; always
  `configureConnection(driver, config)`.
- **satisfies:** BR1 (plain when absent) + BR2 (seam when present) · **verify:** unit — spy shows cipher PRAGMAs skipped w/o config, called w/ config.

### C3 — `pnpm install` + `apps/web/vite.config.ts`
- **op:** run `pnpm install` (relink wa-sqlite). Vite: `optimizeDeps.exclude: ['wa-sqlite']`, `assetsInclude`/`.wasm`
  served, `worker: { format: 'es' }`. **No package.json dep additions needed** (already declared — N1).
- **[VERIFY]** exact installed import specifiers before coding: the sync wa-sqlite ESM entry + the
  `AccessHandlePoolVFS` example path (grep `node_modules/.../wa-sqlite/`). **[VERIFY-DONE]** no COOP/COEP (N4).
- **satisfies:** PLAN §2 IN-3.

### C4 — `apps/web/src/db/worker.ts` (Web Worker)
- **op:** `SQLiteESMFactory()` → `SQLite.Factory(module)` → `const vfs = await AccessHandlePoolVFS.create(name, module)`
  → **`await vfs.isReady`** (if present) → `vfs_register(vfs, true)` → `open_v2(dbName)`. Build the sync driver (C5),
  the Drizzle sync db (C6); `await migrate(driver)`. Expose a minimal `postMessage` protocol
  (`open|exec|query|close`) — proof only. `[wa-sqlite AccessHandlePoolVFS; adapter.ts migrate]`
- **satisfies:** §2 IN-2, BR3/BR5/BR6/BR7 · **verify:** worker boots; data survives reopen.
- **[VERIFY]** the worker can import the `@vida/core` `schema` barrel under Vite's ESM worker bundling.

### C5 — `apps/web/src/db/sync-driver.ts` (sync `SqliteDriver`)
- **op:** implement `exec/run/query/batch/close` (from `adapter.ts` `SqliteDriver`) over wa-sqlite's **sync** API,
  modeled on **`sql-js/session.js`**: `query` uses `values()`-style row iteration returning **positional arrays**,
  each cell passed through a `normalizeFieldValue` equivalent. All synchronous (valid inside the worker).
- **satisfies:** BR7 · **verify:** `SELECT 1` returns rows synchronously; `run` reports `changes`/`lastInsertRowId`.

### C6 — `apps/web/src/db/drizzle-sync-session.ts` (custom Drizzle sync session) — **central step**
- **op:** subclass `SQLitePreparedQuery` (sync `run/all/get/values`; `all` maps positional rows via `mapResultRow`
  when `fields` present) + `SQLiteSession` + use `new SQLiteSyncDialect()`; export `createDrizzle(driver): DrizzleDb`
  returning `new BaseSQLiteDatabase('sync', dialect, session, schema)`. **Blueprint: `sql-js/session.js`** (positional
  arrays), NOT expo-sqlite. `[node_modules drizzle-orm/sql-js/session.js]`
- **[VERIFY-FIRST]** pin the exact `sqlite-core` class signatures against installed `drizzle-orm@0.45.1` `.d.ts`.
- **[B2 fix]** `mapResultRow` is not in `utils.d.ts`: either (a) re-implement its small mapping locally (preferred —
  no internal-import type break), or (b) import from `drizzle-orm` with a single commented `@ts-expect-error`.
  Choose (a) unless the local re-impl diverges from installed behavior. `[node_modules utils.d.ts]`
- **satisfies:** BR7 + `createDrizzle` contract · **verify:** `db.select().from(fixtureTable).all()` returns correctly-shaped typed rows; `tsc` green, `DrizzleDb` still `'sync'`.

### C7 — `apps/web/src/db/web-adapter.ts` (`DatabaseAdapter` impl)
- **op:** implement `open` (no `sqlCipher` → plain; calls `initializeConnection`, which C2 makes cipher-free),
  `migrate` (runner), `createDrizzle` (C6), `exists`/`destroy` (OPFS `navigator.storage.getDirectory()`).
- **satisfies:** BR1/BR2/BR4/BR5 · **verify:** first-run creates; reopen detects existing; destroy removes.

### C8 — barrel + tests
- `index.ts` re-exports the web factory. **Tests split by env (N2/N3):**
  - **Contract layer in Node (Vitest) against better-sqlite3** (installed, synchronous stand-in): prove the sync
    `SqliteDriver` + the Drizzle sync session + a **throwaway `sqliteTable` fixture** (+ raw `CREATE TABLE` and an
    `app_state` bootstrap) → create row → read back; `migrate()` no-op at v0; a fixture failing migration rolls back.
  - **OPFS/worker wiring** proven by a **minimal real-browser smoke** (Playwright) OR marked verification-deferred
    with an explicit note — `FileSystemSyncAccessHandle` exists only in a browser worker, so jsdom can't cover it.
- **satisfies:** §6 · **verify:** Node contract tests green; worker smoke opens+persists (or deferred-note recorded).

## 4. Regras de negócio (técnicas) — PROMOVE → current-business-rules.md
- **[NEW]** BR1 open without `sqlCipher` ⇒ plain DB. `[C1/C2]`  · **[FACT]** BR2 config present ⇒ configure+verify (M3). `[C2]`
- **[NEW]** BR7 web driver synchronous (`AccessHandlePoolVFS`, worker); `DrizzleDb` `'sync'`; repository untouched. `[C5/C6]`
- **[FACT]** BR5 migrate on open; empty registry ⇒ no-op v0 (missing-table safe); failure ⇒ rollback. `[adapter.ts:150-161; runner.ts]`
- **[FACT]** BR6 OPFS persistence across reload. `[C4]`

## 5. Contrato / estrutura — PROMOVE → current-spec.md
- `DatabaseConfig.sqlCipher?` optional. Web `DatabaseAdapter`: `open` (plain M1.0), `createDrizzle(driver):
  BaseSQLiteDatabase<'sync',…>` via a custom `sql-js`-style sync session, `migrate`, `exists`, `destroy`. Execution:
  sync wa-sqlite + **`AccessHandlePoolVFS`** in a Web Worker. New topology under `apps/web/src/db/`.

## 6. Aceitação & verificação
- [ ] Open fresh DB **no passphrase**; write row via Drizzle (fixture table) → reopen → read back. `[C7/C8]`
- [ ] `@vida/core` + `@vida/web` `tsc --noEmit` green, `repository.ts` **unedited**; `DrizzleDb` still `'sync'`. `[C1/C6]`
- [ ] Seam unit: `sqlCipher` present ⇒ configure/verify; absent ⇒ skipped. `[C2]`
- [ ] `migrate()` no-op at v0; fixture failing migration rolls back (with `app_state` bootstrapped). `[C8]`
- [ ] Core barrel adapter exports unchanged in shape. `[C1]`
- [ ] **[C]** `database-layer` current-* refreshed; **[L]** `apps/web/src/db/CLAUDE.md`. `[§XXIX]`

## 7. Gates cleared
- /critique:  REVISE (Rev 1) → B1 VFS name, B2 mapResultRow, B3 reference-driver, N1–N4 fixed in Rev 2 · 2026-07-27
- /preflight: <pending re-run on Rev 2>
- Aprovação 1 (direção): Victor · 2026-07-27 ✅
- Aprovação 2 (liberado p/ implementar): <pending>

## 8. Rollback / risco
- **Riskiest steps (corrected):** **C6** (custom sync session — mitigated by [VERIFY]-first + `sql-js` blueprint +
  local `mapResultRow`) and **C4/C8 test env** (OPFS-sync-handle is browser-worker-only — mitigated by the
  Node/better-sqlite3 contract split + a browser smoke). If the sync session proves unworkable in 0.45.1 → escalate,
  reopening the PLAN §5 async fork (do **not** silently flip).
- **Rollback:** additive except C1/C2 (two small revertable adapter.ts edits); `apps/web/src/db/` is new; no
  migrations, no data-model change → nothing destructive. **Checkpoint:** after C1/C2 run `@vida/core` tsc before the web side.
