import { z } from 'zod'
import {
  ACCOUNT_TYPE,
  TRANSACTION_TYPE,
  ASSET_TYPE,
  LIABILITY_TYPE,
  INVESTMENT_TYPE,
  INCOME_TYPE,
  WORK_TYPE,
} from '@vida/types'

export const AccountTypeSchema = z.enum(ACCOUNT_TYPE)
export const TransactionTypeSchema = z.enum(TRANSACTION_TYPE)
export const AssetTypeSchema = z.enum(ASSET_TYPE)
export const LiabilityTypeSchema = z.enum(LIABILITY_TYPE)
export const InvestmentTypeSchema = z.enum(INVESTMENT_TYPE)
export const IncomeTypeSchema = z.enum(INCOME_TYPE)
export const WorkTypeSchema = z.enum(WORK_TYPE)
