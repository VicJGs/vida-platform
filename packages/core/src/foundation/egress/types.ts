// ============================================================================
// foundation/egress — types (XS-egress-guard #43 · ADR-014 §3.3 · XCU-06/08)
//
// The per-target egress-mediation service — the STRICTEST grant in the system.
// Layers per-target consent + union-of-consents + audit + never-auto-transmit on
// top of the capability enforcer's external_out boolean (#31). Decides + records;
// holds no credentials, makes no network call. No schema at M1 — the durable audit
// + per-target-consent STORE is M2 (the ports; [E] + append-only there, R-1/R-2).
// Spec: docs/specs/foundation/xs-egress-guard/.
// ============================================================================

// WHO receives vault-leaving data. Keyed on the stable integration-identity anchor
// (X10 / ADR-014 §3.8), not a raw URL — so a Layer-3→Layer-1 upgrade keeps audit
// continuity. `kind`: model (ADR-015 cloud call) · external_system (native push,
// e.g. Health CI-6 medical) · webhook (Layer-3 user-managed, ADR-014 §3.2).
export interface EgressTarget {
  integrationId: string
  kind: 'model' | 'external_system' | 'webhook'
  label: string
}

// WHAT leaves — a human-readable summary + the sensitive classes the slice reads
// (caller-supplied, never inferred — BR-17). Never the plaintext payload.
export interface EgressSlice {
  summary: string
  sensitiveModules: string[]
}

// never-auto-transmit (IR-2): every egress is a user-initiated act; a proof-less act denies.
export interface UserInitiationProof {
  kind: 'user_action'
  at: number
}

// XCU-06 — a push egress act.
export interface EgressAct {
  defId: string
  target: EgressTarget
  slice: EgressSlice
  userInitiation: UserInitiationProof
}

// XCU-08 — a cap holding a sensitive read + external_in performs an outbound fetch:
// the URL/params are egress ("a fetch is an outbound request", ADR-014 §3.1). Routed
// through the SAME gate — `fetchParams` becomes the audited slice summary.
export interface FetchEgressAct {
  defId: string
  source: EgressTarget
  fetchParams: string
  slice: EgressSlice
  userInitiation: UserInitiationProof
}

export type EgressDenyReason =
  | 'external_out_not_granted' // enforcer boolean failed (delegated to #31)
  | 'sensitive_consent_missing' // union half absent — sensitive read without its consent
  | 'target_consent_missing' // per-target consent absent (consent port said no)
  | 'not_user_initiated' // never-auto-transmit violated (IR-2)
  | 'target_unresolved' // target integration-identity unset (R-3)

// Produced on permit; RETURNED (M1) + handed to the audit port. `at` = when it left.
// what+when, not content; sensitive → the M2 store field-encrypts it ([E]) + append-only (IR-8/IR-9).
export interface EgressAuditRecord {
  defId: string
  target: EgressTarget
  sliceSummary: string
  sensitiveModules: string[]
  unionConsented: boolean
  at: number
}

export interface EgressDecision {
  permitted: boolean
  reason?: EgressDenyReason
  audit?: EgressAuditRecord
}

// Thrown by the assert* variants on deny. Carries defId (parity with CapabilityDenied).
export class EgressDenied extends Error {
  readonly defId: string
  readonly reason: EgressDenyReason
  constructor(defId: string, reason: EgressDenyReason) {
    super(`Egress denied: ${defId} (${reason})`)
    this.name = 'EgressDenied'
    this.defId = defId
    this.reason = reason
  }
}

// The persistence PORTS — the U-1/U-2 seam. M1 ships deny-safe consent + a no-op audit
// sink (no schema); M2 swaps the real store ([E] + append-only, IR-8/IR-9).
export interface EgressConsentPort {
  hasTargetConsent(defId: string, target: EgressTarget): Promise<boolean>
}
export interface EgressAuditPort {
  record(entry: EgressAuditRecord): Promise<void>
}

export interface EgressGuard {
  /** XCU-06 — strict per-target gate; returns the audit record on permit, throws EgressDenied on deny. */
  assertEgressPermitted(act: EgressAct): Promise<EgressAuditRecord>
  /** Non-throwing variant. PURE — builds the record but never persists (PF-1). */
  checkEgress(act: EgressAct): Promise<EgressDecision>
  /** XCU-08 — treats a sensitive-read cap's outbound fetch as an egress act through the one gate. */
  assertFetchEgress(act: FetchEgressAct): Promise<EgressAuditRecord>
}
