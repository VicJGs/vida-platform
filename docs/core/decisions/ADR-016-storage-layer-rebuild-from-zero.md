# ADR-016: The storage layer is rebuilt from zero — a fresh `schema/` directory authored per-table from the documentation; DDL stays hand-written SQL migrations (Drizzle is the query-only type mirror); every table clears its own build gate

**Status:** Accepted
**Date:** 2026-07-22
**Decision Makers:** Victor J.
**Context:** Vida Platform — the build-phase schema session that ADR-002 §5.20 (D5-a) deferred. The v1 `packages/core/src/db/schema.ts` is the pre-consolidation schema and is **~60% misaligned** with the documented v2 target; DB-1 (LIF-61) shipped the primitives; this ADR governs the from-zero rebuild campaign (DB-2…DB-11 + the per-table gates). Basis: `docs/infrastructure/database-schema-reconciliation.md` + `docs/infrastructure/storage-rebuild-strategy.md`.
**Tags:** architecture · database · schema · migrations · process · foundation
**Realizes:** **ADR-002 §5.20** — this is the deferred consolidation session; §5/§7/§8 are rewritten from the authored schema at DB-11.
**Amends:**
- **ADR-001 (Tech Stack)** — resolves ADR-001's silence on migration generation: DDL is **hand-written SQL migrations** applied by the custom cross-platform runner; `drizzle-kit` is **not** adopted. Drizzle ORM stays the **query-only** type mirror.
**Inherits:** the reconciliation finding (v1 stale); DB-1 primitives (`schema/_shared.ts` · `_registry.ts`); the No-Guessing Principle.

---

## 1. Summary

The implemented storage schema is v1 and cannot be incrementally patched into the v2 target — retire ~22 tables, add ~90-110, reshape ~9, with five systemic gaps (zero CHECKs, missing sync col, flattened partial indexes, `updated_at` omissions, no consolidation primitives). Because the platform is **local-first with no deployed data** (no dogfood vault yet), a rebuild carries **zero migration cost**. So:

- **Rebuild from zero into a fresh `packages/core/src/db/schema/` directory**, authored **from the documentation** (the 24 `structure-data.md` docs + ADR-002 §5.20). The v1 monolith `schema.ts` stays **reference-only** and is deleted at parity.
- **DDL is hand-written SQL migrations** (ADR-002 §5 model) applied by the existing custom runner (`migrations/*` + `runner.ts`); **Zod** validators (DB-9) are the runtime enforcement. **Drizzle objects are the query-only type mirror** — DDL is *not* generated from them (no `drizzle-kit`). Enum enforcement = SQL-migration `CHECK` + Zod + the Drizzle `enumText` union.
- **Every table clears its own Per-Step Build Gate** — its own forward spec, critique, approvals, verification — governed by a **master plan** (`docs/infrastructure/storage-build-plan.md`): the table ledger, phase sequence, and per-table-spec template.

## 2. Context — what triggered this

- **ADR-002 §5.20 deferred it explicitly:** the consolidated re-write is "deferred to its own build-phase schema session (which also writes the Drizzle schema in `packages/core`)." `[FACT: ADR-002 §5.20]`
- **The reconciliation quantified the gap** (2026-07-20): current 80 tables vs a documented target of ~130-150 — carry-forward ~40 · retire ~22 · missing ~90-110 · divergent ~9, plus 5 systemic gaps. `[FACT: database-schema-reconciliation.md §A-E]`
- **DB-1 established the substrate** (2026-07-22, commit b234e85): `schema/` directory + primitives; additive; the monolith kept its import path. During DB-1's review the DDL-generation question surfaced — a Drizzle `check()` helper emits nothing because this repo hand-writes SQL DDL. `[FACT: DB-1 IMPLEMENTATION-PLAN §XXVIII]`
- **Greenfield → structural decision, not a migration:** no released app, no vault, `DB-10 · Seed` still planned. `[FACT: TASKS.md]`

## 3. Decision

**3.1 From zero, into `schema/`, authored from the docs.** A fresh `packages/core/src/db/schema/` directory is the v2 authoring surface: `_shared.ts` (primitives) · `_registry.ts` (the `entity_type` registry) · `foundation/` (cross-cutting substrate) · `<domain>.ts` (one per `structure-data.md`) · `index.ts` (barrel). The v1 `schema.ts` is reference-only and is deleted once the new schema reaches parity (DB-6/7). Every table traces to a `structure-data.md` doc or a §5.20 row — No-Guessing.

**3.2 DDL is hand-written SQL migrations; Drizzle is query-only (fork resolved: A).** The Drizzle objects give typed queries + inferred types; they are **not** compiled into `CREATE TABLE`. DDL is authored as **hand-written SQL** in the TypeScript migration files (`migrations/NNN_*.ts`, raw-SQL fragments via `db.batch`) and applied by the custom runner across wa-sqlite/OPFS · expo-sqlite · Tauri after SQLCipher unlock. **`drizzle-kit` is not adopted.** Consequence: each table is authored on **two coordinated surfaces** — a Drizzle object (queries) and a SQL migration (DDL) — kept in sync by discipline (the master plan's per-table gate checks both). `[FACT: migrations/001_initial.ts; ADR-002 §2.3/§5; ADR-001 silent → resolved here]`

**3.3 Enum enforcement is a three-part contract.** `enumText(col, VALUES)` (Drizzle TS union) + `CHECK (col IN (…))` authored in the SQL migration from the same `VALUES` const + the canonical **Zod** validator (DB-9). No Drizzle `check()` helper — it would emit nothing under 3.2. Polymorphic `entity_type` values derive from `_registry.ts` (`ENTITY_TYPES`), extended per domain; the migration's CHECK is sourced from that const.

**3.4 Locked patterns (from DB-1, enforced for every table).** `baseColumns` (id UUIDv7 · created_at · updated_at · sync) · `syncColumns` (6; `_sync_field_ts` added by DB-2) · typed helpers (`uuidPk` · `timestampMs` · `money` · `calendarDate` · `boolInt` · `json<T>` · `enumText`). The five systemic gaps are fixed at the source: CHECKs in the migration; partial indexes with `WHERE`; `updated_at` via `baseColumns`; consolidation primitives per their owning issue.

**3.5 Per-table gating.** Each table = one Per-Step Build Gate (§XXVI): spec → critique → approve → author (Drizzle object + SQL migration) → verify → ledger row flips `verified`. A table is gated only after its FK parents are `authored` (the ledger enforces order). ⏳ shape-open tables (capability registry, `rules`, `planned_blocks`, session extensions, `store`) resolve their shape at their own gate.

## 4. Consequences

- **Dual-authoring is the accepted cost** of the cross-platform custom runner: 130+ tables authored twice (Drizzle + SQL), synced by hand. The per-table gate is where they're checked against each other.
- **Reversibility preserved (the B trigger).** A→B is a clean later migration (generate SQL from the existing Drizzle objects). **Revisit trigger:** if hand-sync drift bites *before DB-3 authors tables at volume*, reopen the drizzle-kit-generate hybrid (Option B) in a follow-up ADR — at which point a Drizzle `check()` helper becomes valid again.
- **The DB-cluster (DB-2…DB-11) is re-scoped** to "author net-new" rather than "mutate the monolith"; the master plan maps each to a phase. Linear re-scope owed (not executed here).
- **ADR-002 §5/§7/§8 are rewritten** from the authored schema at DB-11; §5.20's stale Stream-ii count (19) is corrected to disk (24).

## 5. Alternatives considered

- **(B) drizzle-kit-generate hybrid** — Drizzle objects as single source → `drizzle-kit generate` → custom runner applies. Eliminates dual-authoring and would sanction a Drizzle `check()` helper. **Deferred, not rejected:** it adds a build-time tool + step across the whole schema and deviates from the documented model; its single-source benefit pays off only at table volume, and A→B is the cheap direction. Recorded with a revisit trigger (§4).
- **Mutate the v1 monolith in place** — rejected: ~60% of the schema is wrong; every step would fight a v1 structure, and the systemic gaps would recur table-by-table.
- **Keep one growing `schema.ts`** — rejected: the per-domain `schema/` directory is DB-4's target and the per-table gate's unit; a monolith can't be gated table-by-table cleanly.
