// ============================================================================
// Migration 016 — Projects  (DB-4 · group #5 · ADR-002 §5.4)
// Hand-written SQL DDL (ADR-016 §3.5 — no drizzle-kit). The fifth DB-4 Stream (ii)
// domain migration. Mirrors schema/projects.ts.
//
// ⚠ up() runs INSIDE runMigrations' BEGIN/COMMIT/ROLLBACK wrapper (adapter.ts) —
// it must NOT open its own transaction.
//
// Spec: docs/specs/foundation/db-4-projects/_index.md §P3.
// 4 tables (the four-level hierarchy + document vault):
//   - projects           (title/description/vision [E]; the top-level project)
//   - milestones         (title/description [E]; nestable via parent_milestone_id)
//   - deliverables       (title/description [E]; INTENDED G2 — the ADR-011 pursuable)
//   - project_documents  (name + encrypted_blob [E]; the secure vault)
//
// Conventions: full baseColumns (id·created_at·updated_at·6 _sync_*) on all;
// project_documents has NO deleted_at (faithful §5.4 — hard-deletes w/ the project).
// NO cross-table FK — §5.4's project→milestone/document CASCADE + milestone SET-NULL
// + self-ref become plain TEXT (no-FK convention BR-DB3-1; cascade/reparent is the
// app/sync layer's, PJ-9). FIXED enums → SQL CHECK sourced from the @vida/types tuple:
//   projects.scope (PROJECT_SCOPE), .complexity (PROJECT_COMPLEXITY), .status (STATUS),
//   .priority (PRIORITY); milestones.status (STATUS); deliverables.measurement_kind
//   (MEASUREMENT_KIND), .binding_mode (BINDING_MODE — nullable, no default: NULL ⇒
//   derive, ADR-011 §3.2 override-slot grain).
// `progress` is a NULLABLE override slot on projects/milestones/deliverables (was
// NOT NULL DEFAULT 0; ADR-011 §3.2/§3.4). `nesting_weight` (ADR-011 §3.3 M4) on the
// rollup children (milestones, deliverables), NOT projects (top-level).
// measurement_kind/binding_mode land on deliverables ONLY (its measure varies;
// projects/milestones are pure rollups w/ implicit 'milestone' — structure-data.md PJ-4).
// Inline `projects.tags` RETIRED → entity_tags (PJ-12, `entity_type='project'`).
// idx_projects_status is partial (WHERE deleted_at IS NULL) → SQL-migration-only.
// ============================================================================

import type { Migration } from '../adapter'

export const migration016Projects: Migration = {
  version: 16,
  name: 'projects',
  up: async (driver) => {
    // --- projects: the project (title/description/vision [E]) ---
    await driver.run(`
      CREATE TABLE projects (
        id               TEXT PRIMARY KEY,
        title            TEXT NOT NULL,   -- [E]
        description      TEXT,            -- [E]
        vision           TEXT,            -- [E] one-line summary (guiding vision is a page, PJ-7)
        scope            TEXT DEFAULT 'personal'
                         CHECK (scope IN ('personal', 'professional', 'academic', 'community')),
        complexity       TEXT DEFAULT 'moderate'
                         CHECK (complexity IN ('simple', 'moderate', 'complex', 'enterprise')),
        status           TEXT NOT NULL DEFAULT 'not_started'
                         CHECK (status IN (
                           'not_started', 'in_progress', 'completed', 'on_hold', 'cancelled'
                         )),
        priority         TEXT NOT NULL DEFAULT 'medium'
                         CHECK (priority IN ('critical', 'high', 'medium', 'low', 'none')),
        progress         INTEGER,         -- 0-100 nullable override slot (NULL ⇒ derive, ADR-011 §3.2)
        start_date       TEXT,            -- YYYY-MM-DD
        target_end_date  TEXT,
        actual_end_date  TEXT,
        estimated_hours  INTEGER,         -- minutes (despite name)
        actual_hours     INTEGER,         -- minutes; derived from task focus (PJ-6)
        color            TEXT,
        icon             TEXT,
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
    await driver.run(
      `CREATE INDEX idx_projects_status ON projects(status) WHERE deleted_at IS NULL`,
    )

    // --- milestones: milestone (nestable via parent_milestone_id) ---
    await driver.run(`
      CREATE TABLE milestones (
        id                  TEXT PRIMARY KEY,
        project_id          TEXT,   -- no FK (was CASCADE; app-layer, PJ-9)
        parent_milestone_id TEXT,   -- self-ref, no FK (was SET NULL)
        title               TEXT NOT NULL,   -- [E]
        description         TEXT,            -- [E]
        status              TEXT NOT NULL DEFAULT 'not_started'
                            CHECK (status IN (
                              'not_started', 'in_progress', 'completed', 'on_hold', 'cancelled'
                            )),
        progress            INTEGER,         -- nullable override slot
        nesting_weight      INTEGER,         -- ADR-011 §3.3 M4; NULL ⇒ equal-weight
        due_date            TEXT,            -- YYYY-MM-DD
        sort_order          INTEGER NOT NULL DEFAULT 0,
        created_at          INTEGER NOT NULL,
        updated_at          INTEGER NOT NULL,
        deleted_at          INTEGER,
        _sync_id            TEXT NOT NULL UNIQUE,
        _sync_version       INTEGER NOT NULL DEFAULT 1,
        _sync_device_id     TEXT NOT NULL,
        _sync_lww_ts        INTEGER NOT NULL,
        _sync_status        TEXT NOT NULL DEFAULT 'pending',
        _sync_hash          TEXT
      )
    `)
    await driver.run(`CREATE INDEX idx_milestones_project ON milestones(project_id)`)

    // --- deliverables: the ADR-011 pursuable level (INTENDED G2) ---
    await driver.run(`
      CREATE TABLE deliverables (
        id               TEXT PRIMARY KEY,
        milestone_id     TEXT,   -- no FK (parent; app-layer reparent/cascade)
        title            TEXT NOT NULL,   -- [E]
        description      TEXT,            -- [E]
        measurement_kind TEXT NOT NULL DEFAULT 'milestone'
                         CHECK (measurement_kind IN (
                           'quantitative', 'milestone', 'rate', 'qualitative'
                         )),
        binding_mode     TEXT             -- nullable, no default (NULL ⇒ derive, ADR-011 §3.2)
                         CHECK (binding_mode IN ('manual', 'derived-pull', 'event-trigger')),
        progress         INTEGER,         -- nullable override slot
        nesting_weight   INTEGER,         -- ADR-011 §3.3 M4; NULL ⇒ equal-weight
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
    await driver.run(`CREATE INDEX idx_deliverables_milestone ON deliverables(milestone_id)`)

    // --- project_documents: secure vault (name + encrypted_blob [E]) ---
    // NO deleted_at, NO index (faithful to §5.4).
    await driver.run(`
      CREATE TABLE project_documents (
        id              TEXT PRIMARY KEY,
        project_id      TEXT,   -- no FK (was CASCADE)
        milestone_id    TEXT,   -- no FK (was SET NULL)
        name            TEXT NOT NULL,   -- [E]
        file_type       TEXT,
        file_size       INTEGER,
        encrypted_blob  BLOB,            -- [E] nullable (large files → R2 seam)
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
  },
}
