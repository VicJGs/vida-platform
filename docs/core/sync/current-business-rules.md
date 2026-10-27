# Sync engine — CURRENT BUSINESS RULES

# Durable ground-truth (§XXIX). Reflects SHIPPED code as of AR-9 (LIF-80, 2026-08-05).

# SY-1/2/3/8/9 are enforced now (scaffold); SY-4/5/6/7 are the activation contract (AR-9b/M4).

- **SY-1 No-flush invariant (the defining constraint).** In M1.0 the engine performs **zero network
  I/O**. The flush loop is structurally present but every transport/push/pull step is a stubbed no-op.
  A test asserts the engine can be constructed and "run" with no server, no socket, no fetch — nothing
  leaves the device. Activation is AR-9b (M4).

- **SY-2 Consumer-only of the queue.** AR-9 never writes `sync_queue` rows and never opens the entity
  write transaction — that is DB-6's co-transactional `enqueue` (ADR-004 §3.4). AR-9 reads pending rows
  and (at M4) transitions their `status`/deletes them post-ACK. It builds no producer path.

- **SY-3 Payload is opaque (ZK).** `sync_queue.payload` arrives already-encrypted from the producer.
  The engine treats it as an opaque blob — it does not decrypt, inspect, or re-encrypt it. This keeps
  the flush path zero-knowledge by construction and independent of AR-3 (crypto).

- **SY-4 FIFO drain.** Pending rows are processed in `created_at` order (ADR-003 §8.1). The read query
  filters `status='pending'` (served by `idx_sync_queue_status`) and orders by `created_at` ascending.

- **SY-5 Dedup collapse.** The producer's `UNIQUE(table_name,row_id,operation)` UPSERT already coalesces
  repeated same-op edits to the latest snapshot (ADR-003 §8.2). The engine additionally collapses a
  `create` followed by a `delete` of the same row to a **no-op** (drop both) before any push.

- **SY-6 Status-enum discipline.** The engine mutates only `sync_queue.status`
  (pending→in_flight→failed) — never a row's `_sync_status` on the read side. The two enums are
  distinct (SY per spec `## The fixed contract`); conflating them is a defect.

- **SY-7 Retry policy is reserved, not active.** The ADR-003 §8.3 policy (exp backoff 1→30s, max 3
  retries → `failed`, 4xx no-retry, 401/403 stop-all) is the AR-9b activation contract. In AR-9 the
  retry/backoff structure exists as a stub; it never fires because nothing pushes (SY-1).

- **SY-8 Resolver/CRDT are shape-only.** `resolver.ts` reserves the field-level LWW merge seam
  (ADR-003 §6.1) and `crdt.ts` the per-page Yjs seam (§4.2). In AR-9 they expose the interface and a
  minimal/no-op body sufficient to compile and be swapped at activation — no live merge runs (nothing
  is pulled).

- **SY-9 Non-structural activation.** The scaffolding is judged correct iff AR-9b can activate
  push/pull by implementing the reserved transport/resolver/crdt seams **without a schema change and
  without touching consumers** (ADR-017 rationale). Any design that would force a migration or a
  consumer edit at activation violates AR-9's purpose.
