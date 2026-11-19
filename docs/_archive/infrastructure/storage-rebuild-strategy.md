# Storage Layer Rebuild — Strategy (intake for the follow-up)

> **Status:** DECISION captured · design intake for the follow-up build campaign. **NOT executed in the DB-1 session.**
> **Produced:** 2026-07-20/21 (DB-1 session, after the schema reconciliation)
> **Basis:** `docs/infrastructure/database-schema-reconciliation.md` (the ground-truth finding)
> **This session (LIF-61 / DB-1) delivers only P0 — the primitives.** Everything else here is the follow-up.

## Decision

The implemented `packages/core/src/db/schema.ts` is the **v1 pre-consolidation** schema and is ~60% wrong vs the
documented v2 target (retire ~22 · missing ~90-110 · divergent ~9; carry-forward ~40). There is **no deployed data**
(local-first, single-user, no dogfood vault yet), so migration cost is zero.

**We rebuild the storage layer from zero, authored from the documentation** (the 24 `structure-data.md` docs +
ADR-002 §5.20 owed ledger), into a fresh `schema/` directory. The v1 monolith stays **reference-only** and is deleted
at parity. `[Victor, 2026-07-20]`

## Two governing artifacts (the follow-up authors these)

1. **`ADR-016 — Storage Layer Rebuild from Zero`** — the durable decision: why from-zero · the topology · the locked
   patterns · the per-table-gating protocol. AR-1 (monorepo topology) and every DB issue reference it.
2. **`docs/infrastructure/storage-build-plan.md`** — the **master plan**: the full table ledger (every table
   enumerated from the docs in FK-dependency order, tagged ✓/⏳/↔), the **table-spec template**, the phase sequence.

## Topology (target `schema/` directory)

```
packages/core/src/db/schema/
├── _shared.ts     # primitives: baseColumns, syncColumns, typed column helpers, enumText (SQL CHECK lives in the migration)
├── _registry.ts   # the entity_type registry (single source for polymorphic FKs + their CHECKs)
├── foundation/    # cross-cutting substrate (pages, tags, spaces, views, sessions, capabilities, economy)
├── <domain>.ts    # one file per structure-data doc
└── index.ts       # barrel — the only public import surface
```

## Locked patterns (fix the 5 systemic gaps at the source — see reconciliation §E)

> **DDL is hand-written SQL migrations** (ADR-002 §5 · `migrations/*`); Drizzle objects are the type-safe query
> mirror (no drizzle-kit). So gaps that live in DDL (CHECK, partial indexes) are fixed **in the SQL migration**;
> gaps that live in the query/type layer are fixed by the Drizzle primitives. See "Open decisions for ADR-016".

1. Zero-CHECK gap → the `CHECK` is authored in the **SQL migration** (DB-3/DB-4) from a shared enum const + the
   **Zod** validator (DB-9); DB-1's `enumText` supplies the TS union. (No Drizzle `check()` helper — it emits no DDL.)
2. `_sync_field_ts` absent → added to `syncColumns` **by DB-2** (LIF-62), not DB-1.
3. Partial indexes flattened → authored with the `WHERE` clause in the **SQL migration**.
4. Completions/junctions omit `updated_at` → authored through `baseColumns` (type side) + the migration.
5. Missing consolidation primitives (`effect_event_id`, `category_bidx`, HLC rep, derive-nullable progress) → per their owning issues.

## Open decisions for ADR-016

- **DDL generation — dual-authoring vs. drizzle-kit (OPEN).** The documented model authors each table **twice**: a
  Drizzle object (queries/types) **and** a hand-written SQL migration (DDL) kept in sync by hand (`migrations/001_initial.ts`
  header: "Matches schema.ts and ADR-002 exactly"). Across ~130 tables this is real drift risk. The only alternative
  that fits the cross-platform custom runner (wa-sqlite/OPFS · expo-sqlite · Tauri, post-SQLCipher) is a **hybrid**:
  Drizzle objects as source → `drizzle-kit generate` emits the SQL → the existing runner applies it (single-source;
  would also make a Drizzle `check()` helper valid again). Adopting drizzle-kit is a **deliberate deviation** from the
  docs (ADR-001/002 specify neither) and needs this ADR to sanction it. **Recommendation:** follow the documented
  hand-written model for now (reversible); decide the hybrid here before DB-3 authors many tables. `[FACT: ADR-001; ADR-002 §5; no drizzle-kit installed]`

## Phasing axis — foundation-first, then dependency-wave

| Phase                           | Contents                                                                                        |
| ------------------------------- | ----------------------------------------------------------------------------------------------- |
| **P0 · Primitives**             | `_shared.ts` · `_registry.ts` · directory · barrel — **this session, DB-1/LIF-61**              |
| **P1 · Notes/Tags/Spaces hub**  | pages · links · tags · entity_tags · spaces · views · capability registry · templates · grants  |
| **P2 · Sessions foundation**    | sessions spine · planned_blocks · session_attachments · applied_effects                         |
| **P3 · Economy/measurement**    | currencies · consequence_ledger · rules · values · contributions · purpose_reviews · plan_steps |
| **P4…N · Domains (wave order)** | one gated phase **per table**, walked in FK-dependency order                                    |
| **P-final · Reconcile**         | rewrite ADR-002 §5/§7/§8 from the authored schema; FTS5; encryption map; repository/migrations  |

## Gating model — **per table**

Each table = one phase = one **Per-Step Build Gate** (spec → critique → approve → implement → verify), producing its
own forward spec, authored into its `schema/<domain>.ts`, verified, ledger row → `verified`. Governed by the master
plan (the shared relational context every per-table gate reads). Resume from the ledger, never from memory.

Context machinery: **table-spec template** (fast, uniform fill-from-doc) + **FK ledger** (a table is gated only after
its referenced parents are `authored`; relationships documented on both sides) + **⏳ shape-decision log**.

## Re-scope owed to Linear

The DB-1…DB-11 issues predate this from-zero decision. DB-3 ("stream-i consolidation") and DB-4 ("per-domain") were
framed as retire/mutate the monolith; they become **author net-new**. Re-scope in the follow-up, not this session.
