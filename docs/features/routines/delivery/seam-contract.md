<!-- Seam Contract — features/routines · Entity Delivery Flow ① Step 2 · mod-routines (LIF-138) · Approval 1 artifact
     The RoutinesService API the UI (fe-routines, P6) + sibling modules will consume. Frozen at this gate.
     Every type references a real shipped symbol; nothing invented. -->

# Seam Contract — `RoutinesService` (①)  (mod-routines · LIF-138)

> The service surface `fe-routines` and sibling modules consume. All types resolve to shipped symbols
> (`@vida/types`, `services/sessions/types.ts`, `services/journals/types.ts`). Factory mirrors
> `createHabitsService(deps)`. `[FACT: packages/core/src/services/habits/service.ts:127-138]`

## Factory & deps

```ts
export interface RoutinesServiceDeps {
  db: DrizzleDb
  deviceId: string
  clock?: () => string                         // () => 'YYYY-MM-DD'; default = today (determinism seam)
  // deny-safe / deferred ports (absent ⇒ documented degrade, never throw) — interpretation §1 X1–X4
  prefs?: RoutinePolicyPort                     // X1 — completion/miss/acceptance policy; absent ⇒ shipped default
  scheduler?: SchedulerPort                     // X3 — reschedule-to-open-slot; absent ⇒ OutsideAcceptanceWindow/unavailable
  sessions?: SessionsPort                       // D2 — createSession (runStep) + registerDueProvider
  effects?: EffectsPort                         // D3 — rail.applyEffect + registry.resolve (emit-only, guarded)
  associations?: AssociationResolver            // D5 — read entity_tags/links (deny-safe → [])
  spaces?: SpacesWritePort                      // D5 — tag/link WRITES (Spaces owns the write API)
}
export function createRoutinesService(deps: RoutinesServiceDeps): RoutinesService
```

## Interface (by slice)

```ts
export interface RoutinesService {
  // ── S1: routine CRUD ────────────────────────────────────────────────
  createRoutine(input: CreateRoutineInput): Promise<Routine>
  updateRoutine(id: Id, patch: UpdateRoutineInput): Promise<Routine>
  archiveRoutine(id: Id): Promise<void>                 // soft-delete; ledger preserved (RT-17)
  getRoutine(id: Id): Promise<Routine | null>
  listRoutines(filter?: { lifecycle?: RoutineLifecycle }): Promise<Routine[]>

  // ── S2: steps ───────────────────────────────────────────────────────
  addStep(routineId: Id, step: AddStepInput): Promise<RoutineStep>
  updateStep(stepId: Id, patch: UpdateStepInput): Promise<RoutineStep>
  reorderSteps(routineId: Id, orderedStepIds: Id[]): Promise<void>
  removeStep(stepId: Id): Promise<void>                 // soft-delete step; hard-delete its completions (IR-3)
  listSteps(routineId: Id): Promise<RoutineStep[]>

  // ── S3: completion ledger ───────────────────────────────────────────
  completeStep(stepId: Id, input?: CompleteStepInput): Promise<RoutineCompletion>   // upsert UNIQUE(step,date)
  skipStep(stepId: Id, input: SkipStepInput): Promise<RoutineCompletion>            // {kind:'planned'|'logged', reason?}
  editCompletion(stepId: Id, date: string, patch: EditCompletionInput): Promise<RoutineCompletion>
  deleteCompletion(stepId: Id, date: string): Promise<void>                         // hard delete (ledger)

  // ── S4: drive the entity (keystone, RT-3) ───────────────────────────
  runStep(stepId: Id): Promise<RunStepResult>          // launches Session sub-type OR native completion; never a parallel record

  // ── S5: evaluate + derived analytics (derive-on-read, IR-1) ─────────
  evaluateRoutine(routineId: Id, date: string): Promise<RoutineEvaluation>
  getProgress(routineId: Id): Promise<number | null>   // progress() derive-on-read; null = unmeasured
  getStreak(routineId: Id): Promise<RoutineStreak>     // policy-derived (RT-7); recomputed from ledger
  getCompletionRate(routineId: Id, range: DateRange): Promise<CompletionRate>

  // ── S6: lifecycle + scheduling ──────────────────────────────────────
  setLifecycle(routineId: Id, lifecycle: RoutineLifecycle): Promise<Routine>
  rescheduleStep(stepId: Id, date: string): Promise<RescheduleResult>   // Scheduler open-slot; deny-safe (X3)

  // ── S7: associations ────────────────────────────────────────────────
  getEntityTags(entityType: 'routine' | 'routine_step', entityId: Id): Promise<Tag[]>
  tagEntity(entityType: 'routine' | 'routine_step', entityId: Id, tagId: Id): Promise<void>
  untagEntity(entityType: 'routine' | 'routine_step', entityId: Id, tagId: Id): Promise<void>

  // ── S8: provider surfaces (consumed by Journals / Calendar) ─────────
  summary(date: string): Promise<SectionData>          // JournalContribution.summary — registerRoutinesJournal(registry, svc)
  dueIn(range: TimeRange): Promise<DueItem[]>           // DueProvider.fetch — registerDueProvider(svc.asDueProvider())
}
```

## Shapes (new in `@vida/types/routine.ts` — authored at S1 DB-11 reconcile)

```ts
// NEW — the named ordered sequence (pursuable). Mirrors schema/routines.ts:47-67.
export interface Routine extends SyncableEntity {
  name: string                 // @encrypted
  description: string | null   // @encrypted
  recurrence_rule: string | null                 // RRULE (RT-11)
  lifecycle: RoutineLifecycle                     // 'active'|'paused'|'off'
  measurement_kind: MeasurementKind              // default 'rate' (RT-19)
  binding_mode: BindingMode | null               // null ⇒ derive derived-pull
  progress: number | null                         // nullable override slot (RT-14 — no cached streak)
  sort_order: number
  deleted_at: Timestamp | null
}
// NEW — polymorphic step (replaces RoutineAction). Mirrors schema/routines.ts:70-89.
export interface RoutineStep extends SyncableEntity {
  routine_id: Id | null
  step_order: number
  step_type: string | null                        // OPEN vocab (RT-3) — registry-validated, no enum
  entity_type: string | null                      // polymorphic driven-entity ref (nullable — RT-4)
  entity_id: Id | null
  is_required: boolean                            // required-node policy support (RT-5)
  title: string                // @encrypted
  description: string | null   // @encrypted
  time_of_day: RoutineTimeOfDay | null
  skip_dates: string[] | null                     // JSON YYYY-MM-DD (planned skips, RT-8)
  deleted_at: Timestamp | null
}
// RE-KEYED — per-step ledger (was routine_action_id). Mirrors schema/routines.ts:92-109.
export interface RoutineCompletion extends SyncableEntity {   // was SyncMetadata; now carries updated_at (baseColumns)
  routine_step_id: Id                             // re-keyed from routine_action_id
  completed_date: string                          // YYYY-MM-DD, UNIQUE per (step,date)
  completed_at: Timestamp
  skipped: boolean
  skip_reason: string | null   // @encrypted
  actual_duration_minutes: number | null
}
// RETIRED at this reconcile: RoutineAction, ROUTINE_ACTION_TYPE, ROUTINE_RECURRENCE_FREQUENCY.
// KEPT: ROUTINE_LIFECYCLE, ROUTINE_TIME_OF_DAY. (schema/routines.ts:35-37; routine.ts:22-26)
```

## Derived / result shapes (service-local in `types.ts`)

```ts
interface RoutineEvaluation { status: 'done' | 'partial' | 'not_started'; percent: number; done: Id[]; not_done: Id[] }
interface RoutineStreak { current: number; longest: number; total: number }   // policy-derived, from ledger (RT-7/RT-14)
interface CompletionRate { scheduled: number; done: number; rate: number | null }  // null = nothing due
interface RunStepResult { kind: 'session' | 'native' | 'unavailable'; sessionId?: Id; state: string }
interface RescheduleResult { kind: 'rescheduled' | 'unavailable'; newSlot?: string }
```

## Reused shipped symbols (NOT redefined here)
- `DueItem`, `DueProvider`, `TimeRange` — `[FACT: packages/core/src/services/sessions/types.ts:218-238]`
- `JournalContribution`, `SectionData`, `HomeSectionKey` (`sectionKey:'summary'`) — `[FACT: packages/core/src/services/journals/types.ts:44-62]`
- `EffectType` (`grant_currency`/`award_xp`/`contribute_purpose_metric`/`emit_measurement_signal`) — `[FACT: packages/types/src/session.ts:85-100]`
- `MeasurementKind`, `BindingMode`, `RoutineLifecycle`, `RoutineTimeOfDay` — `[FACT: @vida/types; schema/routines.ts:43]`
- `Tag`, `AssociationResolver` — Spaces (D5).

## Typed errors (contract.md:50-54)
`EntityUnavailable` (S4 — driven entity missing, never silent skip) · `OutsideAcceptanceWindow` (S6 — make-good past
window) · `PolicyUndefined` (S5 — falls back to shipped default, flagged) · `ProviderEmitFailed` (S8 — isolated, other
providers + the routine unaffected).

## Invariants the seam enforces
- **No parallel completion for a driven step (RT-3/IR-2).** `runStep` drives; the ledger records the routine
  occurrence, never a second behavioral count.
- **Derive-on-read (IR-1).** `getProgress`/`getStreak`/`getCompletionRate`/`evaluateRoutine` recompute from the
  ledger; no cached counters exist to read.
- **Emit-only, guarded, post-commit (IR-9).** `summary`/`dueIn`/completion fan-out never mutate a sibling module; XP
  and contributions are applied by their owners, not by Routines.

## Completion checklist
- [x] factory + deny-safe deps · [x] full interface by slice · [x] new/re-keyed/retired @vida/types shapes · [x] reused symbols cited · [x] typed errors · [x] seam invariants
