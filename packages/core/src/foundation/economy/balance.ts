// ============================================================================
// foundation/economy — derived-balance engine (AR-7 · ADR-012 §3.3)
//
// Balances are DERIVED, never stored (the house rule). `amount` is a positive
// magnitude; `kind` implies the effect on balance. `to-distribute` is a config
// ceiling minus what has been distributed — NOT a ledger sum (§3.3).
// ============================================================================

import type { ConsequenceKind } from '@vida/types'
import type { LedgerEntry, CurrencyBalance } from './types'

export function computeBalance(rows: LedgerEntry[], ceiling?: number | null): CurrencyBalance {
  const sumBy = (k: ConsequenceKind): number => rows.filter((r) => r.kind === k).reduce((acc, r) => acc + r.amount, 0)

  const earned = sumBy('earn')
  const locked = sumBy('lock')
  const spent = sumBy('spend')
  const distributed = sumBy('distribute')
  const current = earned - locked - spent
  const toDistribute = ceiling == null ? null : ceiling - distributed

  return { earned, locked, spent, distributed, current, toDistribute }
}
