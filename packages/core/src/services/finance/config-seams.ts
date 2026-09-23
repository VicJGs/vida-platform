// ============================================================================
// services/finance — S5 deny-safe default ports (mod-finance #47 ① · S5)
//
// The deferred-store seams. Each default surfaces a typed "not-configured" state,
// NEVER a silent default (BR-S5-2…6): FX rates default empty (a missing cross-currency
// rate → FxRateMissingError at the call site, no silent 1:1); recurring defaults to
// forecast-only (never auto-materializes); persisted-aggregates defaults off
// (compute-only); managed-category defaults to passthrough (free-text allowed).
// The durable stores (FX/base-currency, managed-category list, persisted-aggregates)
// are M2 — these ports swap for Preferences-backed impls with no signature change.
// ============================================================================

import type {
  FxRatePort,
  RecurringModePort,
  PersistedAggregatesPort,
  ManagedCategoryPort,
} from './types'

/** M1 default FX port — in-memory, device-side (ZK-1: never server-fetched). Settable in-process/tests;
 *  a rate that was never set reads null → the caller raises FxRateMissingError (no silent 1:1). */
export function createInMemoryFxRatePort(): FxRatePort {
  const rates = new Map<string, number>()
  const key = (from: string, to: string): string => `${from}>${to}`
  return {
    async getRate(from, to) {
      return rates.get(key(from, to)) ?? null
    },
    async setRate(from, to, rate) {
      rates.set(key(from, to), rate)
    },
  }
}

/** Default recurring mode: forecast-only — never auto-materializes a row (BR-S5-1). */
export const forecastOnlyRecurringPort: RecurringModePort = {
  async mode() {
    return 'forecast'
  },
}

/** Default persisted-aggregates: disabled — S3 analytics stay compute-only (BR-S5-3). */
export const computeOnlyAggregatesPort: PersistedAggregatesPort = {
  async enabled() {
    return false
  },
}

/** Default managed-category: passthrough — no managed list configured, so NOTHING resolves as managed → every
 *  category is valid free-text (`managed:false`), never silently rejected (BR-S5-6). null = not in the list. */
export const passthroughCategoryPort: ManagedCategoryPort = {
  async resolve() {
    return null
  },
}
