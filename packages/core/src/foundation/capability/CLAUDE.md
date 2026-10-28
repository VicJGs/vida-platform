# foundation/capability — substrate (ADR-008 + ADR-010)

# Auto-read by Claude when editing this layer. Structural home stood up in Part 2 (ADR-018).

## What this substrate is

Open capability-block registry (declare render targets; user chooses placement) under a declare->grant->enforce authoring-security sandbox (MERGE: CapSecurity #7)

## Owning ADR

ADR-008 + ADR-010

## Capabilities (framework §3)

CB1-CB\* A2 A5

## Status

Registry built by AR-7 Increment 2 (2026-08-03): `capability_definitions` (CB1 registry, `def_id`) + `block_instances`

- `capability_grants` (ADR-010 envelope) — `db/schema/foundation/capability.ts` + migration 005 · `RENDER_TARGET` ·
  `TERMINAL_STATE` + `CapabilityRegistry` (shipped code-registered + user persisted; BR-2..6 → sync_queue).
  **Enforcement services added by XS-capability #31 (2026-09-17):** `enforcer.ts` (`createCapabilityEnforcer` —
  checkAction/assertPermitted decision core · getGrant/isEnvelopeCurrent · grant/revoke · `canonicalEnvelopeHash` ·
  `SENSITIVE_MODULE_CLASSES`) + `offered-set.ts` (`createOfferedSetResolver`). Fail-closed, shipped-bypass, ADR-010
  declare→grant→enforce. Currency: `docs/core/capability/current-*` (BR-9..17). Spec: `docs/specs/foundation/xs-capability/`.
  Deferred (all homed, DF-12): user-code **execution sandbox + DSL + authoring UI** → `#116 CAP-authoring`; registry
  runtime → MOD-notes/UI-3; per-source layer → XS-ingestion `#44`; egress mediation/audit → XS-egress-guard `#43`.
  ⚠ Gotcha: `Repository.findWhere` does NOT apply the soft-delete filter — filter `isNull(deleted_at)` explicitly (see
  `enforcer.ts activeGrant()`). JSON dims = plain TEXT (stringify on write) — never `json<T>()`.
