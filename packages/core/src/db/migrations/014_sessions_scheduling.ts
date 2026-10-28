// ============================================================================
// Migration 014 — Sessions & Scheduling (+Pomodoro)  (DB-4 · group #3 · ADR-004)
// Hand-written SQL DDL (ADR-016 §3.5 — no drizzle-kit). The third DB-4 Stream (ii)
// domain migration. Mirrors schema/foundation/session-extensions.ts + scheduling.ts.
//
// ⚠ up() runs INSIDE runMigrations' BEGIN/COMMIT/ROLLBACK wrapper (adapter.ts) —
// it must NOT open its own transaction.
//
// Spec: docs/specs/foundation/db-4-sessions-and-scheduling/_index.md §P3.
// 6 tables completing the Session framework on the AR-5/AR-7/DB-3 substrate:
//   Extensions (1:1, own id PK + session_id UNIQUE — BR-DB-1 + ADR-004 §3.1/§3.4):
//     - study_sessions   (study sub-type; zero [E])
//     - focus_sessions   (focus sub-type = the timer runtime; zero [E].
//                         pomodoro_sessions is RETIRED into this — notes-and-pages
//                         reframe; entity_type/entity_id/page_id dropped, PD-1/2)
//   Planner (own id PK — §5.11 "redefined not dropped"):
//     - study_availability      (zero [E])
//     - availability_exceptions (reason [E])
//     - study_plan_batches      (name [E]; course_id → scope_type/scope_id, G5; +failed)
//     - session_templates       (name [E], description [E]; focus presets + v1 restores)
//
// Conventions: full baseColumns (id·created_at·updated_at·6 _sync_*) on ALL 6
// (ADR-016 §3.4). NO cross-table FK (no-FK convention; session_id/scope_id/
// resource_id are plain TEXT). NO deleted_at (matches v2 DDL; base sessions owns
// the soft-delete). FIXED enums → SQL CHECK sourced from the @vida/types tuple:
//   study_sessions.resource_type (STUDY_SESSION_RESOURCE_TYPE),
//   focus_sessions.type (POMODORO_TYPE) + .status (POMODORO_STATUS),
//   study_availability.preset_block (PRESET_BLOCK — reused, knowledge.ts),
//   study_plan_batches.status (STUDY_PLAN_BATCH_STATUS + 'failed').
// day_of_week / preference_score are numeric BETWEEN checks (not tuple-sourced).
// ============================================================================

import type { Migration } from '../adapter'

export const migration014SessionsScheduling: Migration = {
  version: 14,
  name: 'sessions_scheduling',
  up: async (driver) => {
    // --- study_sessions: the `study` sub-type 1:1 extension (zero [E]) --------
    // Spine fields (focus_rating/energy_level/distraction_count/key_learnings/
    // started_at/ended_at/duration) live on `sessions` (ADR-004 §3.1) — NOT here.
    await driver.run(`
      CREATE TABLE study_sessions (
        id                TEXT PRIMARY KEY,
        session_id        TEXT NOT NULL UNIQUE,   -- 1:1 key → sessions.id (no FK, ADR-004 §3.4)
        resource_type     TEXT NOT NULL CHECK (resource_type IN (
                            'course', 'book', 'topic', 'homework', 'article', 'video', 'podcast'
                          )),
        resource_id       TEXT NOT NULL,
        pages_read        INTEGER,
        lessons_completed INTEGER,

        created_at        INTEGER NOT NULL,
        updated_at        INTEGER NOT NULL,
        _sync_id          TEXT NOT NULL UNIQUE,
        _sync_version     INTEGER NOT NULL DEFAULT 1,
        _sync_device_id   TEXT NOT NULL,
        _sync_lww_ts      INTEGER NOT NULL,
        _sync_status      TEXT NOT NULL DEFAULT 'pending',
        _sync_hash        TEXT
      )
    `)
    await driver.run(`CREATE INDEX idx_study_sessions_resource ON study_sessions(resource_type, resource_id)`)

    // --- focus_sessions: the `focus` sub-type extension = the timer runtime ----
    // (zero [E]; timer state is structural — pomodoro/conventions.md:35). The
    // retired pomodoro_sessions' columns land here; started_at/ended_at are spine.
    await driver.run(`
      CREATE TABLE focus_sessions (
        id                  TEXT PRIMARY KEY,
        session_id          TEXT NOT NULL UNIQUE,   -- 1:1 key → sessions.id (no FK)
        duration_seconds    INTEGER,
        type                TEXT NOT NULL CHECK (type IN ('focus', 'short_break', 'long_break')),
        status              TEXT NOT NULL DEFAULT 'running'
                            CHECK (status IN ('running', 'paused', 'completed', 'cancelled')),
        completed_count     INTEGER NOT NULL DEFAULT 0,
        -- v1 restores (PD-5/PD-6): real focus = elapsed − paused; interruption capture
        paused_at           INTEGER,
        total_pause_seconds INTEGER NOT NULL DEFAULT 0,
        was_interrupted     INTEGER NOT NULL DEFAULT 0,
        interruption_reason TEXT,

        created_at          INTEGER NOT NULL,
        updated_at          INTEGER NOT NULL,
        _sync_id            TEXT NOT NULL UNIQUE,
        _sync_version       INTEGER NOT NULL DEFAULT 1,
        _sync_device_id     TEXT NOT NULL,
        _sync_lww_ts        INTEGER NOT NULL,
        _sync_status        TEXT NOT NULL DEFAULT 'pending',
        _sync_hash          TEXT
      )
    `)
    await driver.run(`CREATE INDEX idx_focus_sessions_status ON focus_sessions(status)`)

    // --- study_availability: Planner-owned recurring windows (zero [E], SS-9) --
    await driver.run(`
      CREATE TABLE study_availability (
        id                  TEXT PRIMARY KEY,
        day_of_week         INTEGER NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
        start_time          TEXT NOT NULL,     -- HH:MM
        end_time            TEXT NOT NULL,     -- HH:MM
        is_available        INTEGER NOT NULL DEFAULT 1,
        preference_score    INTEGER CHECK (preference_score BETWEEN 1 AND 5),
        preset_block        TEXT CHECK (preset_block IN (
                              'early_morning', 'morning', 'late_morning', 'afternoon',
                              'late_afternoon', 'evening', 'night'
                            )),
        max_session_minutes INTEGER,

        created_at          INTEGER NOT NULL,
        updated_at          INTEGER NOT NULL,
        _sync_id            TEXT NOT NULL UNIQUE,
        _sync_version       INTEGER NOT NULL DEFAULT 1,
        _sync_device_id     TEXT NOT NULL,
        _sync_lww_ts        INTEGER NOT NULL,
        _sync_status        TEXT NOT NULL DEFAULT 'pending',
        _sync_hash          TEXT
      )
    `)

    // --- availability_exceptions: date-specific overrides (reason [E], SS-9) ---
    await driver.run(`
      CREATE TABLE availability_exceptions (
        id              TEXT PRIMARY KEY,
        exception_date  TEXT NOT NULL,        -- YYYY-MM-DD
        is_available    INTEGER NOT NULL,
        reason          TEXT,                 -- [E]
        start_time      TEXT,                 -- HH:MM (if partially available)
        end_time        TEXT,

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

    // --- study_plan_batches: a generated plan batch (name [E]) -----------------
    // scope_type/scope_id widen the plan beyond course (G5); polymorphic, no FK,
    // no CHECK (open target). status gains 'failed' (business-rules.md:89).
    await driver.run(`
      CREATE TABLE study_plan_batches (
        id             TEXT PRIMARY KEY,
        name           TEXT,                  -- [E]
        scope_type     TEXT,                  -- widened beyond course (G5); open, no CHECK, no FK
        scope_id       TEXT,
        status         TEXT NOT NULL DEFAULT 'draft'
                       CHECK (status IN (
                         'draft', 'pending_approval', 'approved', 'active', 'completed', 'failed'
                       )),
        total_sessions INTEGER NOT NULL DEFAULT 0,
        generated_at   INTEGER,
        approved_at    INTEGER,

        created_at     INTEGER NOT NULL,
        updated_at     INTEGER NOT NULL,
        _sync_id       TEXT NOT NULL UNIQUE,
        _sync_version  INTEGER NOT NULL DEFAULT 1,
        _sync_device_id TEXT NOT NULL,
        _sync_lww_ts   INTEGER NOT NULL,
        _sync_status   TEXT NOT NULL DEFAULT 'pending',
        _sync_hash     TEXT
      )
    `)

    // --- session_templates: focus/session presets (name [E], description [E]) --
    // v2 columns + v1 restores (focus_technique/description/notifications/sounds/
    // usage_count/last_used_at — structure-data.md:58); is_default (contract.md:40).
    await driver.run(`
      CREATE TABLE session_templates (
        id                          TEXT PRIMARY KEY,
        name                        TEXT NOT NULL,  -- [E]
        work_minutes                INTEGER NOT NULL DEFAULT 25,
        short_break_minutes         INTEGER NOT NULL DEFAULT 5,
        long_break_minutes          INTEGER NOT NULL DEFAULT 15,
        intervals_before_long_break INTEGER NOT NULL DEFAULT 4,
        auto_start_breaks           INTEGER NOT NULL DEFAULT 1,
        auto_start_work             INTEGER NOT NULL DEFAULT 0,
        is_default                  INTEGER NOT NULL DEFAULT 0,
        -- v1 restores
        focus_technique             TEXT,
        description                 TEXT,           -- [E]
        notifications               INTEGER NOT NULL DEFAULT 1,
        sounds                      INTEGER NOT NULL DEFAULT 1,
        usage_count                 INTEGER NOT NULL DEFAULT 0,
        last_used_at                INTEGER,

        created_at                  INTEGER NOT NULL,
        updated_at                  INTEGER NOT NULL,
        _sync_id                    TEXT NOT NULL UNIQUE,
        _sync_version               INTEGER NOT NULL DEFAULT 1,
        _sync_device_id             TEXT NOT NULL,
        _sync_lww_ts                INTEGER NOT NULL,
        _sync_status                TEXT NOT NULL DEFAULT 'pending',
        _sync_hash                  TEXT
      )
    `)
  },
}
