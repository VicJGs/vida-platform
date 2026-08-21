// ============================================================================
// Domain tables: Skills — DB-4 · group Skills · ADR-002 §5.9 (reshaped roster)
//
// The capability-forging engine — 7 owned tables authored fresh in the hand-written
// ADR-016 model (only db/_legacy carries the old 2-table floor). The
// docs/features/skills/structure-data.md roster is the authoritative shape source
// ([[module-doc-is-db4-roster-not-adr-broad-list]]); ADR-002 §5.9's DDL is STALE
// (pre-reshape: mastery_level NOT NULL DEFAULT 'novice', practice_hours,
// proficiency_test_score, skill_resources CHECK) — read only as the superseded floor.
//
// DDL model (ADR-016 §3.5): CHECK + indexes live in the hand-written SQL migration
// (migrations/021_skills.ts). These Drizzle objects are the type-safe QUERY mirror.
//
// Shape (spec docs/specs/foundation/db-4-skills/):
// - NO FK anywhere — parent_skill_id (self-ref), skill_id, level_id, activity_id,
//   definition_id, session_id are plain TEXT (no-FK, ADR-016 §3.4; §5.9 REFERENCES stale).
//   Cascade/set-null = app/sync-layer (BR-SK-3).
// - Mastery is DERIVED, never a stored default (BR-SK-1): current_level + progress are
//   nullable derived slots; mastery_override is the nullable manual override (M3). The
//   §5.9 `mastery_level NOT NULL DEFAULT 'novice'` anti-signal is resolved OUT.
// - skill_actions IS the Sessions `practice` sub-type (BR-SK-2): own id UUIDv7 PK +
//   session_id UNIQUE (1:1 key, no FK); spine fields live on `sessions`, not re-stored
//   (the group-#3 study_sessions/focus_sessions pattern). SESSION_SUB_TYPE carries 'practice'.
// - FIXED enums → SQL CHECK from the @vida/types tuple. OPEN vocabs (skills.status,
//   skill_activities.difficulty, skill_levels.duration_target, skill_actions.best_time,
//   ladder_template, locale_variant) = plain TEXT, no CHECK ([[open-vocab-columns-take-no-sql-check]]).
// - measurement_config is [E] JSON stored as plain text() (opaque blob at rest — the Notes
//   summary_config precedent, P-2); NOT a typed json<T> and NOT a stored measurement_kind
//   column (BR-SK-4 — the pursuable's M1/M2 is Purpose-owned, C-M1). components_tracked
//   (plain) stays json<T>.
// - Tags/notes/links ride the AR-6 substrate (entity_tags/pages/entity_links, BR-SK-5) —
//   no inline tags column. skill_resources RETIRED → entity_links (not authored).
//
// OUT (owned elsewhere): the X*/AI* ingestion layer, external_in_ok/external_out_ok
// (ADR-010 grant fields), ai_connections (ADR-015), import_staging (ADR-014),
// grant_currency (Gamification), Purpose-target measurability. @vida/types row-interface
// reconcile (the stale learning.ts `Skill`) → DB-11.
//
// M1.0 encryption (BR-DB6-3): the [E] fields are the M3 target — EMPTY [E] set in M1.0.
// ============================================================================

import { sqliteTable, text, integer, index } from 'drizzle-orm/sqlite-core'
import {
  LIFE_DOMAIN,
  PRIORITY,
  FREQUENCY,
  MASTERY_LEVEL,
  SKILL_SETUP_MODE,
  SKILL_LEVEL_STATUS,
  SKILL_ACTIVITY_TYPE,
  SKILL_FILL_SOURCE,
  SKILL_DEPENDENCY_TYPE,
  SKILL_DEPENDENCY_SCOPE,
  SKILL_DEFINITION_SOURCE,
} from '@vida/types'
import { baseColumns, enumText, boolInt, calendarDate, json } from './_shared'

// --- skills: the capability (reshaped) -------------------------------------
export const skills = sqliteTable(
  'skills',
  {
    ...baseColumns,
    domain: enumText('domain', LIFE_DOMAIN).notNull(), // FIXED → SQL CHECK
    /** @encrypted [E] */
    name: text('name').notNull(),
    /** @encrypted [E] */
    description: text('description'),
    /** @encrypted [E] */
    why_important: text('why_important'),
    parent_skill_id: text('parent_skill_id'), // self-ref, no-FK (graph grouping)
    ladder_template: text('ladder_template'), // OPEN, nullable
    current_level: enumText('current_level', MASTERY_LEVEL), // FIXED → CHECK; nullable (DERIVED, BR-SK-1)
    progress: integer('progress'), // nullable (DERIVED)
    mastery_override: enumText('mastery_override', MASTERY_LEVEL), // FIXED → CHECK; nullable override (M3)
    status: text('status'), // OPEN no-CHECK (un-enumerated in every aspect doc)
    priority: enumText('priority', PRIORITY), // FIXED → CHECK; nullable
    practice_frequency: enumText('practice_frequency', FREQUENCY), // FIXED → CHECK; nullable
    target_mastery_date: calendarDate('target_mastery_date'),
    definition_id: text('definition_id'), // → Library, no-FK, nullable
    // Composer config (structure-data.md:13-16):
    components_tracked: json<string[]>('components_tracked'), // plain JSON
    /** @encrypted [E] — JSON at rest (opaque blob, P-2); references the ADR-011 taxonomy, NOT a typed column */
    measurement_config: text('measurement_config'),
    setup_mode: enumText('setup_mode', SKILL_SETUP_MODE), // FIXED → CHECK; nullable (no invented default)
    deleted_at: integer('deleted_at'),
  },
  (t) => [index('idx_skills_parent').on(t.parent_skill_id)],
)

// --- skill_levels: per-skill ladder stage ----------------------------------
export const skillLevels = sqliteTable(
  'skill_levels',
  {
    ...baseColumns,
    skill_id: text('skill_id').notNull(), // no-FK
    sequence: integer('sequence').notNull(),
    /** @encrypted [E] */
    name: text('name').notNull(),
    /** @encrypted [E] */
    completion_criteria: text('completion_criteria'),
    /** @encrypted [E] */
    success_indicators: text('success_indicators'),
    /** @encrypted [E] */
    typical_challenges: text('typical_challenges'),
    /** @encrypted [E] */
    key_skills: text('key_skills'),
    duration_target: text('duration_target'), // OPEN plain text (no unit fixed)
    status: enumText('status', SKILL_LEVEL_STATUS).notNull(), // FIXED → SQL CHECK
    deleted_at: integer('deleted_at'),
  },
  (t) => [index('idx_skill_levels_skill').on(t.skill_id)],
)

// --- skill_activities: typed practice task ---------------------------------
export const skillActivities = sqliteTable(
  'skill_activities',
  {
    ...baseColumns,
    level_id: text('level_id').notNull(), // no-FK
    /** @encrypted [E] */
    name: text('name').notNull(),
    type: enumText('type', SKILL_ACTIVITY_TYPE).notNull(), // FIXED → SQL CHECK
    difficulty: text('difficulty'), // OPEN no-CHECK (un-enumerated; no shared DIFFICULTY vocab)
    duration: integer('duration'), // minutes
    frequency: enumText('frequency', FREQUENCY), // FIXED → CHECK; nullable
    /** @encrypted [E] */
    instructions: text('instructions'),
    /** @encrypted [E] */
    prerequisites: text('prerequisites'),
    /** @encrypted [E] */
    success_criteria: text('success_criteria'),
    fill_source: enumText('fill_source', SKILL_FILL_SOURCE), // FIXED → CHECK; nullable
    deleted_at: integer('deleted_at'),
  },
  (t) => [index('idx_skill_activities_level').on(t.level_id)],
)

// --- skill_actions: Sessions `practice` sub-type (1:1 extension, BR-SK-2) ---
export const skillActions = sqliteTable('skill_actions', {
  ...baseColumns,
  session_id: text('session_id').notNull().unique(), // 1:1 key → sessions.id (no FK)
  activity_id: text('activity_id').notNull(), // no-FK
  scheduled_at: integer('scheduled_at'),
  best_time: text('best_time'), // OPEN no-CHECK
  quality: integer('quality'), // rating
  energy_required: integer('energy_required'), // rating
  energy_after: integer('energy_after'), // rating
  focus_required: integer('focus_required'), // rating
  completed: boolInt('completed').notNull().default(false),
  // NO deleted_at — session sub-type extension; the base `sessions` owns lifecycle
  // (the study_sessions/focus_sessions precedent, session-extensions.ts). Fixed 2026-08-20.
})

// --- skill_dev_logs: reflective practice log (NOT a session sub-type) -------
export const skillDevLogs = sqliteTable(
  'skill_dev_logs',
  {
    ...baseColumns,
    skill_id: text('skill_id').notNull(), // no-FK
    activity_id: text('activity_id'), // no-FK, nullable
    session_date: calendarDate('session_date'),
    duration: integer('duration'), // minutes
    progress_feeling: integer('progress_feeling'), // rating
    focus: integer('focus'), // rating
    motivation: integer('motivation'), // rating
    energy: integer('energy'), // rating
    /** @encrypted [E] */
    what_worked: text('what_worked'),
    /** @encrypted [E] */
    what_to_improve: text('what_to_improve'),
    /** @encrypted [E] */
    next_plan: text('next_plan'),
    /** @encrypted [E] — → Knowledge objects */
    key_insights: text('key_insights'),
    deleted_at: integer('deleted_at'),
  },
  (t) => [index('idx_skill_dev_logs_skill').on(t.skill_id)],
)

// --- skill_dependencies: Skill Graph edges ---------------------------------
export const skillDependencies = sqliteTable(
  'skill_dependencies',
  {
    ...baseColumns,
    from_skill_id: text('from_skill_id').notNull(), // no-FK
    to_skill_id: text('to_skill_id').notNull(), // no-FK
    type: enumText('type', SKILL_DEPENDENCY_TYPE).notNull(), // FIXED → SQL CHECK
    scope: enumText('scope', SKILL_DEPENDENCY_SCOPE).notNull(), // FIXED → SQL CHECK
    deleted_at: integer('deleted_at'),
  },
  (t) => [
    index('idx_skill_dependencies_from').on(t.from_skill_id),
    index('idx_skill_dependencies_to').on(t.to_skill_id),
  ],
)

// --- skill_definitions: the Definition Library -----------------------------
export const skillDefinitions = sqliteTable('skill_definitions', {
  ...baseColumns,
  /** @encrypted [E] */
  name: text('name').notNull(),
  domain: enumText('domain', LIFE_DOMAIN).notNull(), // FIXED → SQL CHECK
  locale_variant: text('locale_variant'), // OPEN (language/region), no CHECK
  /** @encrypted [E] — JSON ladder template */
  ladder_template: text('ladder_template'),
  /** @encrypted [E] — JSON activities template */
  activities_template: text('activities_template'),
  source: enumText('source', SKILL_DEFINITION_SOURCE).notNull(), // FIXED → SQL CHECK (dataset origin; `ai`=AI6)
  /** @encrypted [E] */
  provenance: text('provenance'),
  deleted_at: integer('deleted_at'),
})

// --- inferred row types ------------------------------------------------------
export type SkillRow = typeof skills.$inferSelect
export type SkillInsert = typeof skills.$inferInsert
export type SkillLevelRow = typeof skillLevels.$inferSelect
export type SkillLevelInsert = typeof skillLevels.$inferInsert
export type SkillActivityRow = typeof skillActivities.$inferSelect
export type SkillActivityInsert = typeof skillActivities.$inferInsert
export type SkillActionRow = typeof skillActions.$inferSelect
export type SkillActionInsert = typeof skillActions.$inferInsert
export type SkillDevLogRow = typeof skillDevLogs.$inferSelect
export type SkillDevLogInsert = typeof skillDevLogs.$inferInsert
export type SkillDependencyRow = typeof skillDependencies.$inferSelect
export type SkillDependencyInsert = typeof skillDependencies.$inferInsert
export type SkillDefinitionRow = typeof skillDefinitions.$inferSelect
export type SkillDefinitionInsert = typeof skillDefinitions.$inferInsert
