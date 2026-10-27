// ============================================================================
// Migration 008 — generic review engine (DB-3 · ADR-005)
// Hand-written SQL DDL (ADR-016 §3.2). review_curves + method_bindings + review_events.
// owed-ledger ADR-002 §5.20:3764. Mirrors schema/foundation/knowledge-review.ts.
//
// ⚠ up() runs INSIDE the runner's BEGIN/COMMIT. method_id → capability registry (kind=study_method),
// plain TEXT no FK. review_events is APPEND-ONLY (no deleted_at), mirroring consequence_ledger.
// ============================================================================

import type { Migration } from '../adapter'

export const migration008KnowledgeReview: Migration = {
  version: 8,
  name: 'knowledge_review',
  up: async (driver) => {
    // --- review_curves: personalizable scheduling curves; SM-2 = one preset ---
    await driver.run(`
      CREATE TABLE review_curves (
        id              TEXT PRIMARY KEY,
        name            TEXT NOT NULL,
        curve_kind      TEXT NOT NULL CHECK (curve_kind IN ('decay','review','test')),
        params          TEXT,
        is_preset       INTEGER NOT NULL DEFAULT 0,
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

    // --- method_bindings: which method+curve applies where (polymorphic target) ---
    await driver.run(`
      CREATE TABLE method_bindings (
        id              TEXT PRIMARY KEY,
        method_id       TEXT NOT NULL,
        curve_id        TEXT,
        target_type     TEXT NOT NULL CHECK (target_type IN ('area','subject','unit','topic','kind')),
        target_id       TEXT NOT NULL,
        daily_cap       INTEGER,
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
    await driver.run(`CREATE INDEX idx_method_bindings_target ON method_bindings (target_type, target_id)`)
    await driver.run(`CREATE INDEX idx_method_bindings_method ON method_bindings (method_id)`)

    // --- review_events: append-only outcome log (generalizes topic_reviews/flashcard_reviews) ---
    await driver.run(`
      CREATE TABLE review_events (
        id              TEXT PRIMARY KEY,
        object_id       TEXT NOT NULL,
        method_id       TEXT NOT NULL,
        quality         INTEGER,
        reviewed_at     INTEGER NOT NULL,
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
    await driver.run(`CREATE INDEX idx_review_events_object ON review_events (object_id)`)
    await driver.run(`CREATE INDEX idx_review_events_method ON review_events (method_id)`)
  },
}
