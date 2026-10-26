# Task: mod-routines
# Status: in-progress — re-scope approved; S2c–S7 (+S5c) ✅ shipped (local commits); next = S8 tags/notes/links
# Scenario: Entity Re-scope (Entity Delivery Flow ① recovery variant — re-run from the flow, Victor 2026-10-21)
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
- **S7 — Routine-level effects ✅ (2026-10-26)** — D3 `award_xp` + `contribute_purpose_metric` keyed `routine.id` + `completed:<date>`
  on the WRITE whose date goes not-done → done (rule 21; transition read before/after inside the per-step lock; R5b/cross-midnight
  stamped dates rebuilt from the step's prior row), occurrence-gated, guarded first (zero reads without effects/handlers), isolated,
  drives flag `effect_emit_failed`, re-drivable `contributeToPurposeMetrics` (G8). Reads pure. Wired: complete/run/skip/edit/delete/
  planSkipDates/updateStep{skip_dates} (+ the S6 window guard on updateStep's newly added past dates — an S6 miss). Victor 2026-10-26: the
  reflection case is settled by rule 21 ("everything is described in the documentation") — my settleToday/amendment detour reverted.
  tsc 0 · eslint 0 · **routines 151/151** · full @vida/core **2164/2164** · mutation-checked · **g2 FINDINGS 1 blocking → fixed**
  (updateStep on a soft-deleted step keeps the ratified g2-N1 success) + N1–N5 · **/critique REVISE → fixed** (G5 no-evaluation test
  non-vacuous, mutation-proved) · §XXIX promoted.
- **S6 — Reschedule (SS-8 intent block) + acceptance-window guard ✅ (2026-10-22)** — v1 (no persistence) revised by Victor; v2 (eager
  scheduled session, my framing) failed g1 (focus/TAS-12/time-log); **v3 = SS-8 literal**: `rescheduleStep(stepId,{date,slot})` writes one
  `planned_blocks` row (target `routine_step`, `source 'routines:<D>'` — derived: R3 no MOD schema, Q3 no same-day-only), the make-good creates
  the session carrying `planned_block_id` and fulfils it; a skip cancels it. Step-level admissibility (R1), slot bounds (R2), one pending block
  per (step,D) (R4), R5b (a session linked to D's block stamps D). W1–W3 guard on make-good/skip writes (`OutsideAcceptanceWindowError`).
  Sessions (R1 first-consumer-pull): `planBlock`/`updatePlannedBlock`/`softDeletePlannedBlock`/`listPlannedBlocksForTarget` + `dueIn`
  pending-only filter. tsc 0 · eslint 0 · **routines + sessions 181/181** · full @vida/core 2147/2148 (vault 1MB F006) · **g2 FINDINGS 1
  blocking → fixed** (linked focus finished in-widget) + N1–N4 · **/critique REVISE → fixed** (guard skip for a running linked make-good under
  any date; table break) + a/c folded · §XXIX promoted. **[INTERP for Victor]** a make-good begun in-window completes after the window
  closes (BR-RT-S6-5, derived from contract.md:55 + RT-6). Limits: skipped block beside a done D (edge); stale pending block → S9.
- **S5c — Q1/RT-4/D3 correction ✅ (2026-10-22)** — every step drives an entity: a check-off step IS a Task (created + linked on add;
  legacy null rows migrated on first drive); a standard task occurrence = a Tasks `work` session (startTimer/stopTimer, adopt a Tasks-started
  timer, bare check = completed `work` session); obligation keeps `completeTask` (TK-7); any REGISTERED session sub-type is driven
  lifecycle-aware (`exercise`→`workout`), routines registers none; `completeStep` always returns StepRunState; new required dep
  `sessionRegistry`. A11 superseded (documentation-gate/interpretation/seam/slice-map amended). tsc 0 · eslint 0 · **routines 118/118** ·
  full @vida/core 2110/2111 (the 1 = vault Argon2 timeout at load ~300, F006) · **g2 FINDINGS 2 blocking → fixed** (B1 one occurrence per
  day; B2 BR-RT-S3d-1 stale) + NB fixes (settleOrDrop compensation, half-ref predicate, subTypeDef reuse, 7 gate tests, drift) ·
  **/critique REVISE→fixed** (exercise→workout test; wording; error message) · §XXIX promoted. Named limits: stale running `work`
  occurrence has no abandon rule (Tasks'); shared-Task adoption (RT-10). Open NB: orphan-Task cleanup branches untested.
- **S5 — Progress + analytics ✅ (2026-10-22)** — `getStreak` / `getAnalytics` / `progress` derive-on-read over the routine's occurrences
  (ical.js, minimal RT-11 day-grain allowlist probed 145 shapes × 9 starts: ical.js 2.2.1 hangs on some valid RFC rules); occurrence status
  done/missed/pending/neutral/unjudged under the USER's policy + acceptance window (today pending; real misses final; paused/off via the RT-6/Q3
  window procedure, Victor); policy-derived streak; rate/ranking/comparison; one ledger read per call. routines **102/102** · tsc 0 · eslint 0 ·
  core 2110/2111 (F006). g1/step-5/g2/final critiques folded (§XXVIII: denylist → minimal allowlist). Cross-module note for Victor: tasks'
  `nextOccurrence` shares the ical.js hang exposure. Spec `delivery/PLAN-S5-progress-analytics.md`.
- **S4 — Policy evaluation ✅ (2026-10-22)** — `evaluateRoutine(id, {date?})`: derive-on-read over the as-of-date step set; done = the
  routine row OR the driven entity done as of D (reflection only adds; history never rewritten); planned skip neutral; the USER's policy via
  `prefs?: RoutinesPrefsPort` (**no routines-side default**, Victor: defaults = Spaces templates/presets); no policy ⇒ only all/none judged,
  `policy_source:'undefined'`; exact-ratio threshold; required_node notes; `InvalidRoutinePolicyError`. routines **83/83** · tsc 0 · eslint 0 ·
  core 2087/2089 (F006 + F007 under load ~387, both green alone). g1 REVISE→folded · step-5 REVISE→folded · g2 → §XXVIII (entity-wins
  reversed) · final /critique REVISE→fixed · §XXIX. Spec `delivery/PLAN-S4-policy-evaluation.md`.
- **S3 — Run/drive ✅ (2026-10-22)** — `runStep` + `completeStep` drive leg over REAL tasks/habits/sessions: target precedence; task
  TERMINAL convention (cancelled unavailable, completed reflected, open driven, TAS-23 flag); habit one tick + HB-5 reflect (stale stamp
  removed); focus `startFocus({})`+attach / `completeFocus`+detach (N9 workaround), stamped on its start day (UTC-midnight safe), abandoned
  only before yesterday; per-step lock; `EntityUnavailableError`; `utcDay` clock. routines **64/64** · tsc 0 · eslint 0 · core 2066/2067
  (F006). g1 REVISE→folded · preflight PASSED · step-5 REVISE→folded · g2 10 → fixed (§XXVIII scope-5 narrowed) · final /critique
  REVISE→fixed · §XXIX. Spec `delivery/PLAN-S3-run-drive.md`.
- **S2c — Floor conformance ✅ (re-scope, 2026-10-21)** — setLifecycle · entity_type registry check (+ `registry` dep) · YYYY-MM-DD dates ·
  progress 0–100 · RRULE parse+FREQ (ical.js verified) · non-empty names · 3-key ordering · max+1 append · reorder returns steps · doc
  back-fills. routines **41/41** · tsc 0 · eslint 0 · core 2050/2052 (F006). g1 REVISE→folded · preflight PASSED · step-5 SHIP · g2 10 →
  4 fixed/2 recorded · final /critique REVISE→fixed · §XXIX promoted. Spec `delivery/PLAN-S2c-floor-conformance.md`.
- *(Re-scope 2026-10-21: as-built S1–S3 below = governing S1+S2; docs `delivery/{documentation-gate,interpretation,reconciliation,slice-map}.md`.)*
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

## Build Steps — S2c floor conformance (PLAN-S2c §5 · Approval 2 2026-10-21)
- [x] 1. Gate tests 1–13 written first (red) + construct with registry + retitle IR-n (D4)
- [x] 2. validators/routine.ts — CalendarDate · ProgressField · .min(1) base+extend · SetRoutineLifecycleSchema
- [x] 3. types.ts + index.ts — registry dep · setLifecycle · reorderSteps → RoutineStep[] · InvalidRecurrenceRuleError · header (D3)
- [x] 4. service.ts — RRULE guard · entity_type guard · setLifecycle · max+1 append · 3-key sorts · reorder returns · positional-date parse · D8 comment  (gate point 2–4)
- [x] 5. Back-fills — layer CLAUDE.md (D2) · introspection note (D5) · seam setLifecycle annotation
- [x] 6. Gates — tsc 0 · eslint 0 · routines suite · full @vida/core sequential · g2 · /critique · §XXIX

## Build Steps — S3 run/drive (PLAN-S3 §5 · Approval 2 2026-10-21)
- [x] 1. Tests first (red): real Tasks/Habits/Sessions harness + Gate 1–15 + narrow existing completeStep call sites
- [x] 2. validators — RunStepSchema
- [x] 3. types.ts + index.ts — deps · StepRunState · EntityUnavailableError · runStep · isStepRunState
- [x] 4. service.ts — utcDay clock · resolveTarget · drive legs · focus guard/retry/cancel · completeStep drive  (gate point 2–4)
- [x] 5. Docs annotations (interp 18/R5/23 · seam · slice-map · ledger B11)
- [x] 6. Gates — tsc · eslint · routines · full core · g2 · /critique · §XXIX

## Build Steps — S4 policy evaluation (PLAN-S4 §5 · Approval 2 2026-10-22)
- [x] 1. Tests first (red): Gate 1–14 + harness `prefs` option
- [x] 2. validators — EvaluateRoutineSchema
- [x] 3. types.ts + index.ts — CompletionRule · RoutinePolicy · RoutinesPrefsPort · RoutineStepRef · RoutineEvaluation · InvalidRoutinePolicyError · prefs? dep
- [x] 4. service.ts — bySequence · stepsAsOf · completionsOn · isDoneOn · classify · judge · evaluateRoutine  (gate point 2–4)
- [x] 5. Docs — amend "shipped default" lines + seam signature/additions + S5 note
- [x] 6. Gates — tsc · eslint · routines · full core · g2 · /critique · §XXIX

## Build Steps — S5 progress + analytics (PLAN-S5 §5 · Approval 2 2026-10-22)
- [x] 1. Tests first (red): Gate 1–16
- [x] 2. validators — RoutineDateRangeSchema
- [x] 3. types.ts + index.ts — S5 types · miss widened · getStreak/getAnalytics/progress
- [x] 4a. service.ts refactor — judgeDay + range completions (S4 83 green, commit)
- [x] 4b. service.ts S5 — assertExpandable · occurrences · classify · streak/rate/rank · ops  (gate point 2–4b)
- [x] 5. Docs — seam shapes/renames · current-spec lifecycle line · types comment
- [x] 6. Gates — tsc · eslint · routines · full core · g2 · /critique · §XXIX

## Build Steps — S5c Q1/RT-4/D3 correction (PLAN-S5c §5 · Approval 2 2026-10-22)
- [x] 1. Tests first (red): S5c gates 1–13 + named fixture rewrite
- [x] 2. types.ts / index.ts — sessionRegistry dep · StepRunState.target · completeStep return
- [x] 3. service.ts — resolveTarget · check-off add · legacy migration · task 3a/3b · generic session · isDoneOn  (gate point 2–3)
- [x] 4. Docs (row 7)
- [x] 5. Gates — tsc · eslint · routines · full core · g2 · /critique · §XXIX
- §XXVIII-minor: steps 1–3 landed in one pass (code drafted alongside the test rewrite, not strictly red-first); gates re-proved green after.

## Build Steps — S6 reschedule (SS-8 block) + acceptance-window guard (PLAN-S6 v3 §5 · Approval 2 2026-10-22)
- [x] 1. Tests first (red): routines gates 1–10 (+6b) · sessions gate 11
- [x] 2. Sessions (R1): schemas · planBlock · updatePlannedBlock · softDeletePlannedBlock · listPlannedBlocksForTarget · dueIn status filter  (sessions suite green)
- [x] 3. Routines types/validators/index — 3 errors · RescheduleStepInput/Schema · StepRunState 'scheduled' + planned_block_id
- [x] 4. Routines service — a guard (+ shared window helper, serialized skips) · b blocks · c rescheduleStep · d0 R5b day attribution · d make-good hook · e skip hooks  (gate points after 4a and 4e)
- [x] 5. Docs (row 7)
- [x] 6. Gates — tsc · eslint · routines + sessions · full core · g2 · /critique · §XXIX

## Build Steps — S7 routine-level effects (PLAN-S7 §5 v2 · Approval 2 2026-10-26)
- [x] 1. Tests first (red) + harness (effects wired, rail returned, opt-out, pinned clock)
- [x] 2. Types/index + contributeToPurposeMetrics (green)
- [x] 3. Service — a emission context · b drives (prior-row holder, R5b date) · c other writes (deleteCompletion soft-deleted lookup, updateStep guard) · e flag  (gate: routines green)
- [x] 4. Docs
- [x] 5. Gates — tsc · eslint · routines · full core · g2 · /critique · §XXIX
