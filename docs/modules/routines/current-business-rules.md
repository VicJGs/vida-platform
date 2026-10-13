<!-- CURRENT business rules — module: routines · living doc (§XXIX). Promoted from the MOD-routines ① build
     (LIF-138). Cite code [FACT: path:line]. As-built; refreshed per slice. Scope so far: S1. -->

# Routines — Current Business Rules

> Status: ① backend in progress — **S1–S3 landed** (routine CRUD + reconcile; step CRUD + cascade; completion ledger + skip). S4–S8 append.
> Authority for intent: `docs/features/routines/{identity,business-rules,contract,structure-data,conventions}.md`
> (RT-1…RT-19) + `delivery/interpretation.md` (IR-1…IR-10). This doc records what the CODE enforces.

## S1 — Routine definition CRUD (`createRoutinesService`)

- **BR-RT-S1-1 · Enum validation.** `createRoutine`/`updateRoutine` validate every enum via Zod
  (`CreateRoutineSchema`/`UpdateRoutineSchema`, `z.enum` over the `@vida/types` tuples) — `lifecycle`,
  `measurement_kind`, `binding_mode` — before any write; an off-tuple value rejects, no row written.
  `[FACT: packages/core/src/validators/routine.ts:17-33; services/routines/service.ts:60,66]`
- **BR-RT-S1-2 · Faithful create-echo (IR-8).** `Repository.create` echoes the input row, so `serializeRoutine`
  backfills every notNull-default (`lifecycle:'active'`, `measurement_kind:'rate'`, `sort_order:0`) and coalesces
  every nullable (`description`, `recurrence_rule`, `binding_mode`, `progress`, `deleted_at`) to `null` — the
  returned row never lies. `[FACT: services/routines/service.ts:42-52]`
- **BR-RT-S1-3 · No cached streak/progress counter (RT-14/RT-19).** `progress` is written as the caller's value or
  `null` at create and is NEVER a service-maintained counter; routine-level done/streak/rate DERIVES on read from
  the completions ledger (S5). `binding_mode` null ⇒ derive derived-pull. `[FACT: services/routines/service.ts:48-49; db/schema/routines.ts:58-59]`
- **BR-RT-S1-4 · Partial update never blanks (IR-8).** `updateRoutine` spreads only the validated keys Zod
  `.partial()` carried (absent keys are omitted, not nulled); an unpassed field is left untouched.
  `[FACT: services/routines/service.ts:54,64-67]`
- **BR-RT-S1-5 · Soft-delete preserves the ledger (RT-17).** `archiveRoutine` sets `deleted_at` (softDelete:true);
  the (future) completion ledger is untouched. `getRoutine` excludes soft-deleted via `findById`.
  `[FACT: services/routines/service.ts:69-76]`
- **BR-RT-S1-6 · Explicit soft-delete filter on list (IR-10).** `listRoutines` prepends `isNull(deleted_at)`
  because `Repository.findWhere` bypasses the soft-delete filter; the optional `lifecycle` narrows the read.
  `[FACT: services/routines/service.ts:78-84]`
- **BR-RT-S1-7 · Local-first enqueue (RT-18).** A create/update/archive co-transactionally enqueues a `sync_queue`
  row (verified by the persistence probe); every write succeeds locally first. `[FACT: routines-service.test.ts persistence probe]`

## S2 — Step CRUD + ordering + app-cascade

- **BR-RT-S2-1 · Polymorphic step, OPEN vocab (RT-3/RT-4).** `step_type` is a plain string (NOT enum-validated —
  user-extensible, registry's job); `entity_type`/`entity_id` are nullable (an actionable "alarm" step has no driven
  entity). `[FACT: validators/routine.ts RoutineStepFields; services/routines/service.ts serializeStep]`
- **BR-RT-S2-2 · Add guards the parent exists (no orphan step, IR-3).** `addStep` throws `RoutineNotFoundError` if
  the routine is missing or archived (`findById` excludes soft-deleted) — no FK guards this.
  `[FACT: services/routines/service.ts loadRoutineOrThrow; addStep]`
- **BR-RT-S2-3 · Faithful step echo (IR-8) + skip_dates JSON (IR-6).** `serializeStep` backfills `step_order:0`,
  `is_required:false` and coalesces every nullable; `skip_dates` is `JSON.stringify`'d to the plain-TEXT column and
  parsed back via `parseJsonArray` (never `json<T>()`). `[FACT: services/routines/service.ts serializeStep, toRoutineStep]`
- **BR-RT-S2-4 · Partial step update never blanks.** `serializeStepUpdate` sets only passed keys (Zod `.partial()`
  omits absent keys); `skip_dates` set/clear both honored via the `'skip_dates' in p` guard.
  `[FACT: services/routines/service.ts serializeStepUpdate]`
- **BR-RT-S2-5 · Archive cascades to steps (RT-17/IR-3).** `archiveRoutine` soft-deletes the routine then its live
  steps (no FK; reads `isNull(deleted_at)` so it won't re-touch already-deleted). The step→completion hard-delete
  closer is S8 (ledger ships S3). `[FACT: services/routines/service.ts archiveRoutine]`
- **BR-RT-S2-6 · Reorder is ownership-scoped + contiguous.** `reorderSteps` assigns `step_order` from 0 in list
  position for ids OWNED by the routine; foreign/unknown ids are ignored (no gaps); owned steps omitted from the
  list keep their prior order (callers pass the full set). `[FACT: services/routines/service.ts reorderSteps]`
- **Known behavior (ratified pattern, g2 N1):** `updateStep`/`removeStep` act by raw id without a soft-delete guard
  (mirrors the twin repos' `update`/`delete`); updating a soft-deleted step re-stamps it. Step-lifecycle hardening
  (resurrect semantics) is homed forward, not S2's scope.

## S3 — Completion ledger + skip

- **BR-RT-S3-1 · Upsert per (step,date) (RT-18 UNIQUE).** `completeStep`/`skipStep` share `upsertCompletion`:
  find by `(routine_step_id, completed_date)` → update-or-create; never a duplicate row. `completed_date` defaults
  to `clock()` (today). `[FACT: services/routines/service.ts upsertCompletion, findCompletion]`
- **BR-RT-S3-2 · Done clears skip; skip carries reason (RT-5/RT-8).** `completeStep` always writes `skipped:false,
  skip_reason:null` (a skip→done flip clears the reason); `skipStep` writes `skipped:true` + `reason`. Same row
  flips in place. `[FACT: services/routines/service.ts completeStep, skipStep]`
- **BR-RT-S3-3 · Two skip mechanisms, distinct storage (RT-8, §XXVIII).** A LOGGED skip = a completion row
  (`skipStep`); a PRE-PLANNED skip = `step.skip_dates` (`planSkipDates`, merged/deduped/sorted, no completion row —
  may be a future date). `[FACT: services/routines/service.ts skipStep, planSkipDates; business-rules.md RT-8]`
- **BR-RT-S3-4 · Fail-loud, no orphan completion (RT-3/IR-3).** `loadStepOrThrow` throws `StepNotFoundError` before
  any write (missing OR soft-deleted step); `editCompletion`/`deleteCompletion` throw `CompletionNotFoundError` when
  the (step,date) row is absent — no FK guards these. `[FACT: services/routines/service.ts loadStepOrThrow, editCompletion, deleteCompletion]`
- **BR-RT-S3-5 · Ledger hard-delete (RT-14).** `completionsRepo` is `softDelete:false`; `deleteCompletion` is a
  real DELETE; `routine_completions` has no `deleted_at`. `[FACT: services/routines/service.ts completionsRepo]`
- **Note for S5 (g2 N2):** `editCompletion` patches only sent keys and may leave an incoherent `skipped:false` with
  a stale `skip_reason`; the S5 derive MUST key on `skipped` (authoritative), not on `skip_reason` presence.

## Deferred (homed forward — not enforced in S1; see interpretation.md §1)
Completion/miss/acceptance POLICY → Preferences/Spaces (X1). `routine_step_membership` step-scoping → Spaces
design-pass (X2). Scheduler internals → Sessions (X3). XP application → Gamification handler (X4). Steps · ledger ·
runStep · evaluate · provider · fan-out → S2–S8.
