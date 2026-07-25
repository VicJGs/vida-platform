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

## Downstream (INTENT — owned by later issues)
DB-2 sync cols/HLC · DB-3 substrate tables · DB-4 per-domain tables · DB-5 encryption wiring · DB-6/7 repository +
migrations + monolith retirement · DB-8 FTS5 · DB-11 reconcile ADR-002 §5/§7/§8.
