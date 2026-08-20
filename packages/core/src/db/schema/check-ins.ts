// ============================================================================
// Domain tables: Check-ins — DB-4 · group #16 · ADR-002 §5.13
//
// The lightest DB-4 group — 3 tables: a structured daily-reflection module +
// a small template form-builder. The lone non-ingest unit.
//
// DDL model (ADR-016 §3.5): CHECK + indexes/UNIQUE live in the hand-written SQL
// migration (migrations/026_check_ins.ts). These Drizzle objects are the query mirror.
//
// Shape (spec docs/specs/foundation/db-4-check-ins/_index.md):
// - Enums REUSED from @vida/types (entities/user.ts) — colocated there historically
//   (check_in_streak* lived on user_profile). CHECK_IN_TYPE amended 3→6 (CK-3). No new tuple.
// - NO cross-table FK: template_id ×2 plain TEXT (was SET NULL / CASCADE). CK-10 = app-layer.
// - NO deleted_at on ANY table — a documented FACT (§5.13 DDL + the P/E table omit it on all 3
//   while every neighboring domain lists it; CK-10 = hard-delete lifecycle). Per-module floor.
// - check_in_template_questions = id + syncColumns, NO created_at/updated_at — the §5.13 floor
//   omits them + the interface `extends SyncMetadata` (user.ts:159). daily_check_ins/templates = baseColumns.
// - mood_score/energy_level = plaintext INT, numeric BETWEEN 1 AND 10 CHECK (not tuple-sourced).
// - CK-2 fix: daily_check_ins UNIQUE(check_in_date, check_in_type) (was UNIQUE(check_in_date) alone).
//
// OUT (cite-not-author): E9 check_in_streak* = DERIVED from daily_check_ins (no column; the removal
// from user_profile is Gamification #21's edit); E2 grant_currency(XP) = Gamification-owned (no economy
// col); SP1 no tags; G7 review aggregation = integration + optional entity_links (no column). No M* (C-M).
//
// M1.0 encryption (BR-DB6-3): the [E] fields are the M3 target — EMPTY [E] set in M1.0 (pass-through).
// ============================================================================

import { sqliteTable, text, integer, unique } from 'drizzle-orm/sqlite-core'
import {
  CHECK_IN_TYPE,
  CHECK_IN_SCHEDULE_TYPE,
  CHECK_IN_PREFERRED_TIME,
  CHECK_IN_QUESTION_FIELD_TYPE,
} from '@vida/types'
import { baseColumns, uuidPk, syncColumns, enumText, boolInt, calendarDate } from './_shared'

// --- daily_check_ins: a check-in instance — §5.13 --------------------------
export const dailyCheckIns = sqliteTable(
  'daily_check_ins',
  {
    ...baseColumns,
    template_id: text('template_id'), // no-FK (was SET NULL); nullable
    check_in_date: calendarDate('check_in_date').notNull(), // YYYY-MM-DD (composite UNIQUE, not alone — CK-2)
    check_in_type: enumText('check_in_type', CHECK_IN_TYPE).notNull().default('morning'), // FIXED → SQL CHECK (6, CK-3)
    mood_score: integer('mood_score'), // 1-10 BETWEEN (SQL); plaintext (trend charts)
    energy_level: integer('energy_level'), // 1-10 BETWEEN (SQL); plaintext
    /** @encrypted [E] — JSON array */
    top_intentions: text('top_intentions'),
    /** @encrypted [E] — JSON array */
    wins: text('wins'),
    /** @encrypted [E] — JSON array, deeply personal */
    gratitude: text('gratitude'),
    /** @encrypted [E] — JSON array */
    challenges: text('challenges'),
    /** @encrypted [E] — JSON array */
    tomorrow_focus: text('tomorrow_focus'),
    /** @encrypted [E] — free text, deeply personal */
    reflection: text('reflection'),
    /** @encrypted [E] — JSON from template questions (CK-4) */
    custom_data: text('custom_data'),
    // NO deleted_at (§5.13 floor; CK-10 hard-delete lifecycle)
  },
  (t) => [unique('uq_daily_check_ins_slot').on(t.check_in_date, t.check_in_type)], // CK-2 fix
)

// --- check_in_templates: a reusable form — §5.13 ---------------------------
export const checkInTemplates = sqliteTable('check_in_templates', {
  ...baseColumns,
  /** @encrypted [E] */
  name: text('name').notNull(),
  /** @encrypted [E] */
  description: text('description'),
  icon: text('icon').default('clipboard-check'),
  is_default: boolInt('is_default').notNull().default(false),
  is_active: boolInt('is_active').notNull().default(true),
  schedule_type: enumText('schedule_type', CHECK_IN_SCHEDULE_TYPE), // FIXED → SQL CHECK (nullable)
  schedule_days: text('schedule_days'), // JSON array [0-6]
  preferred_time: enumText('preferred_time', CHECK_IN_PREFERRED_TIME), // FIXED → SQL CHECK (nullable)
  sort_order: integer('sort_order').notNull().default(0),
  // NO deleted_at (is_active governs lifecycle; CK-10 hard-delete)
})

// --- check_in_template_questions: typed questions — §5.13 ------------------
// id + syncColumns ONLY (NO created_at/updated_at — the §5.13 floor omits them + the
// interface `extends SyncMetadata` + explicit id, user.ts:159). No deleted_at.
export const checkInTemplateQuestions = sqliteTable(
  'check_in_template_questions',
  {
    id: uuidPk(),
    template_id: text('template_id').notNull(), // no-FK (was CASCADE)
    field_key: text('field_key').notNull(),
    /** @encrypted [E] */
    label: text('label').notNull(),
    field_type: enumText('field_type', CHECK_IN_QUESTION_FIELD_TYPE).notNull(), // FIXED → SQL CHECK
    /** @encrypted [E] */
    placeholder: text('placeholder'),
    is_required: boolInt('is_required').notNull().default(false),
    min_value: integer('min_value'),
    max_value: integer('max_value'),
    sort_order: integer('sort_order').notNull().default(0),
    ...syncColumns,
  },
  (t) => [unique('uq_check_in_template_questions_field').on(t.template_id, t.field_key)],
)

// --- inferred row types ------------------------------------------------------
export type DailyCheckInRow = typeof dailyCheckIns.$inferSelect
export type DailyCheckInInsert = typeof dailyCheckIns.$inferInsert
export type CheckInTemplateRow = typeof checkInTemplates.$inferSelect
export type CheckInTemplateInsert = typeof checkInTemplates.$inferInsert
export type CheckInTemplateQuestionRow = typeof checkInTemplateQuestions.$inferSelect
export type CheckInTemplateQuestionInsert = typeof checkInTemplateQuestions.$inferInsert
