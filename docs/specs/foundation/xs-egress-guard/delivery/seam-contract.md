# Seam Contract — XS-egress-guard (#43, LIF-171)

> Entity Delivery Flow §2. XS-egress-guard has **no frontend twin**; the seam is the **service API that any
> egressing capability + the M2 mediator + the P6 audit/consent surface consume**. Consumers (all later):
> **XS-ai `#45`** (a cloud `askModel` call is an egress that rides this guard, `[FACT: ADR-015:54,58]`),
> **MOD-finance `#47`** / **MOD-health-core `#61`** / **MOD-skills `#76`** (external push; build-deps →XS-egress-guard,
> `[FACT: decomposition.md:58,61,76]`), and **`fe-integrations-ai-surfaces`** (P6 audit/consent face,
> `[FACT: PLAN-p6-frontend-track.md:189]`).

## The consumed surface (stable)

```ts
// The strict per-target egress gate. Called BEFORE any vault data leaves the device.
// Runs the enforcer external_out boolean, then the egress-specific rails. Returns the audit record on permit.
assertEgressPermitted(act: EgressAct): Promise<EgressAuditRecord>   // throws EgressDenied on deny
checkEgress(act: EgressAct): Promise<EgressDecision>               // non-throwing variant

// XCU-08 — a cap holding a sensitive read + external_in performs an outbound fetch: URL/params are egress.
// "A fetch is an outbound request" [FACT: ADR-014:42] → the SAME egress gate; this builds the EgressAct from
// the fetch (source-as-target, params-as-slice) and calls the one core gate. Not a second gate.
assertFetchEgress(act: FetchEgressAct): Promise<EgressAuditRecord> // throws EgressDenied on deny

interface EgressAct {
  defId: string                        // the initiating capability (its grant is read via the enforcer)
  target: EgressTarget                 // WHO receives the data
  slice: EgressSlice                   // WHAT leaves (summary + sensitive classes read to build it)
  userInitiation: UserInitiationProof  // never-auto-transmit — absence ⇒ deny (IR-2)
}

interface FetchEgressAct {
  defId: string
  source: EgressTarget                 // the fetch source, treated as an egress target (IR-3)
  fetchParams: string                  // the URL/path/query — the potential exfil channel, captured to audit
  slice: EgressSlice
  userInitiation: UserInitiationProof
}

// U-3 lean: a target is keyed on the stable INTEGRATION-IDENTITY anchor (X10), not a raw URL — so a
// Layer-3→Layer-1 upgrade keeps audit continuity. `[FACT: ADR-014:78 (§3.8); capability-framework.md:204 (X10)]`
//   kind: 'model'           — a cloud LLM provider `[FACT: ADR-015:54 (§3.3) cloud call = egress]`
//         'external_system' — a native/Layer-1 push target, e.g. Health CI-6 medical push `[FACT: ADR-014:64]`
//         'webhook'         — a user-managed Layer-3 endpoint `[FACT: ADR-014:50 (§3.2 Layer 3 webhooks)]`
interface EgressTarget { integrationId: string; kind: 'model' | 'external_system' | 'webhook'; label: string }

interface EgressSlice { summary: string; sensitiveModules: string[] } // WHAT + WHEN, never the plaintext payload
type UserInitiationProof = { kind: 'user_action'; at: number }

interface EgressDecision { permitted: boolean; reason?: EgressDenyReason; audit?: EgressAuditRecord }
type EgressDenyReason =
  | 'external_out_not_granted'   // enforcer boolean failed (delegated up to #31)
  | 'sensitive_consent_missing'  // union half absent — sensitive read w/o its consent
  | 'target_consent_missing'     // per-target consent absent (U-2 port said no)
  | 'not_user_initiated'         // never-auto-transmit violated (IR-2)
  | 'target_unresolved'          // target integration-identity unresolved (U-3)

interface EgressAuditRecord {    // produced on permit; RETURNED (M1) + handed to the audit port
  defId: string; target: EgressTarget; sliceSummary: string
  sensitiveModules: string[]; unionConsented: boolean; at: number   // `at` = when it left
}
```

## The persistence PORTS (the U-1/U-2 seam — M1 default adapter, M2 real store)

```ts
interface EgressConsentPort { hasTargetConsent(defId: string, target: EgressTarget): Promise<boolean> } // U-2
// record() is APPEND-ONLY (IR-9 — no update/delete of a recorded egress); the M2 store field-encrypts the
// entry ([E], IR-8 — sliceSummary + sensitiveModules describe what left, plaintext would itself be an egress).
interface EgressAuditPort   { record(entry: EgressAuditRecord): Promise<void> }                          // U-1

// Factory (mirrors createCapabilityEnforcer). M1 default ports: consent = deny-safe (returns false unless a
// per-use consent token is supplied); audit = in-memory sink. M2 swaps real adapters — no signature change.
createEgressGuard(
  enforcer: CapabilityEnforcer,
  ports?: { consent?: EgressConsentPort; audit?: EgressAuditPort },
): EgressGuard
```

## Contract invariants the consumer can rely on
- **Necessary-but-not-sufficient boolean**: `external_out_ok=true` (decided by `#31`) is required first, then the
  strict per-target rails run on top. A blanket "allow external" never satisfies egress. `[FACT: ADR-014:64,66]`.
- **Fail-closed**: any unknown/missing input (no grant, no target consent, no user-initiation, unresolved target) ⇒
  `permitted:false` / `EgressDenied`; permit is only an explicit positive match. `[FACT: enforcer.ts:81-88; ADR-010 fail-closed]`.
- **Never auto-transmit**: every egress requires a `UserInitiationProof`; an agent/code-composed transmit without it
  is denied, and each `askModel` hop re-hits the gate. `[FACT: ADR-014:64; ADR-015:58 (§3.4a)]`.
- **Union-of-consents**: a slice that reads a sensitive module AND reaches a target requires **both** the sensitive
  consent (checked via the enforcer) AND per-target egress consent — presented as one channel. `[FACT: ADR-014:64 (ADR-010 §3.5)]`.
- **A fetch is outbound (XCU-08)**: `assertFetchEgress` treats a sensitive-read cap's `external_in` fetch URL/params
  as egress; a non-sensitive fetch is the enforcer's boolean only, not re-gated. `[FACT: ADR-014:42; capability-framework.md:200]`.
- **Audit is what+when, not content**: the record names the target + slice summary + sensitive tags + timestamp,
  never the plaintext payload. `[FACT: xcut-ingestion-ai.md:19]`.
- **Audit is sensitive + append-only**: the record itself describes what sensitive data left → the M2 store
  field-encrypts it (`[E]`, IR-8) and forbids update/delete (append-only, IR-9). `[FACT: ADR-002 L2; ADR-014:64]`.
- **Revocation stops future egress; sent data is not recalled** — a denied post-revoke transmit fails closed; the
  audit trail retains prior sends. `[FACT: ADR-014:70]`.

## Seams this contract does NOT cross (delegated)
`external_out` boolean + in/out union across action checks (`CapabilityEnforcer #31`) · external-in per-source
**layer** (XS-ingestion `#44`) · **credential injection + provider call** (mediator/ingestion, XCU-09) · the
**model call** (XS-ai `#45` / ADR-015) · the **durable audit + per-target consent STORE + real targets** (M2 port
adapters) · the **audit VIEW + consent UX** (P6, XCU-06u). This service **decides + records**; it does not hold
credentials, make the network call, or persist to a real store at M1.
