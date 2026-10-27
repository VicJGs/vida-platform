// ============================================================================
// foundation/effects — the exactly-once effect rail (AR-7 · ADR-004 §3.2.5 / F1)
//
// applyEffect: the guarded-write + idempotency primitive. Per class (EFFECT_CLASS_OF):
//   • projection → rail no-op (no handler, no ledger row) — idempotent by
//     construction, pull-aggregated at render (BR-6).
//   • keyed/additive/intra_realm → resolve handler (BR-3), derive the deterministic
//     id (BR-2), then in ONE transaction: check-and-insert the ledger key (F1 §3B);
//     if new → call the handler (co-writes through the SAME tx, so a throw rolls
//     BOTH back); if already present → no-op {applied:false} (BR-1).
// ============================================================================

import { and, eq } from 'drizzle-orm'
import type { DrizzleDb } from '../../db/adapter'
import { appliedEffects } from '../../db/schema/foundation/effects'
import { deriveEffectEventId } from './event-id'
import { EFFECT_CLASS_OF, type EffectEvent, NoEffectHandler, UnknownEffectType } from './types'
import type { EffectRegistry } from './registry'

export interface EffectRail {
  applyEffect(event: EffectEvent): Promise<{ applied: boolean }>
}

export function createEffectRail(db: DrizzleDb, registry: EffectRegistry): EffectRail {
  return {
    async applyEffect(event) {
      const cls = EFFECT_CLASS_OF[event.effectType]
      if (!cls) throw new UnknownEffectType(event.effectType)

      // Projection effects write no row and route to no handler (BR-6).
      if (cls === 'projection') return { applied: true }

      // Fail loud BEFORE any write if no handler is registered (BR-3).
      const handler = registry.resolve(event.effectType)
      if (!handler) throw new NoEffectHandler(event.effectType)

      const id = deriveEffectEventId(event.subjectNaturalKey, event.transition, event.effectType)

      return db.transaction(async (tx) => {
        const existing = await tx
          .select()
          .from(appliedEffects)
          .where(
            and(
              eq(appliedEffects.effect_event_id, id),
              eq(appliedEffects.effect_type, event.effectType),
              eq(appliedEffects.target_ref, event.targetRef),
            ),
          )
          .all()
        if (existing.length > 0) return { applied: false } // BR-1 — already applied

        await tx
          .insert(appliedEffects)
          .values({
            effect_event_id: id,
            effect_type: event.effectType,
            target_ref: event.targetRef,
            applied_at: Date.now(),
          })
          .run()
        // Handler co-writes through the SAME tx (F1 §3B); a throw rolls back both.
        await handler(event, tx)
        return { applied: true }
      })
    },
  }
}
