// ============================================================================
// Foundation tables: points economy (AR-7 Increment 4 · ADR-012)
// currencies (§3.2) + consequence_ledger (§3.3, the generalized xp_history).
// owed-ledger ADR-002 §5.20:3777-3778.
//
// Both SYNCABLE (…baseColumns). `currencies.name` is [E]. consequence_ledger is
// APPEND-ONLY (NO deleted_at — corrections are compensating rows, BR-3); its
// UNIQUE (effect_event_id, kind, target_ref) MIRRORS the effect rail's composite
// PK so cross-device convergence matches the rail exactly. No cross-table FK.
// DDL (CHECK/UNIQUE/defaults) lives in migrations/006_economy.ts.
// ============================================================================

import { sqliteTable, text, integer, unique, index } from 'drizzle-orm/sqlite-core'
import { CURRENCY_BACKING_KIND, CONSEQUENCE_KIND } from '@vida/types'
import { baseColumns, enumText } from '../_shared'

export const currencies = sqliteTable('currencies', {
  ...baseColumns,
  code: text('code').notNull().unique(), // semantic id (e.g. 'XP'); UNIQUE business key
  /** @encrypted [E] — display name; field-level libsodium (M1.0 pass-through seam) */
  name: text('name'),
  backing_kind: enumText('backing_kind', CURRENCY_BACKING_KIND).notNull(), // FIXED → CHECK
  unit: text('unit'),
  icon: text('icon'),
  // Config ceiling for self-granted/measured-time; real-money derives from the store box (MOD-finance).
  pool_ceiling: integer('pool_ceiling'),
  deleted_at: integer('deleted_at'),
})

export const consequenceLedger = sqliteTable(
  'consequence_ledger',
  {
    ...baseColumns,
    currency_id: text('currency_id').notNull(), // → currencies.code, no FK
    amount: integer('amount').notNull(), // positive magnitude; sign implied by kind
    kind: enumText('kind', CONSEQUENCE_KIND).notNull(), // FIXED → CHECK
    entity_type: text('entity_type'),
    entity_id: text('entity_id'),
    target_ref: text('target_ref').notNull(), // the rail's dedup dimension
    effect_event_id: text('effect_event_id').notNull(),
    at: integer('at').notNull(), // Unix ms — the economic event time
    // NO deleted_at — append-only ledger (BR-3).
  },
  (t) => [
    // Mirrors the effect rail's (effect_event_id, effect_type, target_ref) PK (kind ↔ effect_type).
    unique('uq_consequence_ledger_event').on(t.effect_event_id, t.kind, t.target_ref),
    index('idx_consequence_ledger_currency').on(t.currency_id),
  ],
)

export type CurrencyRow = typeof currencies.$inferSelect
export type CurrencyInsert = typeof currencies.$inferInsert
export type ConsequenceLedgerRow = typeof consequenceLedger.$inferSelect
export type ConsequenceLedgerInsert = typeof consequenceLedger.$inferInsert
