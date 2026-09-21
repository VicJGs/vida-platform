// ============================================================================
// foundation/egress — the egress-mediation service (XS-egress-guard #43 · XCU-06/08)
//
// The strictest gate in the system. `external_out_ok=true` (decided by the capability
// enforcer #31) is NECESSARY but NOT sufficient: on top of it this service enforces
// per-target consent + union-of-consents + never-auto-transmit and produces the audit
// record. Factory-of-closures (no `this` — safe under destructure, enforcer precedent).
// ============================================================================

import type { CapabilityEnforcer } from '../capability'
import {
  EgressDenied,
  type EgressAct,
  type EgressAuditPort,
  type EgressAuditRecord,
  type EgressConsentPort,
  type EgressDecision,
  type EgressGuard,
  type FetchEgressAct,
} from './types'

// M1 default ports — no schema, fail-closed by construction (R-1/R-2). `createEgressGuard`
// with no consent adapter DENIES every egress (deny-safe) until a caller wires per-target
// consent; the audit sink is a no-op (M2 swaps a real [E] + append-only store).
const DENY_SAFE_CONSENT: EgressConsentPort = {
  async hasTargetConsent() {
    return false
  },
}
const NOOP_AUDIT: EgressAuditPort = {
  async record() {
    /* M1 in-memory/no-op sink; M2 wires the durable [E] + append-only store (IR-8/IR-9). */
  },
}

export function createEgressGuard(
  enforcer: CapabilityEnforcer,
  ports?: { consent?: EgressConsentPort; audit?: EgressAuditPort },
): EgressGuard {
  const consent = ports?.consent ?? DENY_SAFE_CONSENT
  const audit = ports?.audit ?? NOOP_AUDIT

  // Pure decision (PF-1): builds the audit record on permit, NEVER persists — a speculative
  // checkEgress must not write a "what-left" row for an egress that never happened (INV-5).
  // Order is load-bearing; each guard fails closed (INV-1).
  async function checkEgress(act: EgressAct): Promise<EgressDecision> {
    // 1 — never-auto-transmit (IR-2). `?.` keeps it fail-closed even for a type-violating JS caller.
    if (act.userInitiation?.kind !== 'user_action') {
      return { permitted: false, reason: 'not_user_initiated' }
    }
    // 2 — target resolvable (R-3).
    if (!act.target?.integrationId) {
      return { permitted: false, reason: 'target_unresolved' }
    }
    // 3 — external_out boolean, delegated to #31 (INV-2). An unresolvable def throws
    //     CapabilityNotFound here and PROPAGATES — a bug, not a policy deny (INV-7).
    const ext = await enforcer.checkAction(act.defId, {
      type: 'external_out',
      target: act.target.integrationId,
    })
    if (!ext.allowed) return { permitted: false, reason: 'external_out_not_granted' }
    // 4 — union, sensitive half (INV-3). Steps 3+4 together ARE the compositional union
    //     ("enforced ACROSS the two action checks", enforcer.ts:92-98).
    for (const moduleClass of act.slice.sensitiveModules) {
      const s = await enforcer.checkAction(act.defId, { type: 'sensitive', moduleClass })
      if (!s.allowed) return { permitted: false, reason: 'sensitive_consent_missing' }
    }
    // 5 — per-target consent, finer than the boolean (R-2).
    const consented = await consent.hasTargetConsent(act.defId, act.target)
    if (!consented) return { permitted: false, reason: 'target_consent_missing' }
    // 6 — permit: build the record; do NOT persist (PF-1). unionConsented reflects whether a
    //     sensitive×external union was actually required + satisfied (not a blind true).
    const record: EgressAuditRecord = {
      defId: act.defId,
      target: act.target,
      sliceSummary: act.slice.summary,
      sensitiveModules: act.slice.sensitiveModules,
      unionConsented: act.slice.sensitiveModules.length > 0,
      at: Date.now(),
    }
    return { permitted: true, audit: record }
  }

  async function assertEgressPermitted(act: EgressAct): Promise<EgressAuditRecord> {
    const decision = await checkEgress(act)
    if (!decision.permitted || !decision.audit) {
      throw new EgressDenied(act.defId, decision.reason ?? 'external_out_not_granted')
    }
    // Persist once, only on the asserting path (PF-1) — the trail holds exactly the
    // egresses asserted-and-permitted.
    await audit.record(decision.audit)
    return decision.audit
  }

  // "A fetch is an outbound request" (ADR-014 §3.1) — one gate, one record. The fetch's
  // URL/params ARE the audited slice; sensitiveModules are caller-supplied (BR-17) (R-4).
  async function assertFetchEgress(act: FetchEgressAct): Promise<EgressAuditRecord> {
    return assertEgressPermitted({
      defId: act.defId,
      target: act.source,
      slice: { summary: act.fetchParams, sensitiveModules: act.slice.sensitiveModules },
      userInitiation: act.userInitiation,
    })
  }

  return { assertEgressPermitted, checkEgress, assertFetchEgress }
}
