# Sync engine — CURRENT SPEC

# Durable ground-truth (§XXIX). Reflects SHIPPED code as of AR-9 (LIF-80, 2026-08-05):

# the no-flush stub skeleton. Activation (flush/HLC/Yjs/transport) is AR-9b/M4.

## What this is

> **Authoritative definition:** "Sync scaffolding (no-flush):
> the **reader/flush engine stub** (`sync/{queue,resolver,crdt}.ts`), **stubbed** (M4 activates); HLC
> encoding deferred. ⚠ `sync_queue` table + co-transactional enqueue-WRITE moved → DB-6 (ADR-004 §3.4);
> `_sync_*` columns land per-table (DB-2 parked→folded)." Home `core/src/sync` · ADR-003 §8, ADR-017
> (scaffold-only) · profile add-backend-component · depends DB-6.

The consumer / flush side of the offline sync system — the `@vida/core` sync engine that will
_eventually_ drain the `sync_queue`, push encrypted blobs, pull, and merge. **AR-9 delivers only the
scaffold:** the three files' public surface + signatures + wiring + `@vida/core` export, with
**stubbed bodies** — so Phase-2/M4 activation (AR-9b) is a non-structural bolt-on, NOT a schema change.
AR-9 implements no working flush logic; it reserves the shape.

- **Home:** `packages/core/src/sync/` — `types.ts` (`SyncNotActivated`), `queue.ts`, `resolver.ts`,
  `crdt.ts`, `index.ts` (barrel). No `engine.ts`.
- **AS-IS (SHIPPED 2026-08-05):** the three seams are wired stubs; `@vida/core` `index.ts` re-exports
  `./sync`. Every seam method throws `SyncNotActivated` — nothing reads the queue, nothing flushes.

## The fixed contract AR-9 consumes (DB-6 producer — do NOT rebuild)

The producer side is **DONE** and owned by DB-6 (ADR-004 §3.4). AR-9 is a pure consumer of it.

- **Table `sync_queue`** (migration `001_sync_queue.ts`, ADR-002 §5.1):
  `id` · `table_name` · `row_id` · `operation ∈ {create,update,delete}` · `payload` (TEXT, JSON of the
  **encrypted** row snapshot) · `status ∈ {pending,in_flight,failed}` DEFAULT `pending` ·
  `retry_count` DEFAULT 0 · `error_message` · `created_at` · `UNIQUE(table_name,row_id,operation)` ·
  `INDEX idx_sync_queue_status(status)`.
- **Producer behavior** (`repository.ts` `enqueue`): every `create/update/delete` UPSERTs a row
  co-transactionally with the entity write; repeated pre-flush mutations of the same
  `(table_name,row_id,operation)` coalesce to the LATEST snapshot, resetting `status='pending'`,
  `retry_count=0`. `payload` is the **already-encrypted** row (ZK: the engine handles opaque blobs).
- **Two distinct status enums:** `sync_queue.status` (pending|in_flight|failed) is the QUEUE state;
  the row's own `_sync_status` (pending|synced|conflict) is per-entity. AR-9 must not conflate them.

## Contract (the shipped scaffold surface — all seams throw `SyncNotActivated`)

```ts
createSyncQueueReader(db: DrizzleDb): SyncQueueReader   // readPending(): Promise<SyncQueueItem[]>   — ADR-003 §8.1
createFieldLWWResolver(): FieldLWWResolver              // merge(local, remote: SyncBlob): SyncBlob    — ADR-003 §6.1
createYjsSyncSeam(): YjsSyncSeam                        // encode(unit): Uint8Array; apply(unit, update) — ADR-003 §4.2
export class SyncNotActivated extends Error             // thrown by every seam until M4 (AR-9b)
```

Types reused from `@vida/types` (`SyncQueueItem`/`SyncBlob`/`YjsSyncUnit`) — none redefined. No queue
dedup/collapse (DB-6's UPSERT owns it, SY-5). No HLC clock/merge (DB-2 + AR-9b). No `yjs`. No network,
no schema change.

## Scope boundary

- **IN (AR-9, now):** the reader/flush engine **stub** across exactly `sync/{queue,resolver,crdt}.ts`
  — public surface + signatures + wiring + `@vida/core` export; **scaffold-only bodies** (M4/AR-9b
  activates). Governing: **ADR-003 §8 + ADR-017 (scaffold-only)**. Verified by Vitest (compiles,
  exports resolve, no-flush assertion).
- **DEFERRED to AR-9b / M4 (activation):** transport (WebSocket + HTTP polling, §5), actual push/pull
  flows (§10), device management (§12), change-detector debounce triggers (§7), `last_sync_at` cursor,
  the HLC clock + field-LWW merge (§6.1), the live Yjs merge (§4.2), `yjs` dependency.
- **NOT AR-9 (owned elsewhere):** the `sync_queue` table + co-transactional enqueue = **DB-6**
  (producer); the `_sync_*` metadata columns + HLC representation = **DB-2** (parked→folded, lands
  per-table); the encryption layer = **AR-3** (deferred — `payload` arrives already-encrypted).

## Governing decisions

- **ADR-003** — sync protocol (architecture §3, offline queue §8, LWW §6.1, Yjs §4.2, transport §5).
- **ADR-004 §3.4** — co-transactional enqueue (producer, DB-6).
- **ADR-017 §5** — parks the sync engine as the post-feature **hardening pass** and defers _ordering_ to
  a replan. That replan placed **AR-9 = no-flush scaffolding at `#15`
  (M1.0)**, activation **AR-9b at `#78` (M4)**. This baseline follows the reconstruction (the `#`-order
  routing authority). See `## Open questions`.

## Tests

`sync/__tests__/scaffold.test.ts` (6, Vitest, green): factories construct without touching DB/network
(SY-1) · each seam throws `SyncNotActivated` (synchronous — non-`async`, use `() => …).toThrow`, not
`.rejects`) · `SyncNotActivated` exported/named/message-bearing · **no-consumer guard** (FS walk from
repo root scans `packages/`+`apps/` for seam-factory consumption → zero; non-vacuous, ~173 files).

## Notes for AR-9b activation (from the AR-9 critiques — inherited concerns)

- The no-consumer guard matches **seam-factory** identifiers only (the true flush sites); type-only
  imports of the interfaces/`SyncNotActivated` are harmless and unflagged. It also scans only `.ts/.tsx`.
  When AR-9b wires the first consumer, this test flips (widen matchers if a non-factory activation path
  is introduced). [critique finding 1/2]
- The construction test passes `{} as DrizzleDb` (SY-1: the stub never dereferences it). AR-9b, whose
  `readPending` WILL touch the db, must replace this with a mock that **asserts no method is called** at
  construction — an empty cast would mask a SY-1 violation. [critique finding 3]
- `repository.ts` still stamps `_sync_lww_ts = Date.now()` (interim v0); AR-9b/DB-2 replace it with the
  HLC. AR-9 left it untouched by design. [ADR-003 §6.1 "Interim state"]

## Open questions

- **OQ-1 (RESOLVED 2026-08-05):** the ADR-017 "0 lines / hardening-pass" vs plan-`#15` tension was
  resolved — the sanctioned replan (`reconstructed-structure` + delivery-plan:183) re-scoped AR-9 to the
  no-flush stub skeleton at `#15`, and ADR-017:59-61 delegated ordering to it. Both independent critiques
  accepted the reconciliation. Activation stays AR-9b/M4.
