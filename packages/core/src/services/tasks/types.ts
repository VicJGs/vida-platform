// services/tasks — types (mod-tasks #65 · LIF-142 ①)
//
// The TasksService public surface + deps, built PER SLICE (Entity Delivery Flow).
// `TasksServiceDeps` GROWS per slice: S1 = { db, deviceId }; `sessions`/`effects` land at the timer/completion
// slices (S3/S4); `spaces`/`notes`/`registry` at S8; the deny-safe aggregation `providers` port at S7. The
// seam-contract §Factory is the S9 end-state, NOT the S1 shape (docs/features/tasks/delivery/seam-contract.md).
//
// Return types are the Drizzle Row types (NOT @vida/types `Task` — the interface reconcile is DB-11 mirror-only,
// landed this slice). [[drizzle-row-not-assignable-to-vida-types-interface]]
// Pulled ahead of mod-routines (2026-10-14): routines drives task-type steps via createTask/completeTask/getTask/listTasks.

import type { DrizzleDb } from '../../db/adapter'
import type { TaskRow } from '../../db/schema/tasks'
import type { SessionRow } from '../../db/schema/foundation/sessions'
import type { EntityTagRow, ViewRow } from '../../db/schema/foundation/spaces'
// S8: `PageRow` lives HERE (ungated) — the structural gate admits only `db/schema/(tasks|foundation/)` imports in
// service.ts, and the notes barrel does not re-export it (PLAN-S8 preflight A1).
import type { PageRow } from '../../db/schema/notes'
import type { EffectRail, EffectRegistry } from '../../foundation/effects'
import type { SpacesService } from '../../foundation/spaces'
import type { ViewGrouping, ViewProviderRegistry, ViewsService } from '../../foundation/views'
import type { NotesService } from '../notes'
// S9 — the SS-7 due-work shapes (sessions-owned platform primitive; never redeclared here).
import type { DueItem, SessionsService, TimeRange } from '../sessions'
import type {
  Status,
  Priority,
  TaskDifficulty,
  TaskKind,
  MeasurementKind,
  BindingMode,
  ViewLayout,
} from '@vida/types'

// --- deps (grows per slice) --------------------------------------------------
export interface TasksServiceDeps {
  db: DrizzleDb
  deviceId: string
  /** Deny-safe from S3 — the AR-7 effect rail (emit-only producer). DORMANT at M1 for the completion catalogue (no
   *  handler/named consumer) ⇒ fan-out is a no-op. Tasks IS an economy feeder (framework §4 L242) so it emits
   *  `award_xp` — unlike Projects/Books/Education (C-E2). Inline shape (the `EffectsPort` name collides at the barrel).
   *  S4 ALSO rides this: the timer's `log_time` is tasks' OWN handler (registered via `registerTasksTimer`), so the
   *  timer methods assert it is wired (fail-loud, not dormant). */
  effects?: { rail: EffectRail; registry: EffectRegistry }
  /** Required from S4 — the Sessions supertype. The timer is a `'work'` session sub-type (G-S1); `startTimer`/
   *  `stopTimer` open/close it and `getActualMinutes` reads the `task_time_logs` ledger `log_time` writes (G-S4). */
  sessions?: SessionsService
  /** Deny-safe from S7 — the SHARED R7/V4 read-provider seam (`foundation/views` ViewProviderRegistry, ADR-007 §3.4;
   *  the slice-map's `AggregationProviderPort` placeholder resolved to this type — tasks consumes the one OS seam, it
   *  defines no port of its own). `getAggregatedTasks` resolves cross-module PARENTS through it (never a direct
   *  cross-module table read, TK-9/C5). Absent, or a parent type with no registered `ReadProvider` ⇒ that group is
   *  `degraded` (TAS-32 / BR-11). Ships EMPTY at M1 (providers register per-module at their build; the apps/web
   *  composition root — fe-calendar #19 S7 — constructs tasks without `providers`). */
  providers?: ViewProviderRegistry
  /** S8 — the Spaces substrate (ADR-006): tag WRITES delegate to `spaces.tagEntity`/`untagEntity` (BR-14/BR-15;
   *  `'task'` is pre-seeded in the taggable registry — no `registry` dep). Optional + fail-loud: `tagTask`/`untagTask`
   *  throw `TasksDepNotWiredError('spaces')` when absent; `getTaskTags` is a raw read and needs no dep. */
  spaces?: SpacesService
  /** S8 — Notes & Pages: the task's note is a `pages` row (`type:'task_note'`, `entity_type:'task'`, TAS-31) reached
   *  through `notes.ensureEntityNote` (idempotent find-or-create). Optional + fail-loud (`getTaskNote`). */
  notes?: NotesService
  /** S8 — the `views` primitive (ADR-007 V1): a task view IS a `views` row with `entity_types` exactly `['task']`
   *  (§3.5). `saveView`/`listViews` ride `ViewsService`. Optional + fail-loud. */
  views?: ViewsService
}

// --- S1 inputs ---------------------------------------------------------------
export interface CreateTaskInput {
  title: string
  description?: string | null
  /** ≤1 parent-module link (TK-2): project | milestone | course | contact. milestone implies its project. */
  project_id?: string | null
  milestone_id?: string | null
  course_id?: string | null
  contact_id?: string | null
  /** the sub-task axis (single-level, TK-3) — NOT a parent-module FK, not in the ≤1 guard */
  parent_task_id?: string | null
  status?: Status
  priority?: Priority
  difficulty?: TaskDifficulty | null
  due_date?: string | null
  scheduled_date?: string | null
  estimated_minutes?: number | null
  kind?: TaskKind
  /** obligations only; carried now, enforced at S5 */
  recurrence_rule?: string | null
  measurement_kind?: MeasurementKind
  binding_mode?: BindingMode | null
  nesting_weight?: number | null
  sort_order?: number
}

export interface UpdateTaskInput {
  title?: string
  description?: string | null
  project_id?: string | null
  milestone_id?: string | null
  course_id?: string | null
  contact_id?: string | null
  parent_task_id?: string | null
  status?: Status
  priority?: Priority
  difficulty?: TaskDifficulty | null
  due_date?: string | null
  scheduled_date?: string | null
  estimated_minutes?: number | null
  kind?: TaskKind
  recurrence_rule?: string | null
  measurement_kind?: MeasurementKind
  binding_mode?: BindingMode | null
  nesting_weight?: number | null
  sort_order?: number
}

export interface ListTasksFilter {
  status?: Status
  priority?: Priority
  /** null ⇒ top-level tasks only (no parent_task_id); a string ⇒ that parent's sub-tasks */
  parent_task_id?: string | null
  project_id?: string | null
  /** true ⇒ completed only; false ⇒ not-completed only */
  completed?: boolean
  /** YYYY-MM-DD — due on or before this date */
  due_before?: string | null
  /** S8 — the `kind` discriminator (`standard` | `obligation`); lets a T4 preset bound to a kind be expressed as a
   *  provider predicate (TAS-30). Own-table, additive. */
  kind?: TaskKind
  /** S9 — true ⇒ OPEN work only (status ∉ {completed, cancelled}, the platform TERMINAL convention; `on_hold` is open);
   *  false ⇒ terminal only. The Today/Board presets bind it. (`completed` stays the literal completion filter.) */
  open?: boolean
}

// --- S8 — tags · notes · views (TAS-27/28/30/31) + the tasks ReadProvider (XCU-07/08) ----
/**
 * The tasks-side saved-view input = the WHOLE config (the view-builder draft). `entity_types` is NOT accepted — tasks
 * STAMPS `['task']` (ADR-007 §3.5: a task view IS a `views` row with `entity_types=[task]`); `predicates`/`grouping`/
 * `sort` pass through OPAQUE as JSON TEXT (the predicate DSL is the deferred ADR-007 pass). With `id`, the CONFIG is
 * REPLACED (name · layout · filter · grouping · sort written in full; omitted optional keys ⇒ cleared) — `space_id` is
 * OWNERSHIP, not config, and changes only when given.
 */
export interface SaveTaskViewInput {
  /** present ⇒ replace that task view's config (the row must be a task view, else `TaskViewNotFoundError`) */
  id?: string
  name: string
  /** VIEW_LAYOUT (BR-10) */
  layout: ViewLayout
  /** create: NULL (default) = the global All-Tasks view (V2); update: omitted ⇒ ownership unchanged */
  space_id?: string | null
  /** tag ids → `filter.tags` (membership incl. nested, ADR-007:57) */
  tags?: string[]
  /** → `filter.predicates`, opaque */
  predicates?: Record<string, unknown>
  grouping?: ViewGrouping
  sort?: unknown
}

/**
 * A shipped task preset (TAS-30 · ADR-009 T4) = a task view config BOUND to the `kind` discriminator — the preset
 * does NOT own a discriminator of its own (T4 anti-signal). `kind` is both the tab binding (which preset shows for
 * which kind) and, when non-null, the preset's `predicates.kind`. Tasks provides the TYPE + the DATA; the preset
 * primitive + tab are Spaces/P6 (first-consumer-pull seam).
 */
export interface TaskViewPreset {
  key: 'today' | 'board' | 'all_by_project'
  kind: TaskKind | null
  view: Omit<SaveTaskViewInput, 'id' | 'space_id'>
}

/**
 * S9 · TAS-29 (RATIFY) — the ONE saved-view config schema the 12 renderers consume: a `views` row config minus
 * identity/ownership (name · layout · tags · predicates · grouping · sort). Shipped at S8 as `TaskViewPreset['view']`;
 * named here so the ② imports it by its TAS-29 name (the Zod half is `TaskViewConfigSchema` in validators/task.ts).
 * The 12→7 layout mapping is the deferred ADR-007 anatomy pass.
 */
export type TaskViewConfig = TaskViewPreset['view']

// --- S9 — the journal set (cross-module-integration.md §2 · contract.md:32 · TAS-19 surface_journal = PULL) ---------
/**
 * One member of a day's journal set — the governing doc's row verbatim: "Tasks completed or due on the date: title,
 * status, priority" (`tasks WHERE due_date = ? OR completed on date`; `contract.md:32` adds `scheduled_date`). `id` is
 * the ADR-002 universal key; the two membership flags carry WHY the task is in the set so the ② honours the JR-4
 * data-point selection without re-deriving the day (the day of `completed_at` is the UTC calendar day — the platform
 * convention, `utcDay`). A task both completed-on and due-on the date is ONE member with both flags.
 */
export interface TasksDaySummaryItem {
  id: string
  title: string
  status: Status
  priority: Priority
  /** `completed_at != null && utcDay(completed_at) === date` — a status label alone never counts (TK-6: a completion is status + timestamp) */
  completedToday: boolean
  /** `due_date === date || scheduled_date === date` (calendar-string equality) */
  dueToday: boolean
}

// --- S2 inputs (sub-tasks + rollup) ------------------------------------------
/** A sub-task body — the create surface minus `parent_task_id` (addSubtask sets it to the parent). */
export type AddSubtaskInput = Omit<CreateTaskInput, 'parent_task_id'>

/**
 * The sub-task progress rollup (TAS-10). `done`/`total` are the completed/total child counts; `progress` is the
 * ADR-011 M4 weighted rollup (Σ child×weight / Σ weight) over the children's milestone-from-status leaf progress,
 * `null` when there are no (measured) children — DERIVED on read, never a stored column (TK-11/M3).
 */
export interface TaskRollup {
  done: number
  total: number
  progress: number | null
}

// --- S7 — aggregation (R7 fan-out over the shared ViewProviderRegistry) -------
/** TAS-05 "by module/project/status/…". `parent` = by parent ENTITY (the R7 lookup — the ONLY provider-consuming
 *  grouping); `parent_type` = by parent MODULE (own-table data, provider-free); `status` = flat, provider-free.
 *  Additive-extensible (a new `by` is non-breaking). */
export type AggGrouping = { by: 'parent' } | { by: 'parent_type' } | { by: 'status' }

/** The 4 mutually-exclusive parent modules a task may belong to (TK-2) — the aggregator's cross-module axis. */
export type ParentType = 'project' | 'milestone' | 'course' | 'contact'

/**
 * One group of the aggregated view. Degradation is explicit PER-GROUP (TAS-32 — a down source degrades its group,
 * never the view). For `by:'parent'` the parent is resolved through the shared seam and attached OPAQUE
 * (`parentRow: unknown`, exactly as the ViewEngine returns `unknown[]` rows) — the ② render maps it to a display
 * label per type (SPLIT leg). `label` is a deterministic FALLBACK (`'<type>:<id>'` / `'standalone'` / the status /
 * the type), NEVER a name fabricated from an unknown row shape (No-Guessing; the predicate-DSL + per-layout field
 * declarations are the deferred 007 pass).
 */
export interface AggregatedGroup {
  /** `'project:<id>'` · `'parent_type:project'` · `'status:completed'` · `'standalone'` */
  key: string
  /** deterministic fallback; ② upgrades from `parentRow` when it knows the type */
  label: string
  /** the resolved parent ref for `by:'parent'`; `null` for the standalone group and the non-parent groupings */
  parent: { type: ParentType; id: string } | null
  /** the provider's row (opaque `object` — still no shape asserted) when `by:'parent'` resolved through the seam;
   *  `null` otherwise / when degraded. `object | null` (not `unknown | null`, which collapses to `unknown`) so the ②
   *  render can narrow on `!== null` (g2 F7). */
  parentRow: object | null
  /** `'degraded'` ⇒ no `providers` / no provider for the type / no matching row / provider threw (TAS-32, BR-11) */
  state: 'ok' | 'degraded'
  tasks: TaskRow[]
}
export interface AggregatedTasks {
  /** stable order — standalone/Inbox LAST, others by key; includes the standalone group whenever any exist (G2) */
  groups: AggregatedGroup[]
}

// --- service surface (grows per slice) ---------------------------------------
export interface TasksService {
  // S1 — tasks CRUD + queries
  createTask(input: CreateTaskInput): Promise<TaskRow>
  updateTask(id: string, patch: UpdateTaskInput): Promise<TaskRow>
  softDeleteTask(id: string): Promise<void>
  getTask(id: string): Promise<TaskRow | null>
  listTasks(filter?: ListTasksFilter): Promise<TaskRow[]>
  // S2 — sub-tasks + M4 rollup
  addSubtask(parentId: string, input: AddSubtaskInput): Promise<TaskRow>
  getSubtasks(parentId: string): Promise<TaskRow[]>
  getRollup(parentId: string): Promise<TaskRollup>
  // S3 — completion + effect fan-out
  completeTask(id: string): Promise<TaskRow>
  reopenTask(id: string): Promise<TaskRow>
  // S4 — timer + log_time + actual_minutes
  startTimer(taskId: string): Promise<SessionRow>
  stopTimer(sessionId: string): Promise<void>
  getActualMinutes(taskId: string): Promise<number>
  // S5 — obligations + recurrence
  setRecurrence(taskId: string, rule: string | null): Promise<TaskRow>
  // S6 — measurability: the pursuable progress() contract (XCU-08/BR-8), derived-on-read honoring the axes.
  getTaskProgress(id: string): Promise<number | null>
  // S7 — aggregation: the cross-module aggregated view over the shared R7/V4 seam (TAS-05); per-group degradation
  // (TAS-32); never rejects for a source outage.
  getAggregatedTasks(grouping: AggGrouping): Promise<AggregatedTasks>
  // S8 — tags via the shared `entity_tags` primitive (TAS-27 / SP1): writes delegate to SpacesService (idempotent
  // BR-14 / resolve-then-soft-delete BR-15); the create path guards a live tag (orphan guard); the read is raw.
  tagTask(taskId: string, tagId: string): Promise<EntityTagRow>
  untagTask(taskId: string, tagId: string): Promise<void>
  getTaskTags(taskId: string): Promise<EntityTagRow[]>
  // S8 — the task's note = a `pages` row (`task_note`, TAS-31), find-or-create through the Notes contract.
  getTaskNote(taskId: string): Promise<PageRow>
  // S8 — saved views over the `views` primitive (TAS-28, cite-level — V1 anatomy is the deferred 007 pass).
  saveView(input: SaveTaskViewInput): Promise<ViewRow>
  listViews(): Promise<ViewRow[]>
  // S9 — the Journal `/summary` set for a date (PULL — the Journals registry calls this at render via
  // `registerTasksJournal`; cross-module-integration.md §2): every task due OR scheduled OR completed on the date.
  getDayTasksSummary(date: string): Promise<TasksDaySummaryItem[]>
  // S9 — the SS-7 due-bucket (sessions intake G2-shape): OPEN tasks whose `due_date` OR `scheduled_date` falls in the
  // ms window; `hard_deadline` = the `due_date` (absent when none). Registered as the tasks lane via
  // `registerTasksDueProvider`; the Calendar (the dueIn aggregator, IA §4) sees tasks only through it.
  getDueReminders(range: TimeRange): Promise<DueItem[]>
}

// --- typed errors ------------------------------------------------------------
export class TaskNotFoundError extends Error {
  constructor(id: string) {
    super(`Task not found: ${id}`)
    this.name = 'TaskNotFoundError'
  }
}

/** More than one parent-module FK set on create/update (TK-2 / TAS-34). */
export class MultipleParentError extends Error {
  constructor(message = 'A task may set at most one parent module (project / milestone / course / contact)') {
    super(message)
    this.name = 'MultipleParentError'
  }
}

/** addSubtask under a task that is itself a sub-task — sub-tasks are single-level (TK-3). */
export class SubtaskNestingError extends Error {
  constructor(parentId: string) {
    super(`Cannot nest under a sub-task (single-level only, TK-3): ${parentId}`)
    this.name = 'SubtaskNestingError'
  }
}

/** startTimer while a `'work'` timer session is already open for the task (TK-5 / TAS-12). */
export class TimerAlreadyRunningError extends Error {
  constructor(taskId: string) {
    super(`A timer is already running for task: ${taskId}`)
    this.name = 'TimerAlreadyRunningError'
  }
}

/** stopTimer on a missing / non-`'work'` / task-unattached session (TAS-13). */
export class TimerNotFoundError extends Error {
  constructor(sessionId: string) {
    super(`No task timer session found: ${sessionId}`)
    this.name = 'TimerNotFoundError'
  }
}

/** The timer requires the effect rail (its `log_time` handler) + the Sessions service to be wired. */
export class TimerNotWiredError extends Error {
  constructor() {
    super('Task timer requires `effects` (rail+registry) and `sessions` deps to be wired (registerTasksTimer)')
    this.name = 'TimerNotWiredError'
  }
}

/** A non-null `recurrence_rule` on a non-`obligation` task — only obligations recur (TK-7 / TAS-21). */
export class RecurrenceNotAllowedError extends Error {
  constructor(taskId: string) {
    super(`Only an obligation may carry a recurrence rule (TK-7): ${taskId}`)
    this.name = 'RecurrenceNotAllowedError'
  }
}

/** S8 — an operation needs a substrate dep (`spaces` | `notes` | `views`) that was not wired at composition. Fail-loud,
 *  never a silent no-op (a swallowed tag write would be data loss). The S4 timer keeps its own `TimerNotWiredError`. */
export class TasksDepNotWiredError extends Error {
  constructor(public readonly dep: 'spaces' | 'notes' | 'views') {
    super(`Tasks operation requires the \`${dep}\` dep to be wired (createTasksService deps.${dep})`)
    this.name = 'TasksDepNotWiredError'
  }
}

/** S8 — `saveView` with an `id` that is absent, soft-deleted, or NOT a task view (`filter.entity_types` ≠ exactly
 *  `['task']` — tasks never rewrites another module's or a mixed view, ADR-007 §3.3/§3.5). */
export class TaskViewNotFoundError extends Error {
  constructor(public readonly viewId: string) {
    super(`No task view found for id: ${viewId}`)
    this.name = 'TaskViewNotFoundError'
  }
}

/** An obligation completed but its next occurrence could not be regenerated — the rule is INVALID (TAS-23). The task
 *  IS completed (durably); this is the loud "complete-but-flag" signal, NOT a completion failure — do not retry. */
export class RecurrenceRegenError extends Error {
  constructor(
    public readonly taskId: string,
    public readonly reason: string,
  ) {
    super(`Obligation ${taskId} completed, but regenerating the next occurrence failed: ${reason}`)
    this.name = 'RecurrenceRegenError'
  }
}
