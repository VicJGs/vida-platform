<!-- Seam Contract — features/tasks · Entity Delivery Flow ① · Step 2 Decomposition Gate -->
<!-- The TasksService API the ② UI (P6) AND mod-routines consume. Ratified from contract.md + TAS rows + built substrate sigs. -->

# Seam Contract — `TasksService` (① exposes → ② UI + mod-routines consume)

> Final types land in `@vida/types` at S1 DB-11 reconcile. Row-vs-view typing per the repo rule. [[drizzle-row-not-assignable-to-vida-types-interface]]
> **Routines consumes:** `createTask` (with recurrence), `completeTask`, `getTask`, `listTasks` — keep these stable; they are the task-step driver seam.

## Factory
```ts
function createTasksService(deps: TasksServiceDeps): TasksService
interface TasksServiceDeps {
  db: DrizzleDb
  deviceId: string
  spaces?: SpacesService         // tags (S8) — optional + fail-loud (TasksDepNotWiredError), the built post-S1 shape
  notes?: NotesService           // pages (S8) — optional + fail-loud
  views?: ViewsService           // the `views` primitive (S8) — optional + fail-loud
  // registry: TaggableTypeRegistry — DROPPED at S8: 'task' is pre-seeded in `_registry.ts` ENTITY_TYPES (no register())
  sessions?: SessionsService     // timer sub-type (S4) — built optional + fail-loud (TimerNotWiredError)
  effects?: EffectsPort          // deny-safe — completion/log_time effects
  measurementSources?: MeasurementSourceRegistry
  providers?: ViewProviderRegistry      // deny-safe — the SHARED R7/V4 seam (foundation/views); resolved at S7 from the
                                        // `AggregationProviderPort` placeholder — tasks consumes the one OS seam, no port of its own
}
```

## CRUD + queries (S1, S7)
```ts
createTask(input: CreateTaskInput): Promise<Task>          // ≤1 parent → MultipleParentError; validates enums
updateTask(id: Id, patch: UpdateTaskInput): Promise<Task>  // re-enforces ≤1-parent + enum CHECKs
softDeleteTask(id: Id): Promise<void>                      // cascades sub-tasks + task_time_logs (app-layer)
getTask(id: Id): Promise<Task | null>
listTasks(filter?: TaskFilter): Promise<Task[]>            // by priority/status/completion/due/parent
getAggregatedTasks(grouping: AggGrouping): Promise<AggregatedTasks>  // R7 fan-out; standalone group always included; per-group degradation
```

## Completion (S3)
```ts
completeTask(id: Id): Promise<Task>    // status='completed' + completed_at; fires S4 effects (award_xp, contribute_purpose_metric, surface_journal, emit_measurement_signal)
reopenTask(id: Id): Promise<Task>      // clears completed_at
```

## Sub-tasks + rollup (S2)
```ts
addSubtask(parentId: Id, input: CreateTaskInput): Promise<Task>   // single-level only (TK-3)
getSubtasks(parentId: Id): Promise<Task[]>
getRollup(parentId: Id): Promise<{ done: number; total: number; progress: number | null }>  // M4 weighted, derived on read
```

## Time tracking (S4)
```ts
startTimer(taskId: Id): Promise<TaskTimeLog>   // opens a sessions sub-type; TimerAlreadyRunningError if one runs
stopTimer(logId: Id): Promise<TaskTimeLog>     // closes; log_time effect writes the ledger; idempotent no-op if closed
setTimeTrackingEnabled(taskId: Id, enabled: boolean): Promise<void>
getActualMinutes(taskId: Id): Promise<number>  // SUM of closed logs (honors opt-out)
```

## Obligations (S5) — the routines RT-4 seam
```ts
setRecurrence(taskId: Id, rule: string | null): Promise<Task>   // obligations only; standard task → invalid
// completeTask on an obligation spawns the next occurrence (next due_date); bad rule → completes + RecurrenceRegenError
```

## Measurability (S6) · Tags/Notes/Views (S8) · Provider (S9)
```ts
// axes exposed on Task.measurement_kind / binding_mode; progress derives (no advertise — guard)
// S8 (built): tags · note · views — the ROW half of the view surface; pin/reorder are Preferences-OWNED (see below)
tagTask(taskId: Id, tagId: Id): Promise<EntityTagRow>; untagTask(taskId: Id, tagId: Id): Promise<void>; getTaskTags(taskId: Id): Promise<EntityTagRow[]>
getTaskNote(taskId: Id): Promise<PageRow>                                  // 'task_note' page, find-or-create
saveView(input: SaveTaskViewInput): Promise<ViewRow>; listViews(): Promise<ViewRow[]>  // a task view = views row with entity_types EXACTLY ['task']; id ⇒ REPLACE
export function createTasksReadProvider(deps: { svc; db; deviceId }): ReadProvider   // tasks AS a ReadProvider (XCU-07/08)
export function registerTasksReadProvider(providers: ViewProviderRegistry, deps): void
export const TASK_VIEW_PRESETS: readonly TaskViewPreset[]                  // TAS-30 data (today · board · all_by_project)
// reorderViews(ids) · pinView(id) — AMENDED at S8 (PLAN-S8 §Resolved): nav placement of views is Preferences-OWNED
// (ADR-007 §3.5 · IA §6 · XCU-21; origin = intake G1 "named, reorderable, pinnable"). NOT a tasks op; filed as a
// Preferences first-consumer-pull gap (pulled when the ② view-switcher lands).
summary(date: string): Promise<SectionData>; getDueReminders(range: TimeRange): Promise<DueItem[]>
function registerTasksJournal(registry: JournalRegistry, svc: TasksService): void
function registerTasksDueProvider(sessions: SessionsService, svc: TasksService): void
```

## Typed errors
```ts
MultipleParentError      // two parent FKs set (TK-2)
TimerAlreadyRunningError // startTimer while one runs (TK-5)
RecurrenceRegenError     // obligation completes but next occurrence can't be spawned (TK-7) — complete, flag, never silent stop
// + per-group aggregation errors (TAS-32): a source unavailable degrades its group, not the view
```

## Boundary — what ② / routines must NOT expect
- No direct XP/ledger/currency/purpose-metric write — Tasks emits effects; consumers own their stores.
- No stored `progress`/rollup column — every rollup derives on read.
- No `surface_calendar` effect — calendar is a read-seam over `due_date`/`scheduled_date`/`dueIn` (D1).
- No direct parent-module table reads — aggregation goes through the `providers` R7 seam (D3).
