# Task: mod-routines
# Status: in-progress — S3/8 shipped (1a61189); merged origin/main 2026-10-21, S4 next
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
- **S2 — Step CRUD + app-cascade ✅** — `routine_step` CRUD (`addStep`/`updateStep`/`removeStep`/`reorderSteps`/
  `listSteps`); polymorphic `step_type` OPEN-vocab + nullable entity ref (RT-3/RT-4); `is_required`; `skip_dates`
  JSON serialize/parse (IR-6); `addStep` guards parent (`RoutineNotFoundError`, no orphan); `archiveRoutine`
  cascade-soft-deletes steps (IR-3); `reorderSteps` ownership-scoped + contiguous. tsc 0 · eslint 0 · **routines
  18/18** · full @vida/core **1925/1925** · **g2 SHIP** (2 nits: N1 step-lifecycle-resurrect = ratified pattern,
  homed forward · N2 partial-reorder = doc-clarified) · /critique SHIP · §XXIX refreshed.
- **S3 — Completion ledger + skip ✅** — `completeStep`/`skipStep`(logged)/`editCompletion`/`deleteCompletion`/
  `listCompletions` over `routine_completions` (upsert UNIQUE(step,date); hard-delete ledger RT-14) + `planSkipDates`
  → `step.skip_dates` (pre-planned, RT-8). **§XXVIII deviation (g2-APPROVED):** RT-8 two-mechanism split corrected
  the seam-contract's single `skipStep({kind})` (logged=row vs planned=skip_dates). `StepNotFoundError`/
  `CompletionNotFoundError` fail-loud. Fixed a barrel collision (`EditCompletion*`→`EditRoutineCompletion*`,
  [[barrel-export-star-collides-with-services-on-generic-names]]). tsc 0 · eslint 0 · **routines 28/28** · full
  @vida/core **1935/1935** · **g2 SHIP** (deviation APPROVED-sound; 4 cosmetic nits) · /critique SHIP · §XXIX refreshed.
- S4–S8: pending (runStep · evaluate · lifecycle · tags/pages/links · provider+fan-out closer).

## Status note (2026-10-14)
⏸ PAUSED pending `mod-tasks` (#65 / LIF-142). Entity Delivery Flow front matter DONE through the
Decomposition Gate (Approval 1): `docs/features/routines/delivery/{interpretation,slice-map,seam-contract}.md`
— 9 backend slices approved. **D1 resolved (Victor): build Tasks first**, then resume routines with a
**required** `tasks: TasksService` dep (not the deny-safe port). D2 (notes entity_type=`routine_step`) + D3
(two-seam completion) approved. Resume = reconcile substrate sigs vs the shipped TasksService, then start S1.

## Dependencies
- blocked by `mod-tasks`  ← added 2026-10-14 (Tasks-first decision; routines drives task-type steps + RT-4 recurrent task)
- blocked by `mod-journals`
- blocked by `mod-knowledge`
- blocked by `mod-notes-and-pages`
- blocked by `mod-sessions`
- blocked by `xs-effect-rail`
- blocked by `xs-measurement-engine`
- blocked by `xs-spaces-tags-links`
- blocked by `xs-views`
