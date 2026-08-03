# foundation/capability — substrate (ADR-008 + ADR-010)
# Auto-read by Claude when editing this layer. Structural home stood up in Part 2 (ADR-018).

## What this substrate is
Open capability-block registry (declare render targets; user chooses placement) under a declare->grant->enforce authoring-security sandbox (MERGE: CapSecurity #7)

## Owning ADR
ADR-008 + ADR-010

## Capabilities (framework §3)
CB1-CB* A2 A5

## Status
Built by AR-7 Increment 2 (2026-08-03). `capability_definitions` (CB1 registry, `def_id` semantic id) +
`block_instances` (standalone placements, structure) + `capability_grants` (ADR-010 envelope, structure) —
`db/schema/foundation/capability.ts` + migration 005 · `RENDER_TARGET` enum · `TERMINAL_STATE` + `CapabilityRegistry`
(shipped code-registered + user persisted; BR-2..6 validation → sync_queue). Currency: `docs/core/capability/current-*`.
Deferred (all homed, DF-12): sandbox/DSL/enforce runtime → `#85 CAP-authoring`; registry runtime → MOD-notes/UI-3;
grant ext-semantics → P3-boundary. JSON dims = plain TEXT (registry stringifies) — never `json<T>()`.
