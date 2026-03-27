// ============================================================================
// Habits Domain — @vida/types
// ADR-002 §5.5
// ============================================================================

import type { Id, Timestamp, LifeDomain } from './common'
import type { SyncableEntity, SyncMetadata } from './sync'

// ---------------------------------------------------------------------------
// Enums
// ---------------------------------------------------------------------------

export type HabitType = 'build' | 'break'

export type HabitFrequency = 'daily' | 'weekly' | 'biweekly' | 'monthly' | 'custom'

export type HabitTimeOfDay = 'morning' | 'afternoon' | 'evening' | 'anytime' | 'whole_day'

// ---------------------------------------------------------------------------
// Entities
// ---------------------------------------------------------------------------

export interface Habit extends SyncableEntity {
  /** @encrypted */
  name: string
  /** @encrypted */
  description: string | null
  habit_type: HabitType
  frequency: HabitFrequency
  /** [0-6], 0 = Sun */
  days_of_week: number[] | null
  target_count: number
  /** @encrypted — user-defined unit, e.g. "glasses of water" */
  unit: string | null
  time_of_day: HabitTimeOfDay
  /** Multiple reminder times */
  times_of_day: string[] | null
  /** @encrypted — behavioral trigger */
  cue: string | null
  /** @encrypted */
  reward: string | null
  domain: LifeDomain | null
  /** @encrypted */
  tags: string[]
  current_streak: number
  longest_streak: number
  total_completions: number
  is_active: boolean
  sort_order: number
  deleted_at: Timestamp | null
}

export interface HabitCompletion extends SyncMetadata {
  id: Id
  habit_id: Id
  /** YYYY-MM-DD — unique per habit + date */
  completed_date: string
  count: number
  /** Measured value, e.g. miles run */
  value: number | null
  /** 1–5 */
  mood_before: number | null
  /** 1–5 */
  mood_after: number | null
  /** 1–5 */
  ease_rating: number | null
  /** 1–5 */
  satisfaction: number | null
  created_at: Timestamp
}
