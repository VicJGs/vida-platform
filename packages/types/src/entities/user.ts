// ============================================================================
// User, Gamification, Check-ins & Preferences — @vida/types
// ADR-002 §5.13, §5.15, §5.17
// ============================================================================

import type { Id, Timestamp } from '../common'
import type { SyncableEntity, SyncMetadata } from '../sync'

// ---------------------------------------------------------------------------
// Gamification enums
// ---------------------------------------------------------------------------

export type Persona =
  | 'student'
  | 'professional'
  | 'entrepreneur'
  | 'creative'
  | 'parent'
  | 'retiree'

export type AchievementCategory =
  | 'onboarding'
  | 'habits'
  | 'learning'
  | 'projects'
  | 'financial'
  | 'social'
  | 'checkin'
  | 'purpose'
  | 'general'

export type AchievementTier = 'bronze' | 'silver' | 'gold' | 'platinum'

// ---------------------------------------------------------------------------
// User profile & gamification
// ---------------------------------------------------------------------------

export interface UserProfile extends SyncableEntity {
  persona: Persona | null
  life_stage: string | null
  /** @encrypted */
  focus_areas: string[]
  motivation_style: string | null
  /** @encrypted PII */
  display_name: string | null
  /** @encrypted PII */
  avatar_url: string | null
  /** @encrypted PII, YYYY-MM-DD */
  birth_date: string | null
  timezone: string
  total_xp: number
  current_level: number
  check_in_streak: number
  longest_check_in_streak: number
  last_check_in_date: string | null
  onboarding_completed: boolean
  skipped_modules: string[]
  active_modules: string[]
}

/** App-defined static content — not user-generated */
export interface Achievement {
  id: Id
  key: string
  category: AchievementCategory
  tier: AchievementTier
  title: string
  description: string | null
  icon: string | null
  xp_reward: number
  condition: Record<string, unknown> | null
  is_secret: boolean
  created_at: Timestamp
}

export interface UserAchievement extends SyncMetadata {
  id: Id
  achievement_id: Id
  earned_at: Timestamp
  progress: Record<string, number> | null
}

export interface XpHistory extends SyncMetadata {
  id: Id
  action_type: string
  xp_amount: number
  entity_type: string | null
  entity_id: Id | null
  level_before: number | null
  level_after: number | null
  earned_at: Timestamp
}

// ---------------------------------------------------------------------------
// Check-ins
// ---------------------------------------------------------------------------

export type CheckInType = 'morning' | 'evening' | 'weekly_review'
export type CheckInScheduleType = 'daily' | 'weekly' | 'custom'
export type CheckInPreferredTime = 'morning' | 'afternoon' | 'evening' | 'anytime'

export type CheckInQuestionFieldType =
  | 'mood_scale'
  | 'energy_scale'
  | 'text_list'
  | 'text_area'
  | 'rating'
  | 'boolean'

export interface DailyCheckIn extends SyncableEntity {
  /** YYYY-MM-DD (unique) */
  check_in_date: string
  check_in_type: CheckInType
  template_id: Id | null
  /** 1–10 */
  mood_score: number | null
  /** 1–10 */
  energy_level: number | null
  /** @encrypted */
  top_intentions: string[]
  /** @encrypted */
  wins: string[]
  /** @encrypted */
  gratitude: string[]
  /** @encrypted */
  challenges: string[]
  /** @encrypted */
  tomorrow_focus: string[]
  /** @encrypted */
  reflection: string | null
  /** @encrypted JSON from template questions */
  custom_data: Record<string, unknown> | null
}

export interface CheckInTemplate extends SyncableEntity {
  /** @encrypted */
  name: string
  /** @encrypted */
  description: string | null
  icon: string
  is_default: boolean
  is_active: boolean
  schedule_type: CheckInScheduleType | null
  schedule_days: number[] | null
  preferred_time: CheckInPreferredTime | null
  sort_order: number
}

export interface CheckInTemplateQuestion extends SyncMetadata {
  id: Id
  template_id: Id
  field_key: string
  /** @encrypted */
  label: string
  field_type: CheckInQuestionFieldType
  /** @encrypted */
  placeholder: string | null
  is_required: boolean
  min_value: number | null
  max_value: number | null
  sort_order: number
}

// ---------------------------------------------------------------------------
// Preferences & Navigation
// ---------------------------------------------------------------------------

export type Theme = 'light' | 'dark' | 'system'
export type TimeFormat = '12h' | '24h'
export type DockPosition = 'bottom' | 'left' | 'right'
export type DockSize = 'small' | 'medium' | 'large'

export interface UserPreferences extends SyncableEntity {
  theme: Theme
  accent_color: string
  date_format: string
  time_format: TimeFormat
  /** 0=Sun, 1=Mon */
  week_starts_on: number
  currency: string
  dashboard_layout: Record<string, unknown> | null
  show_completed_tasks: boolean
  default_task_priority: string
  pomodoro_work_minutes: number
  pomodoro_break_minutes: number
  pomodoro_long_break_minutes: number
  pomodoro_sessions_before_long: number
  notification_email: boolean
  notification_push: boolean
  notification_in_app: boolean
  quiet_hours_enabled: boolean
  quiet_hours_start: string | null
  quiet_hours_end: string | null
  push_habits: boolean
  push_tasks: boolean
  push_routines: boolean
  push_contacts: boolean
  push_study: boolean
  feature_gamification: boolean
}

export interface NavPreferences extends SyncableEntity {
  dock_position: DockPosition
  dock_auto_hide: boolean
  dock_size: DockSize
  mobile_nav_items: string[] | null
  show_labels: boolean
  haptic_feedback: boolean
  reduce_motion: boolean
}

export interface CommandBarHistory extends SyncMetadata {
  id: Id
  command_key: string
  command_label: string
  command_category: string | null
  use_count: number
  last_used_at: Timestamp | null
  is_pinned: boolean
}
