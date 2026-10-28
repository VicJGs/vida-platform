// ============================================================================
// Migration 018 — Routines  (DB-4 · group #7 · the orchestration REFRAME)
// Hand-written SQL DDL (ADR-016 §3.5 — no drizzle-kit). The seventh DB-4 Stream (ii)
// domain migration. Mirrors schema/routines.ts. Authors the REFRAME (design landed
// docs/intake/routines.md §E; DDL = build phase = now), superseding the flat POC
// (`routine_actions` retired → `routine_step`).
//
// ⚠ up() runs INSIDE runMigrations' BEGIN/COMMIT/ROLLBACK wrapper (adapter.ts) —
// it must NOT open its own transaction.
//
// Spec: docs/specs/foundation/db-4-routines/_index.md §P3.
// 3 tables:
//   - routines            (name/description [E]; the named ordered sequence, pursuable)
//   - routine_step        (title/description [E]; polymorphic step, replaces routine_actions)
//   - routine_completions (skip_reason [E]; per-step ledger, re-keyed to routine_step_id)
//
// Conventions: full baseColumns (id·created_at·updated_at·6 _sync_*) on all;
// routine_completions has NO deleted_at (ledger — RT-17). NO cross-table FK — routine_id
// / routine_step_id / entity_id are plain TEXT (no-FK BR-DB3-1; cascade is app/sync,
// RT-17). FIXED enums → SQL CHECK from the tuple: routines.lifecycle (ROUTINE_LIFECYCLE),
// .measurement_kind (MEASUREMENT_KIND — NN DEFAULT 'rate', RT-19 natural), .binding_mode
// (BINDING_MODE — nullable, no default: NULL ⇒ derive derived-pull, ADR-011 §3.2);
// routine_step.time_of_day (ROUTINE_TIME_OF_DAY, nullable). routine_step.step_type is an
// OPEN vocab (user-extensible §E Q1) → plain TEXT, NO CHECK (session sub_type precedent).
// cadence = recurrence_rule RRULE (tasks precedent). NO cached streak / stored progress
// counter (progress nullable override slot, RT-14). Doc-decided boundaries NOT here:
// policy (Preferences/Spaces), membership/step-scoping (Spaces design-pass), Scheduler.
// UNIQUE(routine_step_id, completed_date) (RT-3/RT-18). idx_routines_lifecycle is partial
// (WHERE deleted_at IS NULL) → this migration only.
// ============================================================================

import type { Migration } from '../adapter'

export const migration018Routines: Migration = {
  version: 18,
  name: 'routines',
  up: async (driver) => {
    // --- routines: the named ordered sequence (pursuable) ---
    await driver.run(`
      CREATE TABLE routines (
        id               TEXT PRIMARY KEY,
        name             TEXT NOT NULL,   -- [E]
        description      TEXT,            -- [E]
        recurrence_rule  TEXT,            -- RRULE (broad schedule, RT-11; Scheduler-consumed)
        lifecycle        TEXT NOT NULL DEFAULT 'active'
                         CHECK (lifecycle IN ('active', 'paused', 'off')),
        measurement_kind TEXT NOT NULL DEFAULT 'rate'   -- ADR-011 M1 (RT-19 natural)
                         CHECK (measurement_kind IN ('quantitative', 'milestone', 'rate', 'qualitative')),
        binding_mode     TEXT             -- ADR-011 M2; nullable, no default (NULL ⇒ derive derived-pull)
                         CHECK (binding_mode IN ('manual', 'derived-pull', 'event-trigger')),
        progress         INTEGER,         -- nullable override slot (RT-14 — no cached streak)
        sort_order       INTEGER NOT NULL DEFAULT 0,
        created_at       INTEGER NOT NULL,
        updated_at       INTEGER NOT NULL,
        deleted_at       INTEGER,
        _sync_id         TEXT NOT NULL UNIQUE,
        _sync_version    INTEGER NOT NULL DEFAULT 1,
        _sync_device_id  TEXT NOT NULL,
        _sync_lww_ts     INTEGER NOT NULL,
        _sync_status     TEXT NOT NULL DEFAULT 'pending',
        _sync_hash       TEXT
      )
    `)
    // partial index (SQL-migration-only — not in the Drizzle mirror)
    await driver.run(`CREATE INDEX idx_routines_lifecycle ON routines(lifecycle) WHERE deleted_at IS NULL`)

    // --- routine_step: polymorphic step (replaces routine_actions) ---
    // step_type is an OPEN vocab (NO CHECK); entity_type/entity_id = polymorphic ref.
    await driver.run(`
      CREATE TABLE routine_step (
        id            TEXT PRIMARY KEY,
        routine_id    TEXT,              -- no FK (parent; app-layer cascade, RT-17)
        step_order    INTEGER NOT NULL DEFAULT 0,
        step_type     TEXT,              -- OPEN vocab (user-extensible §E Q1) — NO CHECK
        entity_type   TEXT,              -- polymorphic driven-entity ref (nullable — RT-4)
        entity_id     TEXT,
        is_required   INTEGER NOT NULL DEFAULT 0,   -- required-node policy support (RT-5)
        title         TEXT NOT NULL,     -- [E]
        description   TEXT,              -- [E]
        time_of_day   TEXT               -- nullable
                      CHECK (time_of_day IN ('morning', 'afternoon', 'evening')),
        skip_dates    TEXT,              -- JSON array of YYYY-MM-DD (RT-8 planned skips)
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
    await driver.run(`CREATE INDEX idx_routine_step_routine ON routine_step(routine_id)`)

    // --- routine_completions: per-step ledger (re-keyed to routine_step_id) ---
    await driver.run(`
      CREATE TABLE routine_completions (
        id                      TEXT PRIMARY KEY,
        routine_step_id         TEXT NOT NULL,   -- no FK (was routine_action_id CASCADE; app-layer)
        completed_date          TEXT NOT NULL,   -- YYYY-MM-DD
        completed_at            INTEGER NOT NULL,
        skipped                 INTEGER NOT NULL DEFAULT 0,
        skip_reason             TEXT,            -- [E]
        actual_duration_minutes INTEGER,
        created_at              INTEGER NOT NULL,
        updated_at              INTEGER NOT NULL,
        _sync_id        TEXT NOT NULL UNIQUE,
        _sync_version   INTEGER NOT NULL DEFAULT 1,
        _sync_device_id TEXT NOT NULL,
        _sync_lww_ts    INTEGER NOT NULL,
        _sync_status    TEXT NOT NULL DEFAULT 'pending',
        _sync_hash      TEXT,
        UNIQUE (routine_step_id, completed_date)
      )
    `)
    await driver.run(`CREATE INDEX idx_routine_comp_date ON routine_completions(completed_date)`)
  },
}
