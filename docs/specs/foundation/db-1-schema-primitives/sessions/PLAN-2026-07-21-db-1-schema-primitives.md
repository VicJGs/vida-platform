# PLAN — DB-1 · schema primitives   (session: 2026-07-21-db-1-schema-primitives · language: TypeScript/English)
> Executive summary (Human Gate 1). Read to approve the DIRECTION. Functional WHAT/WHY — not the technical build
> detail (that is the IMPLEMENTATION-PLAN). No-Guessing: every claim [FACT]/[INTERP]/[UNKNOWN].
>
> ⚠ **SUPERSEDED IN PART (§XXVIII, 2026-07-22):** the "enum/CHECK helper" mentioned below (§2, §3, §4) was
> **removed** post-implementation — DDL is hand-written SQL (ADR-002 §5), so a Drizzle `check()` emits nothing.
> Enum CHECK now = SQL migration (DB-3/4) + Zod (DB-9); DB-1 keeps only `enumText`. This PLAN stays as the dated
> gate-1 audit record; the authoritative surface is the IMPLEMENTATION-PLAN §5 + `current-spec.md`.

## 1. Contexto & demanda
The storage layer (`packages/core/src/db/schema.ts`) is the **v1 pre-consolidation** schema. This session's
reconciliation proved it is ~60% misaligned with the documented v2 target — retire ~22 · missing ~90-110 · divergent
~9 · carry-forward ~40 — with **five systemic gaps** (zero CHECK constraints, missing sync column, flattened partial
indexes, `updated_at` omissions, no consolidation primitives). `[FACT: docs/infrastructure/database-schema-reconciliation.md]`
Decision (Victor, 2026-07-20): **rebuild the storage layer from zero**, authored from the docs; no data exists, so
migration cost is zero. `[FACT: storage-rebuild-strategy.md]`

**DB-1 is P0** — the foundation the entire rebuild stands on: the primitives, conventions, and directory topology
every future table inherits. Without it, each of the ~130-150 table gates would re-derive conventions by hand and the
v1 systemic gaps would recur one table at a time. Affected: all of `@vida/core`'s DB layer, every downstream DB issue
(DB-2…DB-11), and the AR-1 topology decision. `[FACT: roadmap.md ① Database Layer]`

## 2. O que muda e por quê
**IN** — purely additive, breaks nothing:
- New `packages/core/src/db/schema/` directory + `index.ts` barrel (the public surface **for the new primitives**;
  the monolith's `./db/schema` export path stays untouched until consumers migrate at DB-6/7).
- `_shared.ts` — canonical primitives: `baseColumns`, `syncColumns`, typed column helpers, an enum/CHECK helper.
- `_registry.ts` — the `entity_type` registry mechanism + a foundation seed (domains extend it later).
- In-file doc-comments codifying the six conventions.

**OUT** — boundary discipline (each owned by a later issue): `_sync_field_ts` + HLC representation → **DB-2/LIF-62**;
any actual table → DB-3/DB-4; encryption wiring → DB-5; repository/migrations → DB-6/7; master plan + ADR-016 → the
storage-rebuild follow-up. The v1 `schema.ts` stays as **reference-only** and keeps its current import path.

**Why now:** it is the root of the Phase-1.0 critical path — every table gate depends on these primitives existing
and being correct. `[FACT: roadmap.md — "Database Layer leads"]`

## 3. Regras de negócio relevantes (funcional)
- **[FACT]** Every syncable entity carries `id` (UUIDv7 TEXT, client-generated) + `created_at` + `updated_at`
  (unix-ms INTEGER) + the 6 sync columns — expressed once as `baseColumns`, never hand-repeated.
  `[FACT: schema.ts:35-40; ADR-002 §2-§3]`
- **[FACT]** `syncColumns` = exactly the current 6 (`_sync_id · _sync_version · _sync_device_id · _sync_lww_ts ·
  _sync_status · _sync_hash`). The 7th (`_sync_field_ts`) is **DB-2's**, deliberately NOT added here — but the
  shape must let DB-2 add it cleanly. `[FACT: schema.ts:22-28; roadmap.md DB-2]`
- **[FACT]** The six conventions are canonical and must be **enforced by reusable helpers**, not repeated by hand:
  UUIDv7 TEXT PK · unix-ms INTEGER timestamps · 0/1 INTEGER booleans · INTEGER-cents money · `YYYY-MM-DD` TEXT dates ·
  JSON-as-TEXT. `[FACT: CLAUDE.md conventions; ADR-002 §2]`
- **[NEW]** Enums must be expressible as **SQL CHECK + canonical Zod** via a reusable enum/CHECK primitive — this
  closes the systemic zero-CHECK gap the reconciliation found. `[FACT: CLAUDE.md "Enums: TEXT + CHECK + Zod";
  reconciliation §E.1]`
- **[NEW]** Polymorphic `entity_type` values (used by `pages`, `entity_links`, and the future `entity_tags`) must
  derive from **one registry** so cross-table references stay consistent. Today `entity_links.entity_type` is a bare
  `text` with **no CHECK**, which the reconciliation flags for a registry-derived CHECK.
  `[FACT: schema.ts:105 — no CHECK; reconciliation §A "entity_links needs registry CHECK relax"; ADR-006]`
- **[FACT]** Additive-only: the v1 `schema.ts` consumers must keep compiling unchanged.
  `[FACT: index.ts:59, adapter.ts:16 import the monolith]`
- **[FACT/RISK]** The new `schema/` **directory** sits beside the existing `schema.ts` **file**; both consumers import
  the bare specifier `./db/schema`. File-vs-directory resolution is toolchain-dependent (tsc · Vite · esbuild · Metro
  across the 4 apps), so "nothing breaks" must be **verified per-app**, not assumed. The safe mechanism (explicit
  legacy path vs verified coexistence) is locked in the IMPLEMENTATION-PLAN.
  `[FACT: index.ts:59 & adapter.ts:16 import './db/schema'; grep confirms no consumer imports the dir yet]`

## 4. Aceitação (funcional)
- [ ] `packages/core/src/db/schema/` exists with `_shared.ts`, `_registry.ts`, `index.ts`.
- [ ] `_shared.ts` exports `baseColumns` + `syncColumns` (semantics identical to today's) **plus** typed helpers
      (`uuidPk`, `timestampMs`, `money`, `calendarDate`, `boolInt`, `json<T>`) and an enum/CHECK helper. <!-- enum/CHECK helper superseded — see banner -->
- [ ] `syncColumns` contains **exactly 6** columns — `_sync_field_ts` is absent (DB-2 boundary held).
- [ ] `_registry.ts` exports the `entity_type` registry mechanism + a foundation seed; extensible per-domain.
- [ ] **No table** is authored in this unit.
- [ ] `pnpm typecheck` passes; **and** `./db/schema` still resolves to the monolith (all 80 tables) under **each
      app's** resolver (web · mobile · desktop · server), verified — not only at `@vida/core`. The additive-safety
      claim is tested against the bundlers that ship.
- [ ] The six conventions are documented in-file (doc-comments) mirroring ADR-002 §2 / CLAUDE.md.

## 5. Questões em aberto / decisões pendentes
- **[RESOLVED — FACT]** drizzle-orm 0.45.1 exports `check(name, value: SQL): CheckBuilder` from
  `drizzle-orm/sqlite-core` (`checks.d.ts`, re-exported via the barrel). The enum/CHECK helper composes
  `text({ enum })` (TS typing) + `check()` (SQL constraint) + the canonical Zod validator. No longer a gate-2 blocker.
  `[FACT: node_modules/.../drizzle-orm@0.45.1/sqlite-core/checks.d.ts — verified 2026-07-21]`
- **[DECISION — lock at impl-plan]** Typed-helper API surface (signatures/naming). Proposed defaults; not blocking direction.
- **[DECISION — lock at impl-plan]** `_registry.ts` foundation-seed scope — minimal mechanism + the entity types the
  P1 foundation tables will need, vs an exhaustive list now. Recommendation: **minimal + extensible**.

## 6. Aprovação 1 (direção)
Pending — awaiting Victor after `/critique` + `/preflight`.
