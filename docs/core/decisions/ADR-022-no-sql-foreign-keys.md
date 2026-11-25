---
id: ADR-022
kind: decision
module: platform
status: active
supersedes: []
summary: No table in the local schema declares a foreign key; a reference is a plain TEXT column, and its integrity lives in services and sync.
anchors:
  - packages/core/src/db/schema/
  - packages/core/src/db/migrations/
links:
  - ADR-002
  - ADR-003
  - ADR-004
  - ADR-016
tokens: 916
---

# ADR-022: No foreign keys in the local schema — a reference is a plain `TEXT` column; integrity lives in services and sync

**Status:** Accepted · **Date:** 2026-11-25 · **Decision Makers:** Victor J. · **Linear:** LIF-357
**Amends:** [ADR-016](ADR-016-storage-layer-rebuild-from-zero.md) §3.4 (adds this to the locked patterns) and §3.5 (authoring order follows reference parents), and [ADR-002](ADR-002-data-model.md) §5 (its `REFERENCES` clauses and `ON DELETE` actions are superseded).

---

## 1. Decision

No table in the local schema (`packages/core/src/db/schema/` and its migrations) declares a foreign key. A column that points at another row (`project_id`, `parent_id`, `session_id`, a polymorphic `entity_type` + `entity_id` pair) is a plain `TEXT` column, in the hand-written migration and in the Drizzle mirror alike: no `REFERENCES`, no `.references()`, no `ON DELETE CASCADE` or `SET NULL`. The server's own metadata tables (ADR-003 §9.4) are out of scope.

Integrity is kept in two places instead:

- **Services**, on the local write: each module's business rules say what a reference requires and what a delete reaches, and the service carries it out; a cascade is the service soft-deleting, or on an explicit hard delete removing or clearing, each dependent (for example NP-9, CK-10, BR-SK-3).
- **Sync**, on the remote apply: ordering between rows is sync's rule, never the database's. ADR-004 §3.4 holds a session extension until its base is present; the general cross-row ordering rule is F10 (LIF-98). This decision leaves both standing.

`PRAGMA foreign_keys = ON` (`packages/core/src/db/adapter.ts`) stays as it is; with no `REFERENCES` clause it enforces nothing.

## 2. Why

1. **Sync gives no cross-row order.** ADR-003 §4.1 syncs each row as its own encrypted blob, and the §11.1 bootstrap pulls by table priority and recency, so a new device routinely receives a child before its parent. An enforced foreign key would make the device refuse valid data. Ordering belongs to sync (ADR-004 §3.4 for its pair, F10 for the rest).
2. **Most user deletes are soft.** A user delete sets `deleted_at` (golden rules; NP-9). `ON DELETE CASCADE` and `SET NULL` fire only on a hard `DELETE`, so on a tombstone they never run. Hard deletes (NP-9's explicit hard delete, CK-10, and tables with no `deleted_at`) are app-layer cleanups owned by the module's service, and the repository's `hardDelete` enqueues the sync delete for each row, which a database cascade would skip.
3. **Polymorphic references cannot be foreign keys.** `entity_type` + `entity_id` (pages, `entity_tags`, `entity_links`) points into many tables; no single `REFERENCES` target exists.

## 3. Consequences

- Indexes follow query use, not the reference itself: `performance-strategy.md` §2 indexes "frequently filtered, sorted, or joined columns".
- A reference can point at a row that is missing or soft-deleted; code that resolves a reference handles that case.
- The merged migrations that cite "ADR-016 §3.4" or "the `no-FK` convention" for this rule now resolve to this decision through the §3.4 pointer; they are not edited.
- Schema and migration changes stay behind `check:one-way-door`; adding a foreign key later needs a new decision that supersedes this one.

## 4. Options considered

- **Enforced foreign keys (rejected):** refuses valid data on out-of-order apply (reason 1) and cascades past the service and its sync delete (reason 2).
- **Foreign keys declared but deferred (`DEFERRABLE INITIALLY DEFERRED`, rejected):** checks at commit, but a sync batch can still commit a child whose parent is in a later batch, so the device still refuses valid data.
