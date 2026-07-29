// ============================================================================
// ViewProviderRegistry — the V4/R7 read-provider seam  (AR-6 · ADR-007 §3.4)
//
// Modules register their documented list/query API here; the ViewEngine fans a
// view's filter out to the registered providers (INT-1 — never a direct
// cross-module table read). AR-6 ships this EMPTY — real providers register
// per-module at their build (mirrors AR-5's registry-ahead-of-modules).
// ============================================================================

import type { ReadProvider } from './types'

export interface ViewProviderRegistry {
  register(provider: ReadProvider): void
  get(entityType: string): ReadProvider | undefined
  list(): ReadProvider[]
}

export function createViewProviderRegistry(): ViewProviderRegistry {
  const providers = new Map<string, ReadProvider>()
  return {
    register(provider) {
      providers.set(provider.entityType, provider)
    },
    get(entityType) {
      return providers.get(entityType)
    },
    list() {
      return [...providers.values()]
    },
  }
}
