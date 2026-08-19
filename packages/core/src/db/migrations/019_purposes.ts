// ============================================================================
// Migration 019 — Purpose & Goals  (DB-4 · group #8 · the CAPSTONE · ADR-002 §5.7)
// Hand-written SQL DDL (ADR-016 §3.5 — no drizzle-kit). The eighth DB-4 Stream (ii)
// domain migration. Mirrors schema/purposes.ts. Authors the 6 §5.7 tables NOT in the
// DB-3 substrate (values/contributions/purpose_reviews/plan_steps stay in 007_purpose.ts).
//
// ⚠ up() runs INSIDE runMigrations' BEGIN/COMMIT/ROLLBACK wrapper (adapter.ts) —
// it must NOT open its own transaction.
//
// Spec: docs/specs/foundation/db-4-purposes-and-goals/_index.md §P3.
// 6 tables:
//   - purposes              (title/description/vision/why [E]; rollup apex, no measurement_kind)
//   - targets               (title/description/unit/success_criteria [E]; the pursuable)
//   - purpose_metrics        (name/description/unit [E]; no deleted_at — floor)
//   - purpose_metric_values  (context_notes [E]; ledger, no deleted_at)
//   - target_reviews         (reflection/next_actions [E]; ledger, no deleted_at)
//   - dreams                 (title/description/estimated_cost/location/imagery/steps [E]; absorbs bucket_list_items)
//
// Conventions: full baseColumns (id·created_at·updated_at·6 _sync_*). purposes/targets/dreams
// add deleted_at; purpose_metrics/purpose_metric_values/target_reviews do NOT (floor/ledger).
// NO cross-table FK — purpose_id/value_id/metric_id/target_id/project_id are plain TEXT
// (no-FK BR-DB3-1; SR-003 relaxed → nullable spine joints PG-9; cascade/set-null = app-layer PG-19).
// FIXED enums → SQL CHECK from the @vida/types tuple. measurement_kind/binding_mode land on
// `targets` ONLY (structure-data.md:47; dreams/metrics/purposes omit the pair). measurement_kind
// NN DEFAULT 'quantitative' (floor target_type default); binding_mode nullable no-default
// (NULL ⇒ derive, ADR-011 §3.2). source NN DEFAULT 'manual' (natural for a hand-recorded point).
// progress/current_value/progress_percentage are NULLABLE override slots (PG-4, no counters).
// dreams ABSORBS bucket_list_items (PG-16); inline tags RETIRED → entity_tags. review_frequency
// reuses FREQUENCY. target_reviews.progress_rating = range CHECK 1-10 (not tuple-sourced).
// ============================================================================

import type { Migration } from '../adapter'

export const migration019Purposes: Migration = {
  version: 19,
  name: 'purposes',
  up: async (driver) => {
    // --- purposes: the purpose (rollup apex) ---
    await driver.run(`
      CREATE TABLE purposes (
        id           TEXT PRIMARY KEY,
        title        TEXT NOT NULL,   -- [E]
        description  TEXT,            -- [E]
        vision       TEXT,            -- [E]
        why          TEXT,            -- [E]
        value_id     TEXT,            -- no FK → values (DB-3); nullable (PG-9)
        domain       TEXT CHECK (domain IN (
                       'health', 'career', 'finance', 'relationships',
                       'personal_growth', 'spiritual', 'recreation', 'environment'
                     )),
        status       TEXT NOT NULL DEFAULT 'in_progress'
                     CHECK (status IN ('not_started', 'in_progress', 'completed', 'on_hold', 'cancelled')),
        progress     INTEGER,         -- nullable override slot (was NN DEFAULT 0, PG-4)
        start_date   TEXT,
        target_date  TEXT,
        is_primary   INTEGER NOT NULL DEFAULT 0,
        sort_order   INTEGER NOT NULL DEFAULT 0,
        created_at   INTEGER NOT NULL,
        updated_at   INTEGER NOT NULL,
        deleted_at   INTEGER,
        _sync_id        TEXT NOT NULL UNIQUE,
        _sync_version   INTEGER NOT NULL DEFAULT 1,
        _sync_device_id TEXT NOT NULL,
        _sync_lww_ts    INTEGER NOT NULL,
        _sync_status    TEXT NOT NULL DEFAULT 'pending',
        _sync_hash      TEXT
      )
    `)

    // --- targets (= Goals): the pursuable ---
    await driver.run(`
      CREATE TABLE targets (
        id                 TEXT PRIMARY KEY,
        purpose_id         TEXT,   -- no FK; nullable (SR-003 relaxed, PG-9)
        title              TEXT NOT NULL,   -- [E]
        description        TEXT,            -- [E]
        measurement_kind   TEXT NOT NULL DEFAULT 'quantitative'   -- replaces target_type (ADR-011 M1)
                           CHECK (measurement_kind IN ('quantitative', 'milestone', 'rate', 'qualitative')),
        binding_mode       TEXT             -- ADR-011 M2; nullable, no default (NULL ⇒ derive)
                           CHECK (binding_mode IN ('manual', 'derived-pull', 'event-trigger')),
        target_value       REAL,
        current_value      REAL,            -- nullable override slot (PG-4)
        unit               TEXT,            -- [E]
        success_criteria   TEXT,            -- [E] NEW (PG-11)
        measurement_method TEXT,            -- NEW (PG-11)
        status             TEXT NOT NULL DEFAULT 'not_started'
                           CHECK (status IN ('not_started', 'in_progress', 'completed', 'on_hold', 'cancelled')),
        priority           TEXT NOT NULL DEFAULT 'medium'
                           CHECK (priority IN ('critical', 'high', 'medium', 'low', 'none')),
        start_date         TEXT,
        target_date        TEXT,
        next_review_date   TEXT,
        review_frequency   TEXT DEFAULT 'weekly'   -- reuses FREQUENCY; nullable
                           CHECK (review_frequency IN ('daily', 'weekly', 'biweekly', 'monthly', 'quarterly', 'yearly')),
        sort_order         INTEGER NOT NULL DEFAULT 0,
        created_at         INTEGER NOT NULL,
        updated_at         INTEGER NOT NULL,
        deleted_at         INTEGER,
        _sync_id        TEXT NOT NULL UNIQUE,
        _sync_version   INTEGER NOT NULL DEFAULT 1,
        _sync_device_id TEXT NOT NULL,
        _sync_lww_ts    INTEGER NOT NULL,
        _sync_status    TEXT NOT NULL DEFAULT 'pending',
        _sync_hash      TEXT
      )
    `)
    await driver.run(`CREATE INDEX idx_targets_purpose ON targets(purpose_id)`)

    // --- purpose_metrics: a quantitative metric (NO deleted_at — floor) ---
    await driver.run(`
      CREATE TABLE purpose_metrics (
        id                 TEXT PRIMARY KEY,
        purpose_id         TEXT,   -- no FK
        name               TEXT NOT NULL,   -- [E]
        description        TEXT,            -- [E]
        unit               TEXT,            -- [E]
        target_value       REAL,
        current_value      REAL,
        calculation_method TEXT NOT NULL DEFAULT 'latest'
                           CHECK (calculation_method IN ('sum', 'average', 'latest', 'max', 'min', 'count')),
        is_higher_better   INTEGER,         -- NEW (PG-15); nullable
        baseline_value     REAL,            -- NEW (PG-15)
        created_at         INTEGER NOT NULL,
        updated_at         INTEGER NOT NULL,
        _sync_id        TEXT NOT NULL UNIQUE,
        _sync_version   INTEGER NOT NULL DEFAULT 1,
        _sync_device_id TEXT NOT NULL,
        _sync_lww_ts    INTEGER NOT NULL,
        _sync_status    TEXT NOT NULL DEFAULT 'pending',
        _sync_hash      TEXT
      )
    `)

    // --- purpose_metric_values: the time-series ledger (NO deleted_at) ---
    await driver.run(`
      CREATE TABLE purpose_metric_values (
        id            TEXT PRIMARY KEY,
        metric_id     TEXT NOT NULL,   -- no FK
        value         REAL NOT NULL,
        recorded_at   INTEGER NOT NULL,
        source        TEXT NOT NULL DEFAULT 'manual'   -- NEW (PG-15) provenance
                      CHECK (source IN ('manual', 'auto')),
        context_notes TEXT,            -- [E] NEW (PG-15)
        created_at    INTEGER NOT NULL,
        updated_at    INTEGER NOT NULL,
        _sync_id        TEXT NOT NULL UNIQUE,
        _sync_version   INTEGER NOT NULL DEFAULT 1,
        _sync_device_id TEXT NOT NULL,
        _sync_lww_ts    INTEGER NOT NULL,
        _sync_status    TEXT NOT NULL DEFAULT 'pending',
        _sync_hash      TEXT
      )
    `)
    await driver.run(`CREATE INDEX idx_metric_values_metric ON purpose_metric_values(metric_id)`)

    // --- target_reviews: per-target review ledger (NO deleted_at) ---
    await driver.run(`
      CREATE TABLE target_reviews (
        id              TEXT PRIMARY KEY,
        target_id       TEXT NOT NULL,   -- no FK
        progress_rating INTEGER CHECK (progress_rating BETWEEN 1 AND 10),
        reflection      TEXT,            -- [E]
        next_actions    TEXT,            -- [E]
        reviewed_at     INTEGER NOT NULL,
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

    // --- dreams: the single aspiration entity (absorbs bucket_list_items, PG-16) ---
    await driver.run(`
      CREATE TABLE dreams (
        id                  TEXT PRIMARY KEY,
        title               TEXT NOT NULL,   -- [E]
        description         TEXT,            -- [E]
        domain              TEXT CHECK (domain IN (
                              'health', 'career', 'finance', 'relationships',
                              'personal_growth', 'spiritual', 'recreation', 'environment'
                            )),
        category            TEXT DEFAULT 'other'   -- absorbed
                            CHECK (category IN (
                              'travel', 'adventure', 'career', 'creative', 'education',
                              'financial', 'health', 'relationship', 'spiritual', 'other'
                            )),
        status              TEXT NOT NULL DEFAULT 'dream'   -- absorbed
                            CHECK (status IN ('dream', 'planned', 'in_progress', 'completed', 'abandoned')),
        priority            TEXT NOT NULL DEFAULT 'medium'   -- absorbed
                            CHECK (priority IN ('critical', 'high', 'medium', 'low', 'none')),
        target_age          INTEGER,
        target_date         TEXT,            -- absorbed
        completed_date      TEXT,            -- absorbed
        estimated_cost      INTEGER,         -- [E] cents
        location            TEXT,            -- [E] absorbed
        image_url           TEXT,            -- [E] absorbed
        cover_image_url     TEXT,            -- [E] absorbed
        inspiration_url     TEXT,            -- [E] absorbed
        progress_percentage INTEGER,         -- nullable override slot (was NN DEFAULT 0, PG-4)
        steps               TEXT,            -- [E] absorbed; JSON [{id,text,completed}]
        purpose_id          TEXT,            -- no FK; nullable
        project_id          TEXT,            -- no FK; absorbed
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
    await driver.run(`CREATE INDEX idx_dreams_purpose ON dreams(purpose_id)`)
  },
}
