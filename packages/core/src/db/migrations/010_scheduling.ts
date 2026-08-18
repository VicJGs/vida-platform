// ============================================================================
// Migration 010 — scheduling: planned_blocks (DB-3 · ADR-004 §3.1)
// Hand-written SQL DDL (ADR-016 §3.2). The aggregator-scheduled block; the authored
// sessions.planned_block_id references it. owed-ledger ADR-002 §5.20:3761.
// Mirrors schema/foundation/scheduling.ts.
//
// ⚠ up() runs INSIDE the runner's BEGIN/COMMIT. sub_type is OPEN (user-extensible vocab,
// SS-5/BR-6) — plain TEXT, NO CHECK, mirroring sessions.sub_type (a hard CHECK would forbid
// spawning a user-registered custom sub_type). target_type is OPEN too. Refs plain TEXT, no FK.
// ============================================================================

import type { Migration } from '../adapter'

export const migration010Scheduling: Migration = {
  version: 10,
  name: 'scheduling',
  up: async (driver) => {
    await driver.run(`
      CREATE TABLE planned_blocks (
        id              TEXT PRIMARY KEY,
        scheduled_start INTEGER NOT NULL,
        scheduled_end   INTEGER,
        sub_type        TEXT,
        target_type     TEXT,
        target_id       TEXT,
        status          TEXT NOT NULL DEFAULT 'planned' CHECK (status IN ('planned','scheduled','fulfilled','skipped')),
        source          TEXT,
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
    await driver.run(`CREATE INDEX idx_planned_blocks_start ON planned_blocks (scheduled_start)`)
    await driver.run(`CREATE INDEX idx_planned_blocks_status ON planned_blocks (status)`)
  },
}
