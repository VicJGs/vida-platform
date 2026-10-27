// ============================================================================
// Session framework — Integration-Contract TypeScript types (AR-5 · ADR-004 §3.2)
//
// The 4-dimension contract every session sub-type declares (SS-3). AR-5 ships
// the TYPES + a thin registry that validates PRESENCE (BR-3), not deep legality —
// the lifecycle-transition ENGINE and effect FIRING are deferred (AR-7 / later).
// ============================================================================

import type { EffectType, SessionStatus, SessionSubType, SessionPurpose } from '@vida/types'

/** A legal lifecycle move for a sub-type (dim3). Stored as a declaration; the
 *  engine that enforces it is deferred. */
export interface SessionTransition {
  from: SessionStatus
  to: SessionStatus
  event: string
}

/** The permission envelope (dim4) — what a type is allowed to touch (SS-6).
 *  For a USER type this MUST be a subset of the shipped envelope (BR-4). */
export interface CapabilityEnvelope {
  allowed_effects: EffectType[]
  /** sensitive modules (Finance/Health) requiring explicit opt-in consent — ADR-004 §3.2.4 */
  sensitive_optins?: string[]
}

/** A full session-type definition — the 4 Integration-Contract dimensions +
 *  the type's identity (ADR-004 §3.2; SS-3). Registered via SessionRegistry. */
export interface SessionTypeDef {
  sub_type: SessionSubType | string // shipped members are SessionSubType; user long-tail is free (BR-6)
  owner_module: string
  /** dim1 — type-level attachment defaults (polymorphic entity refs) */
  attachment_defaults: Record<string, unknown>
  /** dim2 — declared effects drawn from the fixed catalogue (fired by AR-7, not here) */
  effects: EffectType[]
  /** dim3 — the legal lifecycle transitions + optional hooks (engine deferred) */
  lifecycle: { transitions: SessionTransition[]; hooks?: Record<string, string> }
  /** dim4 — the permission/capability envelope */
  permissions: CapabilityEnvelope
  /** optional extension-table schema hint (per-module table lands in DB-4/M1.1+) */
  extension_schema?: Record<string, unknown>
  /** some sub-types pin their purpose (a `review` session is always review) */
  default_purpose?: SessionPurpose | string
}

// --- Typed errors (AR-5 spec §3.4) — fail loud, never a silent partial ------
export class InvalidSessionTypeDef extends Error {
  constructor(public readonly missingDimension: string) {
    super(`SessionTypeDef is missing required dimension: ${missingDimension}`)
    this.name = 'InvalidSessionTypeDef'
  }
}

export class CapabilityEnvelopeExceeded extends Error {
  constructor(public readonly effect: EffectType) {
    super(`User type declares effect '${effect}' outside the shipped capability envelope (BR-4/SS-6)`)
    this.name = 'CapabilityEnvelopeExceeded'
  }
}

export class DuplicateSubType extends Error {
  constructor(public readonly subType: string) {
    super(`Session sub_type '${subType}' is already registered`)
    this.name = 'DuplicateSubType'
  }
}

export class SessionTypeNotFound extends Error {
  constructor(public readonly subType: string) {
    super(`No session type registered for sub_type '${subType}'`)
    this.name = 'SessionTypeNotFound'
  }
}
