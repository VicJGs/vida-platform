// ============================================================================
// Migration 013 — Preferences  (DB-4 · group #2 · ADR-002 §5.17)
// Hand-written SQL DDL (ADR-016 §3.2 — no drizzle-kit). The second DB-4 Stream (ii)
// domain migration. Mirrors schema/preferences.ts (query mirror).
//
// ⚠ up() runs INSIDE runMigrations' BEGIN/COMMIT/ROLLBACK wrapper (adapter.ts) —
// it must NOT open its own transaction.
//
// Shape (spec docs/specs/foundation/db-4-preferences/):
// - ALL plaintext, ZERO [E] (PR-1) — preferences is structural config, not content.
// - 5 FIXED enums → SQL CHECK sourced from @vida/types tuples: theme (THEME),
//   time_format (TIME_FORMAT), dock_position (DOCK_POSITION), dock_size (DOCK_SIZE),
//   persona (PERSONA). `default_task_priority` is a bare default, NO CHECK (P-R4);
//   `font_size`/`notification_frequency` are OPEN plain TEXT, NO CHECK (vocab undefined).
// - Full baseColumns (id · created_at · updated_at · 6 _sync_*) on ALL 3 tables
//   (P-R2, ADR-016 §3.4). command_bar_history GAINS created_at/updated_at vs §5.17.
//   NO deleted_at — config has no soft-delete semantic (invariant #7 is opt-in).
// - NO cross-table FK anywhere (no-FK convention).
// - Build-phase intent authored here (DB-4 = the build phase): G4 six columns,
//   PB-2 module_visibility (JSON), E9 user_profile split (persona/motivation_style/
//   active_modules/onboarding_completed — Preferences is single-writer owner,
//   ADR-012 §3.10). JSON columns are plain TEXT (app stringifies), not typed.
// ============================================================================

import type { Migration } from '../adapter'

export const migration013Preferences: Migration = {
  version: 13,
  name: 'preferences',
  up: async (driver) => {
    // --- user_preferences: the singleton app-config row (all plaintext) -------
    await driver.run(`
      CREATE TABLE user_preferences (
        id                            TEXT PRIMARY KEY,
        -- Appearance
        theme                         TEXT NOT NULL DEFAULT 'system'
                                      CHECK (theme IN ('light', 'dark', 'system')),
        accent_color                  TEXT DEFAULT '#6366f1',
        compact_mode                  INTEGER NOT NULL DEFAULT 0,   -- G4
        font_size                     TEXT,                         -- G4 (OPEN, no CHECK)
        -- Locale
        date_format                   TEXT DEFAULT 'YYYY-MM-DD',
        time_format                   TEXT NOT NULL DEFAULT '24h'
                                      CHECK (time_format IN ('12h', '24h')),
        week_starts_on                INTEGER DEFAULT 1,            -- 0=Sun, 1=Mon
        currency                      TEXT DEFAULT 'USD',
        number_format                 TEXT,                         -- G4
        -- Dashboard
        dashboard_layout              TEXT,                         -- JSON
        default_dashboard_view        TEXT,                         -- G4
        module_visibility             TEXT,                         -- PB-2 JSON map {moduleKey: bool}
        -- Tasks
        show_completed_tasks          INTEGER NOT NULL DEFAULT 1,
        default_task_priority         TEXT DEFAULT 'medium',        -- no CHECK (P-R4)
        show_archived                 INTEGER NOT NULL DEFAULT 0,   -- G4
        -- Pomodoro
        pomodoro_work_minutes         INTEGER NOT NULL DEFAULT 25,
        pomodoro_break_minutes        INTEGER NOT NULL DEFAULT 5,
        pomodoro_long_break_minutes   INTEGER NOT NULL DEFAULT 15,
        pomodoro_sessions_before_long INTEGER NOT NULL DEFAULT 4,
        -- Notifications
        notification_email            INTEGER NOT NULL DEFAULT 1,
        notification_push             INTEGER NOT NULL DEFAULT 1,
        notification_in_app           INTEGER NOT NULL DEFAULT 1,
        quiet_hours_enabled           INTEGER NOT NULL DEFAULT 0,
        quiet_hours_start             TEXT,                         -- HH:MM
        quiet_hours_end               TEXT,                         -- HH:MM
        notification_frequency        TEXT,                         -- G4 (OPEN, no CHECK)
        -- Per-module push toggles
        push_habits                   INTEGER NOT NULL DEFAULT 1,
        push_tasks                    INTEGER NOT NULL DEFAULT 1,
        push_routines                 INTEGER NOT NULL DEFAULT 1,
        push_contacts                 INTEGER NOT NULL DEFAULT 1,
        push_study                    INTEGER NOT NULL DEFAULT 1,
        -- Features
        feature_gamification          INTEGER NOT NULL DEFAULT 1,
        -- Onboarding & persona (E9 user_profile split, ADR-012 §3.10 — Preferences single-writer owner)
        persona                       TEXT
                                      CHECK (persona IN ('student', 'professional', 'entrepreneur', 'creative', 'parent', 'retiree')),
        motivation_style              TEXT,
        active_modules                TEXT,                         -- JSON array of module keys
        onboarding_completed          INTEGER NOT NULL DEFAULT 0,

        created_at                    INTEGER NOT NULL,
        updated_at                    INTEGER NOT NULL,
        _sync_id                      TEXT NOT NULL UNIQUE,
        _sync_version                 INTEGER NOT NULL DEFAULT 1,
        _sync_device_id               TEXT NOT NULL,
        _sync_lww_ts                  INTEGER NOT NULL,
        _sync_status                  TEXT NOT NULL DEFAULT 'pending',
        _sync_hash                    TEXT
      )
    `)

    // --- nav_preferences: the singleton dock + mobile-nav config -------------
    await driver.run(`
      CREATE TABLE nav_preferences (
        id               TEXT PRIMARY KEY,
        dock_position    TEXT NOT NULL DEFAULT 'bottom'
                         CHECK (dock_position IN ('bottom', 'left', 'right')),
        dock_auto_hide   INTEGER NOT NULL DEFAULT 0,
        dock_size        TEXT NOT NULL DEFAULT 'medium'
                         CHECK (dock_size IN ('small', 'medium', 'large')),
        mobile_nav_items TEXT,                        -- JSON array of module keys
        show_labels      INTEGER NOT NULL DEFAULT 1,
        haptic_feedback  INTEGER NOT NULL DEFAULT 1,
        reduce_motion    INTEGER NOT NULL DEFAULT 0,

        created_at       INTEGER NOT NULL,
        updated_at       INTEGER NOT NULL,
        _sync_id         TEXT NOT NULL UNIQUE,
        _sync_version    INTEGER NOT NULL DEFAULT 1,
        _sync_device_id  TEXT NOT NULL,
        _sync_lww_ts     INTEGER NOT NULL,
        _sync_status     TEXT NOT NULL DEFAULT 'pending',
        _sync_hash       TEXT
      )
    `)

    // --- command_bar_history: Cmd+K palette frecency + pinning (many) ---------
    // P-R2: full baseColumns incl. created_at/updated_at (§5.17 omitted them;
    // ADR-016 §3.4 locked pattern). NO deleted_at.
    await driver.run(`
      CREATE TABLE command_bar_history (
        id               TEXT PRIMARY KEY,
        command_key      TEXT NOT NULL UNIQUE,
        command_label    TEXT NOT NULL,
        command_category TEXT,
        use_count        INTEGER NOT NULL DEFAULT 1,
        last_used_at     INTEGER,
        is_pinned        INTEGER NOT NULL DEFAULT 0,

        created_at       INTEGER NOT NULL,
        updated_at       INTEGER NOT NULL,
        _sync_id         TEXT NOT NULL UNIQUE,
        _sync_version    INTEGER NOT NULL DEFAULT 1,
        _sync_device_id  TEXT NOT NULL,
        _sync_lww_ts     INTEGER NOT NULL,
        _sync_status     TEXT NOT NULL DEFAULT 'pending',
        _sync_hash       TEXT
      )
    `)
  },
}
