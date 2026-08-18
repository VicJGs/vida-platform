// ============================================================================
// Migration 009 — economy store + rules (DB-3 · ADR-012 §3.5/§3.9)
// Hand-written SQL DDL (ADR-016 §3.2). store + rules.
// owed-ledger ADR-002 §5.20:3779-3780. Mirrors schema/foundation/economy.ts (store/rules).
//
// ⚠ up() runs INSIDE the runner's BEGIN/COMMIT. store = Finance-owned nestable layer
// (canonical single-parent, existing Finance entities untouched). rules = headless automation
// (consequences as JSON-as-TEXT for M1.0). All refs plain TEXT, no FK.
// ============================================================================

import type { Migration } from '../adapter'

export const migration009EconomyStoreRules: Migration = {
  version: 9,
  name: 'economy_store_rules',
  up: async (driver) => {
    // --- store: nestable Storage layer (group | wrapper) ---
    await driver.run(`
      CREATE TABLE store (
        id              TEXT PRIMARY KEY,
        parent_id       TEXT,
        node_kind       TEXT NOT NULL CHECK (node_kind IN ('group','wrapper')),
        ref_type        TEXT CHECK (ref_type IN ('account','investment','asset')),
        ref_id          TEXT,
        name            TEXT NOT NULL,
        is_locked       INTEGER NOT NULL DEFAULT 0,
        dream_id        TEXT,
        purpose_id      TEXT,
        currency_id     TEXT,
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
    await driver.run(`CREATE INDEX idx_store_parent ON store (parent_id)`)
    await driver.run(`CREATE INDEX idx_store_ref ON store (ref_type, ref_id)`)

    // --- rules: headless automation (condition binding + typed-consequence set + grant) ---
    await driver.run(`
      CREATE TABLE rules (
        id                     TEXT PRIMARY KEY,
        name                   TEXT NOT NULL,
        condition_binding_type TEXT NOT NULL CHECK (condition_binding_type IN ('event_trigger','derived_pull')),
        condition_ref          TEXT NOT NULL,
        consequences           TEXT NOT NULL,
        grant_id               TEXT,
        is_enabled             INTEGER NOT NULL DEFAULT 1,
        deleted_at             INTEGER,
        created_at             INTEGER NOT NULL,
        updated_at             INTEGER NOT NULL,
        _sync_id               TEXT NOT NULL UNIQUE,
        _sync_version          INTEGER NOT NULL DEFAULT 1,
        _sync_device_id        TEXT NOT NULL,
        _sync_lww_ts           INTEGER NOT NULL,
        _sync_status           TEXT NOT NULL DEFAULT 'pending',
        _sync_hash             TEXT
      )
    `)
    await driver.run(`CREATE INDEX idx_rules_enabled ON rules (is_enabled)`)
  },
}
