# foundation/egress — Current Spec

> Durable contract for the egress-mediation service (XS-egress-guard #43). Owning ADR: ADR-014 §3.3/§3.1
> (+ ADR-015 §3.3 — a cloud call is an egress that rides this guard).
> Kept current with `packages/core/src/foundation/egress/`. Spec: `docs/specs/foundation/xs-egress-guard/`.

## What it is
The per-target egress-mediation service — the STRICTEST grant in the system. `external_out_ok=true` (decided by
the CapabilityEnforcer #31) is NECESSARY but NOT sufficient: on top of it this service enforces per-target
consent + union-of-consents + never-auto-transmit and produces the audit record. It DECIDES + RECORDS; it holds
no credentials, makes no network call, and authors **no schema** — the durable audit + per-target-consent STORE
is M2 (behind the ports). XCU-06 (egress guard) + XCU-08 (compositional treat-fetch-as-egress).

## Surface
- **`createEgressGuard(enforcer: CapabilityEnforcer, ports?): EgressGuard`** (`foundation/egress/service.ts`),
  factory-of-closures (no `this`). `ports = { consent?: EgressConsentPort; audit?: EgressAuditPort }`.
  - `assertEgressPermitted(act: EgressAct) → EgressAuditRecord` (XCU-06) — throws `EgressDenied(defId, reason)` on
    deny; persists the record once via the audit port on permit.
  - `checkEgress(act) → EgressDecision` — non-throwing; **PURE** (builds the record, never persists — PF-1).
  - `assertFetchEgress(act: FetchEgressAct) → EgressAuditRecord` (XCU-08) — a sensitive-read cap's outbound fetch;
    `fetchParams` become the audited slice summary; routes through the one core gate.
- **Flow (order load-bearing, each guard fails closed):** 1 never-auto-transmit (`userInitiation.kind`) → 2 target
  resolvable (`target.integrationId`) → 3 `external_out` boolean via `enforcer.checkAction` → 4 sensitive-union
  (`checkAction {sensitive}` per `slice.sensitiveModules`; steps 3+4 = the compositional union) → 5 per-target
  consent via port → 6 build+return.
- **`foundation/egress/types.ts`:** `EgressTarget` (`{integrationId, kind: model|external_system|webhook, label}`,
  keyed on the integration-identity anchor X10) · `EgressSlice` (`{summary, sensitiveModules}`) ·
  `UserInitiationProof` · `EgressAct` · `FetchEgressAct` · `EgressDecision` · `EgressDenyReason` (5) ·
  `EgressAuditRecord` · `EgressConsentPort` · `EgressAuditPort` · `EgressGuard` · `EgressDenied` error.
- **M1 default ports (no schema):** consent = **deny-safe** (returns false — egress denied until a caller wires
  consent); audit = **no-op** sink. M2 swaps a real store (field-encrypted `[E]` + append-only, IR-8/IR-9).

## Delegated (not owned here)
`external_out` boolean + in/out union across action checks → CapabilityEnforcer #31 · per-source layer →
XS-ingestion #44 · credential injection + provider call → mediator (XCU-09) · the model call → XS-ai #45 /
ADR-015 · durable audit + per-target-consent STORE + real targets → M2 (port adapters) · audit VIEW + consent UX
→ P6 (XCU-06u).

## Tests
`foundation/egress/__tests__/service.test.ts` (14 — live-store smoke on real `capability_grants` via
`createCapabilityEnforcer`): never-auto-transmit · target-unresolved · external_out boolean · sensitive-union ·
per-target consent (deny-safe default) · permit + unionConsented · PF-1 check-is-pure · `EgressDenied(defId)` ·
INV-7 `CapabilityNotFound` propagates · XCU-08 fetch union-gated / boolean-only / params→audit.
