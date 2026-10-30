# PLAN — DB-6 · Repository layer (session: 2026-07-28-db-6-repository-layer · language: TypeScript/English)

> Executive summary (Human Gate 1). Read to approve the DIRECTION. Functional WHAT/WHY — not the technical build
> detail (that is the IMPLEMENTATION-PLAN, authored after Approval 1). No-Guessing: every claim [FACT]/[INTERP]/[UNKNOWN].

## 1. Contexto & demanda

`packages/core/src/db/repository.ts` is **not a stub** — it is a full 432-line generic repository, present since the
Initial commit (`bc83a84`, v1-era) and only async-propagated by AR-2 (`e55010f`), never rebuilt for the v2 DB-6
charter. `[FACT: git log --follow repository.ts]` It already delivers: table-agnostic `createRepository<T>` →
`Repository<T>` (`create/findById/findAll/update/delete/hardDelete/findWhere/count`), active field-level encryption
(`encryptRow`/`decryptRow` via `getVaultKey()`), row-level sync-metadata stamping, UUIDv7/v4, soft-delete.
`[FACT: repository.ts:113-149,175-199,218,258-263]`

So **DB-6 is a reconcile-and-extend, not a from-zero build.** Its true charter — the _single data-access surface every
module and service goes through_ — has three genuine gaps + one architectural fork, all confirmed by the 2026-07-28
baseline (`current-spec.md` → "DB-6 pre-build baseline"):

1. **No `sync_queue` producer** — the repository stamps `_sync_status:'pending'` on the row but never enqueues a
   `sync_queue` entry. `[FACT: no sync_queue ref in repository.ts]`
2. **No transaction wrapper** — mutations issue bare `.run()`; a co-transactional row+queue write needs one
   `BEGIN/COMMIT`. `[FACT: repository.ts:284,369,397]`
3. **No `sync_queue` foundation fragment** — `schema/` has only primitives; the table object does not exist.
   `[FACT: schema/index.ts]`
4. **Untested** — `db/tests/repository.test.ts` is a 0-line placeholder. `[FACT: wc -l = 0]`

**Why now:** DB-6 is the strong M1.0-a spine head off AR-2; it unblocks the entire substrate tier (AR-5/6/7) and the
seed vault (DB-10). Every offline write in the platform depends on the co-transactional enqueue this unit adds.
`[FACT: delivery-plan §4; ADR-004 §3.4]`

## 2. O que muda e por quê

**IN** — the four gaps above, minimally:

- **`schema/foundation/sync-queue.ts`** — a raw-DDL foundation table for `sync_queue`, shaped from the
  **authoritative ADR-002 §5.1** (NOT the quarantined v1 table, which drops the constraints below): `id · table_name ·
row_id · operation · payload(nullable) · status(default 'pending') · retry_count(default 0) ·
error_message(nullable) · created_at`, **plus** `CHECK (operation IN ('create','update','delete'))`,
  `CHECK (status IN ('pending','in_flight','failed'))`, **`UNIQUE(table_name, row_id, operation)`**, and
  `CREATE INDEX idx_sync_queue_status`. It is a **foundation table**: device-local, NOT synced — no
  `baseColumns`/`syncColumns`, never enqueues itself. `[FACT: ADR-002 §5.1 (ADR-002:1271-1287) — legacy
schema.v1.ts:49-61 + types/sync.ts:82-95 carry the field list but NOT the CHECKs/UNIQUE; ADR-016 §3.2 requires the
CHECKs in the SQL migration]` The DDL is a hand-written SQL migration (ADR-016 §3.2); the Drizzle object is its
  query mirror, re-exported via `schema/index.ts`.
- **Co-transactional enqueue** — `create`/`update`/`delete` write the entity row **and** the `sync_queue` insert inside
  **one `db.transaction(async (tx) => …)`**; both commit or both roll back (producer side of the no-flush
  scaffolding). `sync_queue.status` (not the row's `_sync_status`) governs the queue row and starts `'pending'`;
  `operation` ∈ create/update/delete; `payload` = the **final persisted row snapshot** (post managed-field stamp +
  post encrypt-or-passthrough; for `update`, the re-read row — `repository.ts:372-382`). `[ADR-004 §3.4 (extends the
base+extension atomicity rule to all single-row mutations); ADR-002 §5.1 status enum]`
- **M1.0 encryption stance — the ADR-017:20 mechanism (not a key-presence branch):** the `encryptRow`/`decryptRow`
  seam runs **pass-through over an empty `[E]` field set** — in M1.0 repositories are constructed with
  `encryptedFields: []`, so the encrypt/decrypt loop bodies never execute and no ciphertext is produced. The eager
  `getVaultKey()` fetch (`repository.ts:270,337`) must be made **lazy** — only called when `encryptedFieldSet` is
  non-empty — because `getVaultKey()` **throws** when the vault is locked (`key-management.ts:124-128`), which is
  always the case in M1.0. Seam present, activates at M3 by populating `[E]` sets + unlocking the vault (a config/
  runtime change, mirroring AR-2's SQLCipher BR1/BR2). `[FACT: ADR-017:20; repository.ts:270,337; key-management.ts:124-128]`
- **Tests** — real `repository.test.ts` reaching §XIX coverage on all CRUD + enqueue-per-op + **SQL-level atomic
  rollback** + the empty-set pass-through path, run against an in-memory better-sqlite3 driver (the AR-2 Node
  contract-test pattern — `apps/web/src/db/web-adapter.test.ts`, which already proves transactional rollback works
  through this driver). `[FACT: web-adapter.test.ts:35,149]`

**OUT** — boundary discipline (each owned elsewhere):

- The **reader/flush** side of the queue (dequeue, retry, transport) → **AR-9** (stubbed, activates M4). DB-6 is
  producer-only. `[FACT: delivery-plan §5 AR-9; sync/queue.ts is a 0-line stub]`
- **Real encryption activation** (unlocked vault, SQLCipher L1) → **M3** (DB-5 / UX-5b). DB-6 keeps the seam dormant.
- **Migrations runner / registry wiring** → **DB-7** (sibling off AR-2). DB-6 authors the `sync_queue` _schema object_;
  who authors its _CREATE-TABLE migration_ is the §5 seam question. `[FACT: task-file DB-6/DB-7 sibling note]`
- **Any domain table** → DB-3/DB-4 streams. The repository stays table-agnostic. `[FACT: repository.ts:218 generic]`

## 3. Regras de negócio relevantes (funcional)

Already enforced (keep, do not regress):

- **[FACT]** Managed fields are repository-owned (`id`=UUIDv7, timestamps, `_sync_*`); callers never supply them.
  `[FACT: repository.ts:37-52,267]`
- **[FACT]** Soft delete honored when `softDelete` + `deleted_at` present; reads filter `isNull(deleted_at)`.
  `[FACT: repository.ts:258-263,387-393]`
- **[FACT]** `_sync_hash` = hash over non-`_sync_` fields; `_sync_status` starts `'pending'`. `[FACT: repository.ts:151-160]`

Owed by DB-6 (this unit establishes):

- **[OWED] BR-DB6-1 — co-transactional enqueue.** Every mutation writes its `sync_queue` row in the **same
  transaction** as the entity row via `db.transaction()`; a failure in either write rolls back **both**. `[ADR-004
§3.4; mechanism verified: sqlite-proxy `transaction()` = session.js:46-53]`
- **[OWED] BR-DB6-2 — `sync_queue` is a device-local foundation table** with the ADR-002 §5.1 CHECKs +
  `UNIQUE(table_name,row_id,operation)`; raw DDL, not synced, never enqueues itself. `[ADR-002 §5.1; §5 "NOT synced" list]`
- **[OWED] BR-DB6-3 — M1.0 pass-through = empty `[E]` set.** The seam runs over an empty encrypted-field set in M1.0
  (no ciphertext, no vault-key fetch); it activates at M3 by populating `[E]` sets + unlocking. `[ADR-017:20]`
- **[OWED] BR-DB6-4 — two distinct enums, no collision.** The entity row's `_sync_status` (∈ pending|synced|conflict —
  `types/sync.ts`) and the queue row's `status` (∈ pending|in_flight|failed — ADR-002 §5.1) are **different columns on
  different tables** that share the literal `'pending'`; DB-6 must not conflate them. `[FACT: types/sync.ts; ADR-002 §5.1]`
- **[OWED] BR-DB6-5 — tested to §XIX** on all logic, including a SQL-level atomicity proof. `[FACT: standards §XIX]`

## 4. Aceitação (funcional)

- [ ] `schema/foundation/sync-queue.ts` (Drizzle object) + its SQL migration exist; the created table enforces the
      ADR-002 §5.1 `operation` CHECK, `status` CHECK, and `UNIQUE(table_name,row_id,operation)`; no `baseColumns`/
      `syncColumns`; re-exported by `schema/index.ts`.
- [ ] `create`/`update`/`delete` each insert exactly one `sync_queue` row (`operation` correct; `status='pending'`;
      `payload` = the **final persisted/re-read** row snapshot) **in the same `db.transaction()`** as the entity write.
- [ ] **Atomicity proven at the SQL level**: a fault on the **queue write inside the tx, after the entity write has
      executed**, rolls back **both** rows on the real connection — not a JS throw before the transaction opens.
- [ ] **Coalescing**: repeated pre-flush mutations of the same `(table,row,operation)` UPSERT into **one** queue row
      carrying the latest snapshot (no `UNIQUE(table_name,row_id,operation)` throw) — correct for LWW sync.
- [ ] In M1.0 config (`encryptedFields: []`), CRUD round-trips **plaintext** with **no `getVaultKey()` call** and no
      ciphertext at rest.
- [ ] With a non-empty `[E]` set + unlocked vault, the encrypt/decrypt seam still round-trips E-fields (seam intact for M3).
- [ ] The queue `status` enum and the row `_sync_status` enum are never conflated (distinct columns/tables).
- [ ] Soft-delete + managed-field + `_sync_hash` behaviour unchanged (no regression vs current code).
- [ ] `repository.test.ts` covers: CRUD, enqueue-per-op, SQL-level atomic rollback, empty-set pass-through, seam-with-key,
      soft-delete — `pnpm test` green.
- [ ] `pnpm typecheck` passes across `@vida/core` (+ consumers unaffected).

## 5. Questões em aberto / decisões pendentes

_(Resolved by the pre-Approval-1 verification pass — recorded here as the audit trail; the independent /critique
raised all four, each was checked against the source, not assumed.)_

- **[RESOLVED — ADR-017:20] M1.0 encryption stance.** Not a free fork: ADR-017:20 _prescribes_ the mechanism — the
  seam runs **pass-through over an empty `[E]` field set**. Adopted (BR-DB6-3). The earlier "skip when no key" wording
  was refuted: `getVaultKey()` **throws** when locked (`key-management.ts:124-128`), so the eager fetch must be made
  lazy (guarded behind a non-empty `[E]` set). `[FACT: ADR-017:20; key-management.ts:124-128]`
- **[RESOLVED — verified] Transaction mechanism.** The prior "sqlite-proxy has no interactive `.transaction()`" claim
  is **false for drizzle 0.45.1**: `SqliteRemoteDatabase.transaction()` is declared (`session.d.ts:32`) and
  implemented (`session.js:46-53` — emits `begin`→callback→`commit`/`rollback` through the single-connection driver).
  So BR-DB6-1 uses plain `db.transaction()` — **no `createRepository` signature change, no raw-driver path.** The
  AR-2 contract test already exercises transactional rollback through this driver. `[FACT: session.js:46-53;
web-adapter.test.ts:149]`
- **[RESOLVED — ADR-002 §5.1] `sync_queue` shape.** Sourced to ADR-002 §5.1 (authoritative), adding the `operation`/
  `status` CHECKs + `UNIQUE(table_name,row_id,operation)` that the legacy table and `@vida/types` both omit. `[FACT:
ADR-002:1271-1287]`
- **[DECISION — needs your call at Approval 1] `sync_queue` CREATE-TABLE ownership (DB-6↔DB-7 seam).** DB-6 must author
  the Drizzle _object_; the open call is whether DB-6 also authors **and registers** the SQL migration that creates the
  table at runtime:
  - **(i) recommended — DB-6 authors + registers the `sync_queue` migration** in the existing runner registry
    (`migrations/runner.ts:21`, currently empty). Makes DB-6 **independently runnable + testable** (the co-transactional
    insert has a real table). DB-7 then generalizes the per-feature migration _pattern_, not this first row.
  - **(ii) — DB-6 authors the object only; the migration + registry wiring waits for DB-7.** Keeps the sibling boundary
    literally, but DB-6 can't run end-to-end until DB-7 lands (tests create the table inline).
    The task-file sibling note ("DB-6 needs the schema OBJECT, not DB-7's runner") is satisfied by either; (i) is the
    smaller total risk since the runner code already exists (AR-2). **Recommend (i).**

## 6. Aprovação 1 (direção) — ✅ GRANTED (Victor, 2026-07-28)

Direction approved. **Locked decision:** §5 migration seam = **(i) DB-6 authors + registers the `sync_queue`
migration** in the runner registry (DB-6 independently runnable; DB-7 generalizes the pattern later). The direction
cleared an independent adversarial `/critique` (REVISE → all 7 must-fix items resolved, 3 by source verification).
Next: author the IMPLEMENTATION-PLAN → `/preflight` → second `/critique` → Approval 2 → implement.
