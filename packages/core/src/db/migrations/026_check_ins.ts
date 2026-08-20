// ============================================================================
// Migration 026 — Check-ins  (DB-4 · group #16 · ADR-002 §5.13)
// Hand-written SQL DDL (ADR-016 §3.5 — no drizzle-kit). The 15th DB-4 Stream (ii)
// domain migration. Mirrors schema/check-ins.ts. Authors the 3 §5.13 tables (fresh).
//
// ⚠ up() runs INSIDE runMigrations' BEGIN/COMMIT/ROLLBACK wrapper (adapter.ts) —
// it must NOT open its own transaction.
//
// Spec: docs/specs/foundation/db-4-check-ins/_index.md §P3.
// 3 tables: daily_check_ins · check_in_templates · check_in_template_questions
//
// Conventions:
// - daily_check_ins / check_in_templates = full baseColumns (id·created_at·updated_at·6 _sync_*).
// - check_in_template_questions = id + 6 _sync_* ONLY (NO created_at/updated_at — the §5.13 floor
//   omits them + the interface `extends SyncMetadata`, user.ts:159).
// - NO deleted_at on ANY table (§5.13 DDL + P/E table omit it on all 3, while every neighbor lists it;
//   CK-10 = hard-delete: template_id SET NULL / questions CASCADE, both app-layer under no-FK).
// - NO cross-table FK — template_id ×2 plain TEXT (was SET NULL / CASCADE; superseded by ADR-016 §3.4).
// - FIXED enums → SQL CHECK from the @vida/types tuple (CHECK_IN_TYPE now 6, CK-3).
// - mood_score/energy_level = numeric BETWEEN 1 AND 10 (not tuple-sourced). CK-2 fix: composite UNIQUE.
// ============================================================================

import type { Migration } from '../adapter'

export const migration026CheckIns: Migration = {
  version: 26,
  name: 'check_ins',
  up: async (driver) => {
    // --- daily_check_ins: a check-in instance ---
    await driver.run(`
      CREATE TABLE daily_check_ins (
        id               TEXT PRIMARY KEY,
        template_id      TEXT,            -- no FK (was SET NULL); nullable
        check_in_date    TEXT NOT NULL,   -- YYYY-MM-DD (composite UNIQUE below, not alone — CK-2)
        check_in_type    TEXT NOT NULL DEFAULT 'morning'
                         CHECK (check_in_type IN (
                           'morning', 'afternoon', 'evening',
                           'weekly_review', 'monthly_review', 'yearly_review'
                         )),
        mood_score       INTEGER CHECK (mood_score BETWEEN 1 AND 10),
        energy_level     INTEGER CHECK (energy_level BETWEEN 1 AND 10),
        top_intentions   TEXT,            -- [E] JSON array
        wins             TEXT,            -- [E] JSON array
        gratitude        TEXT,            -- [E] JSON array
        challenges       TEXT,            -- [E] JSON array
        tomorrow_focus   TEXT,            -- [E] JSON array
        reflection       TEXT,            -- [E]
        custom_data      TEXT,            -- [E] JSON from template questions
        created_at       INTEGER NOT NULL,
        updated_at       INTEGER NOT NULL,
        _sync_id        TEXT NOT NULL UNIQUE,
        _sync_version   INTEGER NOT NULL DEFAULT 1,
        _sync_device_id TEXT NOT NULL,
        _sync_lww_ts    INTEGER NOT NULL,
        _sync_status    TEXT NOT NULL DEFAULT 'pending',
        _sync_hash      TEXT,
        UNIQUE (check_in_date, check_in_type)
      )
    `)

    // --- check_in_templates: a reusable form ---
    await driver.run(`
      CREATE TABLE check_in_templates (
        id              TEXT PRIMARY KEY,
        name            TEXT NOT NULL,   -- [E]
        description     TEXT,            -- [E]
        icon            TEXT DEFAULT 'clipboard-check',
        is_default      INTEGER NOT NULL DEFAULT 0,
        is_active       INTEGER NOT NULL DEFAULT 1,
        schedule_type   TEXT CHECK (schedule_type IN ('daily', 'weekly', 'custom')),
        schedule_days   TEXT,            -- JSON array [0-6]
        preferred_time  TEXT CHECK (preferred_time IN ('morning', 'afternoon', 'evening', 'anytime')),
        sort_order      INTEGER NOT NULL DEFAULT 0,
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

    // --- check_in_template_questions: typed questions (id + syncColumns, NO created_at/updated_at) ---
    await driver.run(`
      CREATE TABLE check_in_template_questions (
        id           TEXT PRIMARY KEY,
        template_id  TEXT NOT NULL,   -- no FK (was CASCADE)
        field_key    TEXT NOT NULL,
        label        TEXT NOT NULL,   -- [E]
        field_type   TEXT NOT NULL CHECK (field_type IN (
                       'mood_scale', 'energy_scale', 'text_list', 'text_area', 'rating', 'boolean'
                     )),
        placeholder  TEXT,            -- [E]
        is_required  INTEGER NOT NULL DEFAULT 0,
        min_value    INTEGER,
        max_value    INTEGER,
        sort_order   INTEGER NOT NULL DEFAULT 0,
        _sync_id        TEXT NOT NULL UNIQUE,
        _sync_version   INTEGER NOT NULL DEFAULT 1,
        _sync_device_id TEXT NOT NULL,
        _sync_lww_ts    INTEGER NOT NULL,
        _sync_status    TEXT NOT NULL DEFAULT 'pending',
        _sync_hash      TEXT,
        UNIQUE (template_id, field_key)
      )
    `)
  },
}
