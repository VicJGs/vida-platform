// ============================================================================
// DB-4 group #3 — Session sub-type 1:1 extensions (ADR-004 §3.1)
// study_sessions (study) · focus_sessions (focus = the timer runtime).
//
// Each is a 1:1 extension of the AR-5 `sessions` spine: own `id` UUIDv7 PK
// (BR-DB-1 — the Repository factory generates it) + `session_id` UNIQUE (the 1:1
// key → sessions.id, plain TEXT no FK — ADR-004 §3.4 sync applies rows out of
// order). Spine fields live on `sessions`, never re-stored here (BR-S1). Both are
// zero-[E]. DDL lives in migrations/014_sessions_scheduling.ts.
//
// focus_sessions supersedes the retired v2 Notes-owned `pomodoro_sessions`
// (notes-and-pages reframe): entity_type/entity_id/page_id → session_id (PD-1/2).
// ============================================================================

import { sqliteTable, text, integer, index } from 'drizzle-orm/sqlite-core'
import { STUDY_SESSION_RESOURCE_TYPE, POMODORO_TYPE, POMODORO_STATUS } from '@vida/types'
import { baseColumns, enumText } from '../_shared'

export const studySessions = sqliteTable(
  'study_sessions',
  {
    ...baseColumns,
    session_id: text('session_id').notNull().unique(), // 1:1 key → sessions.id (no FK)
    resource_type: enumText('resource_type', STUDY_SESSION_RESOURCE_TYPE).notNull(), // FIXED → CHECK
    resource_id: text('resource_id').notNull(),
    pages_read: integer('pages_read'),
    lessons_completed: integer('lessons_completed'),
  },
  (t) => [index('idx_study_sessions_resource').on(t.resource_type, t.resource_id)],
)

export type StudySessionRow = typeof studySessions.$inferSelect
export type StudySessionInsert = typeof studySessions.$inferInsert

export const focusSessions = sqliteTable(
  'focus_sessions',
  {
    ...baseColumns,
    session_id: text('session_id').notNull().unique(), // 1:1 key → sessions.id (no FK)
    duration_seconds: integer('duration_seconds'),
    type: enumText('type', POMODORO_TYPE).notNull(), // FIXED → CHECK
    status: enumText('status', POMODORO_STATUS).notNull().default('running'), // FIXED → CHECK
    completed_count: integer('completed_count').notNull().default(0),
    // v1 restores (PD-5/PD-6): real focus = elapsed − paused; interruption capture
    paused_at: integer('paused_at'),
    total_pause_seconds: integer('total_pause_seconds').notNull().default(0),
    was_interrupted: integer('was_interrupted', { mode: 'boolean' }).notNull().default(false),
    interruption_reason: text('interruption_reason'),
  },
  (t) => [index('idx_focus_sessions_status').on(t.status)],
)

export type FocusSessionRow = typeof focusSessions.$inferSelect
export type FocusSessionInsert = typeof focusSessions.$inferInsert
