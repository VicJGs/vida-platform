// ============================================================================
// Routines Domain — @vida/types
// ADR-002 §5.6
// ============================================================================

import type { Id, Timestamp } from './common'
import type { SyncableEntity, SyncMetadata } from './sync'

// ---------------------------------------------------------------------------
// Enums
// ---------------------------------------------------------------------------

export const ROUTINE_ACTION_TYPE = ['habit', 'task', 'focus'] as const
export type RoutineActionType = (typeof ROUTINE_ACTION_TYPE)[number]

export const ROUTINE_TIME_OF_DAY = ['morning', 'afternoon', 'evening'] as const
export type RoutineTimeOfDay = (typeof ROUTINE_TIME_OF_DAY)[number]

export const ROUTINE_RECURRENCE_FREQUENCY = ['daily', 'weekdays', 'weekends', 'custom'] as const
export type RoutineRecurrenceFrequency = (typeof ROUTINE_RECURRENCE_FREQUENCY)[number]

// Reframe (DB-4 group #7, §E): the routine lifecycle. ROUTINE_ACTION_TYPE +
// ROUTINE_RECURRENCE_FREQUENCY are superseded by the polymorphic step_type (OPEN)
// + recurrence_rule (RRULE) — retired at the DB-11 interface reconcile.
export const ROUTINE_LIFECYCLE = ['active', 'paused', 'off'] as const
export type RoutineLifecycle = (typeof ROUTINE_LIFECYCLE)[number]

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
