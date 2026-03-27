// ============================================================================
// Financial Domain — @vida/types
// ADR-002 §5.8
// ============================================================================

import type { Id, Timestamp, Frequency, Money, BasisPoints } from './common'
import type { SyncableEntity } from './sync'

// ---------------------------------------------------------------------------
// Enums
// ---------------------------------------------------------------------------

export type AccountType =
  | 'checking'
  | 'savings'
  | 'credit_card'
  | 'investment'
  | 'cash'
  | 'digital_wallet'
  | 'other'

export type TransactionType = 'income' | 'expense' | 'transfer'

export type AssetType =
  | 'real_estate'
  | 'vehicle'
  | 'electronics'
  | 'jewelry'
  | 'collectible'
  | 'other'

export type LiabilityType =
  | 'mortgage'
  | 'student_loan'
  | 'auto_loan'
  | 'credit_card'
  | 'personal_loan'
  | 'medical'
  | 'other'

export type InvestmentType =
  | 'stock'
  | 'bond'
  | 'mutual_fund'
  | 'etf'
  | 'crypto'
  | 'real_estate'
  | 'commodity'
  | 'other'

export type IncomeType =
  | 'salary'
  | 'freelance'
  | 'investment'
  | 'rental'
  | 'business'
  | 'side_hustle'
  | 'passive'
  | 'other'

export type WorkType = 'full_time' | 'part_time' | 'contract' | 'freelance' | 'passive'

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
  /** @encrypted — in cents */
  credit_limit: Money | null
  /** @encrypted — basis points */
  interest_rate: BasisPoints | null
  is_active: boolean
  color: string | null
  icon: string | null
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
  deleted_at: Timestamp | null
}
