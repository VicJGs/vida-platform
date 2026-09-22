// ============================================================================
// validators/finance — canonical Zod validators (mod-finance #47 ①)
//
// Enum schemas (z.enum over the @vida/types tuples — tuple ≡ union ≡ validator ≡
// SQL CHECK, enum-parity.test.ts) + the S1 entity Create/Update shapes.
//
// Money is INTEGER cents, rates are BASIS POINTS (both z.number().int()); quantity
// is REAL (z.number()); dates are YYYY-MM-DD (z.string()). Create schemas make
// defaulted/nullable columns OPTIONAL — the service's serializeCreate backfills the
// notNull-default columns so create()'s echoed row is faithful (repository-create-
// returns-input-row seam). Update schemas are fully partial.
// ============================================================================

import { z } from 'zod'
import {
  ACCOUNT_TYPE,
  TRANSACTION_TYPE,
  ASSET_TYPE,
  LIABILITY_TYPE,
  INVESTMENT_TYPE,
  INCOME_TYPE,
  WORK_TYPE,
  INTEREST_TYPE,
  FISCAL_OWNER_TYPE,
} from '@vida/types'
// FrequencySchema is canonical in ./common (barrel-shared); reuse, don't redefine (barrel collision).
import { FrequencySchema } from './common'

export const AccountTypeSchema = z.enum(ACCOUNT_TYPE)
export const TransactionTypeSchema = z.enum(TRANSACTION_TYPE)
export const AssetTypeSchema = z.enum(ASSET_TYPE)
export const LiabilityTypeSchema = z.enum(LIABILITY_TYPE)
export const InvestmentTypeSchema = z.enum(INVESTMENT_TYPE)
export const IncomeTypeSchema = z.enum(INCOME_TYPE)
export const WorkTypeSchema = z.enum(WORK_TYPE)
export const InterestTypeSchema = z.enum(INTEREST_TYPE)
export const FiscalOwnerTypeSchema = z.enum(FISCAL_OWNER_TYPE)

const money = z.number().int() // cents
const basisPoints = z.number().int()
const calendarDate = z.string() // YYYY-MM-DD

// --- accounts (FIN-01/02) ---------------------------------------------------
const AccountFields = z.object({
  name: z.string(),
  account_type: AccountTypeSchema,
  institution: z.string().nullable(),
  currency: z.string(),
  current_balance: money,
  opening_balance: money.nullable(),
  credit_limit: money.nullable(),
  interest_rate: basisPoints.nullable(),
  is_active: z.boolean(),
  color: z.string().nullable(),
  icon: z.string().nullable(),
  jurisdiction_code: z.string().nullable(),
})
export const CreateAccountSchema = AccountFields.partial().extend({
  name: z.string(),
  account_type: AccountTypeSchema,
})
export const UpdateAccountSchema = AccountFields.partial()

// --- transactions (FIN-06/07 · S2) ------------------------------------------
const TransactionFields = z.object({
  account_id: z.string(),
  transfer_to_account_id: z.string().nullable(),
  transaction_type: TransactionTypeSchema,
  amount: money,
  currency: z.string(),
  category: z.string().nullable(),
  category_bidx: z.string().nullable(),
  subcategory: z.string().nullable(),
  description: z.string().nullable(),
  date: calendarDate,
  is_recurring: z.boolean(),
  recurring_frequency: FrequencySchema.nullable(),
  jurisdiction_code: z.string().nullable(),
})
export const CreateTransactionSchema = TransactionFields.partial().extend({
  account_id: z.string(),
  transaction_type: TransactionTypeSchema,
  amount: money,
  date: calendarDate,
})
export const UpdateTransactionSchema = TransactionFields.partial()

// --- assets (FIN-13) --------------------------------------------------------
const AssetFields = z.object({
  name: z.string(),
  asset_type: AssetTypeSchema,
  purchase_date: calendarDate.nullable(),
  purchase_price: money.nullable(),
  current_value: money.nullable(),
  depreciation_rate: basisPoints.nullable(),
  location: z.string().nullable(),
  jurisdiction_code: z.string().nullable(),
})
export const CreateAssetSchema = AssetFields.partial().extend({
  name: z.string(),
  asset_type: AssetTypeSchema,
})
export const UpdateAssetSchema = AssetFields.partial()

// --- liabilities (FIN-14 + G9 restored, FIN-27) -----------------------------
const LiabilityFields = z.object({
  name: z.string(),
  liability_type: LiabilityTypeSchema,
  original_amount: money.nullable(),
  current_balance: money.nullable(),
  interest_rate: basisPoints.nullable(),
  monthly_payment: money.nullable(),
  due_date: calendarDate.nullable(),
  lender: z.string().nullable(),
  payment_frequency: FrequencySchema.nullable(),
  next_payment_date: calendarDate.nullable(),
  interest_type: InterestTypeSchema.nullable(),
  payoff_date: calendarDate.nullable(),
})
export const CreateLiabilitySchema = LiabilityFields.partial().extend({
  name: z.string(),
  liability_type: LiabilityTypeSchema,
})
export const UpdateLiabilitySchema = LiabilityFields.partial()

// --- investments (FIN-15) ---------------------------------------------------
const InvestmentFields = z.object({
  account_id: z.string().nullable(),
  name: z.string(),
  investment_type: InvestmentTypeSchema,
  ticker_symbol: z.string().nullable(),
  quantity: z.number().nullable(), // REAL
  purchase_price: money.nullable(),
  current_price: money.nullable(),
  jurisdiction_code: z.string().nullable(),
})
export const CreateInvestmentSchema = InvestmentFields.partial().extend({
  name: z.string(),
  investment_type: InvestmentTypeSchema,
})
export const UpdateInvestmentSchema = InvestmentFields.partial()

// --- income_streams (FIN-16 + G9 next_payment_date, FIN-27) -----------------
const IncomeStreamFields = z.object({
  name: z.string(),
  income_type: IncomeTypeSchema,
  work_type: WorkTypeSchema.nullable(),
  amount: money,
  frequency: FrequencySchema,
  is_active: z.boolean(),
  employer: z.string().nullable(),
  start_date: calendarDate.nullable(),
  end_date: calendarDate.nullable(),
  next_payment_date: calendarDate.nullable(),
  jurisdiction_code: z.string().nullable(),
})
export const CreateIncomeStreamSchema = IncomeStreamFields.partial().extend({
  name: z.string(),
  income_type: IncomeTypeSchema,
  amount: money,
})
export const UpdateIncomeStreamSchema = IncomeStreamFields.partial()

// ── S7: fiscal-legal SITUATE validators (FL-01/FL-03) ──────────────────────
// owner_type is FIXED (FISCAL_OWNER_TYPE CHECK); jurisdiction_code/residency_type/entity_type are OPEN (no CHECK,
// per-jurisdiction rule-pack vocab). notes/name/registration_ref are notNull [E] → REQUIRED in the create input.
const ResidencyFields = z.object({
  owner_type: z.enum(FISCAL_OWNER_TYPE),
  owner_id: z.string(),
  jurisdiction_code: z.string(),
  residency_type: z.string(),
  start_date: calendarDate,
  end_date: calendarDate.nullable(),
  notes: z.string(),
})
export const CreateResidencySchema = ResidencyFields.partial().extend({
  owner_type: z.enum(FISCAL_OWNER_TYPE),
  owner_id: z.string(),
  jurisdiction_code: z.string(),
  residency_type: z.string(),
  start_date: calendarDate,
  notes: z.string(),
})
export const UpdateResidencySchema = ResidencyFields.partial()

const LegalEntityFields = z.object({
  project_id: z.string().nullable(),
  name: z.string(),
  entity_type: z.string(),
  jurisdiction_code: z.string(),
  registration_ref: z.string(),
})
export const CreateLegalEntitySchema = LegalEntityFields.partial().extend({
  name: z.string(),
  entity_type: z.string(),
  jurisdiction_code: z.string(),
  registration_ref: z.string(),
})
export const UpdateLegalEntitySchema = LegalEntityFields.partial()
