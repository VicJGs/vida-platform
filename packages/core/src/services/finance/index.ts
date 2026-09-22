// services/finance — barrel (mod-finance #47 ①)
export { createFinanceService } from './service'
export {
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
} from './types'
// S4 — the move_money effect handler (FIN-26)
export {
  createFinanceEffectHandlers,
  registerFinanceEffects,
  denySafeStoreLockPort,
  MoveMoneyPayload,
  MalformedMoveMoneyPayload,
  StoreLayerNotActive,
  type FinanceEffectHandlers,
  type StoreLockPort,
  type MoveMoneyPayloadT,
} from './effects'
