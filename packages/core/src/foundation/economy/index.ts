// Foundation substrate: the points economy (AR-7 Increment 4 · ADR-012).
// currencies + consequence_ledger (derived balances) + the grant_currency/lock_currency
// effect handlers (write the ledger via the rail's tx) + the consequence coordinator +
// a thin currency service. The rules engine, achievements, level curve, store layer,
// and move_money/surface_notification handlers are homed downstream (DF-12).
export * from './types'
export * from './balance'
export { createEconomyHandlers, registerEconomyEffects, dispatchConsequence, type EconomyHandlers } from './handlers'
export { createCurrencyRegistry, SHIPPED_CURRENCIES, type CurrencyRegistry, type CurrencyDef } from './registry'
