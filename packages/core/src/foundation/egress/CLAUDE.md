# foundation/egress — substrate (ADR-014 §3.3 · XCU-06/08)
# Auto-read by Claude when editing this layer.

## What this substrate is
The per-target egress-mediation service — the STRICTEST grant in the system. Vault-leaving data requires
per-target explicit consent + union-of-consents + an audit trail of what left & when + never auto-transmit
(always user-initiated). Compositional-exfiltration (XCU-08): a cap with a sensitive read + ANY external grant
treats its outbound fetch URL/params as egress ("a fetch is an outbound request").

## Owning ADR
ADR-014 §3.3/§3.1 (+ ADR-015 §3.3 — a cloud call is an egress that rides this guard)

## Capabilities (framework §3)
X4 (egress guard) · X6 (compositional exfiltration)

## Status
Built by XS-egress-guard #43 (2026-09-20). `service.ts` (`createEgressGuard(enforcer, ports?)` —
`assertEgressPermitted` / `checkEgress` [pure, XCU-06] + `assertFetchEgress` [XCU-08]) over the BUILT
CapabilityEnforcer #31: step order = never-auto-transmit → target → external_out boolean (delegated to #31) →
sensitive-union → per-target consent → build+return; the assert path persists once. Fail-closed by construction
(no consent adapter ⇒ deny). `EgressDenied(defId, reason)`.
**No schema at M1** — the audit + per-target-consent STORE is M2 via the ports (`EgressConsentPort` deny-safe
default · `EgressAuditPort` no-op default); the M2 store is field-encrypted `[E]` (R3/EN-2) + append-only.
Spec: `docs/specs/foundation/xs-egress-guard/`. Currency: `docs/core/egress/current-*`.
Delegated: `external_out` boolean + in/out union across action checks → CapabilityEnforcer #31 · per-source
layer → XS-ingestion #44 · credential injection + provider call → mediator (XCU-09) · the model call →
XS-ai #45 / ADR-015 · audit VIEW + consent UX → P6 (XCU-06u).
⚠ `at` = `Date.now()` (Unix ms). `sensitiveModules` are caller-supplied, never inferred (BR-17).
