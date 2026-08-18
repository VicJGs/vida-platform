// ============================================================================
// Foundation substrate: aggregator-scheduled blocks (DB-3 · ADR-004 §3.1)
// planned_blocks — the Study-Planner-replacement engine's output; referenced by the
// authored `sessions.planned_block_id`. owed-ledger ADR-002 §5.20:3761.
//
// SYNCABLE (…baseColumns). Model-locked spine; the aggregator engine (M1.1 Study Planner)
// may extend columns at its build (recurrence/effort/syllabus link). Polymorphic target,
// no FK. DDL lives in migrations/010_scheduling.ts.
// ============================================================================

import { sqliteTable, text, integer, index } from 'drizzle-orm/sqlite-core'
import { PLANNED_BLOCK_STATUS } from '@vida/types'
import { baseColumns, enumText } from '../_shared'

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
