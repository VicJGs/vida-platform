// ============================================================================
// Habits Domain — @vida/types
// ADR-002 §5.5
// ============================================================================

import type { Id, Timestamp, LifeDomain } from './common'
import type { SyncableEntity, SyncMetadata } from './sync'

// ---------------------------------------------------------------------------
// Enums
// ---------------------------------------------------------------------------

export const HABIT_TYPE = ['build', 'break'] as const
export type HabitType = (typeof HABIT_TYPE)[number]

export const HABIT_FREQUENCY = ['daily', 'weekly', 'biweekly', 'monthly', 'custom'] as const
export type HabitFrequency = (typeof HABIT_FREQUENCY)[number]

export const HABIT_TIME_OF_DAY = ['morning', 'afternoon', 'evening', 'anytime', 'whole_day'] as const
export type HabitTimeOfDay = (typeof HABIT_TIME_OF_DAY)[number]

// Restored from v1 (DB-4 group #6, G8) — the habit's difficulty rating. Distinct from
// TASK_DIFFICULTY {trivial…expert} and TOPIC_DIFFICULTY {easy…very_hard}.
export const HABIT_DIFFICULTY = ['very_easy', 'easy', 'medium', 'hard', 'very_hard'] as const
export type HabitDifficulty = (typeof HABIT_DIFFICULTY)[number]

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
