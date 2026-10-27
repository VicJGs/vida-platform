// ============================================================================
// Domain tables: Preferences (DB-4 · group #2) — ADR-002 §5.17
//
// The platform's config provider (Wave-0 foundational, out-degree ≈ 0): the two
// singleton config rows (`user_preferences`, `nav_preferences`) + the `command_bar_history`
// palette-frecency list. Consumed widely (all UI, nav, pomodoro, tasks, notifications,
// gamification, dashboard); owns almost no data of its own.
//
// ALL PLAINTEXT — ZERO [E] (PR-1): preferences is structural config, not user content.
// No field encryption; the Repository registers an EMPTY [E] set (M1.0 pass-through).
//
// DDL model (ADR-016 §3.2): CHECK + UNIQUE live in the hand-written SQL migration
// (migrations/013_preferences.ts). These Drizzle objects are the type-safe QUERY
// mirror only — `enumText` gives the TS union, not a SQL CHECK; `command_key`'s
// UNIQUE is SQL-migration-only (the notes.ts precedent).
//
// Shape (spec docs/specs/foundation/db-4-preferences/):
// - Full `baseColumns` (incl. updated_at) on all 3 (P-R2, ADR-016 §3.4). NO deleted_at
//   (config has no soft-delete; invariant #7 is opt-in). NOTE: @vida/types
//   CommandBarHistory still extends SyncMetadata (created_at only) — same divergence
//   class as entity_links/page_links; interface reconcile is DB-11, not here.
// - 5 FIXED enums → SQL CHECK (theme · time_format · dock_position · dock_size · persona);
//   `default_task_priority` = bare default no CHECK (P-R4); `font_size` /
//   `notification_frequency` = OPEN plain TEXT no CHECK (vocab undefined).
// - JSON columns are plain text() (app stringifies), NOT json<T>() (which only casts).
// - Build-phase intent authored here (DB-4 = the build phase): G4 six columns, PB-2
//   `module_visibility`, E9 `user_profile` split (persona/motivation_style/active_modules/
//   onboarding_completed — Preferences is single-writer owner, ADR-012 §3.10).
//
// ⚠ THREE "module" concerns are DISTINCT — never conflate (conventions.md:31, PR-7):
//   · module_visibility  — nav show/hide per module (JSON map {moduleKey: bool})
//   · active_modules     — E9 persona/onboarding-driven enabled set (JSON array)
//   · feature_gamification — whether gamification LOGIC runs (a single bool)
// A module may be hidden yet functionally enabled, or shown yet feature-off.
// ============================================================================

import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core'
import { THEME, TIME_FORMAT, DOCK_POSITION, DOCK_SIZE, PERSONA } from '@vida/types'
import { baseColumns, enumText, boolInt } from './_shared'

// --- user_preferences: the singleton app-config row — ADR-002 §5.17 ----------
export const userPreferences = sqliteTable('user_preferences', {
  ...baseColumns,
  // Appearance
  theme: enumText('theme', THEME).notNull().default('system'), // FIXED → SQL CHECK
  accent_color: text('accent_color').default('#6366f1'),
  compact_mode: boolInt('compact_mode').notNull().default(false), // G4
  font_size: text('font_size'), // G4 — OPEN, no CHECK
  // Locale
  date_format: text('date_format').default('YYYY-MM-DD'),
  time_format: enumText('time_format', TIME_FORMAT).notNull().default('24h'), // FIXED → SQL CHECK
  week_starts_on: integer('week_starts_on').default(1), // 0=Sun, 1=Mon
  currency: text('currency').default('USD'),
  number_format: text('number_format'), // G4
  // Dashboard
  dashboard_layout: text('dashboard_layout'), // JSON (app stringifies)
  default_dashboard_view: text('default_dashboard_view'), // G4
  module_visibility: text('module_visibility'), // PB-2 JSON map {moduleKey: bool}
  // Tasks
  show_completed_tasks: boolInt('show_completed_tasks').notNull().default(true),
  default_task_priority: text('default_task_priority').default('medium'), // no CHECK (P-R4)
  show_archived: boolInt('show_archived').notNull().default(false), // G4
  // Pomodoro
  pomodoro_work_minutes: integer('pomodoro_work_minutes').notNull().default(25),
  pomodoro_break_minutes: integer('pomodoro_break_minutes').notNull().default(5),
  pomodoro_long_break_minutes: integer('pomodoro_long_break_minutes').notNull().default(15),
  pomodoro_sessions_before_long: integer('pomodoro_sessions_before_long').notNull().default(4),
  // Notifications
  notification_email: boolInt('notification_email').notNull().default(true),
  notification_push: boolInt('notification_push').notNull().default(true),
  notification_in_app: boolInt('notification_in_app').notNull().default(true),
  quiet_hours_enabled: boolInt('quiet_hours_enabled').notNull().default(false),
  quiet_hours_start: text('quiet_hours_start'), // HH:MM
  quiet_hours_end: text('quiet_hours_end'), // HH:MM
  notification_frequency: text('notification_frequency'), // G4 — OPEN, no CHECK
  // Per-module push toggles
  push_habits: boolInt('push_habits').notNull().default(true),
  push_tasks: boolInt('push_tasks').notNull().default(true),
  push_routines: boolInt('push_routines').notNull().default(true),
  push_contacts: boolInt('push_contacts').notNull().default(true),
  push_study: boolInt('push_study').notNull().default(true),
  // Features
  // DDL default kept; the service DEFAULTS write `false` (GM-1 opt-in) on create — preferences-rescope F11.
  feature_gamification: boolInt('feature_gamification').notNull().default(true),
  // Onboarding & persona (E9 split, ADR-012 §3.10 — Preferences single-writer owner)
  persona: enumText('persona', PERSONA), // FIXED → SQL CHECK; nullable
  motivation_style: text('motivation_style'),
  active_modules: text('active_modules'), // JSON array (app stringifies)
  onboarding_completed: boolInt('onboarding_completed').notNull().default(false),
})

// --- nav_preferences: the singleton dock + mobile-nav config — ADR-002 §5.17 --
export const navPreferences = sqliteTable('nav_preferences', {
  ...baseColumns,
  dock_position: enumText('dock_position', DOCK_POSITION).notNull().default('bottom'), // FIXED → SQL CHECK
  dock_auto_hide: boolInt('dock_auto_hide').notNull().default(false),
  dock_size: enumText('dock_size', DOCK_SIZE).notNull().default('medium'), // FIXED → SQL CHECK
  mobile_nav_items: text('mobile_nav_items'), // JSON array (app stringifies)
  show_labels: boolInt('show_labels').notNull().default(true),
  haptic_feedback: boolInt('haptic_feedback').notNull().default(true),
  reduce_motion: boolInt('reduce_motion').notNull().default(false),
})

// --- command_bar_history: Cmd+K palette frecency + pinning — ADR-002 §5.17 ----
export const commandBarHistory = sqliteTable('command_bar_history', {
  ...baseColumns,
  command_key: text('command_key').notNull(), // UNIQUE is SQL-migration-only (BR-P3)
  command_label: text('command_label').notNull(),
  command_category: text('command_category'),
  use_count: integer('use_count').notNull().default(1),
  last_used_at: integer('last_used_at'),
  is_pinned: boolInt('is_pinned').notNull().default(false),
})

// --- inferred row types ------------------------------------------------------
export type UserPreferencesRow = typeof userPreferences.$inferSelect
export type UserPreferencesInsert = typeof userPreferences.$inferInsert
export type NavPreferencesRow = typeof navPreferences.$inferSelect
export type NavPreferencesInsert = typeof navPreferences.$inferInsert
export type CommandBarHistoryRow = typeof commandBarHistory.$inferSelect
export type CommandBarHistoryInsert = typeof commandBarHistory.$inferInsert
