# IMPLEMENTATION-PLAN — DB-6 · Repository layer (session: 2026-07-28-db-6-repository-layer)

> Gate 2 (Human Gate 2). The technical HOW — ordered build steps. Approved at Approval 2, executed by
> `victor:execute-plan-code`. Direction + business rules = the PLAN (Approval 1 ✅). No-Guessing: [FACT]/[INTERP]/[UNKNOWN].
> Locked: migration seam **(i)** — DB-6 authors + registers the `sync_queue` migration.

## A. Files touched

| File                                                   | Action      | Why                                                                     |
| ------------------------------------------------------ | ----------- | ----------------------------------------------------------------------- |
| `packages/core/src/db/schema/foundation/sync-queue.ts` | **new**     | Drizzle object for `sync_queue` (query mirror of the DDL)               |
| `packages/core/src/db/schema/index.ts`                 | edit        | re-export the foundation table                                          |
| `packages/core/src/db/migrations/001_sync_queue.ts`    | **new**     | hand-written SQL `CREATE TABLE`+CHECKs+UNIQUE+index (ADR-016 §3.2)      |
| `packages/core/src/db/migrations/runner.ts`            | edit        | register `001_sync_queue` in `ALL_MIGRATIONS` (seam (i))                |
| `packages/core/src/db/repository.ts`                   | edit        | lazy vault-key; co-transactional enqueue in create/update/delete        |
| `packages/core/src/db/tests/repository.test.ts`        | **rewrite** | real coverage (§XIX) on better-sqlite3 harness                          |
| `packages/types/src/sync.ts`                           | verify only | `SyncQueueItem`/`SyncOperation` already exist — reuse, do not duplicate |

## B. Build order (type-first — victor:planning)

**B1 — types (verify, don't invent).** `types/sync.ts` already exports `SyncQueueItem` + `SyncQueueStatus`
(`pending|in_flight|failed`) + `SyncOperation`. Confirm `SyncOperation` = `'create'|'update'|'delete'`; if absent,
add it. No new public type unless B1 reveals a gap. `[FACT: types/sync.ts:82-95]`

**B2 — `schema/foundation/sync-queue.ts` (Drizzle object).** `sqliteTable('sync_queue', { id(pk) · table_name ·
row_id · operation · payload(nullable) · status(default 'pending') · retry_count(default 0, int) ·
error_message(nullable) · created_at(int) }, index('idx_sync_queue_status').on(status))`. NO `...baseColumns`/
`...syncColumns` (foundation table). The CHECKs live in the SQL migration (B3), not the Drizzle object (ADR-016 §3.2 —
Drizzle is the query mirror, DDL is hand-written). **The Drizzle defaults (`status:'pending'`, `retry_count:0`) MUST
mirror the SQL DDL defaults exactly** (two surfaces of one table). Barrel it in `schema/index.ts`.

**B3 — `migrations/001_sync_queue.ts` (hand-written SQL).** A `Migration` (`{version:1, name:'sync_queue', up}`) whose
`up(driver)` runs the ADR-002 §5.1 DDL verbatim: `CREATE TABLE sync_queue (… CHECK(operation IN …), CHECK(status IN
…), UNIQUE(table_name,row_id,operation))` then `CREATE INDEX idx_sync_queue_status`, as two `driver.run(sql)` calls.
⚠ **`up()` must NOT open its own `BEGIN`/transaction** — `runMigrations` (`adapter.ts:256`) already wraps every
migration in `BEGIN…COMMIT/ROLLBACK`; a nested `BEGIN` errors. `[FACT: ADR-002:1271-1287; Migration shape
adapter.ts:39-44; runMigrations wraps: adapter.ts:255-269]`

**B4 — register (seam (i)).** Add `migration001` to `ALL_MIGRATIONS` in `migrations/runner.ts:21` (currently `[]`).
This makes `migrate(driver)` create `sync_queue` at v1 on startup — DB-6 runs end-to-end. `[FACT: runner.ts:21]`

**B5 — repository: lazy vault-key (ALL call sites).** `getVaultKey()` throws when locked (`key-management.ts:124-128`),
so guard **every** `key()` call site — not just the write paths: `create` (`:270`), `update` (`:337`), **and the read/
decrypt paths** `decrypt()` + `decryptAll()` (`:248-255`, used by `findById`/`findAll`/`findWhere`). Fetch the key
**only when `encryptedFieldSet.size > 0`**; otherwise pass a null/sentinel that `encryptRow`/`decryptRow` never
dereference (their loops are empty when the set is empty). Net M1.0 behaviour: empty `[E]` set ⇒ no `getVaultKey`
call anywhere ⇒ plaintext round-trip on reads and writes, no throw. `[FACT: repository.ts:230-232,248-255,267-287,336-383]`

**B6 — repository: co-transactional enqueue.** Wrap each mutation body in `await db.transaction(async (tx) => { … })`:

- `create`: `await tx.insert(table).values(encrypted).run()` then **UPSERT** the queue row `('create', id, encrypted)` (see enqueue helper).
- `update`: read current (for version) inside or before tx; `tx.update(...).set(encrypted)`; then **UPSERT** the queue row `('update', id, finalRow)`; re-read via `tx` for the return + payload (payload = the re-read row, PLAN §2).
- `delete`: soft ⇒ the `update(deleted_at)` path enqueues `operation:'update'` (**resolved at preflight** — a soft delete is a row update: `deleted_at` is set and the row still syncs, so the flush side treats it as an update, not a tombstone). hard ⇒ `tx.delete(...)` + enqueue `('delete', id, snapshot)`.
- `queueRow(op, rowId, snapshot)` helper: `{ id: uuidv7(), table_name: <table name>, row_id: rowId, operation: op, payload: JSON.stringify(snapshot), status: 'pending', retry_count: 0, error_message: null, created_at: ts() }`.
  ⚠ **table name source:** derive from the Drizzle table (e.g. its SQL name) — `[UNKNOWN → resolve in B6: how to read the table name from `SQLiteTableWithColumns` at runtime]`; if not cleanly available, add `tableName` to `RepositoryConfig`.
- ⚠ **ENQUEUE = UPSERT, not INSERT.** `UNIQUE(table_name,row_id,operation)` means a repeated pre-flush mutation of the
  same row+op would collide. Use `tx.insert(syncQueue).values(queueRow(...)).onConflictDoUpdate({ target: [syncQueue.table_name,
syncQueue.row_id, syncQueue.operation], set: { payload: <new>, created_at: <new>, status: 'pending', retry_count: 0,
error_message: null } })` — coalesces multiple pending changes to the **latest** snapshot (correct for LWW sync,
  ADR-003). This is why acceptance criterion "atomicity" is tested by a mid-tx statement fault, NOT a duplicate enqueue.
- `sync_queue.status` starts `'pending'` (queue enum), never the row's `_sync_status`. `[FACT: session.js:46-53 tx works through proxy]`

**B7 — tests (`repository.test.ts`, better-sqlite3 harness per web-adapter.test.ts).** Build an async `SqliteDriver`
over better-sqlite3; `createDrizzleProxy(driver)`; run `migrate(driver)` to create `sync_queue`; a tiny test table
(with `deleted_at`) created inline. Cases:

1. create ⇒ row persisted + exactly one `sync_queue` row (`operation='create'`, `status='pending'`, `payload` parses to the persisted row).
2. update ⇒ `operation='update'`, payload = re-read row, `_sync_version` bumped.
3. delete (soft ⇒ `operation='update'` + `deleted_at` set; hard ⇒ `operation='delete'`) ⇒ correct queue row.
4. **SQL-level atomicity**: a spy driver throws on the **queue write** _after_ the entity write has executed inside the tx ⇒ assert **neither** the entity row **nor** the queue row survives (ROLLBACK undid the entity write on the real connection). _(Not a duplicate-enqueue — UPSERT absorbs that; the fault must be a genuine mid-transaction statement failure.)_
5. **coalescing (UPSERT)**: two updates to the same row before any flush ⇒ **one** `sync_queue` row for `(table,row,'update')`, `payload` = the **second** update's snapshot, `status` back to `'pending'` — no UNIQUE throw.
6. empty-`[E]`-set pass-through ⇒ CRUD + reads work with the vault **locked**, no `getVaultKey` throw, values stored plaintext.
7. non-empty `[E]` set + a stub-unlocked vault ⇒ E-field round-trips (seam intact).
8. soft-delete filter + managed-field + `_sync_hash` unchanged (regression guard).

**B8 — verify.** `pnpm --filter @vida/core typecheck` (zero errors) → `pnpm --filter @vida/core test` (green) →
`pnpm typecheck` at root (consumers unaffected).

## C. Risks / watch-items

- **[RISK] Drizzle table name at runtime (B6).** If reading the SQL name off the Drizzle object is not clean, fall
  back to a `tableName` config field — decide in B6, do not guess.
- **[RISK] tx write enrolment.** `db.transaction()` emits begin/commit through the same proxy callback → same driver
  → same connection (verified `session.js:46-53`). Test #4 is the empirical proof; if it ever shows a non-atomic
  result, STOP → §XXVIII (the mechanism assumption broke).
- **[BOUNDARY] no `_sync_field_ts`, no HLC, no flush, no real encryption** — all later issues. DB-6 stays producer-only.

## D. Approval 2

`/preflight` → **PASSED** (all layers specified; DB-spine invariants upheld; the one `[UNKNOWN]` — Drizzle table-name
mechanism — carries a `tableName`-config fallback, so no guessing). `/critique` on this impl-plan → **REVISE → fixed**:
5 execution defects resolved — enqueue UPSERT (correctness), lazy-key at ALL sites (incl. decrypt paths), atomicity
test = mid-tx fault, migration `up()` no nested BEGIN, Drizzle/DDL default parity. Pending Victor's Approval 2; then
`victor:execute-plan-code` works B1→B8.
