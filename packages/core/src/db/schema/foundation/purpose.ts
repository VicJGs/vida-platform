// ============================================================================
// Foundation substrate: Purpose & Goals domain tables (DB-3 · ADR-011)
// values · contributions · purpose_reviews · plan_steps.
// owed-ledger ADR-002 §5.20:3773-3776. Columns: purposes-and-goals/structure-data.md:30-44.
//
// All SYNCABLE (…baseColumns). Cross-domain refs are PLAIN TEXT, no FK — the target
// domain tables (purposes/tasks/targets/habits/…) are DB-4 (the entity_links.page_id
// precedent). `contributions` holds only the WEIGHT, never a copied progress value (PG-10);
// `plan_steps` is a DOC layer, not a tracked entity (PG-11). DDL lives in migrations/007_purpose.ts.
// ⚠ `values` is a SQL keyword — the migration quotes "values"; Drizzle quotes identifiers itself.
// ============================================================================

import { sqliteTable, text, integer, index } from 'drizzle-orm/sqlite-core'
import {
  CONTRIBUTION_GOAL_TYPE,
  CONTRIBUTION_CONTRIBUTOR_TYPE,
  PLAN_STEP_OWNER_TYPE,
} from '@vida/types'
import { baseColumns, enumText, boolInt } from '../_shared'

// --- values: first-class core-beliefs layer ABOVE purposes (PG4) ---
export const values = sqliteTable('values', {
  ...baseColumns,
  /** @encrypted [E] — the value's name */
  name: text('name').notNull(),
  /** @encrypted [E] */
  description: text('description'),
  sort_order: integer('sort_order').notNull().default(0),
  deleted_at: integer('deleted_at'),
})

// --- contributions: the weighted-laddering goal-edge (PG7 · Purpose-domain, NOT a Spaces primitive) ---
export const contributions = sqliteTable(
  'contributions',
  {
    ...baseColumns,
    goal_type: enumText('goal_type', CONTRIBUTION_GOAL_TYPE).notNull(), // FIXED → CHECK
    goal_id: text('goal_id').notNull(), // → purpose|target, no FK (DB-4)
    contributor_type: enumText('contributor_type', CONTRIBUTION_CONTRIBUTOR_TYPE).notNull(), // FIXED → CHECK
    contributor_id: text('contributor_id').notNull(), // polymorphic, no FK (DB-4)
    contribution_percentage: integer('contribution_percentage').notNull(), // 0–100 weight; never a copied value (PG-10)
    /** @encrypted [E] */
    contribution_notes: text('contribution_notes'),
    deleted_at: integer('deleted_at'),
  },
  (t) => [
    index('idx_contributions_goal').on(t.goal_type, t.goal_id),
    index('idx_contributions_contributor').on(t.contributor_type, t.contributor_id),
  ],
)

// --- purpose_reviews: the alignment/fulfillment loop (PG3, restored from v1) ---
export const purposeReviews = sqliteTable(
  'purpose_reviews',
  {
    ...baseColumns,
    purpose_id: text('purpose_id').notNull(), // → purposes, no FK (DB-4); logical CASCADE
    still_aligned: boolInt('still_aligned').notNull(),
    /** @encrypted [E] */
    alignment_notes: text('alignment_notes'),
    overall_progress: integer('overall_progress'), // 0–100, nullable
    /** @encrypted [E] */
    key_achievements: text('key_achievements'),
    /** @encrypted [E] */
    obstacles_faced: text('obstacles_faced'),
    /** @encrypted [E] */
    adjustments_needed: text('adjustments_needed'),
    renewed_commitment: boolInt('renewed_commitment'),
    fulfillment_rating: integer('fulfillment_rating'),
    clarity_rating: integer('clarity_rating'),
    reviewed_at: integer('reviewed_at').notNull(), // Unix ms
    deleted_at: integer('deleted_at'),
  },
  (t) => [index('idx_purpose_reviews_purpose').on(t.purpose_id)],
)

// --- plan_steps: lightweight DOC checklist on a Task/Target (PG5; not a tracked entity — PG-11) ---
export const planSteps = sqliteTable(
  'plan_steps',
  {
    ...baseColumns,
    owner_type: enumText('owner_type', PLAN_STEP_OWNER_TYPE).notNull(), // FIXED → CHECK
    owner_id: text('owner_id').notNull(), // → task|target, no FK (DB-4)
    /** @encrypted [E] */
    title: text('title').notNull(),
    /** @encrypted [E] */
    note: text('note'),
    sort_order: integer('sort_order').notNull().default(0), // source calls it `order` (reserved word) → sort_order
    is_completed: boolInt('is_completed').notNull().default(false),
    completed_at: integer('completed_at'),
    deleted_at: integer('deleted_at'),
  },
  (t) => [index('idx_plan_steps_owner').on(t.owner_type, t.owner_id)],
)

export type ValueRow = typeof values.$inferSelect
export type ValueInsert = typeof values.$inferInsert
export type ContributionRow = typeof contributions.$inferSelect
export type ContributionInsert = typeof contributions.$inferInsert
export type PurposeReviewRow = typeof purposeReviews.$inferSelect
export type PurposeReviewInsert = typeof purposeReviews.$inferInsert
export type PlanStepRow = typeof planSteps.$inferSelect
export type PlanStepInsert = typeof planSteps.$inferInsert
