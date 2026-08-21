// ============================================================================
// Migration 031 — Gamification ("the System")  (DB-4 · group #21 · ADR-002 additions)
// Hand-written SQL DDL (ADR-016 §3.5 — no drizzle-kit). The 20th DB-4 Stream (ii)
// domain migration. Mirrors schema/gamification.ts. Authors the 3 surviving §5.15
// FACT-floor tables (xp_history RETIRED → consequence_ledger, DB-3).
//
// ⚠ up() runs INSIDE runMigrations' BEGIN/COMMIT/ROLLBACK wrapper (adapter.ts) —
// it must NOT open its own transaction.
//
// Spec: docs/specs/foundation/db-4-gamification/_index.md §3/§P3.1.
// 3 tables: user_profile · achievements · user_achievements.
//
// Conventions:
// - user_profile (singleton) = baseColumns + the ADR-012 §3.10 post-split residual.
//   Drops persona/motivation_style/active_modules/onboarding_completed (→ Preferences #2)
//   + check_in_streak*/last_check_in_date (→ Check-ins #16, derived). No deleted_at.
//   Nullability = the entities/user.ts interface (NOT the stale §5.15 body): focus_areas/
//   timezone/total_xp/current_level/skipped_modules NOT NULL with defaults.
// - achievements = the FIRST non-syncable table: id + fields + created_at ONLY (no _sync_*,
//   no updated_at, no deleted_at — app-defined static seed). key UNIQUE; 2 CHECK (category/tier).
// - user_achievements = SyncMetadata: id + fields + 6 _sync_* (no created_at/updated_at),
//   UNIQUE(achievement_id), no-FK (achievement_id plain TEXT; CASCADE app-layer).
// - [E]: user_profile focus_areas + PII (display_name/avatar_url/birth_date). achievements = all P.
// ============================================================================

import type { Migration } from '../adapter'

// created_at·updated_at + 6 _sync_* (matches _shared.baseColumns tail).
const BASE = `
        created_at      INTEGER NOT NULL,
        updated_at      INTEGER NOT NULL,
        _sync_id        TEXT NOT NULL UNIQUE,
        _sync_version   INTEGER NOT NULL DEFAULT 1,
        _sync_device_id TEXT NOT NULL,
        _sync_lww_ts    INTEGER NOT NULL,
        _sync_status    TEXT NOT NULL DEFAULT 'pending',
        _sync_hash      TEXT`

// 6 _sync_* ONLY (matches _shared.syncColumns — SyncMetadata tail, no created_at/updated_at).
const SYNC = `
        _sync_id        TEXT NOT NULL UNIQUE,
        _sync_version   INTEGER NOT NULL DEFAULT 1,
        _sync_device_id TEXT NOT NULL,
        _sync_lww_ts    INTEGER NOT NULL,
        _sync_status    TEXT NOT NULL DEFAULT 'pending',
        _sync_hash      TEXT`

export const migration031Gamification: Migration = {
  version: 31,
  name: 'gamification',
  up: async (driver) => {
    // --- user_profile: singleton; the ADR-012 §3.10 post-split residual ---
    await driver.run(`
      CREATE TABLE user_profile (
        id                TEXT PRIMARY KEY,
        life_stage        TEXT,
        focus_areas       TEXT NOT NULL DEFAULT '[]',   -- [E] JSON array
        display_name      TEXT,                          -- [E] PII
        avatar_url        TEXT,                          -- [E] PII
        birth_date        TEXT,                          -- [E] PII (YYYY-MM-DD)
        timezone          TEXT NOT NULL DEFAULT 'UTC',
        total_xp          INTEGER NOT NULL DEFAULT 0,     -- cache (GM-4)
        current_level     INTEGER NOT NULL DEFAULT 1,     -- cache (GM-4)
        skipped_modules   TEXT NOT NULL DEFAULT '[]',     -- JSON array
        ${BASE}
      )
    `)

    // --- achievements: app-defined STATIC SEED (non-syncable) ---
    await driver.run(`
      CREATE TABLE achievements (
        id          TEXT PRIMARY KEY,
        key         TEXT NOT NULL UNIQUE,
        category    TEXT NOT NULL CHECK (category IN (
                      'onboarding','habits','learning','projects','financial',
                      'social','checkin','purpose','general'
                    )),
        tier        TEXT NOT NULL DEFAULT 'bronze' CHECK (tier IN (
                      'bronze','silver','gold','platinum'
                    )),
        title       TEXT NOT NULL,
        description TEXT,
        icon        TEXT,
        xp_reward   INTEGER NOT NULL DEFAULT 0,
        condition   TEXT,                              -- JSON: trigger conditions
        is_secret   INTEGER NOT NULL DEFAULT 0,
        created_at  INTEGER NOT NULL
      )
    `)

    // --- user_achievements: the earned-join (SyncMetadata; no-FK; UNIQUE) ---
    await driver.run(`
      CREATE TABLE user_achievements (
        id             TEXT PRIMARY KEY,
        achievement_id TEXT NOT NULL,                  -- no-FK (was CASCADE); app-layer
        earned_at      INTEGER NOT NULL,
        progress       TEXT,                           -- JSON: partial progress
        ${SYNC},

        UNIQUE(achievement_id)
      )
    `)
  },
}
