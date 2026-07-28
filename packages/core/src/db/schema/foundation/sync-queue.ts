// ============================================================================
// Foundation table: sync_queue — the local write-ahead queue (DB-6, producer side)
// ADR-002 §5.1 · ADR-004 §3.4
//
// Device-local, NOT synced: it carries NO baseColumns/syncColumns and never
// enqueues itself. The repository writes one row here co-transactionally with
// every entity mutation (ADR-004 §3.4); the reader/flush engine is AR-9 (M4).
//
// DDL model (ADR-016 §3.2): the CHECK constraints + UNIQUE live in the
// hand-written SQL migration (`migrations/001_sync_queue.ts`) — this Drizzle
// object is only the type-safe QUERY mirror. The defaults here (`status`,
// `retry_count`) MUST mirror the migration DDL defaults exactly.
// ============================================================================

import { sqliteTable, text, integer, index, unique } from 'drizzle-orm/sqlite-core'
import type { SyncOperation, SyncQueueStatus } from '@vida/types'
import { enumText } from '../_shared'

// Reuse the canonical unions from @vida/types (single source — do not redefine).
const OPERATIONS = ['create', 'update', 'delete'] as const satisfies readonly SyncOperation[]
const STATUSES = ['pending', 'in_flight', 'failed'] as const satisfies readonly SyncQueueStatus[]

export const syncQueue = sqliteTable(
  'sync_queue',
  {
    id: text('id').primaryKey(), // UUIDv7, repository-generated
    table_name: text('table_name').notNull(),
    row_id: text('row_id').notNull(),
    operation: enumText('operation', OPERATIONS).notNull(),
    /** JSON snapshot of the final persisted row at time of change */
    payload: text('payload'),
    status: enumText('status', STATUSES).notNull().default('pending'),
    retry_count: integer('retry_count').notNull().default(0),
    error_message: text('error_message'),
    created_at: integer('created_at').notNull(), // Unix ms
  },
  (t) => [
    // One pending change per (table, row, operation) — the repository UPSERTs
    // onto this key so repeated pre-flush mutations coalesce to the latest snapshot.
    unique('uq_sync_queue_change').on(t.table_name, t.row_id, t.operation),
    index('idx_sync_queue_status').on(t.status),
  ],
)

export type SyncQueueRow = typeof syncQueue.$inferSelect
export type SyncQueueInsert = typeof syncQueue.$inferInsert
