// ============================================================================
// foundation/economy — types (AR-7 Increment 4 · ADR-012)
// ============================================================================

import { z } from 'zod'
import type { ConsequenceKind } from '@vida/types'

/** A ledger row reduced to what balance computation needs. */
export interface LedgerEntry {
  kind: ConsequenceKind
  amount: number
}

/** The four derived quantities per currency (§3.3). `toDistribute` is config, not ledger-summed. */
export interface CurrencyBalance {
  earned: number
  locked: number
  spent: number
  distributed: number
  current: number
  toDistribute: number | null
}

// Typed payloads for the economy effect handlers (M2 — no untyped payload reads).
// `target_ref` comes from the EffectEvent (the rail's dedup dimension), not the payload.
export const GrantCurrencyPayload = z.object({
  currencyId: z.string(),
  amount: z.number().int(),
  entityType: z.string().optional(),
  entityId: z.string().optional(),
})
export type GrantCurrencyPayloadT = z.infer<typeof GrantCurrencyPayload>
export const LockCurrencyPayload = GrantCurrencyPayload // same shape

export class MalformedConsequencePayload extends Error {
  constructor(effectType: string, detail: string) {
    super(`Malformed ${effectType} payload: ${detail}`)
    this.name = 'MalformedConsequencePayload'
  }
}
