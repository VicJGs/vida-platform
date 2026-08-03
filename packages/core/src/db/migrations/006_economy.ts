// ============================================================================
// Migration 006 — points economy (AR-7 Increment 4 · ADR-012)
// Hand-written SQL DDL (ADR-016 §3.2). currencies + consequence_ledger.
// owed-ledger ADR-002 §5.20:3777-3778. Mirrors schema/foundation/economy.ts.
//
// ⚠ up() runs INSIDE the runner's BEGIN/COMMIT — no own tx. baseColumns SQL
// mirrors migration 003. consequence_ledger is APPEND-ONLY (no deleted_at); its
// UNIQUE (effect_event_id, kind, target_ref) mirrors the effect rail's PK.
// ============================================================================

import type { Migration } from '../adapter'

export const migration006Economy: Migration = {
  version: 6,
  name: 'economy',
  up: async (driver) => {
    // --- currencies: user-definable resource-currency (XP = one) ---
    await driver.run(`
      CREATE TABLE currencies (
        id              TEXT PRIMARY KEY,
        code            TEXT NOT NULL UNIQUE,
        name            TEXT,
        backing_kind    TEXT NOT NULL CHECK (backing_kind IN ('real-money','self-granted','measured-time')),
        unit            TEXT,
        icon            TEXT,
        pool_ceiling    INTEGER,
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

    // --- consequence_ledger: append-only, derived balances (NO deleted_at) ---
    await driver.run(`
      CREATE TABLE consequence_ledger (
        id              TEXT PRIMARY KEY,
        currency_id     TEXT NOT NULL,
        amount          INTEGER NOT NULL,
        kind            TEXT NOT NULL CHECK (kind IN ('earn','lock','spend','distribute')),
        entity_type     TEXT,
        entity_id       TEXT,
        target_ref      TEXT NOT NULL,
        effect_event_id TEXT NOT NULL,
        at              INTEGER NOT NULL,
        created_at      INTEGER NOT NULL,
        updated_at      INTEGER NOT NULL,
        _sync_id        TEXT NOT NULL UNIQUE,
        _sync_version   INTEGER NOT NULL DEFAULT 1,
        _sync_device_id TEXT NOT NULL,
        _sync_lww_ts    INTEGER NOT NULL,
        _sync_status    TEXT NOT NULL DEFAULT 'pending',
        _sync_hash      TEXT,
        UNIQUE (effect_event_id, kind, target_ref)
      )
    `)
    await driver.run(
      `CREATE INDEX idx_consequence_ledger_currency ON consequence_ledger (currency_id)`,
    )
  },
}
