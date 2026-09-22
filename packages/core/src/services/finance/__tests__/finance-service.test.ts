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
import { createFinanceService, InvalidTransferError, type FinanceService } from '../index'

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
}

async function setup(): Promise<Harness> {
  await initVault()
  const bsql = new Database(':memory:')
  const driver = createBetterSqlite3Driver(bsql)
  await migrate(driver)
  const db = createDrizzleProxy(driver)
  const svc = createFinanceService({ db, deviceId: 'test-device' })
  return { svc, db }
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
