<!-- Seam Contract — features/routines · Entity Delivery Flow ① · Step 2 Decomposition Gate -->
<!-- The RoutinesService API the ② UI (P6) consumes. Ratified from contract.md + ROU rows + built substrate sigs. -->
<!-- This is the FROZEN seam: ② builds against these signatures; ① implements them slice by slice. -->

# Seam Contract — `RoutinesService` (① exposes → ② consumes)

> Shapes are indicative TS (final types land in `@vida/types` at S1 DB-11 reconcile). Row-vs-view typing follows the
> repo rule: raw readers return `*Row` types, constructed/merged returns use view types. [[drizzle-row-not-assignable-to-vida-types-interface]]

## Factory
```ts
function createRoutinesService(deps: RoutinesServiceDeps): RoutinesService

interface RoutinesServiceDeps {
  db: DrizzleDb
  deviceId: string
  spaces: SpacesService                       // required (tags/links)
  notes: NotesService                         // required (pages)
  registry: TaggableTypeRegistry              // required (register 'routine'/'routine_step')
  sessions: SessionsService                   // required (createSession, registerDueProvider, dueIn)
  habits?: HabitsService                       // deny-safe — habit-step native tick
  tasks?: TasksPort                            // deny-safe — Tasks #65 not built (D1)
  effects?: EffectsPort                        // deny-safe — { rail: EffectRail; registry: EffectRegistry }
  measurementSources?: MeasurementSourceRegistry
  prefs?: RoutinesPrefsPort                    // deny-safe — completion/miss/acceptance-window config (ROU-24)
}
```

## Routine lifecycle (S1)
```ts
createRoutine(input: CreateRoutineInput): Promise<Routine>           // {name, description?, recurrence_rule?, measurement_kind?, binding_mode?, sort_order?}
updateRoutine(id: Id, patch: UpdateRoutineInput): Promise<Routine>   // re-validates axes + lifecycle
archiveRoutine(id: Id): Promise<void>                                // soft-delete; cascades to steps; ledger preserved (RT-17)
setLifecycle(id: Id, lifecycle: 'active'|'paused'|'off'): Promise<Routine>   // paused/off generate no misses
getRoutine(id: Id): Promise<Routine | null>
listRoutines(filter?: { lifecycle?: RoutineLifecycle }): Promise<Routine[]>
```

## Steps (S1)
```ts
addStep(routineId: Id, step: AddStepInput): Promise<RoutineStep>     // {step_type, entity_type?, entity_id?, is_required?, title, description?, time_of_day?, skip_dates?}
reorderSteps(routineId: Id, orderedStepIds: Id[]): Promise<RoutineStep[]>
removeStep(stepId: Id): Promise<void>
listSteps(routineId: Id): Promise<RoutineStep[]>
// step_type validated against the registry (OPEN vocab, no enum); entity ref nullable (actionable step, RT-4)
```

## Run / complete / skip / reschedule (S2, S3, S6)
```ts
runStep(stepId: Id): Promise<StepRunState>                          // drives entity: sessions.createSession | habits.logCompletion | tasks?.*; returns live state; NEVER a parallel record (RT-3)
completeStep(stepId: Id, date: string): Promise<RoutineCompletion | StepRunState>   // actionable step → ledger row; driven step → delegates
skipStep(stepId: Id, kind: 'planned'|'logged', opts?: { date?: string; reason?: string }): Promise<void>  // planned→skip_dates; logged→routine_completions.skipped+skip_reason
rescheduleStep(stepId: Id, date: string): Promise<DueItem>         // asks Scheduler for an open slot; OutsideAcceptanceWindow if past window
```

## Derivations — evaluate / progress / analytics (S4, S5)
```ts
evaluateRoutine(routineId: Id, date: string): Promise<RoutineEvaluation>
//   RoutineEvaluation = { status: 'done'|'partial'|'not_started', percent: number, done: StepRef[], not_done: StepRef[] }
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
```

## What ② must NOT expect from ① (boundary)
- No XP/ledger/currency write surface — routines emits effects; Gamification owns `consequence_ledger`.
- No scheduler/session-engine/tag-store/purpose-metric ownership — all composed via the deps above.
- No cached streak/progress columns — every number is derived-on-read; ② must not assume a stored counter.
