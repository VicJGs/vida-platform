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

import type { Account, Asset, Liability, Investment, IncomeStream } from '@vida/types'
import { createRepository, type CreateInput } from '../../db/repository'
import {
  accounts,
  assets,
  liabilities,
  investments,
  incomeStreams,
  type AccountRow,
  type AssetRow,
  type LiabilityRow,
  type InvestmentRow,
  type IncomeStreamRow,
} from '../../db/schema/finance'
import {
  CreateAccountSchema,
  UpdateAccountSchema,
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
  type FinanceService,
  type FinanceServiceDeps,
  type CreateAccountInput,
  type UpdateAccountInput,
  type CreateAssetInput,
  type UpdateAssetInput,
  type CreateLiabilityInput,
  type UpdateLiabilityInput,
  type CreateInvestmentInput,
  type UpdateInvestmentInput,
  type CreateIncomeStreamInput,
  type UpdateIncomeStreamInput,
} from './types'

// --- Row → @vida/types interface (single _sync_status cast; INTENDED cols ride the spread) ---
const toAccount = (r: AccountRow): Account => ({ ...r, _sync_status: r._sync_status as Account['_sync_status'] })
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
