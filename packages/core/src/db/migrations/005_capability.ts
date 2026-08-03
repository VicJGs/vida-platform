// ============================================================================
// Migration 005 — capability registry (AR-7 Increment 2)
// Hand-written SQL DDL (ADR-016 §3.2 — no drizzle-kit). ADR-008 (registry +
// block_instances) + ADR-010 (capability_grants) + owed-ledger ADR-002 §5.20.
// Mirrors schema/foundation/capability.ts (query mirror).
//
// ⚠ up() runs INSIDE runMigrations' BEGIN/COMMIT/ROLLBACK wrapper — no own tx.
// The baseColumns SQL block below MUST mirror schema/_shared.ts + migration 003
// exactly (id + deleted_at + created_at + updated_at + the 6 _sync_* columns).
// JSON dims are plain TEXT (registry stringifies). NO CHECK: kind is OPEN;
// render_targets/effects are JSON arrays.
// ============================================================================

import type { Migration } from '../adapter'

export const migration005Capability: Migration = {
  version: 5,
  name: 'capability',
  up: async (driver) => {
    // --- capability_definitions: CB1 registry (def_id = semantic identity) ---
    await driver.run(`
      CREATE TABLE capability_definitions (
        id              TEXT PRIMARY KEY,
        def_id          TEXT NOT NULL UNIQUE,
        kind            TEXT NOT NULL,
        render_targets  TEXT NOT NULL,
        bindings        TEXT NOT NULL,
        effects         TEXT NOT NULL,
        config_schema   TEXT,
        terminal_states TEXT NOT NULL,
        is_user_type    INTEGER NOT NULL DEFAULT 0,
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

    // --- block_instances: standalone placements ---
    await driver.run(`
      CREATE TABLE block_instances (
        id                TEXT PRIMARY KEY,
        capability_def_id TEXT NOT NULL,
        space_id          TEXT NOT NULL,
        config            TEXT,
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
    await driver.run(`CREATE INDEX idx_block_instances_space ON block_instances (space_id)`)

    // --- capability_grants: the ADR-010 declare→grant envelope ---
    await driver.run(`
      CREATE TABLE capability_grants (
        id                          TEXT PRIMARY KEY,
        capability_def_id           TEXT NOT NULL,
        granted_bindings            TEXT NOT NULL,
        granted_effects             TEXT NOT NULL,
        media_ok                    INTEGER NOT NULL DEFAULT 0,
        external_in_ok              INTEGER NOT NULL DEFAULT 0,
        external_out_ok             INTEGER NOT NULL DEFAULT 0,
        consented_sensitive_modules TEXT NOT NULL,
        granted_envelope_hash       TEXT NOT NULL,
        deleted_at                  INTEGER,
        created_at                  INTEGER NOT NULL,
        updated_at                  INTEGER NOT NULL,
        _sync_id                    TEXT NOT NULL UNIQUE,
        _sync_version               INTEGER NOT NULL DEFAULT 1,
        _sync_device_id             TEXT NOT NULL,
        _sync_lww_ts                INTEGER NOT NULL,
        _sync_status                TEXT NOT NULL DEFAULT 'pending',
        _sync_hash                  TEXT
      )
    `)
    await driver.run(`CREATE INDEX idx_capability_grants_def ON capability_grants (capability_def_id)`)
  },
}
