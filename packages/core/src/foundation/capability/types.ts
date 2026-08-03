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
