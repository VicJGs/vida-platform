// ============================================================================
// Foundation substrate: aggregator-scheduled blocks (DB-3 · ADR-004 §3.1)
// planned_blocks — the Study-Planner-replacement engine's output; referenced by the
// authored `sessions.planned_block_id`. owed-ledger ADR-002 §5.20:3761.
//
// SYNCABLE (…baseColumns). Model-locked spine; the aggregator engine (M1.1 Study Planner)
// may extend columns at its build (recurrence/effort/syllabus link). Polymorphic target,
// no FK. DDL lives in migrations/010_scheduling.ts.
//
// DB-4 group #3 (below) appends the Planner tables (§5.11 "redefined, not dropped"):
// study_availability · availability_exceptions · study_plan_batches · session_templates.
// DDL for those lives in migrations/014_sessions_scheduling.ts.
// ============================================================================

import { sqliteTable, text, integer, index } from 'drizzle-orm/sqlite-core'
import { PLANNED_BLOCK_STATUS, STUDY_PLAN_BATCH_STATUS, PRESET_BLOCK } from '@vida/types'
import { baseColumns, enumText, boolInt } from '../_shared'

export const plannedBlocks = sqliteTable(
  'planned_blocks',
  {
    ...baseColumns,
    scheduled_start: integer('scheduled_start').notNull(), // Unix ms
    scheduled_end: integer('scheduled_end'), // Unix ms, nullable
    sub_type: text('sub_type'), // OPEN vocab (SS-5/BR-6) — the sessions.sub_type this block spawns; registry-validated, no CHECK
    target_type: text('target_type'), // what the block is about (polymorphic, no CHECK — open)
    target_id: text('target_id'),
    status: enumText('status', PLANNED_BLOCK_STATUS).notNull().default('planned'), // FIXED → CHECK
    source: text('source'), // aggregator provenance
    deleted_at: integer('deleted_at'),
  },
  (t) => [
    index('idx_planned_blocks_start').on(t.scheduled_start),
    index('idx_planned_blocks_status').on(t.status),
  ],
)

export type PlannedBlockRow = typeof plannedBlocks.$inferSelect
export type PlannedBlockInsert = typeof plannedBlocks.$inferInsert

// --- DB-4 group #3 · Planner tables (§5.11 redefined, not dropped) -----------

// study_availability — Planner-owned recurring windows (SS-9; zero [E]).
export const studyAvailability = sqliteTable('study_availability', {
  ...baseColumns,
  day_of_week: integer('day_of_week').notNull(), // CHECK 0..6 in migration
  start_time: text('start_time').notNull(), // HH:MM
  end_time: text('end_time').notNull(), // HH:MM
  is_available: boolInt('is_available').notNull().default(true),
  preference_score: integer('preference_score'), // CHECK 1..5 in migration
  preset_block: enumText('preset_block', PRESET_BLOCK), // FIXED → CHECK; reused tuple
  max_session_minutes: integer('max_session_minutes'),
})

export type StudyAvailabilityRow = typeof studyAvailability.$inferSelect
export type StudyAvailabilityInsert = typeof studyAvailability.$inferInsert

// availability_exceptions — date-specific overrides (SS-9).
export const availabilityExceptions = sqliteTable('availability_exceptions', {
  ...baseColumns,
  exception_date: text('exception_date').notNull(), // YYYY-MM-DD
  is_available: boolInt('is_available').notNull(),
  /** @encrypted [E] — free-form reason; field-level libsodium (ADR-002 L2) */
  reason: text('reason'),
  start_time: text('start_time'), // HH:MM (if partially available)
  end_time: text('end_time'),
})

export type AvailabilityExceptionRow = typeof availabilityExceptions.$inferSelect
export type AvailabilityExceptionInsert = typeof availabilityExceptions.$inferInsert

// study_plan_batches — a generated plan batch (name [E]). scope_type/scope_id
// widen beyond course (G5); polymorphic, no FK. status gains 'failed'.
export const studyPlanBatches = sqliteTable('study_plan_batches', {
  ...baseColumns,
  /** @encrypted [E] — user-facing plan name; field-level libsodium (ADR-002 L2) */
  name: text('name'),
  scope_type: text('scope_type'), // widened beyond course (G5); OPEN, no CHECK, no FK
  scope_id: text('scope_id'),
  status: enumText('status', STUDY_PLAN_BATCH_STATUS).notNull().default('draft'), // FIXED → CHECK
  total_sessions: integer('total_sessions').notNull().default(0),
  generated_at: integer('generated_at'),
  approved_at: integer('approved_at'),
})

export type StudyPlanBatchRow = typeof studyPlanBatches.$inferSelect
export type StudyPlanBatchInsert = typeof studyPlanBatches.$inferInsert

// session_templates — focus/session presets (name [E], description [E]). v2
// columns + v1 restores (structure-data.md:58) + is_default (contract.md:40).
export const sessionTemplates = sqliteTable('session_templates', {
  ...baseColumns,
  /** @encrypted [E] — preset name; field-level libsodium (ADR-002 L2) */
  name: text('name').notNull(),
  work_minutes: integer('work_minutes').notNull().default(25),
  short_break_minutes: integer('short_break_minutes').notNull().default(5),
  long_break_minutes: integer('long_break_minutes').notNull().default(15),
  intervals_before_long_break: integer('intervals_before_long_break').notNull().default(4),
  auto_start_breaks: boolInt('auto_start_breaks').notNull().default(true),
  auto_start_work: boolInt('auto_start_work').notNull().default(false),
  is_default: boolInt('is_default').notNull().default(false),
  // v1 restores
  focus_technique: text('focus_technique'),
  /** @encrypted [E] — free-form description; field-level libsodium (ADR-002 L2) */
  description: text('description'),
  notifications: boolInt('notifications').notNull().default(true),
  sounds: boolInt('sounds').notNull().default(true),
  usage_count: integer('usage_count').notNull().default(0),
  last_used_at: integer('last_used_at'),
})

export type SessionTemplateRow = typeof sessionTemplates.$inferSelect
export type SessionTemplateInsert = typeof sessionTemplates.$inferInsert
