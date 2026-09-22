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
// S5 — external / ingestion / config seams (FIN-20/21/25/28/29/30/40)
export {
  FxRateMissingError,
  ZeroKnowledgeViolationError,
  type FxRatePort,
  type RecurringModePort,
  type PersistedAggregatesPort,
  type ManagedCategoryPort,
  type RecurringForecast,
  type ParsedStatementRow,
} from './types'
export {
  createInMemoryFxRatePort,
  forecastOnlyRecurringPort,
  computeOnlyAggregatesPort,
  passthroughCategoryPort,
} from './config-seams'
// S6 — cross-module providers + delegates (FIN-31/32/33/34/35/37)
export { FINANCE_ENTITY_TYPES, type FinanceEntityType } from './types'
export { createFinanceJournalContribution, registerFinanceJournal } from './journal'
