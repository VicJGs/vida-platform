// ============================================================================
// Migration 021 — Skills  (DB-4 · group Skills · ADR-002 §5.9 reshaped roster)
// Hand-written SQL DDL (ADR-016 §3.5 — no drizzle-kit). The tenth DB-4 Stream (ii)
// domain migration. Mirrors schema/skills.ts. Authors the 7 owned tables fresh
// (only db/_legacy has the old 2-table floor). §5.9's DDL is STALE — superseded by
// the structure-data.md roster.
//
// ⚠ up() runs INSIDE runMigrations' BEGIN/COMMIT/ROLLBACK wrapper (adapter.ts) —
// it must NOT open its own transaction.
//
// Spec: docs/specs/foundation/db-4-skills/_index.md §P3.
// 7 tables: skills · skill_levels · skill_activities · skill_actions (Sessions `practice`
//           sub-type extension) · skill_dev_logs · skill_dependencies · skill_definitions
//
// Conventions: full baseColumns (id·created_at·updated_at·6 _sync_*) + deleted_at on all 7.
// NO FK — parent_skill_id/skill_id/level_id/activity_id/definition_id/session_id/from_/to_skill_id
// are plain TEXT (no-FK, ADR-016 §3.4; §5.9 REFERENCES superseded; cascade = app-layer BR-SK-3).
// FIXED enums → SQL CHECK from the @vida/types tuple (14 CHECK columns / 11 tuples). OPEN vocabs
// (skills.status, ladder_template; skill_activities.difficulty; skill_levels.duration_target;
// skill_actions.best_time; skill_definitions.locale_variant) = plain TEXT, no CHECK. Mastery is
// DERIVED (no mastery_level NOT NULL DEFAULT — the §5.9 anti-signal, resolved out, BR-SK-1).
// skill_actions = 1:1 session extension (own id PK + session_id UNIQUE, BR-SK-2). measurement_config
// is [E] JSON as plain TEXT (P-2). skill_resources RETIRED → entity_links (not authored).
// ============================================================================

import type { Migration } from '../adapter'

export const migration021Skills: Migration = {
  version: 21,
  name: 'skills',
  up: async (driver) => {
    // --- skills: the capability (reshaped) ---
    await driver.run(`
      CREATE TABLE skills (
        id                  TEXT PRIMARY KEY,
        domain              TEXT NOT NULL
                            CHECK (domain IN (
                              'health', 'career', 'finance', 'relationships',
                              'personal_growth', 'spiritual', 'recreation', 'environment'
                            )),
        name                TEXT NOT NULL,   -- [E]
        description         TEXT,            -- [E]
        why_important       TEXT,            -- [E]
        parent_skill_id     TEXT,            -- no FK (self-ref; graph grouping)
        ladder_template     TEXT,            -- OPEN, nullable
        current_level       TEXT             -- DERIVED (BR-SK-1); nullable
                            CHECK (current_level IN (
                              'novice', 'beginner', 'intermediate', 'advanced', 'expert', 'master'
                            )),
        progress            INTEGER,         -- DERIVED; nullable
        mastery_override    TEXT             -- manual override (M3); nullable
                            CHECK (mastery_override IN (
                              'novice', 'beginner', 'intermediate', 'advanced', 'expert', 'master'
                            )),
        status              TEXT,            -- OPEN, no CHECK
        priority            TEXT             -- nullable
                            CHECK (priority IN ('critical', 'high', 'medium', 'low', 'none')),
        practice_frequency  TEXT             -- nullable
                            CHECK (practice_frequency IN (
                              'daily', 'weekly', 'biweekly', 'monthly', 'quarterly', 'yearly'
                            )),
        target_mastery_date TEXT,            -- YYYY-MM-DD
        definition_id       TEXT,            -- → Library, no FK, nullable
        components_tracked  TEXT,            -- plain JSON (Composer)
        measurement_config  TEXT,            -- [E] JSON at rest (opaque blob, P-2)
        setup_mode          TEXT             -- nullable (no invented default)
                            CHECK (setup_mode IN ('quick', 'advanced')),
        created_at          INTEGER NOT NULL,
        updated_at          INTEGER NOT NULL,
        deleted_at          INTEGER,
        _sync_id        TEXT NOT NULL UNIQUE,
        _sync_version   INTEGER NOT NULL DEFAULT 1,
        _sync_device_id TEXT NOT NULL,
        _sync_lww_ts    INTEGER NOT NULL,
        _sync_status    TEXT NOT NULL DEFAULT 'pending',
        _sync_hash      TEXT
      )
    `)
    await driver.run(`CREATE INDEX idx_skills_parent ON skills(parent_skill_id)`)

    // --- skill_levels: per-skill ladder stage ---
    await driver.run(`
      CREATE TABLE skill_levels (
        id                  TEXT PRIMARY KEY,
        skill_id            TEXT NOT NULL,   -- no FK
        sequence            INTEGER NOT NULL,
        name                TEXT NOT NULL,   -- [E]
        completion_criteria TEXT,            -- [E]
        success_indicators  TEXT,            -- [E]
        typical_challenges  TEXT,            -- [E]
        key_skills          TEXT,            -- [E]
        duration_target     TEXT,            -- OPEN plain text (no unit fixed)
        status              TEXT NOT NULL
                            CHECK (status IN ('upcoming', 'active', 'complete')),
        created_at          INTEGER NOT NULL,
        updated_at          INTEGER NOT NULL,
        deleted_at          INTEGER,
        _sync_id        TEXT NOT NULL UNIQUE,
        _sync_version   INTEGER NOT NULL DEFAULT 1,
        _sync_device_id TEXT NOT NULL,
        _sync_lww_ts    INTEGER NOT NULL,
        _sync_status    TEXT NOT NULL DEFAULT 'pending',
        _sync_hash      TEXT
      )
    `)
    await driver.run(`CREATE INDEX idx_skill_levels_skill ON skill_levels(skill_id)`)

    // --- skill_activities: typed practice task ---
    await driver.run(`
      CREATE TABLE skill_activities (
        id              TEXT PRIMARY KEY,
        level_id        TEXT NOT NULL,   -- no FK
        name            TEXT NOT NULL,   -- [E]
        type            TEXT NOT NULL
                        CHECK (type IN ('practice', 'study', 'project', 'assessment', 'review')),
        difficulty      TEXT,            -- OPEN, no CHECK (un-enumerated)
        duration        INTEGER,         -- minutes
        frequency       TEXT             -- nullable
                        CHECK (frequency IN (
                          'daily', 'weekly', 'biweekly', 'monthly', 'quarterly', 'yearly'
                        )),
        instructions    TEXT,            -- [E]
        prerequisites   TEXT,            -- [E]
        success_criteria TEXT,           -- [E]
        fill_source     TEXT             -- nullable
                        CHECK (fill_source IN ('manual', 'llm', 'import')),
        created_at      INTEGER NOT NULL,
        updated_at      INTEGER NOT NULL,
        deleted_at      INTEGER,
        _sync_id        TEXT NOT NULL UNIQUE,
        _sync_version   INTEGER NOT NULL DEFAULT 1,
        _sync_device_id TEXT NOT NULL,
        _sync_lww_ts    INTEGER NOT NULL,
        _sync_status    TEXT NOT NULL DEFAULT 'pending',
        _sync_hash      TEXT
      )
    `)
    await driver.run(`CREATE INDEX idx_skill_activities_level ON skill_activities(level_id)`)

    // --- skill_actions: Sessions `practice` sub-type (1:1 extension, BR-SK-2) ---
    await driver.run(`
      CREATE TABLE skill_actions (
        id              TEXT PRIMARY KEY,
        session_id      TEXT NOT NULL UNIQUE,   -- 1:1 key → sessions.id (no FK)
        activity_id     TEXT NOT NULL,          -- no FK
        scheduled_at    INTEGER,
        best_time       TEXT,                   -- OPEN, no CHECK
        quality         INTEGER,                -- rating
        energy_required INTEGER,                -- rating
        energy_after    INTEGER,                -- rating
        focus_required  INTEGER,                -- rating
        completed       INTEGER NOT NULL DEFAULT 0,
        created_at      INTEGER NOT NULL,
        updated_at      INTEGER NOT NULL,
        -- NO deleted_at — session sub-type extension; base sessions owns lifecycle
        -- (study_sessions/focus_sessions precedent). Fixed 2026-08-20 (deleted_at audit).
        _sync_id        TEXT NOT NULL UNIQUE,
        _sync_version   INTEGER NOT NULL DEFAULT 1,
        _sync_device_id TEXT NOT NULL,
        _sync_lww_ts    INTEGER NOT NULL,
        _sync_status    TEXT NOT NULL DEFAULT 'pending',
        _sync_hash      TEXT
      )
    `)

    // --- skill_dev_logs: reflective practice log (NOT a session sub-type) ---
    await driver.run(`
      CREATE TABLE skill_dev_logs (
        id               TEXT PRIMARY KEY,
        skill_id         TEXT NOT NULL,   -- no FK
        activity_id      TEXT,            -- no FK, nullable
        session_date     TEXT,            -- YYYY-MM-DD
        duration         INTEGER,         -- minutes
        progress_feeling INTEGER,         -- rating
        focus            INTEGER,         -- rating
        motivation       INTEGER,         -- rating
        energy           INTEGER,         -- rating
        what_worked      TEXT,            -- [E]
        what_to_improve  TEXT,            -- [E]
        next_plan        TEXT,            -- [E]
        key_insights     TEXT,            -- [E] → Knowledge objects
        created_at       INTEGER NOT NULL,
        updated_at       INTEGER NOT NULL,
        deleted_at       INTEGER,
        _sync_id        TEXT NOT NULL UNIQUE,
        _sync_version   INTEGER NOT NULL DEFAULT 1,
        _sync_device_id TEXT NOT NULL,
        _sync_lww_ts    INTEGER NOT NULL,
        _sync_status    TEXT NOT NULL DEFAULT 'pending',
        _sync_hash      TEXT
      )
    `)
    await driver.run(`CREATE INDEX idx_skill_dev_logs_skill ON skill_dev_logs(skill_id)`)

    // --- skill_dependencies: Skill Graph edges ---
    await driver.run(`
      CREATE TABLE skill_dependencies (
        id            TEXT PRIMARY KEY,
        from_skill_id TEXT NOT NULL,   -- no FK
        to_skill_id   TEXT NOT NULL,   -- no FK
        type          TEXT NOT NULL
                      CHECK (type IN ('requires', 'unlocks', 'synergy')),
        scope         TEXT NOT NULL
                      CHECK (scope IN ('global', 'personal')),
        created_at    INTEGER NOT NULL,
        updated_at    INTEGER NOT NULL,
        deleted_at    INTEGER,
        _sync_id        TEXT NOT NULL UNIQUE,
        _sync_version   INTEGER NOT NULL DEFAULT 1,
        _sync_device_id TEXT NOT NULL,
        _sync_lww_ts    INTEGER NOT NULL,
        _sync_status    TEXT NOT NULL DEFAULT 'pending',
        _sync_hash      TEXT
      )
    `)
    await driver.run(`CREATE INDEX idx_skill_dependencies_from ON skill_dependencies(from_skill_id)`)
    await driver.run(`CREATE INDEX idx_skill_dependencies_to ON skill_dependencies(to_skill_id)`)

    // --- skill_definitions: the Definition Library ---
    await driver.run(`
      CREATE TABLE skill_definitions (
        id                  TEXT PRIMARY KEY,
        name                TEXT NOT NULL,   -- [E]
        domain              TEXT NOT NULL
                            CHECK (domain IN (
                              'health', 'career', 'finance', 'relationships',
                              'personal_growth', 'spiritual', 'recreation', 'environment'
                            )),
        locale_variant      TEXT,            -- OPEN, no CHECK
        ladder_template     TEXT,            -- [E] JSON
        activities_template TEXT,            -- [E] JSON
        source              TEXT NOT NULL    -- dataset origin ('ai' = AI6)
                            CHECK (source IN ('curated', 'community', 'ai')),
        provenance          TEXT,            -- [E]
        created_at          INTEGER NOT NULL,
        updated_at          INTEGER NOT NULL,
        deleted_at          INTEGER,
        _sync_id        TEXT NOT NULL UNIQUE,
        _sync_version   INTEGER NOT NULL DEFAULT 1,
        _sync_device_id TEXT NOT NULL,
        _sync_lww_ts    INTEGER NOT NULL,
        _sync_status    TEXT NOT NULL DEFAULT 'pending',
        _sync_hash      TEXT
      )
    `)
  },
}
