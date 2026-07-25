# Database Layer — Current Business Rules (durable · §XXIX promotion target)

> **Context:** `@vida/core` → `packages/core/src/db/`. **Seeded from documentation** (v1 code is being rebuilt
> from zero, so the docs are the anchor — per Victor 2026-07-21). Sources: ADR-001/002/003, `docs/core/conventions.md`,
> `docs/infrastructure/database-schema-reconciliation.md`, `storage-rebuild-strategy.md`.
> **No-Guessing:** each rule `[FACT: src]` or `[INTENT]` (documented, owed).

## Invariants every syncable table upholds
1. **[FACT]** PK = `id`, UUIDv7 TEXT, client-generated. `[ADR-002 §2.1; CLAUDE.md]`
2. **[FACT]** Timestamps (`created_at`, `updated_at`, `*_at`) = Unix-ms INTEGER (`Date.now()`). `[ADR-002 §2.2]`
3. **[FACT]** Booleans = INTEGER 0/1. Money = INTEGER cents. Calendar dates = `YYYY-MM-DD` TEXT. JSON = TEXT
   (stringified). `[ADR-002 §2.4/§2.6/§2.8/§2.5]`
4. **[FACT]** Enums = TEXT + SQL `CHECK` **authored in the hand-written migration** (ADR-002 §5) + the canonical
   **Zod** validator in `@vida/core` (DB-9). Drizzle's `enumText` supplies the TS union for query types only — DDL is
   not generated from Drizzle objects (no drizzle-kit). `[FACT: ADR-002 §2.3/§5; migrations/001_initial.ts]`
5. **[FACT]** Every syncable table carries the sync-metadata columns (`_sync_id · _sync_version · _sync_device_id ·
   _sync_lww_ts · _sync_status · _sync_hash`). `[ADR-002 §3; ADR-003]` **[INTENT]** `_sync_field_ts` is added to
   the set by **DB-2** (ADR-003 §17). `[roadmap DB-2]`
6. **[FACT]** Notes are never inline columns — all note bodies live in `pages` via the polymorphic
   `entity_type`/`entity_id` pattern. `[ADR-002 §2.7]`
7. **[FACT]** Soft delete = `deleted_at INTEGER` (NULL = live). `[CLAUDE.md]`
8. **[INTENT]** Polymorphic `entity_type` values derive from ONE registry (`ENTITY_TYPES` in `_registry.ts`) so
   cross-table references (pages · entity_links · entity_tags) stay consistent. The SQL migration authors its `CHECK`
   from that same const (DB-3/DB-4); DB-1 supplies the const + `EntityType`/`isEntityType`. `[reconciliation §A; ADR-006]`
9. **[FACT]** Three-layer encryption: L1 SQLCipher (DB at rest) · L2 field-level libsodium (`-- [E]` fields) · L3
   sync-blob (whole row for transit). `[ADR-002 §4]`

## Rules established/changed by DB-1 (IMPLEMENTED 2026-07-21 — `schema/_shared.ts` + `_registry.ts`)
- **[NEW]** Conventions #1–#4 are enforced on the **query/type side** by reusable typed primitives in
  `schema/_shared.ts`, not hand-repeated per table — closing the reconciliation's *hand-repeated-conventions* drift.
  (The systemic *zero-CHECK* gap is closed on the DDL side by the SQL-migration `CHECK` + Zod — DB-3/DB-4/DB-9 — not by
  a Drizzle helper.) `[reconciliation §E]`
- **[NEW]** The `schema/` directory is the v2 authoring surface; the v1 monolith `schema.ts` is **reference-only**
  and additive-safe (its `./db/schema` import path is preserved until consumers migrate at DB-6/7).
- **[FACT — boundary]** DB-1 adds **no table** and does **not** add `_sync_field_ts` (DB-2's charter).
