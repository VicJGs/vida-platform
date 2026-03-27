// ============================================================================
// Routines Domain — @vida/types
// ADR-002 §5.6
// ============================================================================

import type { Id, Timestamp } from './common'
import type { SyncableEntity, SyncMetadata } from './sync'

// ---------------------------------------------------------------------------
// Enums
// ---------------------------------------------------------------------------

export type RoutineActionType = 'habit' | 'task' | 'focus'

export type RoutineTimeOfDay = 'morning' | 'afternoon' | 'evening'

export type RoutineRecurrenceFrequency = 'daily' | 'weekdays' | 'weekends' | 'custom'

// ---------------------------------------------------------------------------
// Entities
// ---------------------------------------------------------------------------

export interface RoutineAction extends SyncableEntity {
  /** @encrypted */
  title: string
  /** @encrypted */
  description: string | null
  action_type: RoutineActionType
  time_of_day: RoutineTimeOfDay
  duration_minutes: number | null
  is_active: boolean
  sort_order: number
  linked_habit_id: Id | null
  linked_task_id: Id | null
  recurrence_frequency: RoutineRecurrenceFrequency
  /** [0-6] */
  recurrence_days: number[] | null
  /** YYYY-MM-DD strings */
  skip_dates: string[] | null
  deleted_at: Timestamp | null
}

export interface RoutineCompletion extends SyncMetadata {
  id: Id
  routine_action_id: Id
  /** YYYY-MM-DD — unique per action + date */
  completed_date: string
  completed_at: Timestamp
  skipped: boolean
  /** @encrypted */
  skip_reason: string | null
  actual_duration_minutes: number | null
}
