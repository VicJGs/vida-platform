<!-- CURRENT business rules — module: routines · living doc (§XXIX). Promoted from the MOD-routines ① build
     (LIF-138). Cite code [FACT: path:line]. As-built; refreshed per slice. Scope so far: S1. -->

# Routines — Current Business Rules

> Status: ① backend in progress — **S1 (routine CRUD + `@vida/types` reconcile) landed**. S2–S8 append.
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

## Deferred (homed forward — not enforced in S1; see interpretation.md §1)
Completion/miss/acceptance POLICY → Preferences/Spaces (X1). `routine_step_membership` step-scoping → Spaces
design-pass (X2). Scheduler internals → Sessions (X3). XP application → Gamification handler (X4). Steps · ledger ·
runStep · evaluate · provider · fan-out → S2–S8.
