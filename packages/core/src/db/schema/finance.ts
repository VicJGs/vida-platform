// ============================================================================
// Domain tables: Finance (+ Fiscal & Legal) — DB-4 · group #9 · ADR-002 §5.8 + §5.20
//
// The private financial command center: the 6 owned entity tables authored fresh
// in the hand-written ADR-016 model (they lived in the pre-rebuild monolith), plus
// the Fiscal & Legal Finance sub-context (net-new) and the money-touch jurisdiction
// link on the 5 finance entities.
//
// DDL model (ADR-016 §3.5): CHECK + indexes live in the hand-written SQL migration
// (migrations/020_finance.ts). These Drizzle objects are the type-safe QUERY mirror.
//
// Shape (spec docs/specs/foundation/db-4-finance-and-fiscal-legal/):
// - NO cross/within-domain FK — account_id/transfer_to_account_id/project_id/owner_id/
//   linked_task_id are plain TEXT (no-FK, current-spec.md:176-177; §5.8 REFERENCES stale,
//   superseded by ADR-016 §3.4). Cascade/orphan (FN-11) = app/sync-layer.
// - FIXED enums → SQL CHECK from the @vida/types tuple. OPEN vocabs (currency, jurisdiction_code,
//   residency_type, entity_type, obligation_type, obligation status, category_bidx) = plain TEXT,
//   no CHECK ([[open-vocab-columns-take-no-sql-check]]; fiscal four are rule-pack-defined, conventions.md:32).
// - store/rules (E6, FN-15) are DB-3 (foundation/economy.ts) — CONSUMED, not re-authored.
//   move_money (FN-16) is a handler, not a table. Inline transactions.tags RETIRED → entity_tags (FN-10, SP1).
// - Amendments authored now (settled build-phase): accounts.opening_balance (FN-3); transactions.category_bidx
//   + idx (F7, P-side blind-index column; PRF derivation service-deferred); liabilities G9 (payment_frequency/
//   next_payment_date/interest_type/payoff_date); income_streams.next_payment_date; jurisdiction_code on the 5.
// - Fiscal nullability = the fiscal-legal/structure-data.md roster ?-notation (the sole source for net-new tables):
//   nullable = residencies.end_date, legal_entities.project_id, obligations.linked_task_id; all else NOT NULL.
//
// OUT (owned elsewhere/undecided): import_staging/connection_config (undecided ingestion ADR);
// ai_connections (ADR-015); budgeting/liability_payments/FX (design pass); measurement_kind/binding_mode
// (Finance is a Purpose feeder, not a pursuable — C6). @vida/types interface reconcile → DB-11.
//
// M1.0 encryption (BR-DB6-3): the [E] fields are the M3 target — EMPTY [E] set in M1.0 (pass-through).
// ============================================================================

import { sqliteTable, text, integer, real, index } from 'drizzle-orm/sqlite-core'
import {
  ACCOUNT_TYPE,
  TRANSACTION_TYPE,
  ASSET_TYPE,
  LIABILITY_TYPE,
  INVESTMENT_TYPE,
  INCOME_TYPE,
  WORK_TYPE,
  INTEREST_TYPE,
  FREQUENCY,
  FISCAL_OWNER_TYPE,
} from '@vida/types'
import { baseColumns, enumText, boolInt, money, calendarDate } from './_shared'

// --- accounts: money stores — §5.8 -----------------------------------------
export const accounts = sqliteTable('accounts', {
  ...baseColumns,
  /** @encrypted [E] */
  name: text('name').notNull(),
  account_type: enumText('account_type', ACCOUNT_TYPE).notNull(), // FIXED → SQL CHECK
  /** @encrypted [E] */
  institution: text('institution'),
  currency: text('currency').notNull().default('USD'), // OPEN (ISO), no CHECK
  /** @encrypted [E] — in cents */
  current_balance: money('current_balance').notNull().default(0),
  /** @encrypted [E] — in cents; NEW (FN-3), nullable override */
  opening_balance: money('opening_balance'),
  /** @encrypted [E] — in cents */
  credit_limit: money('credit_limit'),
  /** @encrypted [E] — basis points */
  interest_rate: integer('interest_rate'),
  is_active: boolInt('is_active').notNull().default(true),
  color: text('color'),
  icon: text('icon'),
  jurisdiction_code: text('jurisdiction_code'), // NEW (FL-9); OPEN, nullable
  deleted_at: integer('deleted_at'),
})

// --- transactions: the ledger — §5.8 ---------------------------------------
export const transactions = sqliteTable(
  'transactions',
  {
    ...baseColumns,
    account_id: text('account_id').notNull(), // no-FK (was CASCADE); app-layer FN-11
    transfer_to_account_id: text('transfer_to_account_id'), // no-FK (was SET NULL)
    transaction_type: enumText('transaction_type', TRANSACTION_TYPE).notNull(), // FIXED → SQL CHECK
    /** @encrypted [E] — in cents */
    amount: money('amount').notNull(),
    currency: text('currency').notNull().default('USD'),
    /** @encrypted [E] */
    category: text('category'),
    category_bidx: text('category_bidx'), // NEW (F7); P-side equality blind index, no CHECK
    /** @encrypted [E] */
    subcategory: text('subcategory'),
    /** @encrypted [E] */
    description: text('description'),
    date: calendarDate('date').notNull(),
    is_recurring: boolInt('is_recurring').notNull().default(false),
    recurring_frequency: enumText('recurring_frequency', FREQUENCY), // FIXED → SQL CHECK (nullable)
    jurisdiction_code: text('jurisdiction_code'), // NEW (FL-9)
    deleted_at: integer('deleted_at'),
    // NOTE: inline `tags` RETIRED → entity_tags (FN-10, SP1). No tags column.
  },
  (t) => [
    index('idx_transactions_account').on(t.account_id),
    index('idx_transactions_date').on(t.date),
    index('idx_transactions_category_bidx').on(t.category_bidx),
  ],
)

// --- assets: owned value — §5.8 --------------------------------------------
export const assets = sqliteTable('assets', {
  ...baseColumns,
  /** @encrypted [E] */
  name: text('name').notNull(),
  asset_type: enumText('asset_type', ASSET_TYPE).notNull(), // FIXED → SQL CHECK
  purchase_date: calendarDate('purchase_date'),
  /** @encrypted [E] — in cents */
  purchase_price: money('purchase_price'),
  /** @encrypted [E] — in cents */
  current_value: money('current_value'),
  /** @encrypted [E] — basis points / year */
  depreciation_rate: integer('depreciation_rate'),
  /** @encrypted [E] */
  location: text('location'),
  jurisdiction_code: text('jurisdiction_code'), // NEW (FL-9)
  deleted_at: integer('deleted_at'),
})

// --- liabilities: debts — §5.8 (+ G9 restored) -----------------------------
export const liabilities = sqliteTable('liabilities', {
  ...baseColumns,
  /** @encrypted [E] */
  name: text('name').notNull(),
  liability_type: enumText('liability_type', LIABILITY_TYPE).notNull(), // FIXED → SQL CHECK
  /** @encrypted [E] — in cents */
  original_amount: money('original_amount'),
  /** @encrypted [E] — in cents */
  current_balance: money('current_balance'),
  /** @encrypted [E] — basis points */
  interest_rate: integer('interest_rate'),
  /** @encrypted [E] — in cents */
  monthly_payment: money('monthly_payment'),
  due_date: calendarDate('due_date'),
  /** @encrypted [E] */
  lender: text('lender'),
  // G9 restored (structure-data.md:28-29):
  payment_frequency: enumText('payment_frequency', FREQUENCY), // FIXED → SQL CHECK (nullable)
  next_payment_date: calendarDate('next_payment_date'),
  interest_type: enumText('interest_type', INTEREST_TYPE), // FIXED → SQL CHECK (nullable)
  payoff_date: calendarDate('payoff_date'),
  deleted_at: integer('deleted_at'),
})

// --- investments: holdings — §5.8 ------------------------------------------
export const investments = sqliteTable(
  'investments',
  {
    ...baseColumns,
    account_id: text('account_id'), // no-FK (was SET NULL); nullable
    /** @encrypted [E] */
    name: text('name').notNull(),
    investment_type: enumText('investment_type', INVESTMENT_TYPE).notNull(), // FIXED → SQL CHECK
    /** @encrypted [E] */
    ticker_symbol: text('ticker_symbol'),
    /** @encrypted [E] */
    quantity: real('quantity'),
    /** @encrypted [E] — cents / unit */
    purchase_price: money('purchase_price'),
    /** @encrypted [E] — cents / unit */
    current_price: money('current_price'),
    jurisdiction_code: text('jurisdiction_code'), // NEW (FL-9)
    deleted_at: integer('deleted_at'),
  },
  (t) => [index('idx_investments_account').on(t.account_id)],
)

// --- income_streams: income — §5.8 (+ G9 next_payment_date) -----------------
export const incomeStreams = sqliteTable('income_streams', {
  ...baseColumns,
  /** @encrypted [E] */
  name: text('name').notNull(),
  income_type: enumText('income_type', INCOME_TYPE).notNull(), // FIXED → SQL CHECK
  work_type: enumText('work_type', WORK_TYPE), // FIXED → SQL CHECK (nullable)
  /** @encrypted [E] — in cents */
  amount: money('amount').notNull(),
  frequency: enumText('frequency', FREQUENCY).notNull().default('monthly'), // FIXED → SQL CHECK
  is_active: boolInt('is_active').notNull().default(true),
  /** @encrypted [E] — PII */
  employer: text('employer'),
  start_date: calendarDate('start_date'),
  end_date: calendarDate('end_date'),
  next_payment_date: calendarDate('next_payment_date'), // NEW (G9)
  jurisdiction_code: text('jurisdiction_code'), // NEW (FL-9)
  deleted_at: integer('deleted_at'),
})

// ============================================================================
// --- Fiscal & Legal sub-context (net-new — §5.20 L3828) ---------------------
// SITUATE spine + legal-entity model + derived obligations. Rule-packs (INFORM) =
// ADR-014 public-reference layer (NOT a table); what-if (ADVISE) = ADR-015 (no table).
// Nullability = the fiscal-legal/structure-data.md roster ?-notation.
// ============================================================================

// --- fiscal_residencies: where user/entity is fiscally-legally resident -----
export const fiscalResidencies = sqliteTable('fiscal_residencies', {
  ...baseColumns,
  owner_type: enumText('owner_type', FISCAL_OWNER_TYPE).notNull(), // FIXED → SQL CHECK
  owner_id: text('owner_id').notNull(), // no-FK
  jurisdiction_code: text('jurisdiction_code').notNull(), // OPEN, no CHECK
  residency_type: text('residency_type').notNull(), // OPEN (per-jurisdiction, rule-pack), no CHECK
  start_date: calendarDate('start_date').notNull(),
  end_date: calendarDate('end_date'), // roster ?
  /** @encrypted [E] */
  notes: text('notes').notNull(),
  deleted_at: integer('deleted_at'),
})

// --- legal_entities: a legal entity (composes Projects) --------------------
export const legalEntities = sqliteTable('legal_entities', {
  ...baseColumns,
  project_id: text('project_id'), // roster ?; no-FK (cross-domain, Projects)
  /** @encrypted [E] */
  name: text('name').notNull(),
  entity_type: text('entity_type').notNull(), // OPEN (per-jurisdiction), no CHECK
  jurisdiction_code: text('jurisdiction_code').notNull(), // OPEN, no CHECK
  /** @encrypted [E] */
  registration_ref: text('registration_ref').notNull(),
  deleted_at: integer('deleted_at'),
})

// --- fiscal_obligations: derived, user-confirmable deadlines/filings --------
export const fiscalObligations = sqliteTable('fiscal_obligations', {
  ...baseColumns,
  jurisdiction_code: text('jurisdiction_code').notNull(), // OPEN, no CHECK
  owner_type: enumText('owner_type', FISCAL_OWNER_TYPE).notNull(), // FIXED → SQL CHECK
  owner_id: text('owner_id').notNull(), // no-FK
  obligation_type: text('obligation_type').notNull(), // OPEN (per-jurisdiction, rule-pack), no CHECK
  due_date: calendarDate('due_date').notNull(),
  status: text('status').notNull(), // OPEN (app/rule-pack lifecycle), no CHECK
  source_rulepack_version: text('source_rulepack_version').notNull(),
  linked_task_id: text('linked_task_id'), // roster ?; no-FK (→ Tasks on confirm, FL-6)
  deleted_at: integer('deleted_at'),
})

// --- inferred row types ------------------------------------------------------
export type AccountRow = typeof accounts.$inferSelect
export type AccountInsert = typeof accounts.$inferInsert
export type TransactionRow = typeof transactions.$inferSelect
export type TransactionInsert = typeof transactions.$inferInsert
export type AssetRow = typeof assets.$inferSelect
export type AssetInsert = typeof assets.$inferInsert
export type LiabilityRow = typeof liabilities.$inferSelect
export type LiabilityInsert = typeof liabilities.$inferInsert
export type InvestmentRow = typeof investments.$inferSelect
export type InvestmentInsert = typeof investments.$inferInsert
export type IncomeStreamRow = typeof incomeStreams.$inferSelect
export type IncomeStreamInsert = typeof incomeStreams.$inferInsert
export type FiscalResidencyRow = typeof fiscalResidencies.$inferSelect
export type FiscalResidencyInsert = typeof fiscalResidencies.$inferInsert
export type LegalEntityRow = typeof legalEntities.$inferSelect
export type LegalEntityInsert = typeof legalEntities.$inferInsert
export type FiscalObligationRow = typeof fiscalObligations.$inferSelect
export type FiscalObligationInsert = typeof fiscalObligations.$inferInsert
