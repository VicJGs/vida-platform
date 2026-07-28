# Database Layer — Current Spec (durable · §XXIX promotion target)

> **Context:** `@vida/core` → `packages/core/src/db/`. **Seeded from documentation** (2026-07-21). Companion:
> `current-business-rules.md`. Baseline finding: `../database-schema-reconciliation.md`. Strategy:
> `../storage-rebuild-strategy.md`. **No-Guessing:** `[FACT: src]` / `[INTENT]` (documented direction, not yet built).

## What the DB layer is
A platform-agnostic, local-first SQLite layer: the schema (Drizzle ORM), a generic encrypting repository, a
per-platform adapter, and a migrations runner. `[FACT: db/ tree]` ADR-002 three-layer encryption; ADR-003 sync model.

## Topology (v2 target — DB-1 stands up the substrate)
```
packages/core/src/db/
├── schema/              # v2 authoring surface (DB-1+)
│   ├── _shared.ts       # primitives: baseColumns · syncColumns · typed column helpers · enumText (SQL CHECK lives in the migration)
│   ├── _registry.ts     # entity_type registry (single source for polymorphic FKs + CHECKs)
│   ├── index.ts         # barrel — primitives now; table modules added by DB-3+
│   └── <domain>.ts      # [INTENT] one file per structure-data doc (DB-4)
├── schema.ts            # v1 monolith — reference-only; deleted at parity (DB-6/7)
├── repository.ts · adapter.ts · migrations/
```

## Current state (FACT)
- `schema.ts` = the **v1** monolith, 80 tables, imported by `index.ts:59` (`export * as schema`) and `adapter.ts:16`.
  `[FACT: schema.ts; index.ts:59; adapter.ts:16]`
- It is ~60% misaligned with the v2 target (retire ~22 · missing ~90-110 · divergent ~9 · carry-forward ~40) and
  carries 5 systemic gaps. `[FACT: ../database-schema-reconciliation.md]`
- The v2 rebuild is authored from-zero into `schema/`, per-table-gated. `[FACT: ../storage-rebuild-strategy.md]`

## Status (2026-07-21)
`schema/_shared.ts` · `_registry.ts` · `index.ts` **implemented + verified** — `tsc --noEmit` green on `@vida/core`,
`@vida/web`, `@vida/server`; additive, monolith and its consumers untouched (`./db/schema` still resolves to the
monolith, proven via `web-adapter.ts:36` `typeof schema`). `[FACT: DB-1 session verification]`

## Contract — the primitives DB-1 establishes (`schema/_shared.ts`)
- `baseColumns` = `{ id (uuidPk) · created_at · updated_at (Unix-ms INTEGER) · ...syncColumns }`.
- `syncColumns` = the **6** sync columns (identical to today; `_sync_field_ts` is DB-2's).
- Column helpers: `uuidPk(name?)` · `timestampMs(n)` · `money(n)` · `calendarDate(n)` · `boolInt(n)` · `json<T>(n)` ·
  `enumText(n, values)`.
- `_registry.ts`: `ENTITY_TYPES` (minimal foundation seed) · `EntityType` type · `isEntityType()` — extensible per domain.

## Enum enforcement model (architecture — three parts, NOT a Drizzle helper)
DDL is hand-written SQL migrations (ADR-002 §5 · `migrations/*`); Drizzle objects are the query mirror (no
drizzle-kit). So an enum is enforced by: **(1)** the `CHECK` constraint in the SQL migration (DB-3/DB-4), **(2)** the
canonical Zod validator (DB-9), **(3)** `enumText`'s TS union for query types (DB-1). DB-1 owns only part (3). A
Drizzle `check()` helper was removed — it emits no DDL in this pipeline. `[FACT: ADR-002 §2.3/§5; migrations/001_initial.ts]`

## AR-2 — DatabaseAdapter contract + web-adapter (IMPLEMENTED 2026-07-27 · LIF-73)
The adapter seam is **asynchronous** — wa-sqlite@1.0.0's Factory API is async-only (`step`/`prepare_v2`/`finalize`
are `async function` regardless of WASM build), so a sync driver is impossible. This matches the delivery plan's
"async Drizzle proxy" for AR-2. `[FACT: node_modules wa-sqlite/src/sqlite-api.js:742-750; delivery-plan §5]`
- **`SqliteDriver`** (`adapter.ts`) — all methods async: `exec/run/query/batch/close` return Promises; **added**
  `values(sql,params): Promise<unknown[][]>` (positional rows for the ORM path). `query` stays object-keyed for
  internal use (migrations, schema version). `[FACT: adapter.ts]`
- **`DrizzleDb = SqliteRemoteDatabase<typeof schema>`** (`'async'`), built by **`createDrizzleProxy(driver)`** via
  `drizzle-orm/sqlite-proxy` — the callback maps `run→{rows:[]}`, `all/values→{rows:positionalArrays}`,
  `get→{rows: firstRow}` (drizzle's `mapGetResult` treats the value as one flat row). `[FACT: adapter.ts; sqlite-proxy/session.js:143-162]`
- **`initializeConnection`** opens **plain** when `config.sqlCipher` is absent (M1.0); configures+verifies the cipher
  when present — the M3 seam, a config change not a code change. `[FACT: adapter.ts; ADR-017]`
- **Migration runner** (`runMigrations`, `getSchemaVersion`, `setSchemaVersion`) is async; each migration runs in a
  `BEGIN/COMMIT`, failure → `ROLLBACK` + version unchanged; empty registry ⇒ no-op v0. `[FACT: adapter.ts; runner.ts]`
- **Web impl** (`apps/web/src/db/`): a **Web Worker** (`worker.ts`) hosting the sync wa-sqlite build +
  `AccessHandlePoolVFS` (OPFS); `web-driver.ts` (async `SqliteDriver` on the `statements()` iterator); `web-adapter.ts`
  (`DatabaseAdapter` — open/migrate/createDrizzle/exists/destroy). `exists`/`destroy` are VFS-directory-scoped
  (the VFS uses opaque OPFS names) — per-name first-run is AR-4. `[FACT: apps/web/src/db/*]`
- **Consequence:** `repository.ts` + `runner.ts` are async-propagated (consume the async `DrizzleDb`). The repository
  encrypt/decrypt **seam** semantics remain **DB-6**. `[FACT: repository.ts; runner.ts]`

## DB-6 — IMPLEMENTED (2026-07-28 · LIF-68 · commit pending)
The repository now delivers its full charter. `[FACT: repository.ts; schema/foundation/sync-queue.ts; migrations/001_sync_queue.ts]`
- **`sync_queue` foundation table** — `schema/foundation/sync-queue.ts` (Drizzle mirror) + `migrations/001_sync_queue.ts`
  (hand-written DDL: `operation`/`status` CHECKs + `UNIQUE(table_name,row_id,operation)` + status index, per ADR-002
  §5.1). Registered in the runner (`ALL_MIGRATIONS=[migration001SyncQueue]`) → applied at schema v1. Device-local, not synced.
- **Co-transactional enqueue** — `create`/`update`/`delete` write the entity row + a `sync_queue` row inside one
  `db.transaction()` (async sqlite-proxy `transaction()`); both commit or both roll back. Enqueue is an **UPSERT** on
  `(table_name,row_id,operation)` → repeated pre-flush mutations coalesce to the latest snapshot (LWW-correct). Soft
  delete enqueues `operation='update'`; hard delete `'delete'`. Payload = the final persisted/re-read row.
- **M1.0 pass-through seam** — encrypt/decrypt runs over an empty `[E]` set (ADR-017:20); the vault key is fetched
  **lazily** (only when `encryptedFieldSet.size > 0`), so a locked vault (M1.0 default) never throws. Producer-only —
  the reader/flush is AR-9 (M4).
- **Tested** — `db/tests/repository.test.ts`: 10 cases incl. SQL-level atomic rollback + coalescing + locked-vault
  pass-through + seam-with-key. `@vida/core` suite 55/55; root typecheck 10/10. `[FACT: vitest run]`

<details><summary>DB-6 pre-build baseline (2026-07-28 · §XXVI.1a — the as-is floor, kept as the audit record)</summary>
`repository.ts` is **NOT a stub** — it is a full 432-line generic repository, present since `bc83a84` (Initial
commit, v1-era) and only **async-propagated** by AR-2 (`e55010f`), never rebuilt for the v2 DB-6 charter.
`[FACT: git log --follow repository.ts]` What is actually there today:
- **`createRepository<T>(db, table, config)`** factory → `Repository<T>` with `create/findById/findAll/update/
  delete/hardDelete/findWhere/count`, all async. `[FACT: repository.ts:218,175-199]`
- **Active field-level encryption** on every write/read: `encryptRow`/`decryptRow` call `getVaultKey()` per op
  (`encryptField`/`decryptField` from `../encryption/vault`; `getVaultKey` resolves at `key-management.ts:124`).
  `[FACT: repository.ts:19-20,113-149,231]`
- **Sync metadata is stamped on the row** (`_sync_id/_version/_device_id/_lww_ts/_status='pending'` + `_sync_hash`
  over non-sync fields). `[FACT: repository.ts:238-246,151-160,281]`
- **UUIDv7/UUIDv4 generators** + `packEncrypted`/`unpackEncrypted` + `buildEncryptionSchema` co-located here.
  `[FACT: repository.ts:62,81,98,103,421]`

**Gaps vs the DB-6 charter (what DB-6 must actually deliver — this is the true unit of work):**
1. **[GAP] No `sync_queue` producer.** The repository only stamps `_sync_status:'pending'` on the row; there is
   **no co-transactional `sync_queue` enqueue** (DB-6's central charter, ADR-004 §3.4). `[FACT: no `sync_queue` ref
   in repository.ts]`
2. **[GAP] No transaction wrapper.** `create/update/delete` issue bare `.run()` calls (`db.insert(table).values().run()`)
   — a co-transactional row+queue write needs a single `BEGIN/COMMIT`, which the current code does not open.
   `[FACT: repository.ts:284,369,397]`
3. **[GAP] No `sync_queue` foundation fragment.** `schema/index.ts` exports only `_shared`+`_registry`; no
   `schema/foundation/` and no `sync_queue` Drizzle object exist. DB-6 authors it (raw DDL, NOT synced, no
   `baseColumns`/`syncColumns` — ADR-002 §5.1). `[FACT: schema/index.ts; find schema/ → no foundation dir]`
4. **[GAP] Untested.** `db/tests/repository.test.ts` is a 0-line placeholder — no coverage on any business logic
   (§XIX requires 100% on logic). `[FACT: wc -l repository.test.ts = 0]`

**⚠ STRUCTURAL TENSION for the PLAN gate (not resolvable at baseline).** The existing repository **actively
encrypts** via `getVaultKey()`, but M1.0 has **no vault unlock** (that is M3 / UX-5b) and the delivery plan +
ADR-017 mandate DB-6 as a **pass-through seam** (encryption flips at M3). So the as-is repository's per-op
`getVaultKey()` cannot run against real data in M1.0. Reconciling "keep the encrypting seam dormant" vs "make it a
true pass-through until M3" is a Step-2/Step-3 (`/api-contract` + `/adr-check`) decision — flagged here, decided in
the plan. `[FACT: repository.ts:231; ADR-017; delivery-plan §5 DB-6 "encryption deferred M3"]`
</details>

## Downstream (INTENT — owned by later issues)
DB-2 sync cols/HLC · DB-3 substrate tables · DB-4 per-domain tables · DB-5 encryption wiring · DB-7 migrations
authoring (runner + registry exist; DB-6 registered the first migration) · monolith retirement · DB-8 FTS5 ·
DB-11 reconcile ADR-002 §5/§7/§8. **DB-6 ✅ done → unblocks ar-5/ar-6/ar-7 (substrates) + db-10 (seed).**
