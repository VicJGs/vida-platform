// ============================================================================
// Tasks Domain — @vida/types
// ADR-002 §5.3
// ============================================================================

import type { Id, Timestamp, Status, Priority } from './common'
import type { SyncableEntity, SyncMetadata } from './sync'

// ---------------------------------------------------------------------------
// Enums
// ---------------------------------------------------------------------------

export const TASK_DIFFICULTY = ['trivial', 'easy', 'medium', 'hard', 'expert'] as const
export type TaskDifficulty = (typeof TASK_DIFFICULTY)[number]

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
  estimated_minutes: number | null
  actual_minutes: number | null
  /** @encrypted */
  tags: string[]
  sort_order: number
  deleted_at: Timestamp | null
}

export interface TaskTimeLog extends SyncMetadata {
  id: Id
  task_id: Id
  start_time: Timestamp
  end_time: Timestamp | null
  duration_minutes: number | null
  created_at: Timestamp
}
