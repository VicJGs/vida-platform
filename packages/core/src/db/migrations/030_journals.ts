// ============================================================================
// Migration 030 — Journals  (DB-4 · group #20 · ADR-002 additions)
// Hand-written SQL DDL (ADR-016 §3.5 — no drizzle-kit). The 19th DB-4 Stream (ii)
// domain migration. Mirrors schema/journals.ts. Authors 1 net-new table.
//
// ⚠ up() runs INSIDE runMigrations' BEGIN/COMMIT/ROLLBACK wrapper (adapter.ts) —
// it must NOT open its own transaction.
//
// Spec: docs/specs/foundation/db-4-journals/_index.md §3a/§P3.1.
// 1 table: journal_snapshots — the frozen point-in-time record (JR-6/JR-7).
//
// Conventions:
// - Hand-composed reduced column set: id + snapshot_date + sections_data[E] +
//   captured_at + 6 _sync_*. NO created_at/updated_at (captured_at IS the
//   timestamp), NO deleted_at (frozen ledger record — check_in_template_questions
//   precedent). NO baseColumns.
// - No CHECK (zero enum columns), no UNIQUE (one-per-date is NP-2 for pages, not
//   snapshots; backfill re-capture is design-pass), no cross-table FK (ADR-016 §3.4).
// - sections_data [E] (the summary_config pattern); snapshot_date/captured_at plaintext keys.
// ============================================================================

import type { Migration } from '../adapter'

export const migration030Journals: Migration = {
  version: 30,
  name: 'journals',
  up: async (driver) => {
    // --- journal_snapshots: the frozen day-summary record the Review engine reads ---
    await driver.run(`
      CREATE TABLE journal_snapshots (
        id              TEXT PRIMARY KEY,
        snapshot_date   TEXT NOT NULL,       -- YYYY-MM-DD (JR-7 date key)
        sections_data   TEXT NOT NULL,       -- [E] frozen per-section JSON (app-stringified)
        captured_at     INTEGER NOT NULL,    -- Unix ms (when frozen)
        _sync_id        TEXT NOT NULL UNIQUE,
        _sync_version   INTEGER NOT NULL DEFAULT 1,
        _sync_device_id TEXT NOT NULL,
        _sync_lww_ts    INTEGER NOT NULL,
        _sync_status    TEXT NOT NULL DEFAULT 'pending',
        _sync_hash      TEXT
      )
    `)

    await driver.run(`CREATE INDEX idx_journal_snapshots_date ON journal_snapshots(snapshot_date)`)
  },
}
