// ============================================================================
// foundation/capability — types (AR-7 Increment 2 · ADR-008 + ADR-010)
//
// The capability/block registry STRUCTURE: a capability DEFINITION (CB1 6-part
// anatomy) + the terminal-state vocabulary (CB6). Shipped defs are code-registered;
// user defs persist. The sandbox/DSL/authoring runtime is deferred (#85 CAP-authoring).
// ============================================================================

import type { EffectType, RenderTarget } from '@vida/types'

// CB6 — every capability declares these four states per supported render target.
// Code-level only (not a DB column) — parity with EFFECT_CLASS in foundation/effects.
export const TERMINAL_STATE = ['loading', 'empty', 'error', 'success'] as const
export type TerminalState = (typeof TERMINAL_STATE)[number]

// CB1 — the 6-part anatomy as data (ADR-008 §3.4). `id` is the semantic identity
// (persisted as `def_id`, the UNIQUE business key; the row PK is a generated UUIDv7).
export interface CapabilityDefinition {
  id: string
  kind: string // OPEN vocab (no CHECK) — carries study_method
  render_targets: RenderTarget[] // ⊆ RENDER_TARGET (BR-2)
  bindings: string[] // entity-type strings (BR-5 subset dim)
  effects: EffectType[] // ⊆ EFFECT_TYPE (BR-3)
  config_schema?: Record<string, unknown>
  terminal_states: Record<string, TerminalState[]> // per render target (BR-4)
  is_user_type?: boolean
}

export class InvalidRenderTarget extends Error {
  constructor(t: string) {
    super(`Invalid render target: ${t}`)
    this.name = 'InvalidRenderTarget'
  }
}
export class UnknownDeclaredEffect extends Error {
  constructor(e: string) {
    super(`Unknown declared effect: ${e}`)
    this.name = 'UnknownDeclaredEffect'
  }
}
export class MissingTerminalStates extends Error {
  constructor(rt: string) {
    super(`Missing terminal states for render target: ${rt}`)
    this.name = 'MissingTerminalStates'
  }
}
export class CapabilityPrivilegeExceeded extends Error {
  constructor(x: string) {
    super(`User capability exceeds the shipped privilege envelope: ${x}`)
    this.name = 'CapabilityPrivilegeExceeded'
  }
}
export class DuplicateCapabilityId extends Error {
  constructor(id: string) {
    super(`A capability is already registered with id: ${id}`)
    this.name = 'DuplicateCapabilityId'
  }
}
export class CapabilityNotFound extends Error {
  constructor(id: string) {
    super(`Capability not found: ${id}`)
    this.name = 'CapabilityNotFound'
  }
}

// ============================================================================
// Enforcement services (XS-capability #31 · ADR-010 declare→grant→enforce)
// The envelope-enforcement decision tier over the AR-7 `capability_grants` structure.
// Pure decision logic — no user-code execution (sandbox = #116), no effect firing (#32),
// no egress mediation (#43). See docs/specs/foundation/xs-capability/.
// ============================================================================

// The def's DECLARATION — the privilege parts of the ADR-008 6-part anatomy (parts 3 + 5).
// This is what the re-grant-on-change hash covers (ADR-008:119-121). NOT render_targets
// (CB2), config_schema (inputs), or kind/id (identity).
export type DeclaredEnvelope = Pick<CapabilityDefinition, 'bindings' | 'effects'>

// The user's GRANT — the consent the user recorded (ADR-010 §3.2). The `capability_grants`
// privilege fields minus the service-computed `granted_envelope_hash`.
export interface GrantEnvelope {
  granted_bindings: string[]
  granted_effects: EffectType[]
  media_ok: boolean
  external_in_ok: boolean
  external_out_ok: boolean
  consented_sensitive_modules: string[]
}

// A resolved (parsed) grant row.
export interface CapabilityGrant extends GrantEnvelope {
  capability_def_id: string
  granted_envelope_hash: string
}

// The sensitive module classes (ADR-010 §3.3.4 — Finance, Health; medical = Health/HC-14).
// A code-level const, not a schema field; the caller supplies its `moduleClass`.
export const SENSITIVE_MODULE_CLASSES = ['finance', 'health'] as const
export type SensitiveModuleClass = (typeof SENSITIVE_MODULE_CLASSES)[number]

// What a user capability is about to do — the enforcer decides allow/deny per action (fail-closed).
// NOTE (INV-9): sensitivity is NOT inferred from `binding`; a consuming sensitive module (Finance,
// Health) MUST guard its reads with the `sensitive` action (ADR-010 §3.3.2). The enforcer gates only
// what it is asked to gate.
export type CapabilityAction =
  | { type: 'effect'; effect: EffectType }
  | { type: 'binding'; entityType: string }
  | { type: 'media' }
  | { type: 'external_in'; source: string }
  | { type: 'external_out'; target: string }
  | { type: 'sensitive'; moduleClass: string }

export type DenyReason =
  | 'no_grant'
  | 'not_in_envelope'
  | 'envelope_changed'
  | 'sensitive_consent_missing'
  | 'compositional_exfiltration'
  | 'media_not_granted'

export interface EnforcementDecision {
  allowed: boolean
  reason?: DenyReason
}

export class CapabilityDenied extends Error {
  readonly defId: string
  readonly reason: DenyReason
  constructor(defId: string, reason: DenyReason) {
    super(`Capability denied: ${defId} (${reason})`)
    this.name = 'CapabilityDenied'
    this.defId = defId
    this.reason = reason
  }
}
export class GrantExceedsDeclaration extends Error {
  constructor(defId: string, detail: string) {
    super(`Grant for ${defId} exceeds the capability's declaration: ${detail}`)
    this.name = 'GrantExceedsDeclaration'
  }
}
