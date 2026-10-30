# Task: db-7-migrations-runner
# Profile: Add Backend Component
# Scenario: default
# Spec: docs/specs/foundation/db-7-migrations-runner/_index.md
# Created: 2026-07-29
# Status: done
# Linear: LIF-69
# Project: M1 — Whole Manual OS
# Milestone: M1.0 — Boot & Connective Base
# Phase: 1.0 — Structural Foundation
# Source: docs/roadmap.md → Phase 1.0 ① Database Layer

## Goal
Build the migrations runner: forward-only migrations, schema versioning, and a dev-reset path.
Runs against the local SQLite (wa-sqlite/OPFS on web) so the dogfood vault can evolve its schema
without data loss during Phase 1. DB-7 **authors the `app_state` foundation fragment** — its own
schema-version store, read/written by `getSchemaVersion`/`setSchemaVersion` (ADR-002 §9.1) — as
`schema/foundation/`, raw DDL, NOT synced (no `baseColumns`/`syncColumns`, ADR-002 §5.1). Migrations
are authored **per-feature** (ADR-018 §3.5b — no monolithic `001_initial` bootstrap).

## Dependencies
- blocked by `ar-2-database-adapter-web`
<!-- removed 2026-07-27 (dep-reconcile triage): stale `blocked by db-4-per-domain-schema` — the runner is
     generic (applies hand-written SQL migrations regardless of which tables); it needs the driver (ar-2) +
     primitives (db-1, transitive), NOT per-domain schema. Migrations authored per-feature (ADR-018 §3.5b). -->
<!-- NOTE: DB-7 authors the `app_state` foundation fragment (its schema-version store; see Goal). SIBLING of DB-6. -->
<!-- 2026-07-29: confirmed COMPUTED head via tracker_sync --next (delivery-plan §4). ar-2 ✅ → db-7 READY. -->

## Context
Profile: Add Backend Component (single-path → scenario `default`)
Files involved: `packages/core/src/db/migrations/` (runner) · `packages/core/src/db/schema/foundation/` (app_state fragment) · `packages/core/src/db/adapter.ts` / repository seam (runner invocation) · existing migration registrations (001 sync_queue @ db-6, 002 sessions @ ar-5, 003 spaces @ ar-6)
Integration points: consumes ar-2's async `DatabaseAdapter`; produces the versioned migration channel db-10 (seed) and every future per-feature migration ride on.

## Open Questions
- [to be filled as they arise during the PLAN step]

## Decisions Made
| Decision | Choice | Reason | Date |
|----------|--------|--------|------|
| *(logged automatically by /session-log)* | | | |

## Progress
<!-- SESSION checklist — the scenario's ## Task List (native panel mirror). Session-level. -->
- [x] Step 0 — document-context BASELINE (`database-layer`): reconcile+extend confirmed; app_state latent-bug found
- [x] PLAN gate 1 — spec §2–§4 → independent /critique (REVISE, all fixed) → Approval 1
- [x] IMPL-PLAN gate 2 — /preflight PASSED → 2nd independent /critique (SHIP) → §5 → Approval 2
- [x] Implement (app-state.ts → ensureInfra/migrate → resetDev → fixtures retired) → typecheck 10/10
- [x] Post-impl /critique (SHIP, 2 NITs fixed) → quality-gate-engineering PASS
- [x] Currency §XXIX — refreshed `database-layer` CURRENT- docs + build-plan ledger + db/CLAUDE.md → ship together

## Build Steps
<!-- UNIT-level — mirrors the approved spec §5 / IMPLEMENTATION-PLAN. -->
- [x] 1. `schema/foundation/app-state.ts` Drizzle mirror + `schema/index.ts` re-export
- [x] 2. `ensureInfra(driver)` in `runner.ts` (idempotent `CREATE TABLE IF NOT EXISTS app_state`)
- [x] 3. `migrate()` calls `ensureInfra` before `runMigrations` (engine untouched)
- [x] 4. `resetDev(adapter, config)` — dev-guarded, not barrel-exported
- [x] 5. Retire all 4 `CREATE_APP_STATE` fixtures
- [x] 6. Contract tests `db/tests/migrations-runner.test.ts` (6 cases)
- [x] 7. Doc currency: build-plan ledger + db/CLAUDE.md + database-layer current-*
- [x] 8. Verify — typecheck 10/10 · @vida/core 131/131 · @vida/web 6/6 · eng gate PASS

## Plan
<!-- Only for a SPEC-LESS small task (§XXVI LITE). db-7 is a full double-gate build — plan lives in the spec. -->

## Session History
| Date | What was done | Next step |
|------|--------------|-----------|
| 2026-07-29 | activated the stub (computed head via --next); scaffolded spec home | Step 0: document-context BASELINE of `database-layer` → PLAN |
| 2026-07-29 | Step 0 baseline (grepped live floor — reconcile+extend, app_state latent-bug); gate-1 PLAN §2–§4 drafted; independent critique (REVISE, all fixed incl. 4th fixture); **APPROVAL 1 ✅** | /preflight → 2nd independent critique → Approval 2 → implement |
| 2026-07-29 | preflight PASSED → 2nd critique SHIP → §5 → **APPROVAL 2 ✅** → IMPLEMENTED all 8 steps + §XXIX docs; post-impl critique SHIP; eng gate PASS. typecheck 10/10, core 131/131, web 6/6 | commit → /task-complete (pending Victor) |

## Notes
- Head confirmed by `tracker_sync.py --next` (2026-07-29), not hand-read. Ranked #1 in `Boot & DB spine` (2 dependents). Delivery-loop audited sound the same session — see [[delivery-loop-verified-sound]] / TASKS.md audit note.
