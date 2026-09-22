// ============================================================================
// services/finance — types (mod-finance #47 ① · S1 entity CRUD)
//
// Deps + the FinanceService interface + input types + typed errors. Factory-object
// shape, hoisted closures, no `this.` (the ② destructure-consumption shape; the
// checkins/notes precedent). Bespoke Error subclasses (ServiceError reconcile → DB-11).
// S1 declares the 5-entity CRUD surface; S2–S6 append (ledger · derivations · effect
// handler · external seams · cross-module providers) per delivery/slice-map.md.
// ============================================================================

import type { z } from 'zod'
import type { Account, Asset, Liability, Investment, IncomeStream, Transaction, TransactionType, Money } from '@vida/types'
import type { DrizzleDb } from '../../db/adapter'
import type {
  CreateAccountSchema,
  UpdateAccountSchema,
  CreateTransactionSchema,
  UpdateTransactionSchema,
  CreateAssetSchema,
  UpdateAssetSchema,
  CreateLiabilitySchema,
  UpdateLiabilitySchema,
  CreateInvestmentSchema,
  UpdateInvestmentSchema,
  CreateIncomeStreamSchema,
  UpdateIncomeStreamSchema,
} from '../../validators/finance'

export interface FinanceServiceDeps {
  db: DrizzleDb
  deviceId: string
}

// --- Zod-inferred input shapes (validators/finance.ts) ----------------------
export type CreateAccountInput = z.infer<typeof CreateAccountSchema>
export type UpdateAccountInput = z.infer<typeof UpdateAccountSchema>
export type CreateTransactionInput = z.infer<typeof CreateTransactionSchema>
export type UpdateTransactionInput = z.infer<typeof UpdateTransactionSchema>

/** listTransactions filter (FIN-09) — narrow by account/type/date range; M1 pagination via limit/offset. */
export interface TransactionFilter {
  account_id?: string
  transaction_type?: TransactionType
  from?: string
  to?: string
  limit?: number
  offset?: number
}

/** createTransfer input (FIN-11) — one transfer row; source ≠ destination (FN-4). */
export interface CreateTransferInput {
  fromAccountId: string
  toAccountId: string
  amount: Money
  date: string
  currency?: string
  category?: string | null
  subcategory?: string | null
  description?: string | null
}
export type CreateAssetInput = z.infer<typeof CreateAssetSchema>
export type UpdateAssetInput = z.infer<typeof UpdateAssetSchema>
export type CreateLiabilityInput = z.infer<typeof CreateLiabilitySchema>
export type UpdateLiabilityInput = z.infer<typeof UpdateLiabilitySchema>
export type CreateInvestmentInput = z.infer<typeof CreateInvestmentSchema>
export type UpdateInvestmentInput = z.infer<typeof UpdateInvestmentSchema>
export type CreateIncomeStreamInput = z.infer<typeof CreateIncomeStreamSchema>
export type UpdateIncomeStreamInput = z.infer<typeof UpdateIncomeStreamSchema>

// --- S3: derived analytics DTOs (service-local; @vida/types untouched, BR-S3-2) ------------------
/**
 * FIN-17 — the derived financial overview. All figures are COMPUTED on read (FN-6), never stored.
 * `netWorth` = FN-7 SIMPLE sum (Σ accounts + Σ assets − Σ liabilities), NOT the deferred store tree
 * (FIN-18); investments are not a net-worth term by FN-7's definition. A null asset/liability value is
 * UNKNOWN (counted into `unvalued*`, folded into `partial`), never a silent 0 (BR-S3-4/FN-40).
 */
export interface FinanceOverview {
  totalBalance: Money
  totalAssets: Money
  totalLiabilities: Money
  netWorth: Money
  monthlyIncome: Money
  monthlyExpenses: Money
  month: string // 'YYYY-MM' the monthly figures cover
  unvaluedAssets: number
  unvaluedLiabilities: number
  partial: boolean
}

/** getOverview options — pin the monthly window; default = current calendar month. */
export interface OverviewOptions {
  month?: string // 'YYYY-MM'
}

/**
 * FIN-19 — a single investment's derived value + gain/loss (qty × current_price vs purchase).
 * A missing `currentPrice` is the legitimate "no price set" empty state (`priceSet:false`, null value),
 * NOT an error/partial (BR-S3-5). `gainLossPct` is a RATIO (0.12), not a pre-multiplied percent (D3).
 *
 * `currentValue == null` is the AUTHORITATIVE "value unknown" signal — it is null when EITHER the price OR
 * the quantity is unset (both are schema-nullable). `priceSet` reports only the price dimension (the FN-19
 * empty-state reason); it can be `true` while `currentValue` is null (price set, quantity missing). A consumer
 * decides renderability off `currentValue != null`, never off `priceSet` alone.
 */
export interface InvestmentValue {
  investmentId: string
  quantity: number | null
  currentPrice: Money | null
  purchasePrice: Money | null
  currentValue: Money | null
  costBasis: Money | null
  gainLoss: Money | null
  gainLossPct: number | null
  priceSet: boolean
}

/** FIN-22 chart-dataset primitives (pure derivations; Chart.js render is P6). */
export interface SpendingByCategory {
  category: string | null
  total: Money
}
export interface IncomeExpensePoint {
  period: string // 'YYYY-MM'
  income: Money
  expenses: Money
  net: Money // income − expenses (cash-flow folded in)
}
export interface BreakdownSlice {
  type: string
  total: Money
}
export interface AssetLiabilityBreakdown {
  assets: BreakdownSlice[]
  liabilities: BreakdownSlice[]
}
/** Inclusive 'YYYY-MM-DD' window for the range-scoped chart derivations. */
export interface ChartRange {
  from: string
  to: string
}
/**
 * FIN-22 aggregator — the default chart template. Each dataset is computed INDEPENDENTLY; a data error
 * degrades ONLY that chart (its field → null + its name pushed to `degraded`), never the whole set.
 */
export interface ChartDatasets {
  spendingByCategory: SpendingByCategory[] | null
  incomeVsExpense: IncomeExpensePoint[] | null
  assetLiabilityBreakdown: AssetLiabilityBreakdown | null
  degraded: string[]
}

export interface FinanceService {
  // ── S1: accounts ────────────────────────────────────────────────
  createAccount(input: CreateAccountInput): Promise<Account>
  updateAccount(id: string, patch: UpdateAccountInput): Promise<Account>
  softDeleteAccount(id: string): Promise<void>
  getAccount(id: string): Promise<Account | null>
  listAccounts(): Promise<Account[]>

  // ── S2: transactions + derived balance + transfers ──────────────
  createTransaction(input: CreateTransactionInput): Promise<Transaction>
  updateTransaction(id: string, patch: UpdateTransactionInput): Promise<Transaction>
  softDeleteTransaction(id: string): Promise<void>
  listTransactions(filter?: TransactionFilter): Promise<Transaction[]>
  getTransactionsInRange(start: string, end: string): Promise<Transaction[]>
  createTransfer(input: CreateTransferInput): Promise<Transaction>
  /** DERIVED (FN-3): opening_balance + Σ signed ledger (transfers debit source / credit dest, FN-4). */
  getBalance(accountId: string): Promise<Money>

  // ── S3: derived analytics (read-side, no writes — FN-6) ──────────
  /** FIN-17 — derived overview; netWorth = FN-7 simple sum; monthly totals exclude transfers (FN-12). */
  getOverview(opts?: OverviewOptions): Promise<FinanceOverview>
  /** FIN-19 — one investment's value + gain/loss; missing price = empty state, not error. */
  getInvestmentValue(id: string): Promise<InvestmentValue>
  /** FIN-22 — expenses grouped by category over a range (transfers excluded). */
  getSpendingByCategory(range: ChartRange): Promise<SpendingByCategory[]>
  /** FIN-22 — monthly income vs expense (net = income − expenses) over a range (transfers excluded). */
  getIncomeVsExpense(range: ChartRange): Promise<IncomeExpensePoint[]>
  /** FIN-22 — current asset/liability totals by type (chart approximation; null values sum as 0). */
  getAssetLiabilityBreakdown(): Promise<AssetLiabilityBreakdown>
  /** FIN-22 aggregator — the default chart set; a failing chart degrades alone (`degraded`). */
  getChartDatasets(range: ChartRange): Promise<ChartDatasets>

  // ── S1: assets ──────────────────────────────────────────────────
  createAsset(input: CreateAssetInput): Promise<Asset>
  updateAsset(id: string, patch: UpdateAssetInput): Promise<Asset>
  softDeleteAsset(id: string): Promise<void>
  listAssets(): Promise<Asset[]>

  // ── S1: liabilities ─────────────────────────────────────────────
  createLiability(input: CreateLiabilityInput): Promise<Liability>
  updateLiability(id: string, patch: UpdateLiabilityInput): Promise<Liability>
  softDeleteLiability(id: string): Promise<void>
  listLiabilities(): Promise<Liability[]>

  // ── S1: investments ─────────────────────────────────────────────
  createInvestment(input: CreateInvestmentInput): Promise<Investment>
  updateInvestment(id: string, patch: UpdateInvestmentInput): Promise<Investment>
  softDeleteInvestment(id: string): Promise<void>
  listInvestments(): Promise<Investment[]>

  // ── S1: income streams ──────────────────────────────────────────
  createIncomeStream(input: CreateIncomeStreamInput): Promise<IncomeStream>
  updateIncomeStream(id: string, patch: UpdateIncomeStreamInput): Promise<IncomeStream>
  softDeleteIncomeStream(id: string): Promise<void>
  listIncomeStreams(): Promise<IncomeStream[]>
}

/** FN-4 — a transfer must set a distinct destination account; source == destination or a missing target is invalid. */
export class InvalidTransferError extends Error {
  constructor(public readonly reason: string) {
    super(`Invalid transfer: ${reason}`)
    this.name = 'InvalidTransferError'
  }
}
