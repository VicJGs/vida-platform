// services/finance — barrel (mod-finance #47 ①)
export { createFinanceService } from './service'
export {
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
