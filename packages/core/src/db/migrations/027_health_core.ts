// ============================================================================
// Migration 027 — Health: Core  (DB-4 · group #17 · ADR-002 additions)
// Hand-written SQL DDL (ADR-016 §3.5 — no drizzle-kit). The 16th DB-4 Stream (ii)
// domain migration. Mirrors schema/health-core.ts. Authors 12 net-new tables (fresh —
// recovered domain, no v2 schema).
//
// ⚠ up() runs INSIDE runMigrations' BEGIN/COMMIT/ROLLBACK wrapper (adapter.ts) —
// it must NOT open its own transaction.
//
// Spec: docs/specs/foundation/db-4-health-core/_index.md §3/§6.
// 12 tables: health_metrics · health_metric_values · health_domains · health_factors ·
// health_exams · assigned_exams · health_goals · physical_roles · health_experiments ·
// health_responses · medical_profile_entries · safety_flags
//
// Conventions:
// - All 12 = full baseColumns (id·created_at·updated_at·6 _sync_*). NO cross-table FK
//   (plain TEXT ids, ADR-016 §3.4).
// - deleted_at on `health_goals` ONLY (the documented floor, structure-data.md:45); the
//   other 11 omit it (entities → status/end_date/phase lifecycle; 4 ledgers → append).
// - FIXED enums → SQL CHECK from the @vida/types tuple (18 columns: 14 net-new + 4 reused
//   MEASUREMENT_KIND/BINDING_MODE/STATUS/FREQUENCY). OPEN columns take NO CHECK.
// - Goal `type` NOT authored (decomposed → measurement_kind × binding_mode, ADR-011 M1/M2).
//   progress/mastery = nullable, no DEFAULT (M3 NULL⇒derive). binding_mode nullable, no default.
// - source enum includes `ai` (AI6). photo_blob = BLOB [E] (inline encrypted binary).
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

export const migration027HealthCore: Migration = {
  version: 27,
  name: 'health_core',
  up: async (driver) => {
    // --- health_metrics: metric definitions (C2 kind taxonomy; M5 read-seam source) ---
    await driver.run(`
      CREATE TABLE health_metrics (
        id          TEXT PRIMARY KEY,
        kind        TEXT NOT NULL CHECK (kind IN (
                      'body-measure', 'performance-capacity', 'test-result', 'biomarker'
                    )),
        name        TEXT NOT NULL,   -- [E]
        unit        TEXT NOT NULL,   -- [E]
        direction   TEXT NOT NULL CHECK (direction IN ('higher-better', 'lower-better')),
        category    TEXT NOT NULL,   -- OPEN no-CHECK
        body_part   TEXT,            -- OPEN no-CHECK; nullable
        side        TEXT CHECK (side IN ('left', 'right', 'bilateral')),
        formula     TEXT,            -- nullable — declares a derived metric
        factor_id   TEXT,            -- no-FK; nullable
        protocol_id TEXT,            -- no-FK; nullable
        catalog_ref TEXT,            -- no-FK; nullable
        ${BASE}
      )
    `)

    // --- health_metric_values: time-series ledger (no deleted_at) ---
    await driver.run(`
      CREATE TABLE health_metric_values (
        id          TEXT PRIMARY KEY,
        metric_id   TEXT NOT NULL,   -- no-FK
        value       REAL NOT NULL,
        recorded_at INTEGER NOT NULL,
        source      TEXT NOT NULL DEFAULT 'manual' CHECK (source IN (
                      'manual', 'photo', 'wearable', 'derived', 'exam', 'import', 'ai'
                    )),
        exam_id     TEXT,            -- no-FK; nullable
        context     TEXT,            -- [E] life-context; nullable
        photo_blob  BLOB,            -- [E] inline encrypted binary; nullable
        ${BASE}
      )
    `)
    await driver.run(`CREATE INDEX idx_health_metric_values_metric ON health_metric_values (metric_id)`)
    await driver.run(`CREATE INDEX idx_health_metric_values_recorded ON health_metric_values (recorded_at)`)

    // --- health_domains: monitoring top level ---
    await driver.run(`
      CREATE TABLE health_domains (
        id          TEXT PRIMARY KEY,
        name        TEXT NOT NULL,   -- [E]
        description TEXT,            -- [E]; nullable
        "order"     INTEGER NOT NULL DEFAULT 0,
        ${BASE}
      )
    `)

    // --- health_factors: measurable sub-indicators ---
    await driver.run(`
      CREATE TABLE health_factors (
        id          TEXT PRIMARY KEY,
        domain_id   TEXT NOT NULL,   -- no-FK
        name        TEXT NOT NULL,   -- [E]
        description TEXT,            -- [E]; nullable
        ${BASE}
      )
    `)
    await driver.run(`CREATE INDEX idx_health_factors_domain ON health_factors (domain_id)`)

    // --- health_exams: user-configured medical exams ---
    await driver.run(`
      CREATE TABLE health_exams (
        id               TEXT PRIMARY KEY,
        name             TEXT NOT NULL,   -- [E]
        kind             TEXT,            -- OPEN no-CHECK (user-configured)
        schedule         TEXT,            -- JSON recurrence
        produces_metrics TEXT,            -- JSON metric_ids
        provider_note    TEXT,            -- [E]; nullable
        ${BASE}
      )
    `)

    // --- assigned_exams: scheduled exam instances (ledger, no deleted_at) ---
    await driver.run(`
      CREATE TABLE assigned_exams (
        id         TEXT PRIMARY KEY,
        exam_id    TEXT NOT NULL,   -- no-FK
        due_date   TEXT NOT NULL,   -- YYYY-MM-DD
        status     TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN (
                     'scheduled', 'due', 'overdue', 'logged', 'skipped'
                   )),
        logged_at  INTEGER,         -- nullable
        ${BASE}
      )
    `)
    await driver.run(`CREATE INDEX idx_assigned_exams_exam ON assigned_exams (exam_id)`)
    await driver.run(`CREATE INDEX idx_assigned_exams_due ON assigned_exams (due_date)`)

    // --- health_goals: the pursuable — the ONLY soft-deleted table (floor L45) ---
    await driver.run(`
      CREATE TABLE health_goals (
        id               TEXT PRIMARY KEY,
        measurement_kind TEXT NOT NULL CHECK (measurement_kind IN (
                           'quantitative', 'milestone', 'rate', 'qualitative'
                         )),
        binding_mode     TEXT CHECK (binding_mode IN ('manual', 'derived-pull', 'event-trigger')),
        title            TEXT NOT NULL,   -- [E]
        description      TEXT,            -- [E]; nullable
        metric_id        TEXT,            -- no-FK; nullable subject
        target_value     REAL,
        unit             TEXT,            -- [E]; nullable
        horizon          TEXT NOT NULL CHECK (horizon IN ('short', 'med', 'long')),
        start_date       TEXT,            -- YYYY-MM-DD; nullable
        target_date      TEXT,            -- YYYY-MM-DD; nullable
        status           TEXT NOT NULL DEFAULT 'not_started' CHECK (status IN (
                           'not_started', 'in_progress', 'completed', 'on_hold', 'cancelled'
                         )),
        progress         REAL,            -- nullable override — NULL ⇒ derive (M3), no DEFAULT
        review_frequency TEXT CHECK (review_frequency IN (
                           'daily', 'weekly', 'biweekly', 'monthly', 'quarterly', 'yearly'
                         )),
        purpose_id       TEXT,            -- no-FK; nullable ladder
        role_id          TEXT,            -- no-FK; nullable subject
        deleted_at       INTEGER,         -- the documented floor — goals ONLY
        ${BASE}
      )
    `)
    await driver.run(`CREATE INDEX idx_health_goals_status ON health_goals (status) WHERE deleted_at IS NULL`)

    // --- physical_roles: the trainable-capability unit ---
    await driver.run(`
      CREATE TABLE physical_roles (
        id                   TEXT PRIMARY KEY,
        name                 TEXT NOT NULL,   -- [E]
        type                 TEXT,            -- OPEN no-CHECK — MODALITY (C1 guard)
        objectives           TEXT,            -- [E]; nullable
        can_do               TEXT,            -- [E]; nullable
        mastery              REAL,            -- nullable override — NULL ⇒ derive (M3/M4), no DEFAULT
        knowledge_subject_id TEXT,            -- no-FK; nullable
        skill_id             TEXT,            -- no-FK; nullable
        exercise_refs        TEXT,            -- JSON
        session_sub_types    TEXT,            -- JSON
        authoring_source     TEXT NOT NULL DEFAULT 'manual' CHECK (authoring_source IN (
                               'manual', 'ai', 'import'
                             )),
        locale_variant       TEXT,            -- nullable
        approach             TEXT,            -- [E]; nullable
        ${BASE}
      )
    `)

    // --- health_experiments: N-of-1 ---
    await driver.run(`
      CREATE TABLE health_experiments (
        id           TEXT PRIMARY KEY,
        name         TEXT NOT NULL,   -- [E]
        pillar       TEXT NOT NULL CHECK (pillar IN ('training', 'nutrition', 'cross')),
        hypothesis   TEXT,            -- [E]; nullable
        type         TEXT,            -- OPEN no-CHECK
        arm_a        TEXT,            -- [E] control; nullable
        arm_b        TEXT,            -- [E] test; nullable
        metrics      TEXT,            -- JSON metric_ids
        duration     INTEGER,         -- day-count; nullable
        phase        TEXT NOT NULL DEFAULT 'A' CHECK (phase IN ('A', 'B', 'analysis', 'done')),
        winner       TEXT,            -- OPEN no-CHECK; nullable
        key_learning TEXT,            -- [E]; nullable
        source       TEXT NOT NULL DEFAULT 'self' CHECK (source IN ('self', 'claim', 'prescription')),
        ${BASE}
      )
    `)

    // --- health_responses: observation logs (ledger, no deleted_at) ---
    await driver.run(`
      CREATE TABLE health_responses (
        id                 TEXT PRIMARY KEY,
        subject_ref        TEXT NOT NULL,   -- poly ref
        energy_response    TEXT,            -- OPEN no-CHECK
        digestion_response TEXT,            -- OPEN no-CHECK
        overall_feeling    TEXT,            -- OPEN no-CHECK
        pattern_type       TEXT,            -- OPEN no-CHECK
        life_context       TEXT,            -- JSON
        notes              TEXT,            -- [E]; nullable
        recorded_at        INTEGER NOT NULL,
        ${BASE}
      )
    `)
    await driver.run(`CREATE INDEX idx_health_responses_recorded ON health_responses (recorded_at)`)

    // --- medical_profile_entries: the fast medical set (module-wide provider) ---
    await driver.run(`
      CREATE TABLE medical_profile_entries (
        id            TEXT PRIMARY KEY,
        kind          TEXT NOT NULL CHECK (kind IN (
                        'condition', 'allergy', 'intolerance', 'injury', 'limitation',
                        'medication', 'supplement', 'prescription', 'clearance', 'contraindication'
                      )),
        label         TEXT NOT NULL,   -- [E]
        severity      TEXT,            -- OPEN no-CHECK; nullable
        status        TEXT,            -- OPEN no-CHECK; nullable
        details       TEXT,            -- [E]; nullable
        affected_refs TEXT,            -- JSON
        source        TEXT NOT NULL DEFAULT 'manual' CHECK (source IN ('manual', 'imported-doctor')),
        start_date    TEXT,            -- YYYY-MM-DD; nullable
        end_date      TEXT,            -- YYYY-MM-DD; nullable (lifecycle, NOT deletion)
        ${BASE}
      )
    `)

    // --- safety_flags: advisory warnings (ledger, no deleted_at) — never blocks ---
    await driver.run(`
      CREATE TABLE safety_flags (
        id         TEXT PRIMARY KEY,
        trigger    TEXT NOT NULL CHECK (trigger IN (
                     'overtraining', 'extreme-deficit', 'rapid-weight-change',
                     'biomarker', 'injury-pattern', 'warning-response'
                   )),
        severity   TEXT,            -- OPEN no-CHECK
        message    TEXT,            -- [E]; nullable
        source_ref TEXT,            -- poly ref; nullable
        raised_at  INTEGER NOT NULL,
        status     TEXT NOT NULL DEFAULT 'active' CHECK (status IN (
                     'active', 'dismissed', 'acknowledged'
                   )),
        ${BASE}
      )
    `)
    await driver.run(`CREATE INDEX idx_safety_flags_status ON safety_flags (status)`)
  },
}
