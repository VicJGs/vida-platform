// ============================================================================
// Migration 017 — Habits  (DB-4 · group #6 · ADR-002 §5.5)
// Hand-written SQL DDL (ADR-016 §3.5 — no drizzle-kit). The sixth DB-4 Stream (ii)
// domain migration. Mirrors schema/habits.ts.
//
// ⚠ up() runs INSIDE runMigrations' BEGIN/COMMIT/ROLLBACK wrapper (adapter.ts) —
// it must NOT open its own transaction.
//
// Spec: docs/specs/foundation/db-4-habits/_index.md §P3.
// 3 tables:
//   - habits             (name/description/unit/cue/reward + success_criteria [E])
//   - habit_completions  (location [E]; the per-date ledger)
//   - project_habits     (zero [E]; the kept Projects↔Habits junction, from #5)
//
// Conventions: full baseColumns (id·created_at·updated_at·6 _sync_*) on all;
// habit_completions has NO deleted_at (ledger — hard-deletes w/ the habit, HB-11).
// NO cross-table FK — §5.5's habit_id CASCADE + project_habits' 2 CASCADEs → plain
// TEXT (no-FK BR-DB3-1; cascade is app/sync layer, HB-11). FIXED enums → SQL CHECK
// from the @vida/types tuple: habits.habit_type (HABIT_TYPE), .frequency
// (HABIT_FREQUENCY), .time_of_day (HABIT_TIME_OF_DAY), .domain (LIFE_DOMAIN),
// .measurement_kind (MEASUREMENT_KIND), .binding_mode (BINDING_MODE — nullable, no
// default: NULL ⇒ derive event-trigger, ADR-011 §3.2), .difficulty (HABIT_DIFFICULTY
// — net-new). measurement_kind NN DEFAULT 'rate' (HB-13 doc-licensed natural).
// habit_completions ratings (mood_before/after/ease_rating/satisfaction) are numeric
// BETWEEN 1 AND 5 checks (002_sessions.ts precedent), NOT tuple-sourced. `value` REAL.
// No stored progress/nesting_weight on habits (rate derives, HB-13). Inline
// `habits.tags` RETIRED → entity_tags. project_habits: synthetic id PK (NOT §5.5's
// composite PK) + UNIQUE(project_id, habit_id). UNIQUE(habit_id, completed_date) (HB-3).
// idx_habits_active is partial (WHERE deleted_at IS NULL) → this migration only.
// ============================================================================

import type { Migration } from '../adapter'

export const migration017Habits: Migration = {
  version: 17,
  name: 'habits',
  up: async (driver) => {
    // --- habits: definition + denormalized streak cache ---
    await driver.run(`
      CREATE TABLE habits (
        id                TEXT PRIMARY KEY,
        name              TEXT NOT NULL,   -- [E]
        description       TEXT,            -- [E]
        habit_type        TEXT NOT NULL DEFAULT 'build'
                          CHECK (habit_type IN ('build', 'break')),
        frequency         TEXT NOT NULL DEFAULT 'daily'
                          CHECK (frequency IN ('daily', 'weekly', 'biweekly', 'monthly', 'custom')),
        days_of_week      TEXT,            -- JSON array [0-6], 0=Sun
        target_count      INTEGER NOT NULL DEFAULT 1,
        unit              TEXT,            -- [E]
        time_of_day       TEXT DEFAULT 'anytime'
                          CHECK (time_of_day IN ('morning', 'afternoon', 'evening', 'anytime', 'whole_day')),
        times_of_day      TEXT,            -- JSON array for multiple reminder times
        cue               TEXT,            -- [E]
        reward            TEXT,            -- [E]
        domain            TEXT CHECK (domain IN (
                            'health', 'career', 'finance', 'relationships',
                            'personal_growth', 'spiritual', 'recreation', 'environment'
                          )),
        current_streak    INTEGER NOT NULL DEFAULT 0,   -- derived cache (HB-2)
        longest_streak    INTEGER NOT NULL DEFAULT 0,   -- derived cache
        total_completions INTEGER NOT NULL DEFAULT 0,   -- derived cache
        is_active         INTEGER NOT NULL DEFAULT 1,
        sort_order        INTEGER NOT NULL DEFAULT 0,
        measurement_kind  TEXT NOT NULL DEFAULT 'rate'   -- ADR-011 M1 (HB-13 natural)
                          CHECK (measurement_kind IN ('quantitative', 'milestone', 'rate', 'qualitative')),
        binding_mode      TEXT             -- ADR-011 M2; nullable, no default (NULL ⇒ derive event-trigger)
                          CHECK (binding_mode IN ('manual', 'derived-pull', 'event-trigger')),
        success_criteria  TEXT,            -- [E] (G8, restored v1)
        difficulty        TEXT             -- G8 (net-new HABIT_DIFFICULTY)
                          CHECK (difficulty IN ('very_easy', 'easy', 'medium', 'hard', 'very_hard')),
        created_at        INTEGER NOT NULL,
        updated_at        INTEGER NOT NULL,
        deleted_at        INTEGER,
        _sync_id          TEXT NOT NULL UNIQUE,
        _sync_version     INTEGER NOT NULL DEFAULT 1,
        _sync_device_id   TEXT NOT NULL,
        _sync_lww_ts      INTEGER NOT NULL,
        _sync_status      TEXT NOT NULL DEFAULT 'pending',
        _sync_hash        TEXT
      )
    `)
    // partial index (SQL-migration-only — not in the Drizzle mirror)
    await driver.run(
      `CREATE INDEX idx_habits_active ON habits(is_active) WHERE deleted_at IS NULL`,
    )

    // --- habit_completions: per-date ledger (no deleted_at; UNIQUE per habit+date) ---
    await driver.run(`
      CREATE TABLE habit_completions (
        id              TEXT PRIMARY KEY,
        habit_id        TEXT NOT NULL,   -- no FK (was CASCADE; app-layer, HB-11)
        completed_date  TEXT NOT NULL,   -- YYYY-MM-DD
        count           INTEGER NOT NULL DEFAULT 1,
        value           REAL,            -- measured value, e.g. miles run
        mood_before     INTEGER CHECK (mood_before BETWEEN 1 AND 5),
        mood_after      INTEGER CHECK (mood_after BETWEEN 1 AND 5),
        ease_rating     INTEGER CHECK (ease_rating BETWEEN 1 AND 5),
        satisfaction    INTEGER CHECK (satisfaction BETWEEN 1 AND 5),
        location        TEXT,            -- [E] (G8, restored v1)
        completion_time INTEGER,         -- G8; full completion moment (Unix ms)
        created_at      INTEGER NOT NULL,
        updated_at      INTEGER NOT NULL,
        _sync_id        TEXT NOT NULL UNIQUE,
        _sync_version   INTEGER NOT NULL DEFAULT 1,
        _sync_device_id TEXT NOT NULL,
        _sync_lww_ts    INTEGER NOT NULL,
        _sync_status    TEXT NOT NULL DEFAULT 'pending',
        _sync_hash      TEXT,
        UNIQUE (habit_id, completed_date)
      )
    `)
    await driver.run(`CREATE INDEX idx_habit_comp_date ON habit_completions(completed_date)`)

    // --- project_habits: kept junction (synthetic id PK + UNIQUE, entity_tags shape) ---
    await driver.run(`
      CREATE TABLE project_habits (
        id              TEXT PRIMARY KEY,
        project_id      TEXT NOT NULL,   -- no FK (was CASCADE)
        habit_id        TEXT NOT NULL,   -- no FK (was CASCADE)
        created_at      INTEGER NOT NULL,
        updated_at      INTEGER NOT NULL,
        deleted_at      INTEGER,
        _sync_id        TEXT NOT NULL UNIQUE,
        _sync_version   INTEGER NOT NULL DEFAULT 1,
        _sync_device_id TEXT NOT NULL,
        _sync_lww_ts    INTEGER NOT NULL,
        _sync_status    TEXT NOT NULL DEFAULT 'pending',
        _sync_hash      TEXT,
        UNIQUE (project_id, habit_id)
      )
    `)
    await driver.run(`CREATE INDEX idx_project_habits_habit ON project_habits(habit_id)`)
  },
}
