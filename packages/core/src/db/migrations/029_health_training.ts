// ============================================================================
// Migration 029 — Health: Training  (DB-4 · group #19 · ADR-002 additions)
// Hand-written SQL DDL (ADR-016 §3.5 — no drizzle-kit). The 18th DB-4 Stream (ii)
// domain migration. Mirrors schema/health-training.ts. Authors 5 net-new tables (fresh —
// recovered domain, no v2 schema).
//
// ⚠ up() runs INSIDE runMigrations' BEGIN/COMMIT/ROLLBACK wrapper (adapter.ts) —
// it must NOT open its own transaction.
//
// Spec: docs/specs/foundation/db-4-health-training/_index.md §3/§6.
// 5 tables: exercises · exercise_plans · workout_templates · workout_sessions · workout_sets
//
// Conventions:
// - All 5 = full baseColumns. NO cross-table FK (plain TEXT ids, ADR-016 §3.4).
// - deleted_at on `exercises` + `exercise_plans` ONLY (the floor, structure-data.md:13,18).
// - workout_sessions = the `sessions` `workout` sub-type extension: own id + session_id
//   UNIQUE (1:1, no FK), NO deleted_at (base `sessions` owns lifecycle).
// - 5 FIXED enums → SQL CHECK: MOVEMENT_PATTERN · WORKOUT_SET_CATEGORY · BURN_SOURCE (net-new)
//   + METRIC_SIDE · PHYSICAL_ROLE_AUTHORING_SOURCE (reused from #17). OPEN columns take NO CHECK.
// - [E] numeric (planned_reps/actual_reps INTEGER, planned_weight REAL). `order` is quoted (reserved word).
// ============================================================================

import type { Migration } from '../adapter'

// Shared baseColumns SQL tail (id·created_at·updated_at·6 _sync_*) — matches _shared.baseColumns.
const BASE = `
        created_at      INTEGER NOT NULL,
        updated_at      INTEGER NOT NULL,
        _sync_id        TEXT NOT NULL UNIQUE,
        _sync_version   INTEGER NOT NULL DEFAULT 1,
        _sync_device_id TEXT NOT NULL,
        _sync_lww_ts    INTEGER NOT NULL,
        _sync_status    TEXT NOT NULL DEFAULT 'pending',
        _sync_hash      TEXT`

export const migration029HealthTraining: Migration = {
  version: 29,
  name: 'health_training',
  up: async (driver) => {
    // --- exercises: the movement catalog ---
    await driver.run(`
      CREATE TABLE exercises (
        id                  TEXT PRIMARY KEY,
        name                TEXT NOT NULL,   -- [E]
        movement_pattern    TEXT CHECK (movement_pattern IN (
                              'push', 'pull', 'hinge', 'squat', 'lunge', 'carry', 'rotation'
                            )),
        primary_muscle      TEXT,            -- OPEN no-CHECK
        secondary_muscles   TEXT,            -- JSON
        equipment           TEXT,            -- JSON
        difficulty          TEXT,            -- OPEN no-CHECK
        risk_level          TEXT,            -- OPEN no-CHECK
        form_cues           TEXT,            -- [E]
        common_errors       TEXT,            -- [E]
        instructions        TEXT,            -- [E]
        variations          TEXT,            -- [E]
        video_url           TEXT,            -- [E]
        knowledge_object_id TEXT,            -- no-FK; nullable
        deleted_at          INTEGER,         -- the documented floor (L13)
        ${BASE}
      )
    `)

    // --- exercise_plans: periodization ---
    await driver.run(`
      CREATE TABLE exercise_plans (
        id                  TEXT PRIMARY KEY,
        name                TEXT NOT NULL,   -- [E]
        description         TEXT,            -- [E]
        progression_model   TEXT,            -- OPEN no-CHECK
        deload_frequency    TEXT,            -- OPEN no-CHECK
        energy_system_focus TEXT,            -- OPEN no-CHECK
        training_focus      TEXT,            -- JSON
        frequency           INTEGER,         -- sessions/week; nullable
        rest_days           TEXT,            -- JSON [0-6]
        start_date          TEXT,            -- YYYY-MM-DD; nullable
        end_date            TEXT,            -- YYYY-MM-DD; nullable
        status              TEXT,            -- OPEN no-CHECK
        goal_ids            TEXT,            -- JSON → Core health_goals
        role_id             TEXT,            -- no-FK; nullable → Core physical_roles
        authoring_source    TEXT NOT NULL DEFAULT 'manual' CHECK (authoring_source IN (
                              'manual', 'llm', 'import'
                            )),
        deleted_at          INTEGER,         -- the documented floor (L18)
        ${BASE}
      )
    `)
    await driver.run(
      `CREATE INDEX idx_exercise_plans_status ON exercise_plans (status) WHERE deleted_at IS NULL`,
    )

    // --- workout_templates: reusable session defs (no deleted_at) ---
    await driver.run(`
      CREATE TABLE workout_templates (
        id                    TEXT PRIMARY KEY,
        name                  TEXT NOT NULL,   -- [E]
        workout_type          TEXT,            -- OPEN no-CHECK
        set_structure         TEXT,            -- OPEN no-CHECK
        primary_muscle_groups TEXT,            -- JSON
        expected_duration     INTEGER,         -- minutes; nullable
        ai_generated          INTEGER NOT NULL DEFAULT 0,   -- 0/1
        exercise_refs         TEXT,            -- JSON → exercises
        ${BASE}
      )
    `)

    // --- workout_sessions: the Sessions `workout` sub-type extension (own id + session_id UNIQUE, no deleted_at) ---
    await driver.run(`
      CREATE TABLE workout_sessions (
        id                TEXT PRIMARY KEY,
        session_id        TEXT NOT NULL UNIQUE,   -- 1:1 key → sessions.id (no FK)
        plan_id           TEXT,            -- no-FK; nullable
        template_id       TEXT,            -- no-FK; nullable
        location          TEXT,            -- OPEN no-CHECK
        pre_energy        INTEGER,         -- 1-10; nullable
        satisfaction      INTEGER,         -- 1-10; nullable
        completion_pct    REAL,            -- nullable
        performance_notes TEXT,            -- [E]
        issues            TEXT,            -- [E]
        recovery_needs    TEXT,            -- [E]
        calories_burned   REAL,            -- nullable
        burn_source       TEXT CHECK (burn_source IN ('formula', 'wearable', 'manual')),
        ${BASE}
      )
    `)
    await driver.run(`CREATE INDEX idx_workout_sessions_plan ON workout_sessions (plan_id)`)

    // --- workout_sets: per-exercise, per-set log (child of a workout) ---
    await driver.run(`
      CREATE TABLE workout_sets (
        id                 TEXT PRIMARY KEY,
        workout_session_id TEXT NOT NULL,   -- no-FK
        exercise_id        TEXT NOT NULL,   -- no-FK
        category           TEXT CHECK (category IN (
                             'warm-up', 'main', 'accessory', 'cardio', 'mobility', 'cool-down'
                           )),
        "order"            INTEGER NOT NULL DEFAULT 0,
        side               TEXT CHECK (side IN ('left', 'right', 'bilateral')),
        planned_sets       INTEGER,         -- nullable
        planned_reps       INTEGER,         -- [E]; nullable
        planned_weight     REAL,            -- [E]; nullable
        sets_done          INTEGER,         -- nullable
        actual_reps        INTEGER,         -- [E]; nullable
        weight_used        REAL,            -- nullable (plaintext)
        rpe                REAL,            -- 1-10 .5 increments; nullable
        form_quality       TEXT,            -- OPEN no-CHECK
        is_pr              INTEGER NOT NULL DEFAULT 0,   -- 0/1
        ${BASE}
      )
    `)
    await driver.run(`CREATE INDEX idx_workout_sets_session ON workout_sets (workout_session_id)`)
    await driver.run(`CREATE INDEX idx_workout_sets_exercise ON workout_sets (exercise_id)`)
  },
}
