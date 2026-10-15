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
import type { EffectRail, EffectRegistry } from '../../foundation/effects'
import type {
  Status,
  Priority,
  TaskDifficulty,
  TaskKind,
  MeasurementKind,
  BindingMode,
} from '@vida/types'

// --- deps (grows per slice) --------------------------------------------------
export interface TasksServiceDeps {
  db: DrizzleDb
  deviceId: string
  /** Deny-safe from S3 — the AR-7 effect rail (emit-only producer). DORMANT at M1 (no handler/named consumer) ⇒ the
   *  completion fan-out is a no-op. Tasks IS an economy feeder (framework §4 L242) so it emits `award_xp` — unlike
   *  Projects/Books/Education (C-E2). Inline shape (the `EffectsPort` name collides at the barrel; projects precedent). */
  effects?: { rail: EffectRail; registry: EffectRegistry }
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
