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
import type {
  StagedRow,
  MatchTolerance,
  CommitResult,
  ImportStagingPort,
  IngestionGuard,
  IngestionAct,
} from '../../foundation/ingestion'
import type { AssociationResolver, TagAssociation } from '../../foundation/spaces'

export interface FinanceServiceDeps {
  db: DrizzleDb
  deviceId: string
  // ── S5: deferred-store ports (optional; each defaults to a deny-safe "not-configured" impl) ──
  fx?: FxRatePort // default: in-memory (rates settable in-process; swapped for Preferences at M2)
  recurringMode?: RecurringModePort // default: forecast-only (never auto-materializes)
  persistedAggregates?: PersistedAggregatesPort // default: disabled (compute-only)
  managedCategory?: ManagedCategoryPort // default: passthrough (free-text allowed)
  stagingPort?: ImportStagingPort // default: in-memory (durable import_staging = M2); INSTANCE-shared
  ingestionGuard?: IngestionGuard // BUILT #44, app/M2-injected; absent ⇒ external access fails closed
  importTolerance?: MatchTolerance // default: { dateDays: 3, amountCents: 0 } (exact-amount, ±3d)
  // ── S6: cross-module consumer port ──
  associations?: AssociationResolver // FIN-35 tag read (Spaces-owned #40); absent ⇒ getEntityTags → [] (deny-safe)
  // NB (FIN-31): the achievement-feed emit `effects` dep + concrete emit are added by Gamification at #48
  // (achievements PULL finance's net_worth via the ADR-011 §3.6 seam — FIN-33 — so finance need not push).
}

// FIN-34/35 — the finance entities that may carry notes/tags. Finance DECLARES this set; the app registers it into
// the shared taggable-type registry (Spaces/Notes own the registry). Finance authors no registry, no tag DDL.
export const FINANCE_ENTITY_TYPES = [
  'account',
  'transaction',
  'asset',
  'investment',
  'liability',
  'income_stream',
] as const
export type FinanceEntityType = (typeof FINANCE_ENTITY_TYPES)[number]

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

// ── S5: deferred-store ports (deny-safe defaults live in config-seams.ts) ────────────────────────
/** FX rates — device-side/manual only (ZK-1, never server-fetched). `getRate` null = not configured. */
export interface FxRatePort {
  getRate(from: string, to: string): Promise<number | null>
  setRate(from: string, to: string, rate: number): Promise<void>
}
/** Recurring mode — a Preferences setting (deferred). Default 'forecast' (never auto-materializes, BR-S5-1). */
export interface RecurringModePort {
  mode(): Promise<'forecast' | 'materialize'>
}
/** Persisted-aggregates opt-in (deferred Preferences). Default false (compute-only, BR-S5-3). */
export interface PersistedAggregatesPort {
  enabled(): Promise<boolean>
}
/** Managed-category resolve (deferred store). Default passthrough (free-text, BR-S5-6). null = not in list. */
export interface ManagedCategoryPort {
  resolve(category: string): Promise<string | null>
}

// ── S5: DTOs ─────────────────────────────────────────────────────
/** A projected occurrence of a recurring transaction — a PREDICTION, never a written row (FIN-20). */
export interface RecurringForecast {
  date: string // 'YYYY-MM-DD'
  amount: Money
  account_id: string
  transaction_type: TransactionType
  sourceTransactionId: string
}
/** The device/P6 CSV-OFX parse output; maps to an ingestion StagedRow (its `parsed` carries this) for matching,
 *  and carries the finance fields needed to CREATE the transaction on commit (FIN-28). */
export interface ParsedStatementRow {
  sourceRowId: string
  date: string // 'YYYY-MM-DD'
  amountCents: Money
  account_id: string
  transaction_type: TransactionType
  description?: string | null
  category?: string | null
}

// ── S5: typed errors (FN-40 fail-loud) ───────────────────────────
/** FIN-21 — a cross-currency conversion with no configured rate (never a silent 1:1). */
export class FxRateMissingError extends Error {
  constructor(
    public readonly from: string,
    public readonly to: string,
  ) {
    super(`No FX rate configured for ${from} → ${to} (set one device-side; rates are never server-fetched)`)
    this.name = 'FxRateMissingError'
  }
}
/** FIN-28/29 — a path that would need server plaintext / an ungranted external reach (refused, not downgraded). */
export class ZeroKnowledgeViolationError extends Error {
  constructor(reason: string) {
    super(`Refused (zero-knowledge): ${reason}`)
    this.name = 'ZeroKnowledgeViolationError'
  }
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

  // ── S5: external / ingestion / config seams (deny-safe over deferred stores) ──
  /** FIN-20 — project recurring txns across a range; creates NO row. */
  forecastRecurring(range: ChartRange): Promise<RecurringForecast[]>
  /** FIN-20 — materialize due recurring rows; `[]` under the default forecast-only mode. */
  materializeDue(asOf?: string): Promise<Transaction[]>
  /** FIN-21 — convert to base currency; identity if equal; missing rate → FxRateMissingError (no silent 1:1). */
  convertToBase(amount: Money, from: string, base: string): Promise<Money>
  getFxRate(from: string, to: string): Promise<number | null>
  setFxRate(from: string, to: string, rate: number): Promise<void>
  /** FIN-30 — resolve a category against the managed list; free-text passthrough default. No category_bidx (M3). */
  resolveCategory(category: string): Promise<{ category: string; managed: boolean }>
  /** FIN-25 — whether derived aggregates are persisted (opt-in); default false → S3 compute-only. */
  aggregatesPersisted(): Promise<boolean>
  /** FIN-28 — stage parsed CSV/OFX rows + auto-match vs existing txns; returns a batch for user confirm. */
  importStatement(rows: ParsedStatementRow[]): Promise<{ batchId: string; staged: StagedRow[] }>
  /** FIN-28 — commit the user-confirmed rows of a batch as real transactions (never silent duplicate). */
  confirmImport(batchId: string, confirmedSourceRowIds: string[]): Promise<CommitResult>
  /** FIN-29 — gate external access via the injected ingestion guard; no guard ⇒ ZeroKnowledgeViolationError. */
  assertExternalAccess(act: IngestionAct): Promise<void>

  // ── S6: cross-module read seams ──────────────────────────────────
  /** FIN-33 — the Purpose measurement-source read seam (ADR-011 §3.6): net worth + its partial flag. Feeder-only. */
  getNetWorth(opts?: OverviewOptions): Promise<{ value: Money; partial: boolean }>
  /** FIN-35 — a finance entity's tags via the shared entity_tags primitive (deny-safe → [] when no resolver). */
  getEntityTags(entityType: string, entityId: string): Promise<TagAssociation[]>

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
