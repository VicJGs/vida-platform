# Task: db-1-schema-primitives
# Status: in_progress   (code implemented + verified 2026-07-22; close-out pending: commit · /task-complete · LIF-61→Done)
# Profile: Generic Coding Session
# Scenario: Default
# Cluster: ① Database Layer
# Milestone: Schema
# Phase: 1.0 — Structural Foundation
# Source: docs/roadmap.md → Phase 1.0 ① Database Layer

## Goal
Stand up Drizzle in `packages/core/src/db/schema/` and codify the column conventions every
table inherits: UUIDv7 TEXT primary keys (client-generated, time-sortable), Unix-ms INTEGER
timestamps, 0/1 INTEGER booleans, INTEGER-cents money, `YYYY-MM-DD` TEXT calendar dates, and
JSON-as-TEXT for arrays/nested objects. This is the substrate DB-3/DB-4 build the consolidated
schema on. (ADR-002; CLAUDE.md conventions.)

## Dependencies
- (root — no blockers; one of the four Phase-1.0 entry points)

## Reframe (2026-07-20/21 — after schema reconciliation)
Ground truth established this session: the v1 `schema.ts` is ~60% wrong vs the documented v2 target
(retire ~22 · missing ~90-110 · divergent ~9 · carry-forward ~40; no deployed data). Decision: **rebuild
the storage layer from zero**, authored from the docs, into a fresh `schema/` directory. DB-1 is **P0 —
the primitives** of that rebuild. See:
- `docs/infrastructure/database-schema-reconciliation.md` — the full sourced reconciliation (ground truth).
- `docs/infrastructure/database-layer.md` — current-state baseline.
- `docs/infrastructure/storage-rebuild-strategy.md` — the from-zero strategy (the follow-up this feeds).

## Scope (this session — additive, breaks nothing)
- `packages/core/src/db/schema/` directory + `index.ts` barrel (monolith `schema.ts` stays reference-only).
- `_shared.ts`: `baseColumns` (id · created_at · updated_at · ...syncColumns), `syncColumns` (**the current 6**),
  typed column helpers (`uuidPk`, `timestampMs`, `money`, `calendarDate`, `boolInt`, `json<T>`) + `enumText` (the SQL CHECK is authored in the migration — DB-3/4).
- `_registry.ts`: the `entity_type` registry mechanism (scaffold + foundation seed; domains extend later).
- Doc-comments codifying the six conventions.

## Out of scope (later issues — boundary discipline)
- `_sync_field_ts` + HLC representation → **DB-2 / LIF-62** (NOT DB-1).
- Any actual domain/foundation table → DB-3 / DB-4 (per-table gates).
- Encryption wiring → DB-5 · repository/migrations → DB-6/7.
- The master plan + ADR-016 → the storage-rebuild follow-up.

## Build Steps (done — 2026-07-21)
- [x] `packages/core/src/db/schema/_shared.ts` — baseColumns · syncColumns[6] · typed helpers · enumText (enumCheck removed 07-22 — DDL is hand-written SQL, ADR-002 §5)
- [x] `packages/core/src/db/schema/_registry.ts` — ENTITY_TYPES seed · EntityType · isEntityType
- [x] `packages/core/src/db/schema/index.ts` — barrel
- Forward spec + both gates: `docs/specs/foundation/db-1-schema-primitives/` (PLAN + IMPLEMENTATION-PLAN).
- Both gates cleared (each `/critique` REVISE→fixed via independent critic; `/preflight` PASSED; Approvals 1+2).

## Verification
- `tsc --noEmit` green: `@vida/core` · `@vida/web` · `@vida/server` (non-regression proven — `./db/schema` still
  resolves to the monolith via `web-adapter.ts:36 typeof schema`).
- Boundary: syncColumns = 6 (no `_sync_field_ts`); `sqliteTable(` count = 0 (comments only).

## Close-out remaining
code-review · quality-gate-engineering · commit · `/task-complete` · Linear LIF-61 → Done.
