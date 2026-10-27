# sync — sync engine scaffolding, no-flush (ADR-003 §8 + ADR-017)

# Auto-read by Claude when editing this layer. Home stood up by AR-9 (2026-08-05).

## What this layer is

The consumer/flush side of offline sync, delivered by **AR-9 as a no-flush stub skeleton**: reserved
seams that M4 (AR-9b) activates without a schema change or a consumer edit. Nothing here flushes,
merges, or touches the network today.

## Owning ADR

ADR-003 (§8 offline queue · §6.1 field-LWW · §4.2 Yjs) · ADR-017 (scaffold-only, fill-later).

## Files

- `types.ts` — `SyncNotActivated extends Error` (thrown by every seam until M4).
- `queue.ts` — `createSyncQueueReader(db) → SyncQueueReader.readPending()` (ADR-003 §8.1).
- `resolver.ts` — `createFieldLWWResolver() → FieldLWWResolver.merge()` (ADR-003 §6.1).
- `crdt.ts` — `createYjsSyncSeam() → encode/apply()` (ADR-003 §4.2).
- `index.ts` — barrel; re-exported from `@vida/core`.
- `__tests__/scaffold.test.ts` — construct-clean · seams throw (synchronous) · no-consumer guard.

## Status

SHIPPED by AR-9 (LIF-80). All seam bodies `throw new SyncNotActivated(...)`. Types reused from
`@vida/types` (never redefined). Currency: `docs/core/sync/current-*`.

## Boundaries (do NOT cross here)

- `sync_queue` table + enqueue-WRITE + UNIQUE dedup/collapse = **DB-6** (`db/repository.ts`), not here.
- `_sync_*` columns + HLC encoding = **DB-2** (parked→folded).
- transport · push/pull · live merge · retry-firing · `yjs` dependency = **AR-9b / M4** (activation).
- crypto = **AR-3** (`payload` arrives already-encrypted; treat as opaque blob).
- Seams throw synchronously (non-`async`) — test with `expect(() => …).toThrow()`, never `.rejects`.
