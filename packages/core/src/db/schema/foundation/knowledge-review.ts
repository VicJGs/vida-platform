// ============================================================================
// Foundation substrate: generic review engine (DB-3 · ADR-005)
// review_curves · method_bindings · review_events.
// owed-ledger ADR-002 §5.20:3764. Columns: knowledge/structure-data.md:39-41.
//
// The GENERIC review engine — cross-domain (Education/Skills/Finance consume it via
// compound_sets), so it is substrate, NOT Knowledge-only. `method_id` → the capability
// registry (kind=study_method, ADR-008), plain TEXT no FK. `review_events` is append-only
// (generalizes the retired topic_reviews/flashcard_reviews), feeds derived mastery.
// DDL lives in migrations/008_knowledge_review.ts.
// ============================================================================

import { sqliteTable, text, integer, index } from 'drizzle-orm/sqlite-core'
import { REVIEW_CURVE_KIND, METHOD_BINDING_TARGET_TYPE } from '@vida/types'
import { baseColumns, enumText, boolInt, json } from '../_shared'

// --- review_curves: personalizable scheduling curves; SM-2 = one preset (KN-8/KN-9) ---
export const reviewCurves = sqliteTable('review_curves', {
  ...baseColumns,
  /** @encrypted [E] — curve display name */
  name: text('name').notNull(),
  curve_kind: enumText('curve_kind', REVIEW_CURVE_KIND).notNull(), // FIXED → CHECK
  /** @encrypted [E] — curve tuning params (JSON-as-TEXT) */
  params: json<Record<string, unknown>>('params'),
  is_preset: boolInt('is_preset').notNull().default(false),
  deleted_at: integer('deleted_at'),
})

// --- method_bindings: which method+curve applies where (polymorphic target, KN-4) ---
export const methodBindings = sqliteTable(
  'method_bindings',
  {
    ...baseColumns,
    method_id: text('method_id').notNull(), // → capability registry (kind=study_method), no FK
    curve_id: text('curve_id'), // → review_curves, nullable, no FK
    target_type: enumText('target_type', METHOD_BINDING_TARGET_TYPE).notNull(), // FIXED → CHECK
    target_id: text('target_id').notNull(), // polymorphic knowledge object, no FK
    daily_cap: integer('daily_cap'),
    deleted_at: integer('deleted_at'),
  },
  (t) => [
    index('idx_method_bindings_target').on(t.target_type, t.target_id),
    index('idx_method_bindings_method').on(t.method_id),
  ],
)

// --- review_events: append-only outcome log; generalizes topic_reviews/flashcard_reviews ---
export const reviewEvents = sqliteTable(
  'review_events',
  {
    ...baseColumns,
    object_id: text('object_id').notNull(), // the reviewed object (or level ref), no FK
    method_id: text('method_id').notNull(), // → capability registry, no FK
    quality: integer('quality'), // signal/grade (SM-2 grade); nullable
    reviewed_at: integer('reviewed_at').notNull(), // Unix ms
    // NO deleted_at — append-only outcome log (mirrors consequence_ledger BR-3).
  },
  (t) => [index('idx_review_events_object').on(t.object_id), index('idx_review_events_method').on(t.method_id)],
)

export type ReviewCurveRow = typeof reviewCurves.$inferSelect
export type ReviewCurveInsert = typeof reviewCurves.$inferInsert
export type MethodBindingRow = typeof methodBindings.$inferSelect
export type MethodBindingInsert = typeof methodBindings.$inferInsert
export type ReviewEventRow = typeof reviewEvents.$inferSelect
export type ReviewEventInsert = typeof reviewEvents.$inferInsert
