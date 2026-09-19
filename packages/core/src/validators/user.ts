import { z } from 'zod'
import {
  PERSONA,
  ACHIEVEMENT_CATEGORY,
  ACHIEVEMENT_TIER,
  CHECK_IN_TYPE,
  CHECK_IN_SCHEDULE_TYPE,
  CHECK_IN_PREFERRED_TIME,
  CHECK_IN_QUESTION_FIELD_TYPE,
  THEME,
  TIME_FORMAT,
  DOCK_POSITION,
  DOCK_SIZE,
} from '@vida/types'

export const PersonaSchema = z.enum(PERSONA)
export const AchievementCategorySchema = z.enum(ACHIEVEMENT_CATEGORY)
export const AchievementTierSchema = z.enum(ACHIEVEMENT_TIER)
export const CheckInTypeSchema = z.enum(CHECK_IN_TYPE)
export const CheckInScheduleTypeSchema = z.enum(CHECK_IN_SCHEDULE_TYPE)
export const CheckInPreferredTimeSchema = z.enum(CHECK_IN_PREFERRED_TIME)
export const CheckInQuestionFieldTypeSchema = z.enum(CHECK_IN_QUESTION_FIELD_TYPE)
export const ThemeSchema = z.enum(THEME)
export const TimeFormatSchema = z.enum(TIME_FORMAT)
export const DockPositionSchema = z.enum(DOCK_POSITION)
export const DockSizeSchema = z.enum(DOCK_SIZE)

// --- Preferences (mod-preferences #37 · Slice 1) ---------------------------
// The full user_preferences config surface (mirrors @vida/types MergedPreferences / schema/preferences.ts).
// FIXED enums reuse the tuple schemas above; OPEN vocabs (font_size, notification_frequency) are plain strings
// (no CHECK — schema/preferences.ts:48,75). JSON columns validate the parsed app shape. Patch = .partial()
// (the AvailabilityPatchSchema idiom, validators/session.ts:66).
export const UserPreferencesFields = z.object({
  // Appearance
  theme: ThemeSchema,
  accent_color: z.string(),
  compact_mode: z.boolean(),
  font_size: z.string().nullable(),
  // Locale
  date_format: z.string(),
  time_format: TimeFormatSchema,
  week_starts_on: z.number().int(),
  currency: z.string(),
  number_format: z.string().nullable(),
  // Dashboard
  dashboard_layout: z.record(z.string(), z.unknown()).nullable(),
  default_dashboard_view: z.string().nullable(),
  module_visibility: z.record(z.string(), z.boolean()).nullable(),
  // Tasks
  show_completed_tasks: z.boolean(),
  default_task_priority: z.string(),
  show_archived: z.boolean(),
  // Pomodoro
  pomodoro_work_minutes: z.number().int(),
  pomodoro_break_minutes: z.number().int(),
  pomodoro_long_break_minutes: z.number().int(),
  pomodoro_sessions_before_long: z.number().int(),
  // Notifications
  notification_email: z.boolean(),
  notification_push: z.boolean(),
  notification_in_app: z.boolean(),
  quiet_hours_enabled: z.boolean(),
  quiet_hours_start: z.string().nullable(),
  quiet_hours_end: z.string().nullable(),
  notification_frequency: z.string().nullable(),
  // Per-module push toggles
  push_habits: z.boolean(),
  push_tasks: z.boolean(),
  push_routines: z.boolean(),
  push_contacts: z.boolean(),
  push_study: z.boolean(),
  // Features
  feature_gamification: z.boolean(),
  // Onboarding & persona (E9)
  persona: PersonaSchema.nullable(),
  motivation_style: z.string().nullable(),
  active_modules: z.array(z.string()).nullable(),
  onboarding_completed: z.boolean(),
})

/** updatePreferences patch — every field optional (PR-4 partial merge). */
export const UpdatePreferencesSchema = UserPreferencesFields.partial()

// nav_preferences (Slice 2) — mirrors @vida/types NavPreferences / schema/preferences.ts:92-101.
// FIXED enums reuse DockPositionSchema/DockSizeSchema; mobile_nav_items is the parsed JSON array.
export const NavPreferencesFields = z.object({
  dock_position: DockPositionSchema,
  dock_auto_hide: z.boolean(),
  dock_size: DockSizeSchema,
  mobile_nav_items: z.array(z.string()).nullable(),
  show_labels: z.boolean(),
  haptic_feedback: z.boolean(),
  reduce_motion: z.boolean(),
})

/** updateNavPreferences patch — every field optional. */
export const UpdateNavPreferencesSchema = NavPreferencesFields.partial()

// command_bar_history (Slice 3) — the recordCommand input. command_key must be non-empty (it indexes the
// palette, UNIQUE — BR-P3); command_category is an optional free TEXT (no vocab). schema/preferences.ts:104-112.
export const RecordCommandSchema = z.object({
  command_key: z.string().min(1),
  command_label: z.string(),
  command_category: z.string().nullable().optional(),
})
