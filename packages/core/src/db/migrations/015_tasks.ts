// ============================================================================
// Migration 015 — Tasks  (DB-4 · group #4 · ADR-002 §5.3)
// Hand-written SQL DDL (ADR-016 §3.5 — no drizzle-kit). The fourth DB-4 Stream (ii)
// domain migration. Mirrors schema/tasks.ts.
//
// ⚠ up() runs INSIDE runMigrations' BEGIN/COMMIT/ROLLBACK wrapper (adapter.ts) —
// it must NOT open its own transaction.
//
// Spec: docs/specs/foundation/db-4-tasks/_index.md §P3.
// 2 tables (the task + its time ledger), the OS-wide task primitive + aggregator:
//   - tasks           (title/description [E]; the aggregator with 5 parent refs)
//   - task_time_logs  (zero [E]; the time ledger, written by the log_time S4 effect)
//
// Conventions: full baseColumns (id·created_at·updated_at·6 _sync_*) on both
// (ADR-016 §3.4). NO cross-table FK — the §5.3 parent FKs + self-ref CASCADE +
// task_time_logs.task_id CASCADE become plain TEXT (no-FK convention BR-DB3-1;
// cascade/set-null is the app/sync layer's, TK-4). FIXED enums → SQL CHECK sourced
// from the @vida/types tuple:
//   tasks.status (STATUS), .priority (PRIORITY), .difficulty (TASK_DIFFICULTY),
//   .kind (TASK_KIND — net-new), .measurement_kind (MEASUREMENT_KIND),
//   .binding_mode (BINDING_MODE — nullable, no default: NULL ⇒ derive-natural,
//   ADR-011 §3.2 override-slot grain).
// INTENDED build-phase columns (author now, [[build-phase-flags-mean-resolve-now-not-defer]]):
//   completed_at (G5) · scheduled_date (G6) · kind + recurrence_rule (G8, RRULE) ·
//   measurement_kind/binding_mode (ADR-011 M1/M2) · nesting_weight (ADR-011 §3.3 M4).
// Inline `tasks.tags` is RETIRED → entity_tags (TK-8, `entity_type='task'`).
// task_time_logs has NO deleted_at (ledger; hard-deletes with the task, §5.3).
// Partial indexes on (status)/(due_date) are SQL-migration-only (the notes.ts precedent).
// ============================================================================

import type { Migration } from '../adapter'

export const migration015Tasks: Migration = {
  version: 15,
  name: 'tasks',
  up: async (driver) => {
    // --- tasks: the task (title/description [E]; aggregator w/ 5 parent refs) ---
    await driver.run(`
      CREATE TABLE tasks (
        id                TEXT PRIMARY KEY,
        project_id        TEXT,   -- no FK (no-FK convention; was REFERENCES projects SET NULL)
        milestone_id      TEXT,   -- no FK
        course_id         TEXT,   -- no FK
        contact_id        TEXT,   -- no FK
        parent_task_id    TEXT,   -- self-ref, no FK (was CASCADE; app-layer, TK-4)
        title             TEXT NOT NULL,   -- [E]
        description       TEXT,            -- [E]
        status            TEXT NOT NULL DEFAULT 'not_started'
                          CHECK (status IN (
                            'not_started', 'in_progress', 'completed', 'on_hold', 'cancelled'
                          )),
        priority          TEXT NOT NULL DEFAULT 'medium'
                          CHECK (priority IN ('critical', 'high', 'medium', 'low', 'none')),
        difficulty        TEXT DEFAULT 'medium'
                          CHECK (difficulty IN ('trivial', 'easy', 'medium', 'hard', 'expert')),
        due_date          TEXT,            -- YYYY-MM-DD
        scheduled_date    TEXT,            -- YYYY-MM-DD (INTENDED G6; distinct from due_date)
        estimated_minutes INTEGER,
        actual_minutes    INTEGER,         -- derived: SUM(task_time_logs.duration_minutes), TK-5
        completed_at      INTEGER,         -- INTENDED G5; set on status→completed (TK-6)
        kind              TEXT NOT NULL DEFAULT 'standard'
                          CHECK (kind IN ('standard', 'obligation')),   -- INTENDED G8
        recurrence_rule   TEXT,            -- INTENDED G8; RRULE (obligations only, TK-7)
        measurement_kind  TEXT NOT NULL DEFAULT 'milestone'
                          CHECK (measurement_kind IN (
                            'quantitative', 'milestone', 'rate', 'qualitative'
                          )),               -- ADR-011 M1; natural = milestone
        binding_mode      TEXT
                          CHECK (binding_mode IN (
                            'manual', 'derived-pull', 'event-trigger'
                          )),               -- ADR-011 M2; nullable (NULL ⇒ derive-natural)
        nesting_weight    INTEGER,         -- ADR-011 §3.3 M4; NULL ⇒ equal-weight
        sort_order        INTEGER NOT NULL DEFAULT 0,

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
    // Query indexes per parent ref (aggregation entry points from parent modules).
    await driver.run(`CREATE INDEX idx_tasks_project ON tasks(project_id)`)
    await driver.run(`CREATE INDEX idx_tasks_milestone ON tasks(milestone_id)`)
    await driver.run(`CREATE INDEX idx_tasks_course ON tasks(course_id)`)
    await driver.run(`CREATE INDEX idx_tasks_contact ON tasks(contact_id)`)
    await driver.run(`CREATE INDEX idx_tasks_parent ON tasks(parent_task_id)`)
    // Partial indexes (SQL-migration-only; the mirror declares plain indexes only).
    await driver.run(`CREATE INDEX idx_tasks_status ON tasks(status) WHERE deleted_at IS NULL`)
    await driver.run(`CREATE INDEX idx_tasks_due ON tasks(due_date) WHERE deleted_at IS NULL`)

    // --- task_time_logs: the time ledger (zero [E]; no deleted_at — ledger) ----
    // The log_time S4 effect (ADR-004) writes these; actual_minutes derives from them.
    await driver.run(`
      CREATE TABLE task_time_logs (
        id               TEXT PRIMARY KEY,
        task_id          TEXT NOT NULL,   -- no FK (was CASCADE; app-layer, TK-4)
        start_time       INTEGER NOT NULL,
        end_time         INTEGER,         -- NULL = running
        duration_minutes INTEGER,

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
    await driver.run(`CREATE INDEX idx_time_logs_task ON task_time_logs(task_id)`)
  },
}
