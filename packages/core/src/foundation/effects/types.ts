// ============================================================================
// foundation/effects — types (AR-7 Increment 1 · the effect rail)
//
// The exactly-once effect rail per capability-framework §2 (R1/R2) + ADR-004
// §3.2.5 (the write-API + idempotency spec-owner) + F1 (guarded-write). Ships
// the RAIL structure: taxonomy, event/handler contract, typed errors. The
// per-module handlers are registered by consumers later (empty seam).
// ============================================================================

import type { EffectType } from '@vida/types'
import type { DrizzleDb } from '../../db/adapter'

// Effect taxonomy classes (ADR-004 §3.2.5). Code-level only — never a stored
// column, so no DB CHECK. Drives the rail's per-class idempotency behaviour.
export const EFFECT_CLASS = ['keyed', 'additive', 'projection', 'intra_realm'] as const
export type EffectClass = (typeof EFFECT_CLASS)[number]

// Exhaustive: a Record over EffectType — a missing/extra EFFECT_TYPE fails tsc (BR-5).
// Class assignments per ADR-004 §3.2.5 taxonomy table + ADR-012 (4 economy effects = Additive).
export const EFFECT_CLASS_OF: Record<EffectType, EffectClass> = {
  complete_habit_occurrence: 'keyed',
  emit_measurement_signal: 'keyed',
  contribute_purpose_metric: 'keyed',
  log_time: 'additive',
  award_xp: 'additive',
  grant_currency: 'additive',
  lock_currency: 'additive',
  move_money: 'additive',
  surface_notification: 'additive',
  surface_journal: 'projection',
  surface_calendar: 'projection',
  attach_pomodoro: 'intra_realm',
}

// The semantic event that fans out to an effect. `targetRef` is the producer-supplied
// target dimension of the dedup key (F1 §3B) — known at derive time, not post-handler.
export interface EffectEvent {
  subjectNaturalKey: string
  transition: string
  effectType: EffectType
  targetRef: string
  payload?: Record<string, unknown>
}

// The active transaction handle — byte-identical to the proven private `Tx` in
// repository.ts:56 (re-derived here to avoid coupling to a non-exported symbol).
export type EffectTx = Parameters<Parameters<DrizzleDb['transaction']>[0]>[0]

// A handler receives the ACTIVE tx and MUST co-write through it (F1 §3B — "same
// transaction as the write"); it must NEVER open its own db.transaction (the
// sqlite-proxy emits a bare BEGIN → nested-BEGIN fails). Signature locked now so
// adding real handlers later is not a breaking change.
export type EffectHandler = (event: EffectEvent, tx: EffectTx) => Promise<void>

export class UnknownEffectType extends Error {
  constructor(t: string) {
    super(`Unknown effect type: ${t}`)
    this.name = 'UnknownEffectType'
  }
}
export class DuplicateEffectHandler extends Error {
  constructor(t: string) {
    super(`An effect handler is already registered for: ${t}`)
    this.name = 'DuplicateEffectHandler'
  }
}
export class NoEffectHandler extends Error {
  constructor(t: string) {
    super(`No effect handler registered for: ${t}`)
    this.name = 'NoEffectHandler'
  }
}
