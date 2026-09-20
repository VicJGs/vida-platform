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

// --- Check-ins (mod-check-ins #41 · S1 · CHE-18/19) ------------------------
// Entity object validators for the check-ins service (S2–S5 consume them). Mirrors @vida/types
// entities/user.ts:128-180 + schema/check-ins.ts; DOMAIN fields only (no baseColumns/syncColumns —
// the UserPreferencesFields precedent above). FIXED enums reuse the tuple schemas (lines 19-22).
// mood/energy bounded 1-10 (CHE-19; check-ins.ts:52-53). Patch = .partial() (UpdatePreferencesSchema idiom).

/** daily_check_ins domain fields — mirrors DailyCheckIn (entities/user.ts:128-151). */
export const DailyCheckInFields = z.object({
  check_in_date: z.string(), // YYYY-MM-DD (:130)
  check_in_type: CheckInTypeSchema,
  template_id: z.string().nullable(), // Id | null (:132), no-FK
  mood_score: z.number().int().min(1).max(10).nullable(), // 1-10 (CHE-19)
  energy_level: z.number().int().min(1).max(10).nullable(), // 1-10 (CHE-19)
  top_intentions: z.array(z.string()), // [E]
  wins: z.array(z.string()), // [E]
  gratitude: z.array(z.string()), // [E]
  challenges: z.array(z.string()), // [E]
  tomorrow_focus: z.array(z.string()), // [E]
  reflection: z.string().nullable(), // [E]
  custom_data: z.record(z.string(), z.unknown()).nullable(), // [E] JSON keyed by field_key
})

/** createCheckIn input (CHE-01) — slot keys required; the rest optional/service-defaulted. */
export const CreateCheckInSchema = DailyCheckInFields.partial().extend({
  check_in_date: z.string(),
  check_in_type: CheckInTypeSchema,
})

/** updateCheckIn patch (CHE-02) — every field optional EXCEPT the slot key, which is immutable on update
 *  (CK-2: a check-in is keyed by (date,type); editing = content edit, not a slot move — the notes
 *  updatePageSchema .strict()-whitelist / NOT-03 precedent). Moving a slot = delete + recreate. */
export const UpdateCheckInSchema = DailyCheckInFields.partial().omit({
  check_in_date: true,
  check_in_type: true,
})

/** check_in_templates domain fields — mirrors CheckInTemplate (entities/user.ts:153-165). */
export const CheckInTemplateFields = z.object({
  name: z.string(), // [E]
  description: z.string().nullable(), // [E]
  icon: z.string(),
  is_default: z.boolean(),
  is_active: z.boolean(),
  schedule_type: CheckInScheduleTypeSchema.nullable(),
  schedule_days: z.array(z.number().int().min(0).max(6)).nullable(), // JSON [0-6] (check-ins.ts:77)
  preferred_time: CheckInPreferredTimeSchema.nullable(),
  sort_order: z.number().int(),
})

/** createTemplate input (CHE-06) — name required; the rest optional/schema-defaulted. */
export const CreateTemplateSchema = CheckInTemplateFields.partial().extend({
  name: z.string(),
})

/** updateTemplate patch (CHE-07) — every field optional. */
export const UpdateTemplateSchema = CheckInTemplateFields.partial()

/** check_in_template_questions domain fields — mirrors CheckInTemplateQuestion (entities/user.ts:167-180).
 *  Excludes id + template_id (service/route args; addQuestion(templateId, q) — seam-contract). */
export const CheckInTemplateQuestionFields = z.object({
  field_key: z.string().min(1), // required, non-empty; UNIQUE per template (CHE-08; command_key min(1) precedent)
  label: z.string(), // [E]
  field_type: CheckInQuestionFieldTypeSchema,
  placeholder: z.string().nullable(), // [E]
  is_required: z.boolean(),
  min_value: z.number().int().nullable(),
  max_value: z.number().int().nullable(),
  sort_order: z.number().int(),
})

/** addQuestion payload (CHE-08) — core fields required; the rest optional/schema-defaulted. */
export const AddQuestionSchema = CheckInTemplateQuestionFields.partial().extend({
  field_key: z.string().min(1),
  label: z.string(),
  field_type: CheckInQuestionFieldTypeSchema,
})

/** setSchedule config (CHE-11) — the per-template schedule; config only (fire is CHE-24, deferred). */
export const ScheduleConfigSchema = z.object({
  schedule_type: CheckInScheduleTypeSchema.nullable(),
  schedule_days: z.array(z.number().int().min(0).max(6)).nullable(),
  preferred_time: CheckInPreferredTimeSchema.nullable(),
})
