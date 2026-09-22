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
import type { Account, Asset, Liability, Investment, IncomeStream } from '@vida/types'
import type { DrizzleDb } from '../../db/adapter'
import type {
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

export interface FinanceServiceDeps {
  db: DrizzleDb
  deviceId: string
}

// --- Zod-inferred input shapes (validators/finance.ts) ----------------------
export type CreateAccountInput = z.infer<typeof CreateAccountSchema>
export type UpdateAccountInput = z.infer<typeof UpdateAccountSchema>
export type CreateAssetInput = z.infer<typeof CreateAssetSchema>
export type UpdateAssetInput = z.infer<typeof UpdateAssetSchema>
export type CreateLiabilityInput = z.infer<typeof CreateLiabilitySchema>
export type UpdateLiabilityInput = z.infer<typeof UpdateLiabilitySchema>
export type CreateInvestmentInput = z.infer<typeof CreateInvestmentSchema>
export type UpdateInvestmentInput = z.infer<typeof UpdateInvestmentSchema>
export type CreateIncomeStreamInput = z.infer<typeof CreateIncomeStreamSchema>
export type UpdateIncomeStreamInput = z.infer<typeof UpdateIncomeStreamSchema>

export interface FinanceService {
  // ── S1: accounts ────────────────────────────────────────────────
  createAccount(input: CreateAccountInput): Promise<Account>
  updateAccount(id: string, patch: UpdateAccountInput): Promise<Account>
  softDeleteAccount(id: string): Promise<void>
  getAccount(id: string): Promise<Account | null>
  listAccounts(): Promise<Account[]>

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
