// ============================================================================
// Migration 032 — Notifications  (DB-4 · group #22 · ADR-002 additions)
// Hand-written SQL DDL (ADR-016 §3.5 — no drizzle-kit). The 21st (FINAL) DB-4
// Stream (ii) domain migration. Mirrors schema/notifications.ts. Authors 1 table.
// ⚠ This migration COMPLETES DB-4 (21/21) → the M1.0 schema foundation.
//
// ⚠ up() runs INSIDE runMigrations' BEGIN/COMMIT/ROLLBACK wrapper (adapter.ts) —
// it must NOT open its own transaction.
//
// Spec: docs/specs/foundation/db-4-notifications/_index.md §3a/§P3.1.
// 1 table: notifications — the pure-sink polymorphic inbox row.
//
// Conventions:
// - Bespoke shape: id + fields + created_at + 6 _sync_*. NO updated_at (v2 dropped it,
//   intake L22), NO deleted_at (read→archive→expire→purge lifecycle, NF-13). NOT baseColumns.
// - §5.16 floor + RESOLUTION-N4 AMENDMENTs (metadata[E]; 3-flag delivery-audit, P) +
//   ADR-012 convergence key (effect_event_id nullable + UNIQUE).
// - type → SQL CHECK (6, NOTIFICATION_TYPE). entity_type OPEN (registry-validated, no CHECK).
// - UNIQUE(effect_event_id): ADR-012 L45/L139 cross-device convergence on the Additive output row;
//   SQLite NULLs distinct → NULL (time-driven) rows unconstrained, event rows converge.
// - Partial index idx_notifications_unread(is_read) WHERE is_archived=0 (§5.16 floor's sole index).
// - [E]: title, message, action_label, metadata. Structural (type/entity/flags/audit/effect_event_id) plaintext.
// ============================================================================

import type { Migration } from '../adapter'

export const migration032Notifications: Migration = {
  version: 32,
  name: 'notifications',
  up: async (driver) => {
    // --- notifications: the polymorphic inbox row (pure sink) ---
    await driver.run(`
      CREATE TABLE notifications (
        id               TEXT PRIMARY KEY,
        type             TEXT NOT NULL CHECK (type IN (
                           'info','success','warning','error','reminder','achievement'
                         )),
        title            TEXT NOT NULL,       -- [E]
        message          TEXT,                -- [E]
        action_url       TEXT,
        action_label     TEXT,                -- [E]
        entity_type      TEXT,                -- OPEN (registry-validated), the linked subject (NF-10)
        entity_id        TEXT,
        is_read          INTEGER NOT NULL DEFAULT 0,
        read_at          INTEGER,
        is_archived      INTEGER NOT NULL DEFAULT 0,
        archived_at      INTEGER,
        expires_at       INTEGER,
        delivered_in_app INTEGER NOT NULL DEFAULT 0,   -- delivery-audit (P, N4)
        delivered_push   INTEGER NOT NULL DEFAULT 0,
        delivered_email  INTEGER NOT NULL DEFAULT 0,
        metadata         TEXT,                -- [E] optional payload JSON (N4)
        effect_event_id  TEXT,                -- nullable; ADR-012 Additive convergence key
        created_at       INTEGER NOT NULL,
        _sync_id         TEXT NOT NULL UNIQUE,
        _sync_version    INTEGER NOT NULL DEFAULT 1,
        _sync_device_id  TEXT NOT NULL,
        _sync_lww_ts     INTEGER NOT NULL,
        _sync_status     TEXT NOT NULL DEFAULT 'pending',
        _sync_hash       TEXT,

        UNIQUE(effect_event_id)
      )
    `)

    // §5.16 floor's sole index — a PARTIAL index (unread, non-archived).
    await driver.run(
      `CREATE INDEX idx_notifications_unread ON notifications(is_read) WHERE is_archived = 0`,
    )
  },
}
