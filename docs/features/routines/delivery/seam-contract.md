<!-- Seam Contract — features/routines · Entity Delivery Flow ① · Step 2 Decomposition Gate -->
<!-- The RoutinesService API the ② UI (P6) consumes. Ratified from contract.md + ROU rows + built substrate sigs. -->
<!-- This is the FROZEN seam: ② builds against these signatures; ① implements them slice by slice. -->

# Seam Contract — `RoutinesService` (① exposes → ② consumes)

> **Amended at the Re-scope Gate (2026-10-21, ledger D7)**, pending Victor's approval. Changes are marked `// ⟲ amended` and
> cite the ledger row. The as-built S1/S2 surface is now part of the frozen seam.

> Shapes are indicative TS (final types land in `@vida/types` at S1 DB-11 reconcile). Row-vs-view typing follows the
> repo rule: raw readers return `*Row` types, constructed/merged returns use view types. [[drizzle-row-not-assignable-to-vida-types-interface]]

## Factory
```ts
function createRoutinesService(deps: RoutinesServiceDeps): RoutinesService

interface RoutinesServiceDeps {             // ⟲ amended (A2, N3, D1)
  db: DrizzleDb
  deviceId: string
  clock?: () => string                       // ⟲ built (as-built S1): asOf YYYY-MM-DD, default UTC today
  tasks: TasksService                         // ⟲ REQUIRED (D1). Replaces the deny-safe TasksPort
  registry: TaggableTypeRegistry              // entity_type validation at addStep (R2). Registration already seeded (_registry.ts:45-46)
  sessions?: SessionsService                  // ⟲ optional + fail-loud RoutinesDepNotWiredError (shipped convention)
  habits?: HabitsService                       // habit-step native tick
  spaces?: SpacesService                      // ⟲ optional + fail-loud (tags/links)
  notes?: NotesService                        // ⟲ optional + fail-loud (pages)
  effects?: { rail: EffectRail; registry: EffectRegistry }   // producer guard registry.resolve before applyEffect (N8)
  prefs?: RoutinesPrefsPort                    // completion/miss/acceptance-window config; absent ⇒ shipped default, FLAGGED (R4)
  // ⟲ dropped: measurementSources (rule 12: no M5 source)
}
```

## Routine lifecycle (S1)
```ts
createRoutine(input: CreateRoutineInput): Promise<Routine>           // {name, description?, recurrence_rule?, measurement_kind?, binding_mode?, sort_order?}
updateRoutine(id: Id, patch: UpdateRoutineInput): Promise<Routine>   // re-validates axes + lifecycle
archiveRoutine(id: Id): Promise<void>                                // soft-delete; cascades to steps; ledger preserved (RT-17)
setLifecycle(id: Id, lifecycle: 'active'|'paused'|'off'): Promise<Routine>   // paused/off generate no misses (S2c)
getRoutine(id: Id): Promise<Routine | null>
listRoutines(filter?: { lifecycle?: RoutineLifecycle }): Promise<Routine[]>
```

## Steps (S1)
```ts
addStep(routineId: Id, step: AddStepInput): Promise<RoutineStep>     // {step_type, entity_type?, entity_id?, is_required?, title, description?, time_of_day?, skip_dates?}
reorderSteps(routineId: Id, orderedStepIds: Id[]): Promise<RoutineStep[]>
removeStep(stepId: Id): Promise<void>
listSteps(routineId: Id): Promise<RoutineStep[]>
// ⟲ step_type OPEN vocab, stored as-is (no M1 registry, R2); entity_type validated against TaggableTypeRegistry; entity ref
//   nullable = actionable (alarm-like) step completing in the ledger (gate A11). addStep APPENDS (step_order = max+1) unless given (A11)
```

## Run / complete / skip / reschedule (S2, S3, S6)
```ts
runStep(stepId: Id): Promise<StepRunState>                          // ⟲ amended: drives tasks.completeTask | habits.logCompletion(date) |
                                                                   //   focus: startFocus({attach routine_step, instance}) → completeFocus (never completeSession, N9);
                                                                   //   returns live state; one entity completion per event (rule 1)
completeStep(stepId: Id, input?: { date?: string; actual_duration_minutes?: number | null }):
  Promise<RoutineCompletion | StepRunState>   // ⟲ amended (A16): actionable → ledger row; driven → DRIVE the entity first, then stamp
                                               //   the routine's own occurrence row (rule 1, N7). Never fires the entity's effects
// ⟲ amended (A17): RT-8's two mechanisms have different storage, so there are two methods (§XXVIII, as-built S3, g2-approved)
skipStep(stepId: Id, input?: { date?: string; reason?: string | null }): Promise<RoutineCompletion>   // LOGGED skip on the day
planSkipDates(stepId: Id, dates: string[]): Promise<RoutineStep>                                     // PRE-PLANNED, merged into skip_dates
// ⟲ added (A18): the ledger edit path RT-14 re-derives from
editCompletion(stepId: Id, date: string, patch: { skipped?; skip_reason?; actual_duration_minutes? }): Promise<RoutineCompletion>
deleteCompletion(stepId: Id, date: string): Promise<void>          // HARD (ledger has no deleted_at)
listCompletions(stepId: Id): Promise<RoutineCompletion[]>
rescheduleStep(stepId: Id, date: string): Promise<DueItem>         // ⟲ amended (R3): moves the occurrence to the CALLER-given date/slot;
                                                                   //   OutsideAcceptanceWindow if past window. Auto-slot (G5) = borrowed leg
```

## Derivations — evaluate / progress / analytics (S4, S5)
```ts
evaluateRoutine(routineId: Id, date: string): Promise<RoutineEvaluation>
//   RoutineEvaluation = { status: 'done'|'partial'|'not_started', percent: number, done: StepRef[], not_done: StepRef[],
//                         policy_source: 'user'|'default' }   // ⟲ added (R4): PolicyUndefined ⇒ shipped default, FLAGGED
//   applies completion_policy (read from prefs); partial ALWAYS returned (RT-5)
progress(routineId: Id): Promise<number | null>                     // resolveProgress(stored, derive); NULL ⇒ derived-on-read
getStreak(routineId: Id): Promise<RoutineStreak>                    // POLICY-derived (not Habits rule); the READ seam Gamification pulls
getAnalytics(routineId: Id, range: TimeRange): Promise<RoutineAnalytics>  // {completionRate, ranking, timePeriodComparison} — recomputed from ledger, no cache
```

## Provider seam + Journal wiring (S9)
```ts
dueIn(range: TimeRange): Promise<DueItem[]>                         // scheduled occurrences → Calendar + Journal agenda
getDueReminders(range: TimeRange): Promise<DueItem[]>              // the DueProvider.fetch impl (SS-7 lane)
summary(date: string): Promise<SectionData>                        // Journal /summary contribution (PULL at render)

// module-level register helpers (mirrors services/relationships/journal.ts):
function registerRoutinesJournal(registry: JournalRegistry, svc: RoutinesService): void
function registerRoutinesDueProvider(sessions: SessionsService, svc: RoutinesService): void
```

## Typed errors (fail loud — ROU-30)
```ts
EntityUnavailable        // a step's driven entity missing/deleted/port-absent → typed step state, never silent skip (RT-3)
OutsideAcceptanceWindow  // make-good/reschedule past the window → rejected, no state change (RT-6)
PolicyUndefined          // evaluate before policy resolves → falls back to shipped default, flagged
ProviderEmitFailed       // dueIn/summary failure isolated — routine + sibling providers unaffected (RT-13)
// ⟲ added (A25): the as-built errors
RoutineNotFoundError     // addStep on a missing/archived routine (no orphan step)
StepNotFoundError        // complete/skip/plan/edit on a missing/archived step (no orphan completion)
CompletionNotFoundError  // edit/delete an absent (step,date)
RoutinesDepNotWiredError // an op needing an optional dep (sessions/spaces/notes) that is not wired (shipped convention)
```

## What ② must NOT expect from ① (boundary)
- No XP/ledger/currency write surface — routines emits effects; Gamification owns `consequence_ledger`.
- No scheduler/session-engine/tag-store/purpose-metric ownership — all composed via the deps above.
- No cached streak/progress columns — every number is derived-on-read; ② must not assume a stored counter.
