// ============================================================================
// Migration 024 — Learning: Education (+ICS)  (DB-4 · group #12 · ADR-002 §5.10/§5.18)
// Hand-written SQL DDL (ADR-016 §3.5 — no drizzle-kit). The thirteenth DB-4 Stream (ii)
// domain migration. Mirrors schema/learning.ts. THE Learning hub — the heaviest group.
//
// ⚠ up() runs INSIDE runMigrations' BEGIN/COMMIT/ROLLBACK wrapper (adapter.ts) —
// it must NOT open its own transaction.
//
// Spec: docs/specs/foundation/db-4-learning-education/_index.md §P3.
// 15 tables: subjects · ics_feed_configs · ics_synced_events · institutions · self_taught
//            · programs · curricula · terms · class_sessions (Sessions `class` sub-type)
//            · subject_schedules · grading_systems · grading_components · assessments
//            · subject_documents · education_measurements
//
// Conventions: full baseColumns (id·created_at·updated_at·6 _sync_*). NO FK — every ref is
// plain TEXT (§5.10 REFERENCES/CASCADE superseded, ADR-016 §3.4). FIXED enums → SQL CHECK
// from the @vida/types tuple (15 CHECK cols across 11 net-new + 3 FACT + 2 reused tuples).
// subjects.rating = numeric CHECK BETWEEN 1 AND 5 (not a tuple). Doc-fixed UNIQUEs:
// ics_synced_events(feed_id, uid) [X8 dedup] · subject_schedules(subject_id) [ED-5 one-per].
// subjects.progress DERIVED (nullable, no NOT NULL DEFAULT 0 — the §5.10 anti-signal, M3).
// Inline courses.tags RETIRED → entity_tags.
//
// deleted_at EXCEPTIONS: ics_feed_configs + ics_synced_events (FACT interfaces omit; X8
// add-only / X9 revoke=is_active), class_sessions (session extension — base sessions owns
// lifecycle) and subject_documents (PJ-8 vault, faithful §5.4) carry NO deleted_at.
// class_sessions = 1:1 `class` session extension (own id PK + session_id UNIQUE).
// ============================================================================

import type { Migration } from '../adapter'

export const migration024LearningEducation: Migration = {
  version: 24,
  name: 'learning_education',
  up: async (driver) => {
    // --- subjects: the study unit (= courses reinterpreted) ---
    await driver.run(`
      CREATE TABLE subjects (
        id                TEXT PRIMARY KEY,
        title             TEXT NOT NULL,   -- [E]
        description       TEXT,            -- [E]
        provider          TEXT,            -- [E]
        instructor        TEXT,            -- [E]
        url               TEXT,            -- [E]
        metadata          TEXT,            -- [E] generic slot (v1 college-data superseded)
        course_type       TEXT CHECK (course_type IN ('online', 'in_person', 'hybrid', 'self_paced')),
        status            TEXT NOT NULL
                          CHECK (status IN ('not_started', 'in_progress', 'completed', 'dropped')),
        progress          INTEGER,         -- DERIVED override, nullable (M3)
        total_modules     INTEGER,
        completed_modules INTEGER,
        start_date        TEXT,            -- YYYY-MM-DD
        end_date          TEXT,
        target_completion TEXT,
        estimated_hours   INTEGER,         -- minutes
        rating            INTEGER CHECK (rating BETWEEN 1 AND 5),
        curriculum_id     TEXT,            -- no FK (routing, nullable per A1)
        term_id           TEXT,            -- no FK, nullable
        degree_tier       TEXT CHECK (degree_tier IN ('high_school', 'bachelor', 'master', 'doctorate')),
        created_at        INTEGER NOT NULL,
        updated_at        INTEGER NOT NULL,
        deleted_at        INTEGER,
        _sync_id        TEXT NOT NULL UNIQUE,
        _sync_version   INTEGER NOT NULL DEFAULT 1,
        _sync_device_id TEXT NOT NULL,
        _sync_lww_ts    INTEGER NOT NULL,
        _sync_status    TEXT NOT NULL DEFAULT 'pending',
        _sync_hash      TEXT
      )
    `)
    await driver.run(`CREATE INDEX idx_subjects_curriculum ON subjects(curriculum_id)`)

    // --- ics_feed_configs: calendar feeds (FACT) — NO deleted_at (X9 revoke=is_active) ---
    await driver.run(`
      CREATE TABLE ics_feed_configs (
        id                   TEXT PRIMARY KEY,
        feed_url             TEXT NOT NULL,   -- [E]
        feed_name            TEXT,            -- [E]
        is_active            INTEGER NOT NULL DEFAULT 1,
        auto_create_sessions INTEGER NOT NULL DEFAULT 0,
        default_subject_id   TEXT,            -- no FK
        sync_interval_hours  INTEGER NOT NULL DEFAULT 6,
        last_synced_at       INTEGER,
        last_error           TEXT,            -- [E]
        metadata             TEXT,            -- [E]
        created_at           INTEGER NOT NULL,
        updated_at           INTEGER NOT NULL,
        -- NO deleted_at — a feed is revoked via is_active (X9), not deleted
        _sync_id        TEXT NOT NULL UNIQUE,
        _sync_version   INTEGER NOT NULL DEFAULT 1,
        _sync_device_id TEXT NOT NULL,
        _sync_lww_ts    INTEGER NOT NULL,
        _sync_status    TEXT NOT NULL DEFAULT 'pending',
        _sync_hash      TEXT
      )
    `)

    // --- ics_synced_events: synced events (FACT) — add-only, NO deleted_at (X8) ---
    await driver.run(`
      CREATE TABLE ics_synced_events (
        id                 TEXT PRIMARY KEY,
        feed_id            TEXT NOT NULL,   -- no FK
        uid                TEXT NOT NULL,
        summary            TEXT,            -- [E]
        description        TEXT,            -- [E]
        location           TEXT,            -- [E]
        start_time         INTEGER NOT NULL,
        end_time           INTEGER,
        recurrence_rule    TEXT,
        matched_subject_id TEXT,            -- no FK
        created_session_id TEXT,            -- no FK
        is_ignored         INTEGER NOT NULL DEFAULT 0,
        raw_event          TEXT,            -- [E]
        created_at         INTEGER NOT NULL,
        updated_at         INTEGER NOT NULL,
        -- NO deleted_at — X8 add-only feed (dedup + is_ignored, never delete)
        _sync_id        TEXT NOT NULL UNIQUE,
        _sync_version   INTEGER NOT NULL DEFAULT 1,
        _sync_device_id TEXT NOT NULL,
        _sync_lww_ts    INTEGER NOT NULL,
        _sync_status    TEXT NOT NULL DEFAULT 'pending',
        _sync_hash      TEXT,
        UNIQUE(feed_id, uid)
      )
    `)
    await driver.run(`CREATE INDEX idx_ics_synced_events_feed ON ics_synced_events(feed_id)`)

    // --- institutions: formal parent (ED-2) ---
    await driver.run(`
      CREATE TABLE institutions (
        id          TEXT PRIMARY KEY,
        name        TEXT NOT NULL,   -- [E]
        description TEXT,            -- [E]
        created_at  INTEGER NOT NULL,
        updated_at  INTEGER NOT NULL,
        deleted_at  INTEGER,
        _sync_id        TEXT NOT NULL UNIQUE,
        _sync_version   INTEGER NOT NULL DEFAULT 1,
        _sync_device_id TEXT NOT NULL,
        _sync_lww_ts    INTEGER NOT NULL,
        _sync_status    TEXT NOT NULL DEFAULT 'pending',
        _sync_hash      TEXT
      )
    `)

    // --- self_taught: the self-taught mode container (ED-2/H2) ---
    await driver.run(`
      CREATE TABLE self_taught (
        id          TEXT PRIMARY KEY,
        name        TEXT NOT NULL,   -- [E]
        description TEXT,            -- [E]
        created_at  INTEGER NOT NULL,
        updated_at  INTEGER NOT NULL,
        deleted_at  INTEGER,
        _sync_id        TEXT NOT NULL UNIQUE,
        _sync_version   INTEGER NOT NULL DEFAULT 1,
        _sync_device_id TEXT NOT NULL,
        _sync_lww_ts    INTEGER NOT NULL,
        _sync_status    TEXT NOT NULL DEFAULT 'pending',
        _sync_hash      TEXT
      )
    `)

    // --- programs: the pursuit (ED-2) ---
    await driver.run(`
      CREATE TABLE programs (
        id          TEXT PRIMARY KEY,
        parent_type TEXT NOT NULL CHECK (parent_type IN ('institution', 'self_taught')),
        parent_id   TEXT NOT NULL,   -- no FK
        name        TEXT NOT NULL,   -- [E]
        description TEXT,            -- [E]
        created_at  INTEGER NOT NULL,
        updated_at  INTEGER NOT NULL,
        deleted_at  INTEGER,
        _sync_id        TEXT NOT NULL UNIQUE,
        _sync_version   INTEGER NOT NULL DEFAULT 1,
        _sync_device_id TEXT NOT NULL,
        _sync_lww_ts    INTEGER NOT NULL,
        _sync_status    TEXT NOT NULL DEFAULT 'pending',
        _sync_hash      TEXT
      )
    `)
    await driver.run(`CREATE INDEX idx_programs_parent ON programs(parent_type, parent_id)`)

    // --- curricula: the shaped plan, forkable (ED-11) ---
    await driver.run(`
      CREATE TABLE curricula (
        id             TEXT PRIMARY KEY,
        program_id     TEXT NOT NULL,   -- no FK
        name           TEXT NOT NULL,   -- [E]
        description    TEXT,            -- [E]
        forked_from_id TEXT,            -- no FK, nullable (lineage, ED-11)
        is_template    INTEGER NOT NULL DEFAULT 0,
        created_at     INTEGER NOT NULL,
        updated_at     INTEGER NOT NULL,
        deleted_at     INTEGER,
        _sync_id        TEXT NOT NULL UNIQUE,
        _sync_version   INTEGER NOT NULL DEFAULT 1,
        _sync_device_id TEXT NOT NULL,
        _sync_lww_ts    INTEGER NOT NULL,
        _sync_status    TEXT NOT NULL DEFAULT 'pending',
        _sync_hash      TEXT
      )
    `)
    await driver.run(`CREATE INDEX idx_curricula_program ON curricula(program_id)`)

    // --- terms: hierarchical time containers (ED-12) ---
    await driver.run(`
      CREATE TABLE terms (
        id             TEXT PRIMARY KEY,
        curriculum_id  TEXT NOT NULL,   -- no FK
        level          TEXT NOT NULL CHECK (level IN ('year', 'semester', 'term')),
        parent_term_id TEXT,            -- no FK, nullable (year ⊃ semester ⊃ term)
        name           TEXT NOT NULL,   -- [E]
        start_date     TEXT,            -- YYYY-MM-DD
        end_date       TEXT,
        created_at     INTEGER NOT NULL,
        updated_at     INTEGER NOT NULL,
        deleted_at     INTEGER,
        _sync_id        TEXT NOT NULL UNIQUE,
        _sync_version   INTEGER NOT NULL DEFAULT 1,
        _sync_device_id TEXT NOT NULL,
        _sync_lww_ts    INTEGER NOT NULL,
        _sync_status    TEXT NOT NULL DEFAULT 'pending',
        _sync_hash      TEXT
      )
    `)
    await driver.run(`CREATE INDEX idx_terms_curriculum ON terms(curriculum_id)`)

    // --- class_sessions: `class` Session sub-type (1:1 extension) — NO deleted_at ---
    await driver.run(`
      CREATE TABLE class_sessions (
        id              TEXT PRIMARY KEY,
        session_id      TEXT NOT NULL UNIQUE,   -- 1:1 key → sessions.id (no FK)
        subject_id      TEXT NOT NULL,          -- no FK
        schedule_id     TEXT,                   -- no FK, nullable
        source_event_id TEXT,                   -- no FK, nullable
        location        TEXT,                   -- [E]
        created_at      INTEGER NOT NULL,
        updated_at      INTEGER NOT NULL,
        -- NO deleted_at — session extension; base sessions owns lifecycle
        _sync_id        TEXT NOT NULL UNIQUE,
        _sync_version   INTEGER NOT NULL DEFAULT 1,
        _sync_device_id TEXT NOT NULL,
        _sync_lww_ts    INTEGER NOT NULL,
        _sync_status    TEXT NOT NULL DEFAULT 'pending',
        _sync_hash      TEXT
      )
    `)
    await driver.run(`CREATE INDEX idx_class_sessions_subject ON class_sessions(subject_id)`)

    // --- subject_schedules: the single schedule source (ED-5) — one per subject ---
    await driver.run(`
      CREATE TABLE subject_schedules (
        id         TEXT PRIMARY KEY,
        subject_id TEXT NOT NULL,   -- no FK
        source     TEXT NOT NULL CHECK (source IN ('ics', 'document', 'manual')),
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL,
        deleted_at INTEGER,
        _sync_id        TEXT NOT NULL UNIQUE,
        _sync_version   INTEGER NOT NULL DEFAULT 1,
        _sync_device_id TEXT NOT NULL,
        _sync_lww_ts    INTEGER NOT NULL,
        _sync_status    TEXT NOT NULL DEFAULT 'pending',
        _sync_hash      TEXT,
        UNIQUE(subject_id)
      )
    `)

    // --- grading_systems: the grading builder (ED-7) ---
    await driver.run(`
      CREATE TABLE grading_systems (
        id          TEXT PRIMARY KEY,
        scope       TEXT NOT NULL CHECK (scope IN ('institution', 'program', 'subject')),
        scope_id    TEXT NOT NULL,   -- no FK
        name        TEXT NOT NULL,   -- [E]
        description TEXT,            -- [E]
        scale_type  TEXT NOT NULL CHECK (scale_type IN ('letter', 'numeric', 'pass_fail', 'custom')),
        scale_config TEXT,           -- [E] custom scale (JSON-as-text)
        created_at  INTEGER NOT NULL,
        updated_at  INTEGER NOT NULL,
        deleted_at  INTEGER,
        _sync_id        TEXT NOT NULL UNIQUE,
        _sync_version   INTEGER NOT NULL DEFAULT 1,
        _sync_device_id TEXT NOT NULL,
        _sync_lww_ts    INTEGER NOT NULL,
        _sync_status    TEXT NOT NULL DEFAULT 'pending',
        _sync_hash      TEXT
      )
    `)
    await driver.run(`CREATE INDEX idx_grading_systems_scope ON grading_systems(scope, scope_id)`)

    // --- grading_components: weighted component template (ED-7) ---
    await driver.run(`
      CREATE TABLE grading_components (
        id                TEXT PRIMARY KEY,
        grading_system_id TEXT NOT NULL,   -- no FK
        component_type    TEXT NOT NULL
                          CHECK (component_type IN ('homework', 'task', 'exam', 'quiz', 'test', 'presentation', 'work')),
        name              TEXT,            -- [E]
        weight            INTEGER,         -- BasisPoints, nullable
        max_points        INTEGER,         -- nullable
        created_at        INTEGER NOT NULL,
        updated_at        INTEGER NOT NULL,
        deleted_at        INTEGER,
        _sync_id        TEXT NOT NULL UNIQUE,
        _sync_version   INTEGER NOT NULL DEFAULT 1,
        _sync_device_id TEXT NOT NULL,
        _sync_lww_ts    INTEGER NOT NULL,
        _sync_status    TEXT NOT NULL DEFAULT 'pending',
        _sync_hash      TEXT
      )
    `)
    await driver.run(`CREATE INDEX idx_grading_components_system ON grading_components(grading_system_id)`)

    // --- assessments: subject-attached (ED-8) ---
    await driver.run(`
      CREATE TABLE assessments (
        id                   TEXT PRIMARY KEY,
        subject_id           TEXT NOT NULL,   -- no FK
        type                 TEXT NOT NULL
                             CHECK (type IN ('exam', 'quiz', 'test', 'presentation', 'work')),
        grading_component_id TEXT,            -- no FK, nullable
        title                TEXT,            -- [E]
        description          TEXT,            -- [E]
        date                 TEXT,            -- YYYY-MM-DD
        weight               INTEGER,         -- BasisPoints, nullable
        max_points           INTEGER,         -- nullable
        modality             TEXT CHECK (modality IN ('online', 'in_person')),
        score                INTEGER,         -- result; grade derives via the system (no range CHECK, F6)
        source               TEXT NOT NULL DEFAULT 'manual'
                             CHECK (source IN ('manual', 'ai', 'import')),
        created_at           INTEGER NOT NULL,
        updated_at           INTEGER NOT NULL,
        deleted_at           INTEGER,
        _sync_id        TEXT NOT NULL UNIQUE,
        _sync_version   INTEGER NOT NULL DEFAULT 1,
        _sync_device_id TEXT NOT NULL,
        _sync_lww_ts    INTEGER NOT NULL,
        _sync_status    TEXT NOT NULL DEFAULT 'pending',
        _sync_hash      TEXT
      )
    `)
    await driver.run(`CREATE INDEX idx_assessments_subject ON assessments(subject_id)`)
    await driver.run(`CREATE INDEX idx_assessments_type ON assessments(type)`)

    // --- subject_documents: the per-subject vault (ED-13, PJ-8) — NO deleted_at ---
    await driver.run(`
      CREATE TABLE subject_documents (
        id             TEXT PRIMARY KEY,
        subject_id     TEXT NOT NULL,   -- no FK
        title          TEXT NOT NULL,   -- [E]
        description    TEXT,            -- [E]
        doc_type       TEXT,            -- OPEN vocab (syllabus/schedule/material) — no CHECK
        encrypted_blob BLOB,            -- inline small, nullable
        storage_ref    TEXT,            -- R2 ref for large, nullable
        created_at     INTEGER NOT NULL,
        updated_at     INTEGER NOT NULL,
        -- NO deleted_at — the project_documents/PJ-8 vault pattern (faithful §5.4)
        _sync_id        TEXT NOT NULL UNIQUE,
        _sync_version   INTEGER NOT NULL DEFAULT 1,
        _sync_device_id TEXT NOT NULL,
        _sync_lww_ts    INTEGER NOT NULL,
        _sync_status    TEXT NOT NULL DEFAULT 'pending',
        _sync_hash      TEXT
      )
    `)

    // --- education_measurements: Education-forged measure entity (ED-10) ---
    await driver.run(`
      CREATE TABLE education_measurements (
        id               TEXT PRIMARY KEY,
        ref_type         TEXT NOT NULL CHECK (ref_type IN ('subject', 'program')),
        ref_id           TEXT NOT NULL,   -- no FK
        measurement_kind TEXT NOT NULL
                         CHECK (measurement_kind IN ('quantitative', 'milestone', 'rate', 'qualitative')),
        binding_mode     TEXT CHECK (binding_mode IN ('manual', 'derived-pull', 'event-trigger')),
        progress         INTEGER,         -- DERIVED override, nullable (M3)
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
    await driver.run(`CREATE INDEX idx_education_measurements_ref ON education_measurements(ref_type, ref_id)`)
  },
}
