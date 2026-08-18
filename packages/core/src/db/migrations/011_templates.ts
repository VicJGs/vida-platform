// ============================================================================
// Migration 011 — templates (DB-3 · ADR-009)
// Hand-written SQL DDL (ADR-016 §3.2). Light seed-bundle store; fork-on-instantiate
// keeps no back-link (no FK). owed-ledger ADR-002 §5.20:3771. Mirrors schema/foundation/templates.ts.
//
// ⚠ up() runs INSIDE the runner's BEGIN/COMMIT. `bundle` is one opaque serialized TEXT column.
// ============================================================================

import type { Migration } from '../adapter'

export const migration011Templates: Migration = {
  version: 11,
  name: 'templates',
  up: async (driver) => {
    await driver.run(`
      CREATE TABLE templates (
        id              TEXT PRIMARY KEY,
        name            TEXT NOT NULL,
        bundle          TEXT NOT NULL,
        deleted_at      INTEGER,
        created_at      INTEGER NOT NULL,
        updated_at      INTEGER NOT NULL,
        _sync_id        TEXT NOT NULL UNIQUE,
        _sync_version   INTEGER NOT NULL DEFAULT 1,
        _sync_device_id TEXT NOT NULL,
        _sync_lww_ts    INTEGER NOT NULL,
        _sync_status    TEXT NOT NULL DEFAULT 'pending',
        _sync_hash      TEXT
      )
    `)
  },
}
