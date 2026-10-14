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
import type {
  Status,
  Priority,
  TaskDifficulty,
  TaskKind,
  MeasurementKind,
  BindingMode,
} from '@vida/types'

// --- deps (S1 subset) --------------------------------------------------------
export interface TasksServiceDeps {
  db: DrizzleDb
  deviceId: string
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

// --- service surface (grows per slice) ---------------------------------------
export interface TasksService {
  // S1 — tasks CRUD + queries
  createTask(input: CreateTaskInput): Promise<TaskRow>
  updateTask(id: string, patch: UpdateTaskInput): Promise<TaskRow>
  softDeleteTask(id: string): Promise<void>
  getTask(id: string): Promise<TaskRow | null>
  listTasks(filter?: ListTasksFilter): Promise<TaskRow[]>
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
