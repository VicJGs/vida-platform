// ============================================================================
// Financial Domain — @vida/types
// ADR-002 §5.8
// ============================================================================

import type { Id, Timestamp, Frequency, Money, BasisPoints } from './common'
import type { SyncableEntity } from './sync'

// ---------------------------------------------------------------------------
// Enums
// ---------------------------------------------------------------------------

export const ACCOUNT_TYPE = [
  'checking',
  'savings',
  'credit_card',
  'investment',
  'cash',
  'digital_wallet',
  'other',
] as const
export type AccountType = (typeof ACCOUNT_TYPE)[number]

export const TRANSACTION_TYPE = ['income', 'expense', 'transfer'] as const
export type TransactionType = (typeof TRANSACTION_TYPE)[number]

export const ASSET_TYPE = ['real_estate', 'vehicle', 'electronics', 'jewelry', 'collectible', 'other'] as const
export type AssetType = (typeof ASSET_TYPE)[number]

export const LIABILITY_TYPE = [
  'mortgage',
  'student_loan',
  'auto_loan',
  'credit_card',
  'personal_loan',
  'medical',
  'other',
] as const
export type LiabilityType = (typeof LIABILITY_TYPE)[number]

export const INVESTMENT_TYPE = [
  'stock',
  'bond',
  'mutual_fund',
  'etf',
  'crypto',
  'real_estate',
  'commodity',
  'other',
] as const
export type InvestmentType = (typeof INVESTMENT_TYPE)[number]

export const INCOME_TYPE = [
  'salary',
  'freelance',
  'investment',
  'rental',
  'business',
  'side_hustle',
  'passive',
  'other',
] as const
export type IncomeType = (typeof INCOME_TYPE)[number]

export const WORK_TYPE = ['full_time', 'part_time', 'contract', 'freelance', 'passive'] as const
export type WorkType = (typeof WORK_TYPE)[number]

// Liability interest structure (G9 restored from v1). FIXED → SQL CHECK.
export const INTEREST_TYPE = ['fixed', 'variable'] as const
export type InterestType = (typeof INTEREST_TYPE)[number]

// Fiscal & Legal sub-context — who a residency/obligation belongs to. FIXED → SQL CHECK.
// (residency_type/obligation_type/status/entity_type are per-jurisdiction OPEN vocabs — no tuple, no CHECK.)
export const FISCAL_OWNER_TYPE = ['user', 'legal_entity'] as const
export type FiscalOwnerType = (typeof FISCAL_OWNER_TYPE)[number]

// ---------------------------------------------------------------------------
// Entities
// ---------------------------------------------------------------------------

export interface Account extends SyncableEntity {
  /** @encrypted */
  name: string
  account_type: AccountType
  /** @encrypted */
  institution: string | null
  currency: string
  /** @encrypted — in cents */
  current_balance: Money
  /** @encrypted — in cents; ledger-derived-balance seed (FN-3, FIN-01) */
  opening_balance: Money | null
  /** @encrypted — in cents */
  credit_limit: Money | null
  /** @encrypted — basis points */
  interest_rate: BasisPoints | null
  is_active: boolean
  color: string | null
  icon: string | null
  /** ISO jurisdiction code — the fiscal-legal money-touch link (FL-02/FL-9; exposure deferred S1→S7). */
  jurisdiction_code: string | null
  deleted_at: Timestamp | null
}

export interface Transaction extends SyncableEntity {
  account_id: Id
  transfer_to_account_id: Id | null
  transaction_type: TransactionType
  /** @encrypted — in cents */
  amount: Money
  currency: string
  /** @encrypted */
  category: string | null
  /** @encrypted */
  subcategory: string | null
  /** @encrypted */
  description: string | null
  /** YYYY-MM-DD */
  date: string
  is_recurring: boolean
  recurring_frequency: Frequency | null
  /** @encrypted */
  tags: string[]
  /** ISO jurisdiction code — the fiscal-legal money-touch link (FL-02/FL-9; exposure deferred S1→S7). */
  jurisdiction_code: string | null
  deleted_at: Timestamp | null
}

export interface Asset extends SyncableEntity {
  /** @encrypted */
  name: string
  asset_type: AssetType
  purchase_date: string | null
  /** @encrypted — in cents */
  purchase_price: Money | null
  /** @encrypted — in cents */
  current_value: Money | null
  /** @encrypted — basis points / year */
  depreciation_rate: BasisPoints | null
  /** @encrypted */
  location: string | null
  /** ISO jurisdiction code — the fiscal-legal money-touch link (FL-02/FL-9; exposure deferred S1→S7). */
  jurisdiction_code: string | null
  deleted_at: Timestamp | null
}

export interface Liability extends SyncableEntity {
  /** @encrypted */
  name: string
  liability_type: LiabilityType
  /** @encrypted — in cents */
  original_amount: Money | null
  /** @encrypted — in cents */
  current_balance: Money | null
  /** @encrypted — basis points */
  interest_rate: BasisPoints | null
  /** @encrypted — in cents */
  monthly_payment: Money | null
  due_date: string | null
  /** @encrypted */
  lender: string | null
  // G9 restored schedule fields (FIN-27) — feed the liability-payment view.
  payment_frequency: Frequency | null
  next_payment_date: string | null
  interest_type: InterestType | null
  payoff_date: string | null
  deleted_at: Timestamp | null
}

export interface Investment extends SyncableEntity {
  account_id: Id | null
  /** @encrypted */
  name: string
  investment_type: InvestmentType
  /** @encrypted */
  ticker_symbol: string | null
  /** @encrypted */
  quantity: number | null
  /** @encrypted — cents / unit */
  purchase_price: Money | null
  /** @encrypted — cents / unit */
  current_price: Money | null
  /** ISO jurisdiction code — the fiscal-legal money-touch link (FL-02/FL-9; exposure deferred S1→S7). */
  jurisdiction_code: string | null
  deleted_at: Timestamp | null
}

export interface IncomeStream extends SyncableEntity {
  /** @encrypted */
  name: string
  income_type: IncomeType
  work_type: WorkType | null
  /** @encrypted — in cents */
  amount: Money
  frequency: Frequency
  is_active: boolean
  /** @encrypted — PII */
  employer: string | null
  start_date: string | null
  end_date: string | null
  /** G9 restored (FIN-27) */
  next_payment_date: string | null
  /** ISO jurisdiction code — the fiscal-legal money-touch link (FL-02/FL-9; exposure deferred S1→S7). */
  jurisdiction_code: string | null
  deleted_at: Timestamp | null
}
