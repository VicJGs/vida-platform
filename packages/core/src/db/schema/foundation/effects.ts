// ============================================================================
// Foundation table: applied_effects — the exactly-once dedup ledger (AR-7)
// ADR-004 §3.2.5-B (F1) · owed-ledger ADR-002 §5.20:3763
//
// Device-local, NOT synced (like sync_queue): NO baseColumns/syncColumns, never
// enqueues itself. The rail's applyEffect checks-and-inserts one row per applied
// effect in the same transaction as the handler's write (F1 §3B).
//
// DDL model (ADR-016 §3.2): the composite PRIMARY KEY + CHECK live in the
// hand-written SQL migration (`migrations/004_effects.ts`) — this Drizzle object
// is only the type-safe QUERY mirror. Owning DDL = F1 §3B (composite PK, no
// surrogate id — nothing FKs to this local-only ledger).
// ============================================================================

import { sqliteTable, text, integer, primaryKey, index } from 'drizzle-orm/sqlite-core'
import { EFFECT_TYPE } from '@vida/types'
import { enumText } from '../_shared'

export const appliedEffects = sqliteTable(
  'applied_effects',
  {
    effect_event_id: text('effect_event_id').notNull(), // deterministic (BR-2)
    effect_type: enumText('effect_type', EFFECT_TYPE).notNull(), // FIXED → SQL CHECK
    target_ref: text('target_ref').notNull(), // producer-supplied target dim (F1 §3B)
    applied_at: integer('applied_at').notNull(), // Unix ms
  },
  (t) => [
    primaryKey({ columns: [t.effect_event_id, t.effect_type, t.target_ref] }),
    index('idx_applied_effects_event').on(t.effect_event_id),
  ],
)

export type AppliedEffectRow = typeof appliedEffects.$inferSelect
export type AppliedEffectInsert = typeof appliedEffects.$inferInsert
