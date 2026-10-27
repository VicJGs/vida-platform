// ============================================================================
// foundation/economy — effect handlers + consequence coordinator (AR-7 · ADR-012 §3.1)
//
// grant_currency / lock_currency are Additive effects (increment 1 EFFECT_TYPE).
// Each handler writes ONE consequence_ledger row inside the effect rail's tx
// (ADR-004 §3.2.5 single write path + §3.4 co-transactional enqueue) via the
// Repository's `createInTx` — the deterministic effect_event_id (recomputed from
// the event) + UNIQUE (effect_event_id, kind, target_ref) mirror the rail's PK.
// move_money → Finance handler / surface_notification → Notifications handler are
// NOT registered here (deferred, DF-12). The coordinator fans a fire out to the
// rail per typed effect — it invents no write path (§3.1).
// ============================================================================

import type { ConsequenceKind } from '@vida/types'
import type { DrizzleDb } from '../../db/adapter'
import { createRepository } from '../../db/repository'
import { consequenceLedger } from '../../db/schema/foundation/economy'
import {
  type EffectEvent,
  type EffectHandler,
  type EffectRail,
  type EffectRegistry,
  deriveEffectEventId,
} from '../effects'
import { GrantCurrencyPayload, LockCurrencyPayload, MalformedConsequencePayload } from './types'

export interface EconomyHandlers {
  grant_currency: EffectHandler
  lock_currency: EffectHandler
}

export function createEconomyHandlers(db: DrizzleDb, deviceId: string): EconomyHandlers {
  // consequence_ledger has no [E] fields; encrypt seam stays dormant (M1.0).
  const ledgerRepo = createRepository(db, consequenceLedger, { deviceId, encryptedFields: [] })

  const make =
    (kind: ConsequenceKind, schema: typeof GrantCurrencyPayload): EffectHandler =>
    async (event, tx) => {
      const parsed = schema.safeParse(event.payload)
      if (!parsed.success) throw new MalformedConsequencePayload(event.effectType, parsed.error.message)
      const p = parsed.data
      // Deterministic id == the rail's (same inputs); the ledger UNIQUE mirrors the rail's PK.
      const id = deriveEffectEventId(event.subjectNaturalKey, event.transition, event.effectType)
      await ledgerRepo.createInTx(tx, {
        effect_event_id: id,
        kind,
        target_ref: event.targetRef,
        currency_id: p.currencyId,
        amount: p.amount,
        entity_type: p.entityType ?? null,
        entity_id: p.entityId ?? null,
        at: Date.now(),
      })
    }

  return {
    grant_currency: make('earn', GrantCurrencyPayload),
    lock_currency: make('lock', LockCurrencyPayload),
  }
}

/** Register the economy effect handlers into the rail's registry (increment 1). */
export function registerEconomyEffects(registry: EffectRegistry, handlers: EconomyHandlers): void {
  registry.register('grant_currency', handlers.grant_currency)
  registry.register('lock_currency', handlers.lock_currency)
}

/** The consequence coordinator (§3.1): fan a rule-fire out to the rail per typed effect —
 *  no new write path, no new idempotency. Rule STORAGE + condition-eval are deferred (MOD-gamification). */
export async function dispatchConsequence(rail: EffectRail, effects: EffectEvent[]): Promise<void> {
  for (const effect of effects) {
    await rail.applyEffect(effect)
  }
}
