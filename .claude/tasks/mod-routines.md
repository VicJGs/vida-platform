# Task: mod-routines
# Status: in_progress
# Scenario: Default (Entity Delivery Flow ①)
# Profile: Add Backend Component
# Linear: LIF-138
# Project: M1 — Whole Manual OS
# Milestone: M1.1.2 — Feature Modules · Backend
# Source: reconstructed-structure.md (Phase V, LIF-110; ADR-016 model)

## Goal
Routines (orchestrator) — routines linked to habits/tasks

## Scope finding (BASELINE)
The aspect corpus flags the orchestration reframe `⚠ INTENDED`, but the reframe DDL **already shipped at DB-4**
(migration 018 creates `routines` + `routine_step` + `routine_completions`). Prose is stale lag; schema is the
oracle. ① = `createRoutinesService` over the 3 shipped tables, mirroring the twin MODs. Deferred (homed forward):
completion/miss policy → Preferences; `routine_step_membership` → Spaces design-pass; Scheduler internals →
Sessions; XP application → Gamification. Delivery: `docs/features/routines/delivery/`.

## Slice log
- **S1 — Routine CRUD + DB-11 reconcile ✅** — `@vida/types/routine.ts` reconciled (new `Routine`/`RoutineStep`,
  re-key `RoutineCompletion`→`routine_step_id` (SyncableEntity), retire `RoutineAction`+`ROUTINE_ACTION_TYPE`+
  `ROUTINE_RECURRENCE_FREQUENCY`; zero live consumers); validators; `createRoutinesService` S1 CRUD (faithful echo
  + soft-delete + lifecycle filter); barrel; core export. tsc 0 · eslint 0 · **routines 9/9** live-store gate
  (faithful echo · partial update · soft-delete · filter · 2 failure paths · sync_queue probe) · full @vida/core
  **1916/1916** (DB-11 enum retirement 0 regression) · **g2 SHIP** (3 nits, all deferred) · /critique SHIP ·
  §XXIX `docs/modules/routines/current-*` born.
- S2–S8: pending (steps · ledger · runStep · evaluate · lifecycle · tags/pages/links · provider+fan-out closer).

## Dependencies
- blocked by `mod-journals`
- blocked by `mod-knowledge`
- blocked by `mod-notes-and-pages`
- blocked by `mod-sessions`
- blocked by `xs-effect-rail`
- blocked by `xs-measurement-engine`
- blocked by `xs-spaces-tags-links`
- blocked by `xs-views`
