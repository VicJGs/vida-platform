// ============================================================================
// Domain tables: Projects (DB-4 · group #5) — ADR-002 §5.4
//
// The four-level project hierarchy (Project > Milestone > Deliverable > Task) +
// a confidential document vault. `projects`/`milestones`/`project_documents` are
// the §5.4 FACT floor; `deliverables` is the build-phase INTENDED addition (G2) —
// the real level between milestones and tasks, an ADR-011 pursuable
// ([[build-phase-flags-mean-resolve-now-not-defer]]).
//
// DDL model (ADR-016 §3.5): CHECK + the partial index live in the hand-written SQL
// migration (migrations/016_projects.ts). These Drizzle objects are only the
// type-safe QUERY mirror — `enumText` gives the TS union, not a SQL CHECK.
//
// Shape (spec docs/specs/foundation/db-4-projects/):
// - NO hard cross-table FK, self-ref included (no-FK convention; project→milestone/
//   document cascade + milestone SET-NULL/reparent are the app/sync layer's, PJ-9).
// - `progress` is a NULLABLE override slot on projects/milestones/deliverables
//   (NULL ⇒ derive via progress() on-read, ADR-011 §3.2/§3.4 — never NOT NULL
//   DEFAULT 0). `nesting_weight` (ADR-011 §3.3 M4, NULL ⇒ equal) on the rollup
//   CHILDREN (milestones, deliverables); NOT on projects (top-level; the UP ladder
//   to purpose uses contributions.contribution_percentage).
// - measurement_kind/binding_mode land on `deliverables` ONLY (its measure varies —
//   financial/task-stat/artifact/…); projects/milestones are pure rollups with an
//   implicit 'milestone' kind (structure-data.md PJ-4; the module doc is the DB-4
//   roster). measurement_kind NN DEFAULT 'milestone' (doc-licensed natural);
//   binding_mode nullable, no default (NULL ⇒ derive, ADR-011 §3.2 override grain).
// - Inline tags RETIRED → entity_tags (`entity_type='project'`, PJ-12/G11); notes +
//   vision/mission are pages (`entity_type` ∈ project/milestone/deliverable — G3/G10;
//   mission is a page, not a column). No project_contacts/project_habits/events here
//   (partner-domain-owned boundaries).
// - project_documents: `...baseColumns` only (has updated_at, NO deleted_at — faithful
//   §5.4); `encrypted_blob` is NULLABLE BLOB (§5.4 L1639); NO index (§5.4 declares none).
//
// @vida/types interface reconcile (Project progress→nullable & −tags; Milestone
// +nesting_weight & progress→nullable; new Deliverable) → DB-11 (mirror-only now;
// group #1/#3/#4 precedent). No $inferSelect↔interface assertion exists → compiles.
//
// M1.0 encryption (BR-DB6-3): the [E] fields are the M3 target — the Repository
// registers an EMPTY [E] set in M1.0 (pass-through).
// ============================================================================

import { sqliteTable, text, integer, index, blob } from 'drizzle-orm/sqlite-core'
import { STATUS, PRIORITY, PROJECT_SCOPE, PROJECT_COMPLEXITY, MEASUREMENT_KIND, BINDING_MODE } from '@vida/types'
import { baseColumns, enumText, calendarDate } from './_shared'

// --- projects: the project — ADR-002 §5.4 -----------------------------------
export const projects = sqliteTable(
  'projects',
  {
    ...baseColumns,
    /** @encrypted [E] — user content (M3 target; M1.0 pass-through) */
    title: text('title').notNull(),
    /** @encrypted [E] */
    description: text('description'),
    /** @encrypted [E] — one-line summary; the guiding vision is a page (PJ-7) */
    vision: text('vision'),
    scope: enumText('scope', PROJECT_SCOPE).default('personal'), // FIXED → SQL CHECK
    complexity: enumText('complexity', PROJECT_COMPLEXITY).default('moderate'), // FIXED → SQL CHECK
    status: enumText('status', STATUS).notNull().default('not_started'), // FIXED → SQL CHECK
    priority: enumText('priority', PRIORITY).notNull().default('medium'), // FIXED → SQL CHECK
    progress: integer('progress'), // 0-100 nullable override slot (NULL ⇒ derive, ADR-011 §3.2)
    start_date: calendarDate('start_date'), // YYYY-MM-DD
    target_end_date: calendarDate('target_end_date'),
    actual_end_date: calendarDate('actual_end_date'),
    estimated_hours: integer('estimated_hours'), // in minutes (despite name)
    actual_hours: integer('actual_hours'), // minutes; derived from task focus (PJ-6)
    color: text('color'),
    icon: text('icon'),
    deleted_at: integer('deleted_at'),
    // NOTE: inline `tags` RETIRED → entity_tags (PJ-12/G11).
  },
  () => [
    // NOTE: idx_projects_status (partial, WHERE deleted_at IS NULL) is SQL-migration-only.
  ],
)

// --- milestones: milestone (nestable) — ADR-002 §5.4 ------------------------
export const milestones = sqliteTable(
  'milestones',
  {
    ...baseColumns,
    project_id: text('project_id'), // no FK (was CASCADE; app-layer, PJ-9)
    parent_milestone_id: text('parent_milestone_id'), // self-ref, no FK (was SET NULL)
    /** @encrypted [E] */
    title: text('title').notNull(),
    /** @encrypted [E] */
    description: text('description'),
    status: enumText('status', STATUS).notNull().default('not_started'), // FIXED → SQL CHECK
    progress: integer('progress'), // nullable override slot
    nesting_weight: integer('nesting_weight'), // ADR-011 §3.3 M4; NULL ⇒ equal-weight
    due_date: calendarDate('due_date'), // YYYY-MM-DD
    sort_order: integer('sort_order').notNull().default(0),
    deleted_at: integer('deleted_at'),
  },
  (t) => [index('idx_milestones_project').on(t.project_id)],
)

// --- deliverables: the pursuable level (INTENDED G2) — ADR-011 §3.1/§3.4/§3.5 --
export const deliverables = sqliteTable(
  'deliverables',
  {
    ...baseColumns,
    milestone_id: text('milestone_id'), // no FK (parent; app-layer reparent/cascade)
    /** @encrypted [E] */
    title: text('title').notNull(),
    /** @encrypted [E] */
    description: text('description'),
    measurement_kind: enumText('measurement_kind', MEASUREMENT_KIND).notNull().default('milestone'), // ADR-011 M1
    binding_mode: enumText('binding_mode', BINDING_MODE), // ADR-011 M2; nullable, no default (NULL ⇒ derive)
    progress: integer('progress'), // nullable override slot
    nesting_weight: integer('nesting_weight'), // ADR-011 §3.3 M4; NULL ⇒ equal-weight
    sort_order: integer('sort_order').notNull().default(0),
    deleted_at: integer('deleted_at'),
    // NOTE: no `status`/`due_date`/`source` — progress + measurement_kind carry state;
    // source binding is an entity_links row + the M5/R7 service seam (deliberate
    // asymmetry vs milestones, which carry status/due_date from the §5.4 FACT floor).
  },
  (t) => [index('idx_deliverables_milestone').on(t.milestone_id)],
)

// --- project_documents: secure vault — ADR-002 §5.4 -------------------------
export const projectDocuments = sqliteTable('project_documents', {
  ...baseColumns, // id · created_at · updated_at · 6 _sync_* — NO deleted_at (faithful §5.4)
  project_id: text('project_id'), // no FK (was CASCADE)
  milestone_id: text('milestone_id'), // no FK (was SET NULL)
  /** @encrypted [E] */
  name: text('name').notNull(),
  file_type: text('file_type'),
  file_size: integer('file_size'),
  /** @encrypted [E] — file content stored locally (nullable; large files → R2 seam) */
  encrypted_blob: blob('encrypted_blob', { mode: 'buffer' }),
})

// --- inferred row types ------------------------------------------------------
export type ProjectRow = typeof projects.$inferSelect
export type ProjectInsert = typeof projects.$inferInsert
export type MilestoneRow = typeof milestones.$inferSelect
export type MilestoneInsert = typeof milestones.$inferInsert
export type DeliverableRow = typeof deliverables.$inferSelect
export type DeliverableInsert = typeof deliverables.$inferInsert
export type ProjectDocumentRow = typeof projectDocuments.$inferSelect
export type ProjectDocumentInsert = typeof projectDocuments.$inferInsert
