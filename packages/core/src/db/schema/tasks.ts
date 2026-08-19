// ============================================================================
// Domain tables: Tasks (DB-4 · group #4) — ADR-002 §5.3
//
// The OS-wide task primitive + its time ledger. `tasks` is a Wave-1 independent
// domain but an AGGREGATOR: 5 parent refs (project/milestone/course/contact +
// self-ref parent_task) reach OUT to other modules — all plain TEXT, no FK
// (no-FK convention; referential integrity + TK-4 cascade/set-null are the
// app/sync layer's). Tags are NOT here (→ entity_tags, `entity_type='task'`,
// TK-8); notes are NOT here (→ pages, `entity_type='task'`); saved views are NOT
// here (→ the shared `views` primitive, AR-6); the timer/pomodoro is NOT here
// (→ focus_sessions, group #3 — the log_time S4 effect writes task_time_logs).
//
// DDL model (ADR-016 §3.5): the CHECK + partial indexes live in the hand-written
// SQL migration (migrations/015_tasks.ts). These Drizzle objects are only the
// type-safe QUERY mirror — `enumText` gives the TS union, not a SQL CHECK; the
// mirror declares the plain query indexes only (the 2 partial `WHERE deleted_at
// IS NULL` indexes are SQL-migration-only — the notes.ts precedent).
//
// Shape (spec docs/specs/foundation/db-4-tasks/):
// - NO hard cross-table FK, self-ref included (no-FK convention).
// - Full `baseColumns` (incl. updated_at) on both; `tasks` has `deleted_at`,
//   `task_time_logs` does NOT (ledger — hard-deletes with the task, §5.3).
// - FIXED CHECK cols source from @vida/types tuples: status/priority/difficulty/
//   kind/measurement_kind/binding_mode. `binding_mode` is nullable, no default
//   (NULL ⇒ derive-natural, ADR-011 §3.2 override-slot grain); `measurement_kind`
//   NOT NULL DEFAULT 'milestone' (doc-licensed natural, structure-data.md:20).
// - INTENDED build-phase cols authored now: completed_at · scheduled_date · kind +
//   recurrence_rule (RRULE) · measurement_kind/binding_mode (M1/M2) · nesting_weight
//   (ADR-011 §3.3 M4 per-child weight, NULL ⇒ equal).
//
// @vida/types interface reconcile (Task gains 7 cols + drops `tags`; TaskTimeLog
// gains updated_at) → DB-11 (mirror-only now; group #1/#3 precedent). No
// $inferSelect↔interface assertion exists → compiles.
//
// M1.0 encryption (BR-DB6-3): the [E] fields (title/description) are the M3 target
// — the Repository registers an EMPTY [E] set in M1.0 (pass-through).
// ============================================================================

import { sqliteTable, text, integer, index } from 'drizzle-orm/sqlite-core'
import { STATUS, PRIORITY, TASK_DIFFICULTY, TASK_KIND, MEASUREMENT_KIND, BINDING_MODE } from '@vida/types'
import { baseColumns, enumText, timestampMs, calendarDate } from './_shared'

// --- tasks: the task — ADR-002 §5.3 -----------------------------------------
export const tasks = sqliteTable(
  'tasks',
  {
    ...baseColumns,
    project_id: text('project_id'), // no FK
    milestone_id: text('milestone_id'), // no FK
    course_id: text('course_id'), // no FK
    contact_id: text('contact_id'), // no FK
    parent_task_id: text('parent_task_id'), // self-ref, no FK
    /** @encrypted [E] — user content (M3 target; M1.0 pass-through) */
    title: text('title').notNull(),
    /** @encrypted [E] */
    description: text('description'),
    status: enumText('status', STATUS).notNull().default('not_started'), // FIXED → SQL CHECK
    priority: enumText('priority', PRIORITY).notNull().default('medium'), // FIXED → SQL CHECK
    difficulty: enumText('difficulty', TASK_DIFFICULTY).default('medium'), // FIXED → SQL CHECK (nullable)
    due_date: calendarDate('due_date'), // YYYY-MM-DD
    scheduled_date: calendarDate('scheduled_date'), // YYYY-MM-DD (INTENDED G6)
    estimated_minutes: integer('estimated_minutes'),
    actual_minutes: integer('actual_minutes'), // derived (TK-5), never hand-set
    completed_at: timestampMs('completed_at'), // INTENDED G5 (set on completion, TK-6)
    kind: enumText('kind', TASK_KIND).notNull().default('standard'), // INTENDED G8 → SQL CHECK
    recurrence_rule: text('recurrence_rule'), // INTENDED G8; RRULE (obligations only)
    measurement_kind: enumText('measurement_kind', MEASUREMENT_KIND).notNull().default('milestone'), // ADR-011 M1
    binding_mode: enumText('binding_mode', BINDING_MODE), // ADR-011 M2; nullable, no default (NULL ⇒ derive)
    nesting_weight: integer('nesting_weight'), // ADR-011 §3.3 M4; NULL ⇒ equal-weight
    sort_order: integer('sort_order').notNull().default(0),
    deleted_at: integer('deleted_at'),
  },
  (t) => [
    index('idx_tasks_project').on(t.project_id),
    index('idx_tasks_milestone').on(t.milestone_id),
    index('idx_tasks_course').on(t.course_id),
    index('idx_tasks_contact').on(t.contact_id),
    index('idx_tasks_parent').on(t.parent_task_id),
    // NOTE: idx_tasks_status / idx_tasks_due (partial, WHERE deleted_at IS NULL) are SQL-migration-only.
  ],
)

// --- task_time_logs: the time ledger — ADR-002 §5.3 -------------------------
export const taskTimeLogs = sqliteTable(
  'task_time_logs',
  {
    ...baseColumns,
    task_id: text('task_id').notNull(), // plain TEXT, no FK
    start_time: timestampMs('start_time').notNull(),
    end_time: timestampMs('end_time'), // NULL = running
    duration_minutes: integer('duration_minutes'),
    // NO deleted_at — ledger; hard-deletes with the task (§5.3).
  },
  (t) => [index('idx_time_logs_task').on(t.task_id)],
)

// --- inferred row types ------------------------------------------------------
export type TaskRow = typeof tasks.$inferSelect
export type TaskInsert = typeof tasks.$inferInsert
export type TaskTimeLogRow = typeof taskTimeLogs.$inferSelect
export type TaskTimeLogInsert = typeof taskTimeLogs.$inferInsert
