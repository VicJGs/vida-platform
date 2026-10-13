<!-- Slice Map — features/routines · Entity Delivery Flow ① Step 2 · mod-routines (LIF-138) · Approval 1 artifact
     Each slice tagged backend|frontend|shared. ① = backend only; frontend rides fe-routines (P6). -->

# Slice Map — Routines (①)  (mod-routines · LIF-138 · M1.1.2)

> 8 backend slices over the shipped DB-4 reframe schema (`routines` · `routine_step` · `routine_completions`).
> Mirrors the twin MOD builds (habits 5 · projects/purposes/relationships 9). Each slice runs the full per-slice
> service track (Steps 3–11): forward spec → §XXVI gate → implement → tsc 0 → **blocking live-store Verification
> Gate** → g2 code-review → /critique SHIP → §XXIX currency. No batching; each slice's gate PASSES before the next.

## Backend / frontend split
- **All 8 slices = `backend`.** Routines ① is a pure `@vida/core` service. No `@vida/ui`/`apps/web` surface here.
- **Frontend = out of scope → `fe-routines` (P6).** The to-do view, standalone page, analytics charts, run-step UI.
- **No `shared` slice** — the service API the UI will consume is frozen in `seam-contract.md` (this gate).

## Slices

| # | Slice | Tag | Scope (legs) | Composes | Key invariants |
|---|---|---|---|---|---|
| **S1** | **Routine CRUD + DB-11 reconcile** | backend | `createRoutine/updateRoutine/archiveRoutine/getRoutine/listRoutines`; author `Routine`/`RoutineStep`/`RoutineCompletion` in `@vida/types`, retire `RoutineAction`+old enums; validators; pursuable columns (`measurement_kind`/`binding_mode`/`progress`) | Repository (D1) | IR-7, IR-8, IR-10 |
| **S2** | **Step CRUD + app-cascade** | backend | `addStep/updateStep/reorderSteps/removeStep`; polymorphic `step_type`(OPEN)+`entity_type`/`entity_id`(nullable); `is_required`; delete-routine → app-cascade steps (IR-3) | Repository | IR-3, IR-4, IR-8 |
| **S3** | **Completion ledger + skip** | backend | `completeStep/skipStep({planned\|logged,reason?})/editCompletion/deleteCompletion`; upsert `UNIQUE(step,date)`; planned (`skip_dates`) vs logged (`skipped`) RT-8; **partial always recorded** RT-5 | Repository | IR-2, IR-6, IR-10 |
| **S4** | **runStep — drive the entity (keystone)** | backend | `runStep(step)`: resolve `entity_type`/`entity_id` → `SessionRegistry.createSession` OR native completion; `EntityUnavailable` typed state; **never a parallel completion** RT-3; deny-safe when a driver port is absent | Sessions registry (D2), Tasks/Habits (D9) | IR-2, RT-3 |
| **S5** | **Evaluate + derived analytics** | backend | `evaluateRoutine(routine,date):{done\|partial,percent,done[],not_done[]}`; **default** completion policy (all-or-nothing / required-node via `is_required` / threshold); `progress()` derive-on-read; streak/rate recompute from ledger (no cache) RT-14/RT-19 | Measurement (D4) | IR-1, IR-5 |
| **S6** | **Lifecycle + reschedule + scheduling seam** | backend | `setLifecycle(active\|paused\|off)` (paused/off → no misses); `rescheduleStep` → Scheduler open-slot (deny-safe X3); `recurrence_rule` RRULE → consumed by `dueIn`; `OutsideAcceptanceWindow` (default window, X1) | Sessions scheduler (D2), prefs? port | IR-5, RT-6 |
| **S7** | **Tags + pages + links** | backend | register `entity_type` `'routine'`/`'routine_step'`; `getEntityTags` (read via `associations`); tag/link WRITES via Spaces port; notes via `pages` RT-15/RT-16 | Spaces (D5), Notes (D6) | IR-10 |
| **S8** | **Provider + fan-out + deletion (① closer)** | backend | `JournalContribution` `summary(date)` + `registerRoutinesJournal`; `DueProvider` `fetch(range)` + `registerDueProvider`; emit-only effects `grant_currency`/`award_xp`+`contribute_purpose_metric`+`emit_measurement_signal` (guarded, post-commit, idempotent); routine→step→completion app-cascade deletion | Journals (D7), Sessions (D2), Effects (D3), Purpose (D8) | IR-2, IR-3, IR-9 |

## Dependency order (build sequence)
```
S1 ─► S2 ─► S3 ─► S4 ─► S5 ─► S6 ─► S7 ─► S8
 types/CRUD  steps  ledger  drive  evaluate  schedule  assoc  provider+fanout+closer
```
S1 is the type/CRUD spine (every later slice imports the mappers). S4 depends on S2's steps + S3's ledger. S5
depends on S3's ledger. S8 depends on S5 (summary digest), S3 (completion events), S6 (dueIn occurrences).

## Deferred — homed forward (NOT built, per interpretation §1 / §5)
- **Completion/miss/acceptance POLICY store** → Preferences/Spaces (X1). S5/S6 ship a default + deny-safe `prefs?` port.
- **`routine_step_membership` step-scoping (RT-10)** → Spaces design-pass (X2). S2 is single-routine ownership only.
- **Scheduler internals** → Sessions (X3). S6 composes `dueIn`/availability; `rescheduleStep` degrades deny-safe.
- **Gamification XP application** → Gamification handler (X4). S8 EMITS only; dormant until a handler resolves.
- **Frontend (to-do view, standalone page, analytics, run UI)** → `fe-routines` (P6).

## Per-slice Definition of Done (every slice)
tsc 0 · eslint 0 · forward spec + §XXVI gate cleared · **live-store Verification Gate PASS** (functional + ≥2 failure
paths + a real encrypt/persist write) · g2 code-review folded · /critique SHIP · §XXIX currency (`docs/modules/routines/current-*`).

## Completion checklist
- [x] every slice tagged backend/frontend/shared · [x] legs mapped · [x] build order acyclic · [x] deferred homed · [x] DoD stated
