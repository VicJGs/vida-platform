// ============================================================================
// Migration 002 — Sessions base  (AR-5)
// Hand-written SQL DDL (ADR-016 §3.2 — no drizzle-kit); shape per ADR-004 §3.1/§3.2
// and the AR-5 spec §3.2. Mirrors schema/foundation/sessions.ts (the query mirror).
//
// ⚠ up() runs INSIDE runMigrations' BEGIN/COMMIT/ROLLBACK wrapper
// (adapter.ts) — it must NOT open its own transaction.
//
// The `...baseColumns`/`...syncColumns` SQL below MUST mirror schema/_shared.ts
// exactly (id + created_at + updated_at + the 6 _sync_* columns + defaults).
// NO cross-table FK (base/extension are separate sync blobs, applied out of order —
// ADR-004 §3.4; integrity is app/sync-layer).
// ============================================================================

import type { Migration } from '../adapter'

export const migration002Sessions: Migration = {
  version: 2,
  name: 'sessions',
  up: async (driver) => {
    // --- sessions: the base spine (syncable) — ADR-004 §3.1 -------------------
    await driver.run(`
      CREATE TABLE sessions (
        id                TEXT PRIMARY KEY,
        sub_type          TEXT NOT NULL,
        purpose           TEXT,
        scheduling_mode   TEXT NOT NULL CHECK (scheduling_mode IN ('attended', 'planned', 'ad_hoc')),
        planned_block_id  TEXT,
        started_at        INTEGER,
        ended_at          INTEGER,
        status            TEXT NOT NULL CHECK (status IN ('scheduled', 'planned', 'in_progress', 'completed', 'skipped', 'missed', 'rescheduled')),
        focus_rating      INTEGER CHECK (focus_rating BETWEEN 1 AND 5),
        energy_level      INTEGER CHECK (energy_level BETWEEN 1 AND 5),
        distraction_count INTEGER,
        key_learnings     TEXT,
        deleted_at        INTEGER,
        created_at        INTEGER NOT NULL,
        updated_at        INTEGER NOT NULL,
        _sync_id          TEXT NOT NULL UNIQUE,
        _sync_version     INTEGER NOT NULL DEFAULT 1,
        _sync_device_id   TEXT NOT NULL,
        _sync_lww_ts      INTEGER NOT NULL,
        _sync_status      TEXT NOT NULL DEFAULT 'pending',
        _sync_hash        TEXT
      )
    `)
    await driver.run(`CREATE INDEX idx_sessions_status ON sessions(status)`)
    await driver.run(`CREATE INDEX idx_sessions_sub_type ON sessions(sub_type)`)

    // --- session_type_registry: SessionTypeDef (dims 2-4) — id PK, sub_type UNIQUE -
    await driver.run(`
      CREATE TABLE session_type_registry (
        id                  TEXT PRIMARY KEY,
        sub_type            TEXT NOT NULL UNIQUE,
        owner_module        TEXT NOT NULL,
        is_user_type        INTEGER NOT NULL DEFAULT 0,
        default_purpose     TEXT,
        attachment_defaults TEXT,
        effects             TEXT,
        lifecycle           TEXT,
        permissions         TEXT,
        created_at          INTEGER NOT NULL,
        updated_at          INTEGER NOT NULL,
        _sync_id            TEXT NOT NULL UNIQUE,
        _sync_version       INTEGER NOT NULL DEFAULT 1,
        _sync_device_id     TEXT NOT NULL,
        _sync_lww_ts        INTEGER NOT NULL,
        _sync_status        TEXT NOT NULL DEFAULT 'pending',
        _sync_hash          TEXT
      )
    `)

    // --- session_attachments: polymorphic dim1 — ADR-004 §3.2.1 ---------------
    await driver.run(`
      CREATE TABLE session_attachments (
        id              TEXT PRIMARY KEY,
        session_id      TEXT NOT NULL,
        entity_type     TEXT NOT NULL,
        entity_id       TEXT NOT NULL,
        level           TEXT NOT NULL CHECK (level IN ('type', 'instance')),
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
    await driver.run(`CREATE INDEX idx_session_attachments_session ON session_attachments(session_id)`)
  },
}
