// ============================================================================
// Migration 001 — sync_queue  (DB-6)
// Hand-written SQL DDL (ADR-016 §3.2 — no drizzle-kit); shape per ADR-002 §5.1.
//
// ⚠ up() runs INSIDE runMigrations' BEGIN/COMMIT/ROLLBACK wrapper
// (adapter.ts:255-269) — it must NOT open its own transaction.
// ============================================================================

import type { Migration } from '../adapter'

export const migration001SyncQueue: Migration = {
  version: 1,
  name: 'sync_queue',
  up: async (driver) => {
    await driver.run(`
      CREATE TABLE sync_queue (
        id            TEXT PRIMARY KEY,
        table_name    TEXT NOT NULL,
        row_id        TEXT NOT NULL,
        operation     TEXT NOT NULL CHECK (operation IN ('create', 'update', 'delete')),
        payload       TEXT,
        status        TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_flight', 'failed')),
        retry_count   INTEGER NOT NULL DEFAULT 0,
        error_message TEXT,
        created_at    INTEGER NOT NULL,
        UNIQUE (table_name, row_id, operation)
      )
    `)
    await driver.run(`CREATE INDEX idx_sync_queue_status ON sync_queue(status)`)
  },
}
