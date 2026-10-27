// ============================================================================
// User, Gamification, Check-ins & Preferences — @vida/types
// ADR-002 §5.13, §5.15, §5.17
// ============================================================================

import type { Id, Timestamp } from '../common'
import type { SyncableEntity, SyncMetadata } from '../sync'

// ---------------------------------------------------------------------------
// Gamification enums
// ---------------------------------------------------------------------------

export const PERSONA = ['student', 'professional', 'entrepreneur', 'creative', 'parent', 'retiree'] as const
export type Persona = (typeof PERSONA)[number]

export const ACHIEVEMENT_CATEGORY = [
  'onboarding',
  'habits',
  'learning',
  'projects',
  'financial',
  'social',
  'checkin',
  'purpose',
  'general',
] as const
export type AchievementCategory = (typeof ACHIEVEMENT_CATEGORY)[number]

export const ACHIEVEMENT_TIER = ['bronze', 'silver', 'gold', 'platinum'] as const
export type AchievementTier = (typeof ACHIEVEMENT_TIER)[number]

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

// DB-4 #16 (CK-3, intake G3): expanded 3→6 — +afternoon/monthly_review/yearly_review.
export const CHECK_IN_TYPE = [
  'morning',
  'afternoon',
  'evening',
  'weekly_review',
  'monthly_review',
  'yearly_review',
] as const
export type CheckInType = (typeof CHECK_IN_TYPE)[number]
export const CHECK_IN_SCHEDULE_TYPE = ['daily', 'weekly', 'custom'] as const
export type CheckInScheduleType = (typeof CHECK_IN_SCHEDULE_TYPE)[number]
export const CHECK_IN_PREFERRED_TIME = ['morning', 'afternoon', 'evening', 'anytime'] as const
export type CheckInPreferredTime = (typeof CHECK_IN_PREFERRED_TIME)[number]

export const CHECK_IN_QUESTION_FIELD_TYPE = [
  'mood_scale',
  'energy_scale',
  'text_list',
  'text_area',
  'rating',
  'boolean',
] as const
export type CheckInQuestionFieldType = (typeof CHECK_IN_QUESTION_FIELD_TYPE)[number]

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

export const THEME = ['light', 'dark', 'system'] as const
export type Theme = (typeof THEME)[number]
export const TIME_FORMAT = ['12h', '24h'] as const
export type TimeFormat = (typeof TIME_FORMAT)[number]
export const DOCK_POSITION = ['bottom', 'left', 'right'] as const
export type DockPosition = (typeof DOCK_POSITION)[number]
export const DOCK_SIZE = ['small', 'medium', 'large'] as const
export type DockSize = (typeof DOCK_SIZE)[number]

export interface UserPreferences extends SyncableEntity {
  // Appearance
  theme: Theme
  accent_color: string
  compact_mode: boolean
  /** OPEN vocab (no CHECK) — schema/preferences.ts:48 */
  font_size: string | null
  // Locale
  date_format: string
  time_format: TimeFormat
  /** 0=Sun, 1=Mon */
  week_starts_on: number
  currency: string
  number_format: string | null
  // Dashboard
  dashboard_layout: Record<string, unknown> | null
  default_dashboard_view: string | null
  /** PB-2 per-module nav visibility {moduleKey: bool} — distinct from active_modules & feature_gamification (PR-7) */
  module_visibility: Record<string, boolean> | null
  // Tasks
  show_completed_tasks: boolean
  default_task_priority: string
  show_archived: boolean
  // Pomodoro
  pomodoro_work_minutes: number
  pomodoro_break_minutes: number
  pomodoro_long_break_minutes: number
  pomodoro_sessions_before_long: number
  // Notifications
  notification_email: boolean
  notification_push: boolean
  notification_in_app: boolean
  quiet_hours_enabled: boolean
  quiet_hours_start: string | null
  quiet_hours_end: string | null
  /** OPEN vocab (no CHECK) — schema/preferences.ts:75 */
  notification_frequency: string | null
  // Per-module push toggles
  push_habits: boolean
  push_tasks: boolean
  push_routines: boolean
  push_contacts: boolean
  push_study: boolean
  // Features
  feature_gamification: boolean
  // Onboarding & persona (E9 single-writer split, ADR-012 §3.10 — plaintext config, never PII)
  persona: Persona | null
  motivation_style: string | null
  active_modules: string[] | null
  onboarding_completed: boolean
}

/**
 * The merged, consumer-facing preferences view: config fields only, DB row overlaid on defaults (PR-2 — never
 * `undefined`). Strips SyncableEntity metadata (id/timestamps/_sync_*) because the defaults-fallback path has no row
 * identity — mirrors the `sessions` `FocusConfig` subset precedent. `getMergedPreferences` returns this;
 * `USER_PREFERENCES_DEFAULTS` is one.
 */
export type MergedPreferences = Omit<UserPreferences, keyof SyncableEntity>

export interface NavPreferences extends SyncableEntity {
  dock_position: DockPosition
  dock_auto_hide: boolean
  dock_size: DockSize
  mobile_nav_items: string[] | null
  show_labels: boolean
  haptic_feedback: boolean
  reduce_motion: boolean
}

/** Merged, consumer-facing nav-config view: config fields only, DB row overlaid on defaults (PR-2). Strips the
 *  SyncableEntity metadata — same B1 pattern as `MergedPreferences`. `getNavPreferences` returns this. */
export type MergedNavPreferences = Omit<NavPreferences, keyof SyncableEntity>

export interface CommandBarHistory extends SyncMetadata {
  id: Id
  command_key: string
  command_label: string
  command_category: string | null
  use_count: number
  last_used_at: Timestamp | null
  is_pinned: boolean
}
