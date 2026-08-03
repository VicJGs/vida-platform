# Task: cap-authoring
# Profile: Add Backend Component
# Scenario: default
# Status: planned
# Linear: LIF-156
# Project: M4 — Venues / Multi-Device
# Milestone: M4.0 — Venues

## Goal
The user-authored capability **safe-authoring surface** (ADR-010 / SP4): the sandbox runtime · authoring DSL/UI ·
grant enforce/re-grant/revoke. ⚠ **INTENDED-later** — no M1–M4 module consumes user-authored capabilities
(first-consumer-pull → parked at the tail, `#85`); its per-platform sandbox rides each venue's pass (ADR-010 §3.6).
Consumes the `capability_grants` table (AR-7 inc-2) + rides the capability registry (AR-7).

## Dependencies
- blocked by `ar-7-capability-registry`  <!-- the registry + capability_grants it enforces -->
- blocked by `ui-3-vida-editor`  <!-- the authoring UI needs the editor -->

## Provenance
Created by **DF-12** (home-deferred-substrate-pieces) so AR-7's cited ADR-010/SP4 deferral has a real issue home
(db-10-proof — no orphan deferral). `CAP-` slug (not `MOD-`) so the unscoped "all `MOD-*`" aggregators don't pull a
`#85` backward-edge. Structure row: `reconstructed-structure.md` #85.

## Notes
Not for build now — a tracked horizon issue. Build begins when user-authoring is first offered (its first consumer).
