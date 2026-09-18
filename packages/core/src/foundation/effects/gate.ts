// ============================================================================
// foundation/effects — fire-time validation gate (XS-effect-rail #32 · XCU-22)
//
// The dynamic half of the write-API contract (ADR-004 §3.2.5-A(3)): before an
// effect fires, a user producer's sensitive-module targets require explicit
// opt-in consent. The STATIC half (declared effects[] ⊆ envelope) is already
// enforced at registration; this adds only the fire-time consent check (IR-3).
//
// Producer-agnostic by design (§3.2.5-C — one contract, enforcement differs by
// tier): the caller supplies the consented set from its own envelope —
//   session      → SessionTypeDef.permissions.sensitive_optins
//   ADR-010 cap  → grant.consented_sensitive_modules   (#116, not here)
// Shipped/trusted producers are structurally enforced and never call this gate.
// Pure + synchronous: it decides over data the caller already holds.
// ============================================================================

import type { EffectType } from '@vida/types'
import { SENSITIVE_MODULE_CLASSES } from '../capability' // single source of the sensitivity taxonomy
import { EFFECT_CLASS_OF } from './types'

/** The producer's fire-time consent context — its consented sensitive-module set. */
export interface FireGateContext {
  consentedSensitiveModules: string[]
}

/** Thrown when an effect targets a sensitive module the producer has not consented to (no write). */
export class EffectConsentMissing extends Error {
  constructor(
    public readonly effectType: EffectType,
    public readonly moduleClass: string,
  ) {
    super(`Effect '${effectType}' targets sensitive module '${moduleClass}' without opt-in consent`)
    this.name = 'EffectConsentMissing'
  }
}

function isSensitive(moduleClass: string): boolean {
  return (SENSITIVE_MODULE_CLASSES as readonly string[]).includes(moduleClass)
}

/**
 * Fire-time consent gate (XCU-22). Throws `EffectConsentMissing` iff `effectType` targets a sensitive
 * `moduleClass` not in `ctx.consentedSensitiveModules`. Projection effects (BR-S2-4) and non-sensitive /
 * unspecified targets (BR-S2-2) pass. `moduleClass` is caller-supplied, never inferred (IR-5 / BR-17).
 */
export function assertEffectPermitted(
  ctx: FireGateContext,
  effectType: EffectType,
  moduleClass: string | undefined,
): void {
  // BR-S2-4 — projection effects write no row; no consent gate.
  if (EFFECT_CLASS_OF[effectType] === 'projection') return
  // BR-S2-2 — a non-sensitive (or unspecified) target needs no consent.
  if (!moduleClass || !isSensitive(moduleClass)) return
  // BR-S2-1 — a sensitive target requires explicit opt-in consent.
  if (!ctx.consentedSensitiveModules.includes(moduleClass)) {
    throw new EffectConsentMissing(effectType, moduleClass)
  }
}
