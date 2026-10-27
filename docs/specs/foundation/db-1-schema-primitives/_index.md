# Unit: db-1-schema-primitives (foundation · refactor)

> Thin index (session-split form). Deep content lives in `sessions/`. No §3/§5 duplicated here.

## Identity

- **What:** P0 of the from-zero storage rebuild — the Drizzle **primitives** (`_shared.ts`), the **entity_type
  registry** mechanism (`_registry.ts`), and the `schema/` **directory topology** every future table inherits.
- **Why:** the v1 `schema.ts` is ~60% misaligned with the documented v2 target (see
  `docs/infrastructure/database-schema-reconciliation.md`); we rebuild from zero. DB-1 lays the substrate so the
  systemic gaps (no CHECKs, hand-repeated conventions) can't recur table-by-table.
- **Type:** refactor / foundation. **Additive** — the v1 monolith stays reference-only; nothing breaks.
- **Issue:** LIF-61 · **Cluster:** ① Database Layer · **Phase:** 1.0.
- **Boundaries:** `_sync_field_ts`/HLC → DB-2 (LIF-62); tables → DB-3/DB-4; encryption → DB-5; repo/migrations → DB-6/7.

## Acceptance

See the PLAN §4 (functional) and, after Approval 1, the IMPLEMENTATION-PLAN §Acceptance (technical/parity).

## Gate files (session split)

- **Gate 1 — PLAN (direction):** [`sessions/PLAN-2026-07-21-db-1-schema-primitives.md`](sessions/PLAN-2026-07-21-db-1-schema-primitives.md)
- **Gate 2 — IMPLEMENTATION-PLAN (build):** [`sessions/IMPLEMENTATION-PLAN-2026-07-21-db-1-schema-primitives.md`](sessions/IMPLEMENTATION-PLAN-2026-07-21-db-1-schema-primitives.md) — **implemented + verified 2026-07-21**

## Status

**Implemented + verified** (both gates cleared; core/web/server typecheck green). Remaining close-out: code-review · quality-gate · commit · `/task-complete`.

## Ground truth

`docs/infrastructure/database-schema-reconciliation.md` · `database-layer.md` · `storage-rebuild-strategy.md` ·
current primitives at `packages/core/src/db/schema.ts:22-40` · ADR-002 §2-§3 · CLAUDE.md conventions.
