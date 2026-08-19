// ============================================================================
// Domain tables: Purpose & Goals (DB-4 · group #8 · the CAPSTONE) — ADR-002 §5.7
//
// The meaning-spine rollup apex: Values → Purposes → Targets (+ Dreams beside).
// This authors the 6 §5.7 tables NOT in the DB-3 substrate — the DB-3 tables
// (values · contributions · purpose_reviews · plan_steps) live in
// foundation/purpose.ts and are CONSUMED here (no-FK), never re-authored.
//
// DDL model (ADR-016 §3.5): CHECK + indexes live in the hand-written SQL migration
// (migrations/019_purposes.ts). These Drizzle objects are the type-safe QUERY mirror.
//
// Shape (spec docs/specs/foundation/db-4-purposes-and-goals/):
// - NO hard cross-table FK — purpose_id/value_id/metric_id/target_id/project_id are
//   plain TEXT (no-FK BR-DB3-1; SR-003 relaxed → the spine joints are OPTIONAL/nullable,
//   PG-9; delete-parent = app-layer SET NULL, PG-19).
// - Progress DERIVES (PG-4/PG-17): purposes.progress / targets.current_value /
//   dreams.progress_percentage are NULLABLE override slots (NULL ⇒ derive), never counters.
// - measurement_kind + binding_mode land on `targets` ONLY (structure-data.md:47 converts
//   target_type → measurement_kind; the dreams-widen list + metric amendments do NOT list
//   the pair; purposes is the rollup apex — [[module-doc-is-db4-roster-not-adr-broad-list]]).
//   measurement_kind NN DEFAULT 'quantitative' (the floor target_type default); binding_mode
//   nullable, no default (override-slot grain).
// - PG-15 restores: targets success_criteria[E]/measurement_method; purpose_metrics
//   is_higher_better/baseline_value; purpose_metric_values source{manual,auto}/context_notes[E].
// - `dreams` ABSORBS `bucket_list_items` (PG-16): category/status/priority/imagery/steps/
//   project_id/location/progress_percentage; inline tags RETIRED → entity_tags.
// - Ledgers (purpose_metric_values, target_reviews) + purpose_metrics have NO deleted_at
//   (floor faithful); the ledgers add updated_at via baseColumns (task_time_logs precedent).
//
// @vida/types interface reconcile (Purpose +value_id/progress→null; new Target/PurposeMetric/
// PurposeMetricValue/TargetReview/Dream; retire TARGET_TYPE; BucketListItem→Dream) → DB-11.
//
// M1.0 encryption (BR-DB6-3): the [E] fields are the M3 target — EMPTY [E] set in M1.0.
// ============================================================================

import { sqliteTable, text, integer, real, index } from 'drizzle-orm/sqlite-core'
import {
  STATUS,
  PRIORITY,
  LIFE_DOMAIN,
  FREQUENCY,
  MEASUREMENT_KIND,
  BINDING_MODE,
  CALCULATION_METHOD,
  METRIC_VALUE_SOURCE,
  BUCKET_LIST_CATEGORY,
  BUCKET_LIST_STATUS,
} from '@vida/types'
import { baseColumns, enumText, boolInt, calendarDate, timestampMs } from './_shared'

// --- purposes: the purpose (rollup apex; no measurement_kind) — §5.7 ---------
export const purposes = sqliteTable('purposes', {
  ...baseColumns,
  /** @encrypted [E] */
  title: text('title').notNull(),
  /** @encrypted [E] */
  description: text('description'),
  /** @encrypted [E] */
  vision: text('vision'),
  /** @encrypted [E] */
  why: text('why'),
  value_id: text('value_id'), // NEW (PG-9): nullable, no-FK → values (DB-3)
  domain: enumText('domain', LIFE_DOMAIN), // FIXED → SQL CHECK (nullable)
  status: enumText('status', STATUS).notNull().default('in_progress'), // FIXED → SQL CHECK
  progress: integer('progress'), // AMEND: nullable override slot (was NN DEFAULT 0, PG-4)
  start_date: calendarDate('start_date'),
  target_date: calendarDate('target_date'),
  is_primary: boolInt('is_primary').notNull().default(false),
  sort_order: integer('sort_order').notNull().default(0),
  deleted_at: integer('deleted_at'),
})

// --- targets (= Goals): the pursuable — §5.7 --------------------------------
export const targets = sqliteTable(
  'targets',
  {
    ...baseColumns,
    purpose_id: text('purpose_id'), // AMEND: nullable, no-FK (SR-003 relaxed, PG-9)
    /** @encrypted [E] */
    title: text('title').notNull(),
    /** @encrypted [E] */
    description: text('description'),
    measurement_kind: enumText('measurement_kind', MEASUREMENT_KIND).notNull().default('quantitative'), // replaces target_type (ADR-011 M1)
    binding_mode: enumText('binding_mode', BINDING_MODE), // ADR-011 M2; nullable, no default (NULL ⇒ derive)
    target_value: real('target_value'),
    current_value: real('current_value'), // nullable override slot (PG-4)
    /** @encrypted [E] */
    unit: text('unit'),
    /** @encrypted [E] — NEW (PG-11, restored) */
    success_criteria: text('success_criteria'),
    measurement_method: text('measurement_method'), // NEW (PG-11, restored) — how it is measured
    status: enumText('status', STATUS).notNull().default('not_started'), // FIXED → SQL CHECK
    priority: enumText('priority', PRIORITY).notNull().default('medium'), // FIXED → SQL CHECK
    start_date: calendarDate('start_date'),
    target_date: calendarDate('target_date'),
    next_review_date: calendarDate('next_review_date'),
    review_frequency: enumText('review_frequency', FREQUENCY).default('weekly'), // FIXED → SQL CHECK (nullable)
    sort_order: integer('sort_order').notNull().default(0),
    deleted_at: integer('deleted_at'),
    // is_achieved = derived (no column).
  },
  (t) => [index('idx_targets_purpose').on(t.purpose_id)],
)

// --- purpose_metrics: a quantitative metric on a purpose — §5.7 -------------
// NO deleted_at (floor faithful — §5.7 has created_at+updated_at only).
export const purposeMetrics = sqliteTable('purpose_metrics', {
  ...baseColumns,
  purpose_id: text('purpose_id'), // no-FK
  /** @encrypted [E] */
  name: text('name').notNull(),
  /** @encrypted [E] */
  description: text('description'),
  /** @encrypted [E] */
  unit: text('unit'),
  target_value: real('target_value'),
  current_value: real('current_value'),
  calculation_method: enumText('calculation_method', CALCULATION_METHOD).notNull().default('latest'), // FIXED → SQL CHECK
  is_higher_better: boolInt('is_higher_better'), // NEW (PG-15, restored) — nullable (progress direction)
  baseline_value: real('baseline_value'), // NEW (PG-15, restored)
})

// --- purpose_metric_values: the time-series ledger — §5.7 -------------------
// Ledger: baseColumns (adds created_at+updated_at vs floor), NO deleted_at.
export const purposeMetricValues = sqliteTable(
  'purpose_metric_values',
  {
    ...baseColumns,
    metric_id: text('metric_id').notNull(), // no-FK
    value: real('value').notNull(),
    recorded_at: timestampMs('recorded_at').notNull(),
    // NEW (PG-15): 'manual' = natural for a hand-recorded point; 'auto' only via a derived-pull writer.
    source: enumText('source', METRIC_VALUE_SOURCE).notNull().default('manual'), // FIXED → SQL CHECK
    /** @encrypted [E] — NEW (PG-15) */
    context_notes: text('context_notes'),
  },
  (t) => [index('idx_metric_values_metric').on(t.metric_id)],
)

// --- target_reviews: per-target review ledger — §5.7 ------------------------
// Ledger: baseColumns (adds created_at+updated_at vs floor), NO deleted_at.
export const targetReviews = sqliteTable('target_reviews', {
  ...baseColumns,
  target_id: text('target_id').notNull(), // no-FK
  progress_rating: integer('progress_rating'), // 1-10 range CHECK (SQL-only)
  /** @encrypted [E] */
  reflection: text('reflection'),
  /** @encrypted [E] */
  next_actions: text('next_actions'),
  reviewed_at: timestampMs('reviewed_at').notNull(),
})

// --- dreams: the single aspiration entity (floor + bucket_list absorption) --
export const dreams = sqliteTable(
  'dreams',
  {
    ...baseColumns,
    /** @encrypted [E] */
    title: text('title').notNull(),
    /** @encrypted [E] */
    description: text('description'),
    domain: enumText('domain', LIFE_DOMAIN), // FIXED → SQL CHECK (nullable)
    category: enumText('category', BUCKET_LIST_CATEGORY).default('other'), // absorbed; FIXED → SQL CHECK (nullable)
    status: enumText('status', BUCKET_LIST_STATUS).notNull().default('dream'), // absorbed; FIXED → SQL CHECK
    priority: enumText('priority', PRIORITY).notNull().default('medium'), // absorbed; FIXED → SQL CHECK
    target_age: integer('target_age'),
    target_date: calendarDate('target_date'), // absorbed
    completed_date: calendarDate('completed_date'), // absorbed
    /** @encrypted [E] — in cents */
    estimated_cost: integer('estimated_cost'),
    /** @encrypted [E] — absorbed */
    location: text('location'),
    /** @encrypted [E] — absorbed */
    image_url: text('image_url'),
    /** @encrypted [E] — absorbed */
    cover_image_url: text('cover_image_url'),
    /** @encrypted [E] — absorbed */
    inspiration_url: text('inspiration_url'),
    progress_percentage: integer('progress_percentage'), // AMEND: nullable override slot (was NN DEFAULT 0, PG-4)
    /** @encrypted [E] — absorbed; JSON [{id,text,completed}] (plain text, NEVER json<T>()) */
    steps: text('steps'),
    purpose_id: text('purpose_id'), // nullable, no-FK
    project_id: text('project_id'), // absorbed; nullable, no-FK
    deleted_at: integer('deleted_at'),
    // NOTE: inline `tags` RETIRED → entity_tags. No measurement_kind (widen list omits it).
  },
  (t) => [index('idx_dreams_purpose').on(t.purpose_id)],
)

// --- inferred row types ------------------------------------------------------
export type PurposeRow = typeof purposes.$inferSelect
export type PurposeInsert = typeof purposes.$inferInsert
export type TargetRow = typeof targets.$inferSelect
export type TargetInsert = typeof targets.$inferInsert
export type PurposeMetricRow = typeof purposeMetrics.$inferSelect
export type PurposeMetricInsert = typeof purposeMetrics.$inferInsert
export type PurposeMetricValueRow = typeof purposeMetricValues.$inferSelect
export type PurposeMetricValueInsert = typeof purposeMetricValues.$inferInsert
export type TargetReviewRow = typeof targetReviews.$inferSelect
export type TargetReviewInsert = typeof targetReviews.$inferInsert
export type DreamRow = typeof dreams.$inferSelect
export type DreamInsert = typeof dreams.$inferInsert
