// ============================================================================
// services/finance — the service (mod-finance #47 ① · S1 entity CRUD)
//
// CRUD over the finished DB-4 `020_finance` tables (accounts · assets · liabilities
// · investments · income_streams). Factory-object, hoisted closures, no `this.`
// (the ② destructure shape; the checkins precedent). Persistence: DB-6 Repository,
// encryptedFields:[] M1.0 pass-through (FIN-43 → M3/DB-5). All 5 tables carry
// `deleted_at` → softDelete:true.
//
// create() ECHOES the input row (not a DB re-read), so serialize*() backfills every
// notNull-default column + coalesces nullables to null → the returned row is FAITHFUL
// (repository-create-returns-input-row seam; checkins serializeCreate precedent).
// Row → @vida/types interface = a single `_sync_status` string→union cast at the
// boundary (drizzle-row-not-assignable-to-vida-types-interface). The INTENDED cols
// (opening_balance/jurisdiction_code, DB-11 interface reconcile) ride the row spread.
// ============================================================================

import { and, eq, gte, isNull, lte, type SQL } from 'drizzle-orm'
import type { Account, Asset, Liability, Investment, IncomeStream, Transaction, Money } from '@vida/types'
import { createRepository, type CreateInput } from '../../db/repository'
import {
  accounts,
  transactions,
  assets,
  liabilities,
  investments,
  incomeStreams,
  type AccountRow,
  type TransactionRow,
  type AssetRow,
  type LiabilityRow,
  type InvestmentRow,
  type IncomeStreamRow,
} from '../../db/schema/finance'
import {
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
import {
  InvalidTransferError,
  type FinanceService,
  type FinanceServiceDeps,
  type CreateAccountInput,
  type UpdateAccountInput,
  type CreateTransactionInput,
  type UpdateTransactionInput,
  type TransactionFilter,
  type CreateTransferInput,
  type CreateAssetInput,
  type UpdateAssetInput,
  type CreateLiabilityInput,
  type UpdateLiabilityInput,
  type CreateInvestmentInput,
  type UpdateInvestmentInput,
  type CreateIncomeStreamInput,
  type UpdateIncomeStreamInput,
  type OverviewOptions,
  type FinanceOverview,
  type InvestmentValue,
  type ChartRange,
  type SpendingByCategory,
  type IncomeExpensePoint,
  type AssetLiabilityBreakdown,
  type BreakdownSlice,
  type ChartDatasets,
} from './types'

// --- Row → @vida/types interface (single _sync_status cast; INTENDED cols ride the spread) ---
const toAccount = (r: AccountRow): Account => ({ ...r, _sync_status: r._sync_status as Account['_sync_status'] })
// Transaction.tags is a STALE interface field — the inline column was retired → entity_tags (FN-10/SP1).
// S2 returns tags:[]; the real tag read via entity_tags is S6 (FIN-35). (DB-11 interface reconcile.)
const toTransaction = (r: TransactionRow): Transaction => ({
  ...r,
  tags: [],
  _sync_status: r._sync_status as Transaction['_sync_status'],
})

// Newest-first with a STABLE total order — findWhere issues no ORDER BY, and same-date rows are common
// (dates have no time). Tiebreak: created_at desc, then the time-sortable uuidv7 id desc (deterministic).
const byNewest = (a: TransactionRow, b: TransactionRow): number =>
  b.date.localeCompare(a.date) || b.created_at - a.created_at || b.id.localeCompare(a.id)

// S3 date helpers (no date-fns in @vida/core — the checkins inline precedent, service.ts:441).
const currentMonth = (): string => new Date().toISOString().slice(0, 7) // 'YYYY-MM'
const monthWindow = (m: string): { from: string; to: string } => {
  const [y, mo] = m.split('-')
  // Day 0 of the NEXT month = last day of `m`. The 1-based `mo` is passed as Date.UTC's 0-based month
  // index, which lands on the next month; day 0 rolls back to `m`'s last day. UTC → no TZ off-by-one.
  const lastDay = new Date(Date.UTC(Number(y), Number(mo), 0)).getUTCDate()
  return { from: `${m}-01`, to: `${m}-${String(lastDay).padStart(2, '0')}` }
}
const toAsset = (r: AssetRow): Asset => ({ ...r, _sync_status: r._sync_status as Asset['_sync_status'] })
const toLiability = (r: LiabilityRow): Liability => ({ ...r, _sync_status: r._sync_status as Liability['_sync_status'] })
const toInvestment = (r: InvestmentRow): Investment => ({ ...r, _sync_status: r._sync_status as Investment['_sync_status'] })
const toIncomeStream = (r: IncomeStreamRow): IncomeStream => ({
  ...r,
  _sync_status: r._sync_status as IncomeStream['_sync_status'],
})

export function createFinanceService(deps: FinanceServiceDeps): FinanceService {
  const { db, deviceId } = deps
  const cfg = { deviceId, encryptedFields: [] as string[], softDelete: true }

  const accountRepo = createRepository(db, accounts, cfg)
  const txRepo = createRepository(db, transactions, cfg)
  const assetRepo = createRepository(db, assets, cfg)
  const liabilityRepo = createRepository(db, liabilities, cfg)
  const investmentRepo = createRepository(db, investments, cfg)
  const incomeRepo = createRepository(db, incomeStreams, cfg)

  // --- serialize create: backfill notNull-defaults + coalesce nullables to null (faithful echo) ---
  const serializeAccount = (p: CreateAccountInput): CreateInput<typeof accounts> => ({
    name: p.name,
    account_type: p.account_type,
    institution: p.institution ?? null,
    currency: p.currency ?? 'USD',
    current_balance: p.current_balance ?? 0,
    opening_balance: p.opening_balance ?? null,
    credit_limit: p.credit_limit ?? null,
    interest_rate: p.interest_rate ?? null,
    is_active: p.is_active ?? true,
    color: p.color ?? null,
    icon: p.icon ?? null,
    jurisdiction_code: p.jurisdiction_code ?? null,
    deleted_at: null,
  })
  const serializeTransaction = (p: CreateTransactionInput): CreateInput<typeof transactions> => ({
    account_id: p.account_id,
    transfer_to_account_id: p.transfer_to_account_id ?? null,
    transaction_type: p.transaction_type,
    amount: p.amount,
    currency: p.currency ?? 'USD',
    category: p.category ?? null,
    category_bidx: p.category_bidx ?? null,
    subcategory: p.subcategory ?? null,
    description: p.description ?? null,
    date: p.date,
    is_recurring: p.is_recurring ?? false,
    recurring_frequency: p.recurring_frequency ?? null,
    jurisdiction_code: p.jurisdiction_code ?? null,
    deleted_at: null,
  })
  const serializeAsset = (p: CreateAssetInput): CreateInput<typeof assets> => ({
    name: p.name,
    asset_type: p.asset_type,
    purchase_date: p.purchase_date ?? null,
    purchase_price: p.purchase_price ?? null,
    current_value: p.current_value ?? null,
    depreciation_rate: p.depreciation_rate ?? null,
    location: p.location ?? null,
    jurisdiction_code: p.jurisdiction_code ?? null,
    deleted_at: null,
  })
  const serializeLiability = (p: CreateLiabilityInput): CreateInput<typeof liabilities> => ({
    name: p.name,
    liability_type: p.liability_type,
    original_amount: p.original_amount ?? null,
    current_balance: p.current_balance ?? null,
    interest_rate: p.interest_rate ?? null,
    monthly_payment: p.monthly_payment ?? null,
    due_date: p.due_date ?? null,
    lender: p.lender ?? null,
    payment_frequency: p.payment_frequency ?? null,
    next_payment_date: p.next_payment_date ?? null,
    interest_type: p.interest_type ?? null,
    payoff_date: p.payoff_date ?? null,
    deleted_at: null,
  })
  const serializeInvestment = (p: CreateInvestmentInput): CreateInput<typeof investments> => ({
    account_id: p.account_id ?? null,
    name: p.name,
    investment_type: p.investment_type,
    ticker_symbol: p.ticker_symbol ?? null,
    quantity: p.quantity ?? null,
    purchase_price: p.purchase_price ?? null,
    current_price: p.current_price ?? null,
    jurisdiction_code: p.jurisdiction_code ?? null,
    deleted_at: null,
  })
  const serializeIncome = (p: CreateIncomeStreamInput): CreateInput<typeof incomeStreams> => ({
    name: p.name,
    income_type: p.income_type,
    work_type: p.work_type ?? null,
    amount: p.amount,
    frequency: p.frequency ?? 'monthly',
    is_active: p.is_active ?? true,
    employer: p.employer ?? null,
    start_date: p.start_date ?? null,
    end_date: p.end_date ?? null,
    next_payment_date: p.next_payment_date ?? null,
    jurisdiction_code: p.jurisdiction_code ?? null,
    deleted_at: null,
  })

  // FN-4 — a transfer MUST set a distinct destination; a non-transfer MUST leave it null (fail-loud).
  function assertTransferShape(type: string, transferTo: string | null | undefined, sourceId: string): void {
    if (type === 'transfer') {
      if (transferTo == null) throw new InvalidTransferError('a transfer requires transfer_to_account_id')
      if (transferTo === sourceId) throw new InvalidTransferError('source and destination must differ')
    } else if (transferTo != null) {
      throw new InvalidTransferError(`a ${type} must not set transfer_to_account_id`)
    }
  }

  // FN-3/FN-4 — DERIVED balance: opening_balance + Σ signed ledger. Outgoing rows (account_id=acct)
  // sign income +/expense −/transfer −; incoming transfer rows (transfer_to_account_id=acct) add +.
  // findWhere skips the soft-delete filter → add isNull(deleted_at) explicitly (repository-findwhere seam).
  async function getBalance(accountId: string): Promise<Money> {
    const acct = await accountRepo.findById(accountId)
    if (acct == null) throw new Error(`account not found: ${accountId}`)
    let bal: number = acct.opening_balance ?? 0
    const out = await txRepo.findWhere(
      and(eq(transactions.account_id, accountId), isNull(transactions.deleted_at)) as SQL,
    )
    for (const r of out) {
      if (r.transaction_type === 'income') bal += r.amount
      else if (r.transaction_type === 'expense') bal -= r.amount
      else if (r.transaction_type === 'transfer') bal -= r.amount // outgoing transfer debits the source
    }
    const incoming = await txRepo.findWhere(
      and(eq(transactions.transfer_to_account_id, accountId), isNull(transactions.deleted_at)) as SQL,
    )
    for (const r of incoming) bal += r.amount // incoming transfer credits the destination
    return bal
  }

  // --- S3 derived analytics (hoisted closures; the chart derivations are shared by getChartDatasets) ---
  // Raw rows in an inclusive [start,end] date range. findWhere skips the soft-delete filter → add isNull.
  async function txRowsInRange(start: string, end: string): Promise<TransactionRow[]> {
    return txRepo.findWhere(
      and(gte(transactions.date, start), lte(transactions.date, end), isNull(transactions.deleted_at)) as SQL,
    )
  }

  // FIN-22 — expenses grouped by category (income + transfer rows dropped, BR-S3-3); desc by total.
  const spendingByCategory = async (range: ChartRange): Promise<SpendingByCategory[]> => {
    const byCat = new Map<string | null, number>()
    for (const t of await txRowsInRange(range.from, range.to)) {
      if (t.transaction_type !== 'expense') continue
      byCat.set(t.category, (byCat.get(t.category) ?? 0) + t.amount)
    }
    return [...byCat.entries()]
      .map(([category, total]) => ({ category, total }))
      // desc by total, then a STABLE category tiebreak — findWhere issues no ORDER BY, so equal totals would
      // otherwise return in nondeterministic row order across devices (the S2 byNewest precedent, service.ts:88).
      .sort((a, b) => b.total - a.total || (a.category ?? '').localeCompare(b.category ?? ''))
  }

  // FIN-22 — monthly income vs expense (net = income − expenses); transfers excluded (FN-12). No zero-fill (R3).
  const incomeVsExpense = async (range: ChartRange): Promise<IncomeExpensePoint[]> => {
    const byPeriod = new Map<string, { income: number; expenses: number }>()
    for (const t of await txRowsInRange(range.from, range.to)) {
      if (t.transaction_type === 'transfer') continue
      const period = t.date.slice(0, 7)
      const bucket = byPeriod.get(period) ?? { income: 0, expenses: 0 }
      if (t.transaction_type === 'income') bucket.income += t.amount
      else bucket.expenses += t.amount
      byPeriod.set(period, bucket)
    }
    return [...byPeriod.entries()]
      .map(([period, b]) => ({ period, income: b.income, expenses: b.expenses, net: b.income - b.expenses }))
      .sort((a, b) => a.period.localeCompare(b.period))
  }

  // FIN-22 — current asset/liability totals by type; null value sums as 0 (chart approximation, BR-S3-4 note).
  const assetLiabilityBreakdown = async (): Promise<AssetLiabilityBreakdown> => {
    const group = <T>(rows: T[], typeOf: (r: T) => string, valOf: (r: T) => number | null): BreakdownSlice[] => {
      const m = new Map<string, number>()
      for (const r of rows) m.set(typeOf(r), (m.get(typeOf(r)) ?? 0) + (valOf(r) ?? 0))
      // desc by total, then a stable `type` tiebreak (findAll has no ORDER BY — same determinism guard as above).
      return [...m.entries()]
        .map(([type, total]) => ({ type, total }))
        .sort((a, b) => b.total - a.total || a.type.localeCompare(b.type))
    }
    const [assetRows, liabilityRows] = [await assetRepo.findAll(), await liabilityRepo.findAll()]
    return {
      assets: group(assetRows, (a) => a.asset_type, (a) => a.current_value),
      liabilities: group(liabilityRows, (l) => l.liability_type, (l) => l.current_balance),
    }
  }

  // Update/soft-delete on a missing id fail loud via the repository's own throw
  // (`Error('Row not found: <id>')`, repository.ts:412) — the checkins/journals precedent,
  // no finance-local pre-read guard. Soft-delete-aware update rejection is a repo-wide
  // concern (update() re-reads without the deleted_at filter) → DB-11, not a finance patch.
  const service: FinanceService = {
    // ── accounts (FIN-01/02/03/04) ──────────────────────────────────
    createAccount: async (input: CreateAccountInput): Promise<Account> => {
      const p = CreateAccountSchema.parse(input)
      return toAccount(await accountRepo.create(serializeAccount(p)))
    },
    updateAccount: async (id: string, patch: UpdateAccountInput): Promise<Account> => {
      const p = UpdateAccountSchema.parse(patch)
      return toAccount(await accountRepo.update(id, p))
    },
    softDeleteAccount: async (id: string): Promise<void> => {
      await accountRepo.delete(id)
    },
    getAccount: async (id: string): Promise<Account | null> => {
      const row = await accountRepo.findById(id)
      return row ? toAccount(row) : null
    },
    listAccounts: async (): Promise<Account[]> => (await accountRepo.findAll()).map(toAccount),

    // ── transactions + balance + transfers (FIN-05/06/07/08/09/10/11/12) ──
    createTransaction: async (input: CreateTransactionInput): Promise<Transaction> => {
      const p = CreateTransactionSchema.parse(input)
      assertTransferShape(p.transaction_type, p.transfer_to_account_id, p.account_id) // FN-4
      // NB: the create-side achievement emit (FIN-31) is a cross-module seam wired in S6.
      return toTransaction(await txRepo.create(serializeTransaction(p)))
    },
    updateTransaction: async (id: string, patch: UpdateTransactionInput): Promise<Transaction> => {
      const p = UpdateTransactionSchema.parse(patch)
      // Re-validate FN-4 when ANY of its three legs changes (type · transfer_to · account_id) — an
      // account_id change alone can turn a transfer into a self-transfer (source == dest).
      if (
        p.transaction_type !== undefined ||
        p.transfer_to_account_id !== undefined ||
        p.account_id !== undefined
      ) {
        const existing = await txRepo.findById(id)
        if (existing == null) throw new Error(`Row not found: ${id}`)
        const type = p.transaction_type ?? existing.transaction_type
        const transferTo =
          p.transfer_to_account_id !== undefined ? p.transfer_to_account_id : existing.transfer_to_account_id
        assertTransferShape(type, transferTo, p.account_id ?? existing.account_id)
      }
      return toTransaction(await txRepo.update(id, p))
    },
    softDeleteTransaction: async (id: string): Promise<void> => {
      await txRepo.delete(id) // balance re-derives on the next getBalance (FN-3)
    },
    listTransactions: async (filter: TransactionFilter = {}): Promise<Transaction[]> => {
      const clauses: SQL[] = [isNull(transactions.deleted_at)]
      if (filter.account_id) clauses.push(eq(transactions.account_id, filter.account_id))
      if (filter.transaction_type) clauses.push(eq(transactions.transaction_type, filter.transaction_type))
      if (filter.from) clauses.push(gte(transactions.date, filter.from))
      if (filter.to) clauses.push(lte(transactions.date, filter.to))
      const rows = await txRepo.findWhere(and(...clauses) as SQL)
      // Newest first; M1 pagination = in-memory slice (single-user local ledger — findWhere has no limit/offset).
      rows.sort(byNewest)
      const start = filter.offset ?? 0
      const sliced = filter.limit != null ? rows.slice(start, start + filter.limit) : rows.slice(start)
      return sliced.map(toTransaction)
    },
    getTransactionsInRange: async (start: string, end: string): Promise<Transaction[]> => {
      const rows = await txRepo.findWhere(
        and(gte(transactions.date, start), lte(transactions.date, end), isNull(transactions.deleted_at)) as SQL,
      )
      rows.sort(byNewest)
      return rows.map(toTransaction)
    },
    createTransfer: async (input: CreateTransferInput): Promise<Transaction> => {
      if (input.fromAccountId === input.toAccountId) {
        throw new InvalidTransferError('source and destination must differ')
      }
      // One transfer row (FN-4): account_id=source, transfer_to_account_id=dest; both balances derive from it.
      return toTransaction(
        await txRepo.create(
          serializeTransaction({
            account_id: input.fromAccountId,
            transfer_to_account_id: input.toAccountId,
            transaction_type: 'transfer',
            amount: input.amount,
            date: input.date,
            currency: input.currency,
            category: input.category,
            subcategory: input.subcategory,
            description: input.description,
          }),
        ),
      )
    },
    getBalance,

    // ── S3: derived analytics (read-side, no writes — FN-6) ──────────
    // FIN-17 — netWorth = FN-7 SIMPLE sum (accounts + assets − liabilities; investments NOT a term, deferred
    // store-tree FIN-18). Null asset/liability value = UNKNOWN → counted into unvalued* + partial, never a
    // silent 0 (BR-S3-4/FN-40). Monthly income/expense exclude transfers (FN-12).
    getOverview: async (opts: OverviewOptions = {}): Promise<FinanceOverview> => {
      const month = opts.month ?? currentMonth()
      const { from, to } = monthWindow(month)

      let totalBalance = 0
      let balanceThrew = false
      for (const a of await accountRepo.findAll()) {
        try {
          totalBalance += await getBalance(a.id)
        } catch {
          balanceThrew = true // a per-account compute failure flags partial; the account contributes 0
        }
      }

      let totalAssets = 0
      let unvaluedAssets = 0
      for (const a of await assetRepo.findAll()) {
        if (a.current_value == null) unvaluedAssets += 1
        else totalAssets += a.current_value
      }
      let totalLiabilities = 0
      let unvaluedLiabilities = 0
      for (const l of await liabilityRepo.findAll()) {
        if (l.current_balance == null) unvaluedLiabilities += 1
        else totalLiabilities += l.current_balance
      }

      let monthlyIncome = 0
      let monthlyExpenses = 0
      for (const t of await txRowsInRange(from, to)) {
        if (t.transaction_type === 'income') monthlyIncome += t.amount
        else if (t.transaction_type === 'expense') monthlyExpenses += t.amount
      }

      return {
        totalBalance,
        totalAssets,
        totalLiabilities,
        netWorth: totalBalance + totalAssets - totalLiabilities, // FN-7 simple sum
        monthlyIncome,
        monthlyExpenses,
        month,
        unvaluedAssets,
        unvaluedLiabilities,
        partial: balanceThrew || unvaluedAssets > 0 || unvaluedLiabilities > 0,
      }
    },

    // FIN-19 — qty × current_price + gain/loss vs purchase. Missing price = "no price set" empty state
    // (priceSet:false, null value), NOT an error/partial (BR-S3-5). Not-found throws (the getBalance precedent).
    getInvestmentValue: async (id: string): Promise<InvestmentValue> => {
      const inv = await investmentRepo.findById(id)
      if (inv == null) throw new Error(`investment not found: ${id}`)
      const { quantity } = inv
      const currentPrice = inv.current_price
      const purchasePrice = inv.purchase_price
      // Fractional shares × integer cents → round to integer cents (rounded independently — display-grade, R2).
      const currentValue = currentPrice != null && quantity != null ? Math.round(quantity * currentPrice) : null
      const costBasis = purchasePrice != null && quantity != null ? Math.round(quantity * purchasePrice) : null
      const gainLoss = currentValue != null && costBasis != null ? currentValue - costBasis : null
      // Ratio (D3); null unless costBasis is strictly positive — 0 avoids divide-by-zero, ≤0 (e.g. a short's
      // negative quantity) makes the percentage sign-meaningless, so we report null rather than a wrong number.
      const gainLossPct = gainLoss != null && costBasis != null && costBasis > 0 ? gainLoss / costBasis : null
      // `currentValue != null` is the authoritative "value is known" signal (null when EITHER price or quantity
      // is unset). `priceSet` is the price-specific empty-state reason only (FN-19 "no price set") — a consumer
      // renders a value iff currentValue != null, not off priceSet alone.
      return {
        investmentId: id,
        quantity,
        currentPrice,
        purchasePrice,
        currentValue,
        costBasis,
        gainLoss,
        gainLossPct,
        priceSet: currentPrice != null,
      }
    },

    // FIN-22 chart derivations (delegate to the hoisted closures — shared with getChartDatasets).
    getSpendingByCategory: spendingByCategory,
    getIncomeVsExpense: incomeVsExpense,
    getAssetLiabilityBreakdown: assetLiabilityBreakdown,

    // FIN-22 aggregator — each dataset computed INDEPENDENTLY; a throw degrades ONLY that chart (its field →
    // null, its name → `degraded`), never the whole set (FN-40; the journals/dashboard.ts degrade precedent).
    getChartDatasets: async (range: ChartRange): Promise<ChartDatasets> => {
      const degraded: string[] = []
      const safe = async <T>(name: string, fn: () => Promise<T>): Promise<T | null> => {
        try {
          return await fn()
        } catch {
          degraded.push(name)
          return null
        }
      }
      return {
        spendingByCategory: await safe('spendingByCategory', () => spendingByCategory(range)),
        incomeVsExpense: await safe('incomeVsExpense', () => incomeVsExpense(range)),
        assetLiabilityBreakdown: await safe('assetLiabilityBreakdown', () => assetLiabilityBreakdown()),
        degraded,
      }
    },

    // ── assets (FIN-13) ─────────────────────────────────────────────
    createAsset: async (input: CreateAssetInput): Promise<Asset> => {
      const p = CreateAssetSchema.parse(input)
      return toAsset(await assetRepo.create(serializeAsset(p)))
    },
    updateAsset: async (id: string, patch: UpdateAssetInput): Promise<Asset> => {
      const p = UpdateAssetSchema.parse(patch)
      return toAsset(await assetRepo.update(id, p))
    },
    softDeleteAsset: async (id: string): Promise<void> => {
      await assetRepo.delete(id)
    },
    listAssets: async (): Promise<Asset[]> => (await assetRepo.findAll()).map(toAsset),

    // ── liabilities (FIN-14 + G9) ───────────────────────────────────
    createLiability: async (input: CreateLiabilityInput): Promise<Liability> => {
      const p = CreateLiabilitySchema.parse(input)
      return toLiability(await liabilityRepo.create(serializeLiability(p)))
    },
    updateLiability: async (id: string, patch: UpdateLiabilityInput): Promise<Liability> => {
      const p = UpdateLiabilitySchema.parse(patch)
      return toLiability(await liabilityRepo.update(id, p))
    },
    softDeleteLiability: async (id: string): Promise<void> => {
      await liabilityRepo.delete(id)
    },
    listLiabilities: async (): Promise<Liability[]> => (await liabilityRepo.findAll()).map(toLiability),

    // ── investments (FIN-15) ────────────────────────────────────────
    createInvestment: async (input: CreateInvestmentInput): Promise<Investment> => {
      const p = CreateInvestmentSchema.parse(input)
      return toInvestment(await investmentRepo.create(serializeInvestment(p)))
    },
    updateInvestment: async (id: string, patch: UpdateInvestmentInput): Promise<Investment> => {
      const p = UpdateInvestmentSchema.parse(patch)
      return toInvestment(await investmentRepo.update(id, p))
    },
    softDeleteInvestment: async (id: string): Promise<void> => {
      await investmentRepo.delete(id)
    },
    listInvestments: async (): Promise<Investment[]> => (await investmentRepo.findAll()).map(toInvestment),

    // ── income streams (FIN-16 + G9) ────────────────────────────────
    createIncomeStream: async (input: CreateIncomeStreamInput): Promise<IncomeStream> => {
      const p = CreateIncomeStreamSchema.parse(input)
      return toIncomeStream(await incomeRepo.create(serializeIncome(p)))
    },
    updateIncomeStream: async (id: string, patch: UpdateIncomeStreamInput): Promise<IncomeStream> => {
      const p = UpdateIncomeStreamSchema.parse(patch)
      return toIncomeStream(await incomeRepo.update(id, p))
    },
    softDeleteIncomeStream: async (id: string): Promise<void> => {
      await incomeRepo.delete(id)
    },
    listIncomeStreams: async (): Promise<IncomeStream[]> => (await incomeRepo.findAll()).map(toIncomeStream),
  }

  return service
}
