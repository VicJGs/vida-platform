// ============================================================================
// Migration 007 — Purpose & Goals substrate (DB-3 · ADR-011)
// Hand-written SQL DDL (ADR-016 §3.2). values + contributions + purpose_reviews + plan_steps.
// owed-ledger ADR-002 §5.20:3773-3776. Mirrors schema/foundation/purpose.ts.
//
// ⚠ up() runs INSIDE the runner's BEGIN/COMMIT — no own tx. baseColumns SQL mirrors migration 006.
// Cross-domain refs (goal_id/contributor_id/purpose_id/owner_id) are PLAIN TEXT, no FK (targets are DB-4).
// ⚠ `values` is a SQL keyword → the table name is quoted "values".
// ============================================================================

import type { Migration } from '../adapter'

export const migration007Purpose: Migration = {
  version: 7,
  name: 'purpose',
  up: async (driver) => {
    // --- values: core-beliefs layer above purposes (PG4) ---
    await driver.run(`
      CREATE TABLE "values" (
        id              TEXT PRIMARY KEY,
        name            TEXT NOT NULL,
        description     TEXT,
        sort_order      INTEGER NOT NULL DEFAULT 0,
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

    // --- contributions: weighted-laddering goal-edge (PG7) ---
    await driver.run(`
      CREATE TABLE contributions (
        id                      TEXT PRIMARY KEY,
        goal_type               TEXT NOT NULL CHECK (goal_type IN ('purpose','target')),
        goal_id                 TEXT NOT NULL,
        contributor_type        TEXT NOT NULL CHECK (contributor_type IN ('habit','routine','project','task','dream','finance_target','check_in')),
        contributor_id          TEXT NOT NULL,
        contribution_percentage INTEGER NOT NULL,
        contribution_notes      TEXT,
        deleted_at              INTEGER,
        created_at              INTEGER NOT NULL,
        updated_at              INTEGER NOT NULL,
        _sync_id                TEXT NOT NULL UNIQUE,
        _sync_version           INTEGER NOT NULL DEFAULT 1,
        _sync_device_id         TEXT NOT NULL,
        _sync_lww_ts            INTEGER NOT NULL,
        _sync_status            TEXT NOT NULL DEFAULT 'pending',
        _sync_hash              TEXT
      )
    `)
    await driver.run(`CREATE INDEX idx_contributions_goal ON contributions (goal_type, goal_id)`)
    await driver.run(
      `CREATE INDEX idx_contributions_contributor ON contributions (contributor_type, contributor_id)`,
    )

    // --- purpose_reviews: alignment/fulfillment loop (PG3) ---
    await driver.run(`
      CREATE TABLE purpose_reviews (
        id                 TEXT PRIMARY KEY,
        purpose_id         TEXT NOT NULL,
        still_aligned      INTEGER NOT NULL,
        alignment_notes    TEXT,
        overall_progress   INTEGER,
        key_achievements   TEXT,
        obstacles_faced    TEXT,
        adjustments_needed TEXT,
        renewed_commitment INTEGER,
        fulfillment_rating INTEGER,
        clarity_rating     INTEGER,
        reviewed_at        INTEGER NOT NULL,
        deleted_at         INTEGER,
        created_at         INTEGER NOT NULL,
        updated_at         INTEGER NOT NULL,
        _sync_id           TEXT NOT NULL UNIQUE,
        _sync_version      INTEGER NOT NULL DEFAULT 1,
        _sync_device_id    TEXT NOT NULL,
        _sync_lww_ts       INTEGER NOT NULL,
        _sync_status       TEXT NOT NULL DEFAULT 'pending',
        _sync_hash         TEXT
      )
    `)
    await driver.run(`CREATE INDEX idx_purpose_reviews_purpose ON purpose_reviews (purpose_id)`)

    // --- plan_steps: lightweight DOC checklist on a Task/Target (PG5) ---
    await driver.run(`
      CREATE TABLE plan_steps (
        id              TEXT PRIMARY KEY,
        owner_type      TEXT NOT NULL CHECK (owner_type IN ('task','target')),
        owner_id        TEXT NOT NULL,
        title           TEXT NOT NULL,
        note            TEXT,
        sort_order      INTEGER NOT NULL DEFAULT 0,
        is_completed    INTEGER NOT NULL DEFAULT 0,
        completed_at    INTEGER,
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
    await driver.run(`CREATE INDEX idx_plan_steps_owner ON plan_steps (owner_type, owner_id)`)
  },
}
