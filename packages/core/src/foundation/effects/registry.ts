// ============================================================================
// foundation/effects — the effect-handler registry (AR-7 · ADR-004 §3.2.5-A)
//
// Maps each EFFECT_TYPE → EXACTLY ONE handler (BR-4). Ships EMPTY — a seam that
// consumer modules register their handlers into at wire-up (per ADR-004 §3.2.5-A,
// handlers are service methods in packages/core/services/<module>).
// ============================================================================

import type { EffectType } from '@vida/types'
import { type EffectHandler, DuplicateEffectHandler } from './types'

export interface EffectRegistry {
  /** Register the single handler for an effect-type (BR-4 — duplicate → throws). */
  register(effectType: EffectType, handler: EffectHandler): void
  /** Resolve a handler, or undefined if none is registered. */
  resolve(effectType: EffectType): EffectHandler | undefined
}

export function createEffectRegistry(): EffectRegistry {
  const handlers = new Map<EffectType, EffectHandler>()
  return {
    register(effectType, handler) {
      if (handlers.has(effectType)) throw new DuplicateEffectHandler(effectType)
      handlers.set(effectType, handler)
    },
    resolve(effectType) {
      return handlers.get(effectType)
    },
  }
}
