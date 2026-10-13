<!-- CURRENT spec — module: routines · living doc (§XXIX). Promoted from the MOD-routines ① build (LIF-138).
     As-built service contract; refreshed per slice. Scope so far: S1–S3. -->

# Routines — Current Spec (① backend service tier)

> Status: ① in progress — S1–S3 landed. Home: `packages/core/src/services/routines/`. Schema:
> `db/schema/routines.ts` (`018_routines` — the orchestration REFRAME). Types/validators:
> `@vida/types/routine.ts` + `@vida/core/validators/routine.ts`. ② `fe-routines` (P6) owns the UI.
> Intent authority: the `docs/features/routines/` aspect corpus + `delivery/{interpretation,slice-map,seam-contract}.md`.

## Composition
`createRoutinesService(deps: RoutinesServiceDeps): RoutinesService` — factory-object, hoisted closures, no `this.`.
Deps: `{ db: DrizzleDb; deviceId: string; clock? }` (S2–S8 append optional deny-safe ports: sessions · effects ·
associations · spaces · prefs/policy · scheduler). Repo: `createRepository(db, routines, { deviceId,
encryptedFields: [], softDelete: true })`. The `[E]` fields (`name`/`description`) are a DORMANT M1.0 seam
(`encryptedFields:[]` → M3/DB-5). `[FACT: packages/core/src/services/routines/service.ts:33-37; types.ts:16-20]`

## The schema it serves (shipped reframe — migration 018)
- **`routines`** — the named ordered sequence + pursuable: `name[E]`/`description[E]`, `recurrence_rule` (RRULE),
  `lifecycle`∈{active,paused,off}, `measurement_kind` (NN DEFAULT 'rate'), `binding_mode` (nullable; NULL⇒derive),
  `progress` (nullable override slot — no cached streak), `sort_order`, soft-delete. `[FACT: db/schema/routines.ts:47-67]`
- **`routine_step`** — polymorphic driven step (replaces `routine_actions`): `routine_id`, `step_order`,
  `step_type` (OPEN vocab, no CHECK), `entity_type`/`entity_id` (nullable driven ref), `is_required`, `title[E]`/
  `description[E]`, `time_of_day`, `skip_dates` JSON. Built in **S2**. `[FACT: db/schema/routines.ts:70-89]`
- **`routine_completions`** — per-step ledger, re-keyed to `routine_step_id`; UNIQUE(step,date); no `deleted_at`.
  Built in **S3**. `[FACT: db/schema/routines.ts:92-109]`

## Operations (as-built)

### S1 — routine definition CRUD
| Method | Signature | Notes |
|--------|-----------|-------|
| `createRoutine` | `(input: CreateRoutineInput) => Promise<Routine>` | Zod-validated; faithful echo (BR-RT-S1-2); defaults backfilled |
| `updateRoutine` | `(id, patch: UpdateRoutineInput) => Promise<Routine>` | partial patch (no blanking); re-validates; `Row not found` if missing |
| `archiveRoutine` | `(id) => Promise<void>` | sets `deleted_at`; completion ledger preserved (RT-17) |
| `getRoutine` | `(id) => Promise<Routine \| null>` | excludes soft-deleted (`findById`) |
| `listRoutines` | `(filter?: { lifecycle? }) => Promise<Routine[]>` | explicit `isNull(deleted_at)` (findWhere gotcha, IR-10) |

### S2 — step CRUD + ordering + app-cascade
| Method | Signature | Notes |
|--------|-----------|-------|
| `addStep` | `(routineId, step: AddStepInput) => Promise<RoutineStep>` | guards routine exists (`RoutineNotFoundError`, no orphan); faithful echo; polymorphic `step_type` OPEN-vocab + nullable entity ref (RT-3/RT-4); `skip_dates` JSON serialize |
| `updateStep` | `(stepId, patch: UpdateStepInput) => Promise<RoutineStep>` | partial (no blanking); skip_dates set/clear |
| `removeStep` | `(stepId) => Promise<void>` | soft-delete; ledger cascade = S3/S8 |
| `reorderSteps` | `(routineId, orderedStepIds) => Promise<void>` | contiguous step_order from 0 in list position; foreign ids ignored; pass the FULL set |
| `listSteps` | `(routineId) => Promise<RoutineStep[]>` | live steps sorted by step_order |

`archiveRoutine` extended (S2): soft-deletes the routine THEN cascade-soft-deletes its live steps (IR-3, no FK). The
full routine→step→completion hard-delete closer lands in S8 (the ledger ships in S3).

### S3 — completion ledger + skip
| Method | Signature | Notes |
|--------|-----------|-------|
| `completeStep` | `(stepId, input?: {date?, actual_duration_minutes?}) => Promise<RoutineCompletion>` | DONE occurrence (skipped=false); UPSERT per (step,date); clears skip_reason on flip; `StepNotFoundError` if step missing |
| `skipStep` | `(stepId, input?: {date?, reason?}) => Promise<RoutineCompletion>` | LOGGED skip on the day (skipped=true + reason); UPSERT per (step,date) (RT-8) |
| `planSkipDates` | `(stepId, dates[]) => Promise<RoutineStep>` | PRE-PLANNED skips → merged into `step.skip_dates` (dedup+sort); NOT a completion row (RT-8) |
| `editCompletion` | `(stepId, date, patch) => Promise<RoutineCompletion>` | patches an existing (step,date); `CompletionNotFoundError` if absent |
| `deleteCompletion` | `(stepId, date) => Promise<void>` | HARD delete (ledger has no deleted_at, RT-14) |
| `listCompletions` | `(stepId) => Promise<RoutineCompletion[]>` | date-sorted ledger — the derive-on-read source for S5 |

**§XXVIII deviation (grounded, g2-APPROVED):** the Approval-1 seam-contract had a single `skipStep({kind})`; RT-8
defines two distinct skip mechanisms with different storage (logged completion row vs pre-planned `skip_dates`, a
possibly-future date with no row). Corrected to `skipStep` (logged) + `planSkipDates` (pre-planned). The frozen
`seam-contract.md`/`slice-map.md` text still shows the old single method; this note supersedes it.

### S4–S8 — appended per slice (not yet built)
`runStep` drive-the-entity (S4) · evaluate + derived analytics (S5) · lifecycle + reschedule (S6) · tags/pages/links
(S7) · provider + fan-out + deletion closer (S8). Surface frozen in `delivery/seam-contract.md`.

## `@vida/types` reconcile (DB-11, S1)
Authored `Routine`/`RoutineStep` + re-keyed `RoutineCompletion` (`routine_action_id`→`routine_step_id`,
`SyncMetadata`→`SyncableEntity`). Retired `RoutineAction`/`ROUTINE_ACTION_TYPE`/`ROUTINE_RECURRENCE_FREQUENCY`
(flat POC; zero live consumers). Kept `ROUTINE_LIFECYCLE`/`ROUTINE_TIME_OF_DAY` (live CHECK columns).
`[FACT: packages/types/src/routine.ts; packages/core/src/validators/routine.ts]`

## Verification (S1)
Live-store Vitest (`routines-service.test.ts`, better-sqlite3 in-memory, `migrate()` applies 018): 9/9 — faithful
echo · explicit values · partial update (no blanking) · soft-delete hides · lifecycle filter · 2 failure paths
(invalid enum, missing name) · sync_queue persistence probe. Full `@vida/core` 1916/1916; tsc 0; eslint 0.
