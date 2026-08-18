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
import {
  CURRENCY_BACKING_KIND,
  CONSEQUENCE_KIND,
  STORE_NODE_KIND,
  STORE_REF_TYPE,
  RULE_CONDITION_BINDING_TYPE,
} from '@vida/types'
import { baseColumns, enumText, boolInt } from '../_shared'

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

// --- store: Finance-owned nestable Storage layer (§3.5 · DB-3) ---
// A group (folder) OR a wrapper over an existing account/investment/asset; self-nesting via
// parent_id; canonical single-parent (no double-count). Existing Finance entities UNTOUCHED.
// The concrete overlay encoding (currency_id/dream_id/purpose_id) is build-phase (ADR-012 L97). No FK.
export const store = sqliteTable(
  'store',
  {
    ...baseColumns,
    parent_id: text('parent_id'), // self-nest; NULL = root
    node_kind: enumText('node_kind', STORE_NODE_KIND).notNull(), // FIXED → CHECK
    ref_type: enumText('ref_type', STORE_REF_TYPE), // wrapper-only; NULL for group
    ref_id: text('ref_id'), // → the wrapped Finance entity, no FK
    /** @encrypted [E] — box name */
    name: text('name').notNull(),
    is_locked: boolInt('is_locked').notNull().default(false),
    dream_id: text('dream_id'), // overlay earmark, no FK (DB-4)
    purpose_id: text('purpose_id'), // overlay earmark, no FK (DB-4)
    currency_id: text('currency_id'), // overlay, no FK
    deleted_at: integer('deleted_at'),
  },
  (t) => [
    index('idx_store_parent').on(t.parent_id),
    index('idx_store_ref').on(t.ref_type, t.ref_id),
  ],
)

// --- rules: HEADLESS automation under ADR-010 — NOT an ADR-008 render-Block (§3.9 · DB-3) ---
// condition = an ADR-011 binding; consequences = a typed effect-descriptor set (ADR-004 §3.2.5),
// encoded as JSON-as-TEXT for M1.0 (no engine yet; ADR-012 leaves the shape build-phase-open).
// grant_id NULL = a shipped/trusted rule; non-null = user-authored under an ADR-010 grant. No FK.
export const rules = sqliteTable(
  'rules',
  {
    ...baseColumns,
    /** @encrypted [E] — rule name */
    name: text('name').notNull(),
    condition_binding_type: enumText('condition_binding_type', RULE_CONDITION_BINDING_TYPE).notNull(), // FIXED → CHECK
    /** @encrypted [E] — the binding target/predicate encoding */
    condition_ref: text('condition_ref').notNull(),
    /** @encrypted [E] — typed-consequence set (ADR-004 §3.2.5 effect descriptors) as JSON-as-TEXT */
    consequences: text('consequences').notNull(),
    grant_id: text('grant_id'), // → capability_grants, no FK; NULL = shipped/trusted
    is_enabled: boolInt('is_enabled').notNull().default(true),
    deleted_at: integer('deleted_at'),
  },
  (t) => [index('idx_rules_enabled').on(t.is_enabled)],
)

export type CurrencyRow = typeof currencies.$inferSelect
export type CurrencyInsert = typeof currencies.$inferInsert
export type ConsequenceLedgerRow = typeof consequenceLedger.$inferSelect
export type ConsequenceLedgerInsert = typeof consequenceLedger.$inferInsert
export type StoreRow = typeof store.$inferSelect
export type StoreInsert = typeof store.$inferInsert
export type RuleRow = typeof rules.$inferSelect
export type RuleInsert = typeof rules.$inferInsert
