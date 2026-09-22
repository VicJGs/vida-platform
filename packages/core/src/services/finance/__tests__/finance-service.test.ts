// ============================================================================
// mod-finance #47 ① · S1 — entity CRUD service (LIF-122)
//
// Node / better-sqlite3 live-store harness (mirrors checkins/preferences): REAL data store, UNLOCKED
// vault (IR-a — the sync-hash path runs even with empty [E]), migrate() applies 020_finance so the
// tables exist. Covers the slice-map.md S1 gate: CRUD happy + invalid-enum reject + soft-delete hides +
// not-found guard + faithful create echo (defaults backfilled) + co-transactional sync_queue enqueue.
// ============================================================================

import { describe, it, expect, beforeEach } from 'vitest'
import Database from 'better-sqlite3'
import { createDrizzleProxy, type SqliteDriver, type DrizzleDb } from '../../../db/adapter'
import { migrate } from '../../../db/migrations/runner'
import { initVault } from '../../../encryption/vault'
import { syncQueue } from '../../../db/schema'
import { appliedEffects } from '../../../db/schema/foundation/effects'
import { createEffectRail, createEffectRegistry, type EffectEvent } from '../../../foundation/effects'
import {
  createFinanceService,
  InvalidTransferError,
  createFinanceEffectHandlers,
  registerFinanceEffects,
  denySafeStoreLockPort,
  MalformedMoveMoneyPayload,
  StoreLayerNotActive,
  type StoreLockPort,
  type FinanceService,
} from '../index'

function createBetterSqlite3Driver(db: Database.Database): SqliteDriver {
  return {
    async exec(sqlText, params) {
      const stmt = db.prepare(sqlText)
      if (stmt.reader) {
        const rows = stmt.all(...(params ?? [])) as Record<string, unknown>[]
        return { rows, changes: 0, lastInsertRowId: 0 }
      }
      const info = stmt.run(...(params ?? []))
      return { rows: [], changes: info.changes, lastInsertRowId: info.lastInsertRowid }
    },
    async run(sqlText, params) {
      if (!params || params.length === 0) db.exec(sqlText)
      else db.prepare(sqlText).run(...params)
    },
    async query(sqlText, params) {
      return db.prepare(sqlText).all(...(params ?? [])) as never
    },
    async values(sqlText, params) {
      return db.prepare(sqlText).raw().all(...(params ?? [])) as unknown[][]
    },
    async batch(statements) {
      for (const s of statements) {
        if (s.params && s.params.length > 0) db.prepare(s.sql).run(...s.params)
        else db.exec(s.sql)
      }
    },
    async close() {
      db.close()
    },
  }
}

interface Harness {
  svc: FinanceService
  db: DrizzleDb
  bsql: Database.Database // raw handle — S3 uses it to DROP a table for the live-store per-chart degrade test
}

async function setup(): Promise<Harness> {
  await initVault()
  const bsql = new Database(':memory:')
  const driver = createBetterSqlite3Driver(bsql)
  await migrate(driver)
  const db = createDrizzleProxy(driver)
  const svc = createFinanceService({ db, deviceId: 'test-device' })
  return { svc, db, bsql }
}

describe('mod-finance S1 — entity CRUD', () => {
  let h: Harness
  beforeEach(async () => {
    h = await setup()
  })

  // ── accounts ──────────────────────────────────────────────────────
  describe('accounts (FIN-01/02/03/04)', () => {
    it('createAccount echoes a FAITHFUL row — notNull-defaults backfilled, nullables → null (FIN-01)', async () => {
      const a = await h.svc.createAccount({ name: 'Checking', account_type: 'checking' })
      expect(a.id).toBeTruthy()
      expect(a.currency).toBe('USD') // default backfilled (not undefined)
      expect(a.current_balance).toBe(0) // default backfilled
      expect(a.is_active).toBe(true) // default backfilled
      expect(a.institution).toBeNull() // nullable coalesced (not undefined)
      expect(a.credit_limit).toBeNull()
      expect(a.deleted_at).toBeNull()
      expect(a._sync_status).toBe('pending')
    })

    it('createAccount honours an explicit opening_balance seed (FIN-01, FN-3)', async () => {
      const a = await h.svc.createAccount({
        name: 'Savings',
        account_type: 'savings',
        currency: 'BRL',
        opening_balance: 150_00,
        current_balance: 150_00,
      })
      expect(a.currency).toBe('BRL')
      expect(a.current_balance).toBe(150_00)
      expect(a.opening_balance).toBe(150_00)
    })

    it('createAccount rejects an invalid account_type (enum CHECK, FIN-41)', async () => {
      await expect(
        // @ts-expect-error — invalid enum value is the failure path under test
        h.svc.createAccount({ name: 'X', account_type: 'not_a_type' }),
      ).rejects.toThrow()
    })

    it('createAccount enqueues a co-transactional sync_queue row (ADR-004 §3.4)', async () => {
      await h.svc.createAccount({ name: 'Checking', account_type: 'checking' })
      const queued = await h.db.select().from(syncQueue).all()
      expect(queued.length).toBeGreaterThan(0)
    })

    it('updateAccount patches + re-validates; listAccounts reflects it', async () => {
      const a = await h.svc.createAccount({ name: 'Checking', account_type: 'checking' })
      const upd = await h.svc.updateAccount(a.id, { name: 'Main Checking', is_active: false })
      expect(upd.name).toBe('Main Checking')
      expect(upd.is_active).toBe(false)
      const list = await h.svc.listAccounts()
      expect(list.find((x) => x.id === a.id)?.name).toBe('Main Checking')
    })

    it('updateAccount on a missing id fails loud via the repo throw (FIN-40)', async () => {
      await expect(h.svc.updateAccount('missing-id', { name: 'x' })).rejects.toThrow(/not found/i)
    })

    it('softDeleteAccount HIDES from list + getAccount (FIN-03 soft delete)', async () => {
      const a = await h.svc.createAccount({ name: 'Checking', account_type: 'checking' })
      await h.svc.softDeleteAccount(a.id)
      expect(await h.svc.getAccount(a.id)).toBeNull()
      expect((await h.svc.listAccounts()).find((x) => x.id === a.id)).toBeUndefined()
    })

    it('softDeleteAccount on a missing id fails loud via the repo throw', async () => {
      await expect(h.svc.softDeleteAccount('missing-id')).rejects.toThrow(/not found/i)
    })
  })

  // ── assets / liabilities / investments / income ───────────────────
  it('createAsset + listAssets (FIN-13)', async () => {
    const asset = await h.svc.createAsset({ name: 'Car', asset_type: 'vehicle', current_value: 30_000_00 })
    expect(asset.current_value).toBe(30_000_00)
    expect(asset.purchase_price).toBeNull()
    expect((await h.svc.listAssets()).map((x) => x.id)).toContain(asset.id)
  })

  it('createLiability carries the restored G9 schedule fields (FIN-14/27)', async () => {
    const l = await h.svc.createLiability({
      name: 'Mortgage',
      liability_type: 'mortgage',
      current_balance: 200_000_00,
      interest_type: 'fixed',
      payment_frequency: 'monthly',
      next_payment_date: '2026-10-01',
      payoff_date: '2046-10-01',
    })
    expect(l.interest_type).toBe('fixed')
    expect(l.payment_frequency).toBe('monthly')
    expect(l.next_payment_date).toBe('2026-10-01')
    expect(l.payoff_date).toBe('2046-10-01')
  })

  it('createInvestment (nullable account_id) + soft delete hides (FIN-15)', async () => {
    const inv = await h.svc.createInvestment({ name: 'VOO', investment_type: 'stock', quantity: 10, current_price: 500_00 })
    expect(inv.account_id).toBeNull()
    expect(inv.quantity).toBe(10)
    await h.svc.softDeleteInvestment(inv.id)
    expect((await h.svc.listInvestments()).find((x) => x.id === inv.id)).toBeUndefined()
  })

  it('createIncomeStream echoes faithful defaults (frequency=monthly, is_active=true) + G9 next_payment_date (FIN-16/27)', async () => {
    const inc = await h.svc.createIncomeStream({
      name: 'Salary',
      income_type: 'salary',
      amount: 5_000_00,
      next_payment_date: '2026-10-05',
    })
    expect(inc.frequency).toBe('monthly')
    expect(inc.is_active).toBe(true)
    expect(inc.work_type).toBeNull()
    expect(inc.employer).toBeNull()
    expect(inc.next_payment_date).toBe('2026-10-05')
  })

  it('createIncomeStream rejects an invalid income_type (FIN-41)', async () => {
    await expect(
      // @ts-expect-error — invalid enum value is the failure path under test
      h.svc.createIncomeStream({ name: 'X', income_type: 'not_a_type', amount: 1 }),
    ).rejects.toThrow()
  })
})

describe('mod-finance S2 — ledger + derived balance + transfers', () => {
  let h: Harness
  let acctA: string
  let acctB: string
  beforeEach(async () => {
    h = await setup()
    acctA = (await h.svc.createAccount({ name: 'A', account_type: 'checking', opening_balance: 100_00, current_balance: 100_00 })).id
    acctB = (await h.svc.createAccount({ name: 'B', account_type: 'savings' })).id
  })

  it('getBalance = opening_balance + Σ signed ledger (FN-3): income adds, expense subtracts', async () => {
    expect(await h.svc.getBalance(acctA)).toBe(100_00) // opening only
    await h.svc.createTransaction({ account_id: acctA, transaction_type: 'income', amount: 50_00, date: '2026-09-10' })
    await h.svc.createTransaction({ account_id: acctA, transaction_type: 'expense', amount: 20_00, date: '2026-09-11' })
    expect(await h.svc.getBalance(acctA)).toBe(130_00) // 100 + 50 − 20
  })

  it('createTransaction returns tags:[] — inline tags retired → entity_tags (FN-10, S6)', async () => {
    const t = await h.svc.createTransaction({ account_id: acctA, transaction_type: 'income', amount: 1_00, date: '2026-09-10' })
    expect(t.tags).toEqual([])
    expect(t.transfer_to_account_id).toBeNull()
  })

  it('createTransaction rejects a transfer_to on a non-transfer + a transfer with no target (FN-4)', async () => {
    await expect(
      h.svc.createTransaction({ account_id: acctA, transaction_type: 'expense', amount: 1_00, date: '2026-09-10', transfer_to_account_id: acctB }),
    ).rejects.toBeInstanceOf(InvalidTransferError)
    await expect(
      h.svc.createTransaction({ account_id: acctA, transaction_type: 'transfer', amount: 1_00, date: '2026-09-10' }),
    ).rejects.toBeInstanceOf(InvalidTransferError)
  })

  it('createTransfer moves money: source −amount, destination +amount (FN-4, one row)', async () => {
    const t = await h.svc.createTransfer({ fromAccountId: acctA, toAccountId: acctB, amount: 40_00, date: '2026-09-12' })
    expect(t.transaction_type).toBe('transfer')
    expect(t.transfer_to_account_id).toBe(acctB)
    expect(await h.svc.getBalance(acctA)).toBe(60_00) // 100 − 40
    expect(await h.svc.getBalance(acctB)).toBe(40_00) // 0 + 40
    // exactly one row was created (FN-4 — one transfer row, not two)
    expect((await h.svc.listTransactions()).filter((x) => x.transaction_type === 'transfer')).toHaveLength(1)
  })

  it('createTransfer rejects source == destination (FN-4)', async () => {
    await expect(
      h.svc.createTransfer({ fromAccountId: acctA, toAccountId: acctA, amount: 1_00, date: '2026-09-12' }),
    ).rejects.toBeInstanceOf(InvalidTransferError)
  })

  it('updateTransaction re-derives the balance (FN-3, never a manual correction)', async () => {
    const t = await h.svc.createTransaction({ account_id: acctA, transaction_type: 'expense', amount: 20_00, date: '2026-09-10' })
    expect(await h.svc.getBalance(acctA)).toBe(80_00)
    await h.svc.updateTransaction(t.id, { amount: 5_00 })
    expect(await h.svc.getBalance(acctA)).toBe(95_00) // re-derived: 100 − 5
  })

  it('softDeleteTransaction removes it from the balance derivation + list (FN-3)', async () => {
    const t = await h.svc.createTransaction({ account_id: acctA, transaction_type: 'expense', amount: 30_00, date: '2026-09-10' })
    expect(await h.svc.getBalance(acctA)).toBe(70_00)
    await h.svc.softDeleteTransaction(t.id)
    expect(await h.svc.getBalance(acctA)).toBe(100_00) // deleted row excluded
    expect((await h.svc.listTransactions()).find((x) => x.id === t.id)).toBeUndefined()
  })

  it('listTransactions filters by account/type/range + paginates (FIN-09)', async () => {
    await h.svc.createTransaction({ account_id: acctA, transaction_type: 'income', amount: 1_00, date: '2026-08-01' })
    await h.svc.createTransaction({ account_id: acctA, transaction_type: 'expense', amount: 2_00, date: '2026-09-05' })
    await h.svc.createTransaction({ account_id: acctB, transaction_type: 'income', amount: 3_00, date: '2026-09-06' })
    expect(await h.svc.listTransactions({ account_id: acctA })).toHaveLength(2)
    expect(await h.svc.listTransactions({ transaction_type: 'income' })).toHaveLength(2)
    expect(await h.svc.listTransactions({ from: '2026-09-01', to: '2026-09-30' })).toHaveLength(2)
    // newest-first + pagination
    const page = await h.svc.listTransactions({ limit: 1, offset: 0 })
    expect(page).toHaveLength(1)
    expect(page[0]!.date).toBe('2026-09-06') // newest
  })

  it('getTransactionsInRange returns the ranged ledger, newest first (FIN-10)', async () => {
    await h.svc.createTransaction({ account_id: acctA, transaction_type: 'income', amount: 1_00, date: '2026-06-15' })
    await h.svc.createTransaction({ account_id: acctA, transaction_type: 'income', amount: 2_00, date: '2026-07-15' })
    const june = await h.svc.getTransactionsInRange('2026-06-01', '2026-06-30')
    expect(june).toHaveLength(1)
    expect(june[0]!.date).toBe('2026-06-15')
  })

  it('getBalance on a missing account fails loud', async () => {
    await expect(h.svc.getBalance('missing')).rejects.toThrow(/not found/i)
  })

  it('updateTransaction rejects an account_id change that turns a transfer into a self-transfer (FN-4)', async () => {
    const t = await h.svc.createTransfer({ fromAccountId: acctA, toAccountId: acctB, amount: 10_00, date: '2026-09-12' })
    // changing source to equal the destination (transfer_to=B) must re-trigger FN-4 even though
    // neither transaction_type nor transfer_to_account_id is in the patch.
    await expect(h.svc.updateTransaction(t.id, { account_id: acctB })).rejects.toBeInstanceOf(InvalidTransferError)
  })
})

describe('mod-finance S3 — derived analytics', () => {
  let h: Harness
  beforeEach(async () => {
    h = await setup()
  })

  // ── getOverview (FIN-17) ──────────────────────────────────────────
  describe('getOverview (FIN-17)', () => {
    it('netWorth = FN-7 simple sum; monthly totals EXCLUDE transfers (FN-12); clean path partial:false', async () => {
      const a = await h.svc.createAccount({ name: 'A', account_type: 'checking', opening_balance: 1_000_00, current_balance: 1_000_00 })
      const b = await h.svc.createAccount({ name: 'B', account_type: 'savings' })
      await h.svc.createTransaction({ account_id: a.id, transaction_type: 'income', amount: 200_00, date: '2026-09-10' })
      await h.svc.createTransaction({ account_id: a.id, transaction_type: 'expense', amount: 50_00, date: '2026-09-15' })
      await h.svc.createTransfer({ fromAccountId: a.id, toAccountId: b.id, amount: 30_00, date: '2026-09-20' })
      await h.svc.createAsset({ name: 'Car', asset_type: 'vehicle', current_value: 5_000_00 })
      await h.svc.createLiability({ name: 'Loan', liability_type: 'personal_loan', current_balance: 2_000_00 })

      const o = await h.svc.getOverview({ month: '2026-09' })
      expect(o.totalBalance).toBe(1_150_00) // A: 1000+200−50−30=1120 ; B: +30 = 1150 total
      expect(o.totalAssets).toBe(5_000_00)
      expect(o.totalLiabilities).toBe(2_000_00)
      expect(o.netWorth).toBe(4_150_00) // 1150 + 5000 − 2000
      expect(o.monthlyIncome).toBe(200_00) // transfer's 30 EXCLUDED
      expect(o.monthlyExpenses).toBe(50_00) // transfer's 30 EXCLUDED
      expect(o.month).toBe('2026-09')
      expect(o.unvaluedAssets).toBe(0)
      expect(o.unvaluedLiabilities).toBe(0)
      expect(o.partial).toBe(false)
    })

    it('investments are NOT a net-worth term (FN-7, N1)', async () => {
      await h.svc.createAccount({ name: 'A', account_type: 'checking', opening_balance: 100_00, current_balance: 100_00 })
      const before = (await h.svc.getOverview({ month: '2026-09' })).netWorth
      await h.svc.createInvestment({ name: 'VOO', investment_type: 'stock', quantity: 10, current_price: 500_00 })
      const after = (await h.svc.getOverview({ month: '2026-09' })).netWorth
      expect(after).toBe(before) // 100_00 — the 5000_00 investment value does not move net worth
    })

    it('a null asset/liability value is UNKNOWN — counted + partial, never a silent 0 (BR-S3-4/FN-40)', async () => {
      await h.svc.createAsset({ name: 'House', asset_type: 'real_estate' }) // no current_value
      await h.svc.createAsset({ name: 'Car', asset_type: 'vehicle', current_value: 30_000_00 })
      await h.svc.createLiability({ name: 'Loan', liability_type: 'personal_loan' }) // no current_balance
      const o = await h.svc.getOverview({ month: '2026-09' })
      expect(o.totalAssets).toBe(30_000_00) // the unvalued house contributes 0…
      expect(o.unvaluedAssets).toBe(1) // …but is COUNTED, not silently dropped
      expect(o.unvaluedLiabilities).toBe(1)
      expect(o.partial).toBe(true)
    })

    it('inactive accounts still count toward totalBalance (N2)', async () => {
      await h.svc.createAccount({ name: 'Active', account_type: 'checking', opening_balance: 100_00, current_balance: 100_00 })
      await h.svc.createAccount({ name: 'Closed', account_type: 'checking', opening_balance: 500_00, current_balance: 500_00, is_active: false })
      const o = await h.svc.getOverview({ month: '2026-09' })
      expect(o.totalBalance).toBe(600_00) // both included
    })

    it('empty dataset → all-zero overview, unvalued 0, partial:false', async () => {
      const o = await h.svc.getOverview({ month: '2026-09' })
      expect(o).toMatchObject({ totalBalance: 0, totalAssets: 0, totalLiabilities: 0, netWorth: 0, monthlyIncome: 0, monthlyExpenses: 0, unvaluedAssets: 0, unvaluedLiabilities: 0, partial: false })
    })

    it('defaults to the current calendar month when unpinned', async () => {
      const o = await h.svc.getOverview()
      expect(o.month).toMatch(/^\d{4}-\d{2}$/)
      expect(o.month).toBe(new Date().toISOString().slice(0, 7))
    })
  })

  // ── getInvestmentValue (FIN-19) ───────────────────────────────────
  describe('getInvestmentValue (FIN-19)', () => {
    it('value + gain/loss with fractional-share rounding; gainLossPct is a ratio (D3)', async () => {
      // qty 2.5 × price 100_00 = 250_00 ; cost 2.5 × 80_00 = 200_00 ; gain 50_00 ; pct 0.25
      const inv = await h.svc.createInvestment({ name: 'ETF', investment_type: 'etf', quantity: 2.5, purchase_price: 80_00, current_price: 100_00 })
      const v = await h.svc.getInvestmentValue(inv.id)
      expect(v.currentValue).toBe(250_00)
      expect(v.costBasis).toBe(200_00)
      expect(v.gainLoss).toBe(50_00)
      expect(v.gainLossPct).toBeCloseTo(0.25, 6)
      expect(v.priceSet).toBe(true)
    })

    it('missing current_price = "no price set" empty state (priceSet:false, null value) — NOT a throw (BR-S3-5)', async () => {
      const inv = await h.svc.createInvestment({ name: 'Private', investment_type: 'other', quantity: 5 })
      const v = await h.svc.getInvestmentValue(inv.id)
      expect(v.priceSet).toBe(false)
      expect(v.currentValue).toBeNull()
      expect(v.gainLoss).toBeNull()
      expect(v.gainLossPct).toBeNull()
    })

    it('a zero cost basis yields a null gainLossPct (no divide-by-zero)', async () => {
      const inv = await h.svc.createInvestment({ name: 'Gift', investment_type: 'stock', quantity: 10, purchase_price: 0, current_price: 100_00 })
      const v = await h.svc.getInvestmentValue(inv.id)
      expect(v.currentValue).toBe(1_000_00)
      expect(v.costBasis).toBe(0)
      expect(v.gainLoss).toBe(1_000_00)
      expect(v.gainLossPct).toBeNull()
    })

    it('price set but quantity null → priceSet:true yet currentValue null (currentValue is the authoritative signal)', async () => {
      const inv = await h.svc.createInvestment({ name: 'Held', investment_type: 'stock', current_price: 100_00 }) // no quantity
      const v = await h.svc.getInvestmentValue(inv.id)
      expect(v.priceSet).toBe(true) // the price dimension IS set…
      expect(v.currentValue).toBeNull() // …but value is unknown without a quantity — a consumer keys off this
      expect(v.gainLoss).toBeNull()
      expect(v.gainLossPct).toBeNull()
    })

    it('a missing investment fails loud', async () => {
      await expect(h.svc.getInvestmentValue('missing-id')).rejects.toThrow(/not found/i)
    })
  })

  // ── chart datasets (FIN-22) ───────────────────────────────────────
  describe('chart datasets (FIN-22)', () => {
    beforeEach(async () => {
      const a = (await h.svc.createAccount({ name: 'A', account_type: 'checking' })).id
      const b = (await h.svc.createAccount({ name: 'B', account_type: 'savings' })).id
      await h.svc.createTransaction({ account_id: a, transaction_type: 'expense', amount: 40_00, category: 'food', date: '2026-08-10' })
      await h.svc.createTransaction({ account_id: a, transaction_type: 'expense', amount: 60_00, category: 'food', date: '2026-09-10' })
      await h.svc.createTransaction({ account_id: a, transaction_type: 'expense', amount: 10_00, category: 'rent', date: '2026-09-11' })
      await h.svc.createTransaction({ account_id: a, transaction_type: 'income', amount: 500_00, category: 'salary', date: '2026-09-01' })
      await h.svc.createTransfer({ fromAccountId: a, toAccountId: b, amount: 25_00, date: '2026-09-15' }) // must never appear
    })

    it('getSpendingByCategory groups EXPENSES by category, excludes income + transfers, desc by total', async () => {
      const rows = await h.svc.getSpendingByCategory({ from: '2026-09-01', to: '2026-09-30' })
      expect(rows).toEqual([
        { category: 'food', total: 60_00 },
        { category: 'rent', total: 10_00 },
      ]) // salary income + the 25_00 transfer excluded; desc order
    })

    it('getIncomeVsExpense buckets by month, net = income − expenses, transfers excluded, ascending', async () => {
      const rows = await h.svc.getIncomeVsExpense({ from: '2026-08-01', to: '2026-09-30' })
      expect(rows).toEqual([
        { period: '2026-08', income: 0, expenses: 40_00, net: -40_00 },
        { period: '2026-09', income: 500_00, expenses: 70_00, net: 430_00 }, // transfer's 25 excluded
      ])
    })

    it('getAssetLiabilityBreakdown totals by type; null value sums as 0 (chart approximation)', async () => {
      await h.svc.createAsset({ name: 'Car', asset_type: 'vehicle', current_value: 30_000_00 })
      await h.svc.createAsset({ name: 'Bike', asset_type: 'vehicle', current_value: 2_000_00 })
      await h.svc.createAsset({ name: 'Land', asset_type: 'real_estate' }) // null → 0
      await h.svc.createLiability({ name: 'Loan', liability_type: 'personal_loan', current_balance: 5_000_00 })
      const bd = await h.svc.getAssetLiabilityBreakdown()
      expect(bd.assets).toEqual([
        { type: 'vehicle', total: 32_000_00 },
        { type: 'real_estate', total: 0 },
      ])
      expect(bd.liabilities).toEqual([{ type: 'personal_loan', total: 5_000_00 }])
    })

    it('equal-total categories sort deterministically (stable tiebreak, no ORDER BY)', async () => {
      const a = (await h.svc.createAccount({ name: 'C', account_type: 'checking' })).id
      await h.svc.createTransaction({ account_id: a, transaction_type: 'expense', amount: 10_00, category: 'zeta', date: '2026-10-01' })
      await h.svc.createTransaction({ account_id: a, transaction_type: 'expense', amount: 10_00, category: 'alpha', date: '2026-10-02' })
      const rows = await h.svc.getSpendingByCategory({ from: '2026-10-01', to: '2026-10-31' })
      expect(rows.map((r) => r.category)).toEqual(['alpha', 'zeta']) // equal totals → category asc, not row order
    })

    it('getChartDatasets returns all three on the clean path, degraded empty', async () => {
      const d = await h.svc.getChartDatasets({ from: '2026-08-01', to: '2026-09-30' })
      expect(d.spendingByCategory).not.toBeNull()
      expect(d.incomeVsExpense).not.toBeNull()
      expect(d.assetLiabilityBreakdown).not.toBeNull()
      expect(d.degraded).toEqual([])
    })

    it('a failing chart degrades ALONE — others still return (FN-40, live-store)', async () => {
      // Drop the assets table on the real store → assetLiabilityBreakdown throws; the txn-based charts survive.
      h.bsql.exec('DROP TABLE assets')
      const d = await h.svc.getChartDatasets({ from: '2026-08-01', to: '2026-09-30' })
      expect(d.assetLiabilityBreakdown).toBeNull()
      expect(d.degraded).toContain('assetLiabilityBreakdown')
      expect(d.spendingByCategory).not.toBeNull() // degrades ONLY that chart
      expect(d.incomeVsExpense).not.toBeNull()
    })
  })
})

describe('mod-finance S4 — move_money effect handler', () => {
  let h: Harness
  let rail: ReturnType<typeof createEffectRail>
  let acctA: string
  let acctB: string

  // Build the REAL rail + registry over the same store, register the finance handler (the M1 trusted caller).
  function wire(storeLock?: StoreLockPort): void {
    const registry = createEffectRegistry()
    const handlers = createFinanceEffectHandlers(h.db, 'test-device', storeLock)
    registerFinanceEffects(registry, handlers)
    rail = createEffectRail(h.db, registry)
  }
  const ev = (over: Partial<EffectEvent> & { payload: Record<string, unknown> }): EffectEvent => ({
    subjectNaturalKey: 'rule-1',
    transition: 'reward',
    effectType: 'move_money',
    targetRef: acctB,
    ...over,
  })

  beforeEach(async () => {
    h = await setup()
    acctA = (await h.svc.createAccount({ name: 'A', account_type: 'checking', opening_balance: 100_00, current_balance: 100_00 })).id
    acctB = (await h.svc.createAccount({ name: 'B', account_type: 'savings' })).id
    wire()
  })

  it('registers + executes move_money as ONE transfer row that moves both balances (FIN-26/BR-S4-1)', async () => {
    const res = await rail.applyEffect(ev({ payload: { fromAccountId: acctA, toAccountId: acctB, amount: 40_00, date: '2026-09-20' } }))
    expect(res.applied).toBe(true)
    const transfers = (await h.svc.listTransactions()).filter((t) => t.transaction_type === 'transfer')
    expect(transfers).toHaveLength(1)
    expect(await h.svc.getBalance(acctA)).toBe(60_00) // 100 − 40
    expect(await h.svc.getBalance(acctB)).toBe(40_00) // 0 + 40 (derived, FN-3)
  })

  it('idempotent replay → applied:false, NO second row; a distinct move → applied:true (BR-S4-2)', async () => {
    const payload = { fromAccountId: acctA, toAccountId: acctB, amount: 40_00, date: '2026-09-20' }
    expect((await rail.applyEffect(ev({ payload }))).applied).toBe(true)
    // same subjectNaturalKey+transition+targetRef → same effect_event_id → deduped
    expect((await rail.applyEffect(ev({ payload }))).applied).toBe(false)
    // a genuinely-distinct move (different transition) → applies
    expect((await rail.applyEffect(ev({ transition: 'reward-2', payload }))).applied).toBe(true)
    expect((await h.svc.listTransactions()).filter((t) => t.transaction_type === 'transfer')).toHaveLength(2)
  })

  it('source == destination → InvalidTransferError, nothing written (BR-S4-3)', async () => {
    await expect(
      rail.applyEffect(ev({ targetRef: acctA, payload: { fromAccountId: acctA, toAccountId: acctA, amount: 10_00 } })),
    ).rejects.toBeInstanceOf(InvalidTransferError)
    expect(await h.svc.listTransactions()).toHaveLength(0)
  })

  it('malformed payload → MalformedMoveMoneyPayload, nothing written', async () => {
    await expect(
      rail.applyEffect(ev({ payload: { fromAccountId: acctA, amount: -5 } })), // missing toAccountId + non-positive
    ).rejects.toBeInstanceOf(MalformedMoveMoneyPayload)
    expect(await h.svc.listTransactions()).toHaveLength(0)
  })

  it('lockTarget + deny-safe port → StoreLayerNotActive AND the transfer rolls back atomically (BR-S4-4)', async () => {
    // deny-safe port is the default; a penalty lock must fail loud and revert the whole effect.
    await expect(
      // a penalty's target dimension IS the box being locked → targetRef = the box id (producer convention)
      rail.applyEffect(ev({ transition: 'penalty', targetRef: 'box-1', payload: { fromAccountId: acctA, toAccountId: acctB, amount: 20_00, lockTarget: 'box-1' } })),
    ).rejects.toBeInstanceOf(StoreLayerNotActive)
    expect(await h.svc.listTransactions()).toHaveLength(0) // transfer rolled back
    expect(await h.db.select().from(appliedEffects).all()).toHaveLength(0) // dedup key not burned (same tx rollback)
    // balances untouched
    expect(await h.svc.getBalance(acctA)).toBe(100_00)
  })

  it('a real store-lock port receives the rail tx and co-writes atomically (B2 — swap shape)', async () => {
    let received = false
    const spyLock: StoreLockPort = {
      async lock(_boxId, tx) {
        received = tx != null // the future real port co-writes through this tx (F1 §3B)
      },
      async unlock() {},
    }
    wire(spyLock)
    const res = await rail.applyEffect(ev({ transition: 'penalty', targetRef: 'box-1', payload: { fromAccountId: acctA, toAccountId: acctB, amount: 20_00, date: '2026-09-20', lockTarget: 'box-1' } }))
    expect(res.applied).toBe(true)
    expect(received).toBe(true) // lock was called WITH the tx
    expect((await h.svc.listTransactions()).filter((t) => t.transaction_type === 'transfer')).toHaveLength(1)
  })

  it('the deny-safe port throws on both lock and unlock (never fabricates a lock)', async () => {
    await expect(denySafeStoreLockPort.lock('box', {} as never)).rejects.toBeInstanceOf(StoreLayerNotActive)
    await expect(denySafeStoreLockPort.unlock('box', {} as never)).rejects.toBeInstanceOf(StoreLayerNotActive)
  })
})
