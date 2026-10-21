// ============================================================================
// Tasks Domain — @vida/types
// ADR-002 §5.3
// ============================================================================

import type { Id, Timestamp, Status, Priority } from './common'
import type { SyncableEntity, SyncMetadata } from './sync'
import type { MeasurementKind, BindingMode } from './measurement'

// ---------------------------------------------------------------------------
// Enums
// ---------------------------------------------------------------------------

export const TASK_DIFFICULTY = ['trivial', 'easy', 'medium', 'hard', 'expert'] as const
export type TaskDifficulty = (typeof TASK_DIFFICULTY)[number]

// The task's obligation discriminator (DB-4 group #4 · structure-data G8). `obligation`
// = a deadline-recurring task (carries `recurrence_rule`); `standard` = the non-recurring
// baseline. Also the ADR-009 T4 preset type discriminator. `standard` is the default.
export const TASK_KIND = ['standard', 'obligation'] as const
export type TaskKind = (typeof TASK_KIND)[number]

// ---------------------------------------------------------------------------
// Entities
// ---------------------------------------------------------------------------

export interface Task extends SyncableEntity {
  project_id: Id | null
  milestone_id: Id | null
  course_id: Id | null
  contact_id: Id | null
  parent_task_id: Id | null
  /** @encrypted */
  title: string
  /** @encrypted */
  description: string | null
  status: Status
  priority: Priority
  difficulty: TaskDifficulty | null
  /** YYYY-MM-DD */
  due_date: string | null
  /** YYYY-MM-DD — the planned work date (distinct from the hard due_date; DB-4 group #4) */
  scheduled_date: string | null
  estimated_minutes: number | null
  /** derived — auto-sum of task_time_logs.duration_minutes (TK-5), never hand-set */
  actual_minutes: number | null
  /** set on the status→completed transition (TK-6); cleared on reopen */
  completed_at: Timestamp | null
  /** obligation discriminator — `obligation` carries a recurrence_rule (TK-7) */
  kind: TaskKind
  /** RRULE — obligations only (standard tasks never recur) */
  recurrence_rule: string | null
  /** ADR-011 M1 — the measure shape (natural `milestone`) */
  measurement_kind: MeasurementKind
  /** ADR-011 M2 — how progress binds (completion = `event-trigger`); NULL ⇒ derive-natural */
  binding_mode: BindingMode | null
  /** ADR-011 §3.3 M4 per-child sub-task rollup weight; NULL ⇒ equal-weight */
  nesting_weight: number | null
  sort_order: number
  deleted_at: Timestamp | null
}

export interface TaskTimeLog extends SyncMetadata {
  id: Id
  task_id: Id
  start_time: Timestamp
  /** NULL = running */
  end_time: Timestamp | null
  duration_minutes: number | null
  created_at: Timestamp
  updated_at: Timestamp
}
