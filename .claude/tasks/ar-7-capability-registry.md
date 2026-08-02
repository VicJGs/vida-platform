# Task: ar-7-capability-registry
# Profile: Add Backend Component
# Scenario: default
# Spec: docs/specs/foundation/ar-7-capability-registry/_index.md  (to be authored in the PLAN gate)
# Created: 2026-08-01 (planned) · opened 2026-08-02
# Status: in_progress
# Linear: LIF-78
# Project: M1 — Whole Manual OS
# Milestone: M1.0 — Boot & Connective Base
# Phase: 1.0 — Structural Foundation
# Source: docs/roadmap.md → Phase 1.0 ② Architecture Layer (ADR-008/011/012)

## Goal
Build the capability substrate: the Capability/Block Registry (ADR-008) that declares which blocks
a space can enable, the measurability layer (ADR-011) that makes any metric roll up, and the
effect rail (ADR-004/012) that routes consequence events into the points economy. The machinery
Purposes & Goals (capstone) and Gamification consume.

## Dependencies
- blocked by `ar-5-sessions-framework`
- blocked by `ar-6-spaces`  <!-- intra-tier substrate edge, reconciled 2026-07-29: AR-7's capability/block registry (ADR-008) references the spaces/space_enabled_blocks tables AR-6 owns; capability-registry/block_instances were explicitly DEFERRED from AR-6 → AR-7. Asserted by the 2026-07-28 + 07-29 session-logs; was missing from both this file and delivery-plan §5. -->
- blocked by `db-6-repository-layer`
- blocked by `db-9-enums-zod`  <!-- slug→canonical map key (was db-9-enums-and-zod-validators); delivery-planning-loop U1 -->
<!-- reconciled 2026-07-27 (dep-reconcile triage): added DB-6 + DB-9 (was ar-5 only). The capability/measurability/
     effect rail persists through the repository (DB-6) and needs enums/Zod (DB-9). `applied_effects` stays in the
     DB-3 stream under schema/foundation/effects (ADR-018 §3.1) — NOT relocated. -->

**All 4 blockers ✅ done** (AR-5 LIF-107, AR-6 LIF-77, DB-6 LIF-68, DB-9 LIF-106) → AR-7 is genuinely READY.
Homes: `core/src/foundation/{capability,measurement,economy,effects}` (ADRs 008/011/012/004). Unblocks
MOD-purposes, MOD-gamification, HARD-2 (reconstructed-structure.md row 13). Highest ready fan-out (3).

## Open Questions
- Exact scope split: capability/block registry (CB1–CB6, ADR-008) vs measurability (ADR-011) vs economy
  (ADR-012) vs effect rail (ADR-004 §3.2.5) — resolve in Step 0/PLAN via the capability-framework §3/§6
  predicates (mechanical boundary, not a grain fork).
- What AR-7 does NOT own (deferred to consumer modules / build-time) — cite each boundary to an ADR §"does NOT".

## Decisions Made
| Decision | Choice | Reason | Date |
|----------|--------|--------|------|
| Next M1.0 head | AR-7 | computed `tracker_sync --next`, confirmed across --plan / --verify (live Linear, 91/91) / reconstructed-structure.md row 13; highest ready fan-out (3); all 4 blockers done | 2026-08-02 |

## Progress
<!-- SESSION checklist — mirrors the scenario ## Task List; native panel mirrors this. -->
- [ ] document-context BASELINE — current-* of the contexts to touch (ground truth for the gates)
- [ ] Forward spec written + PLAN gate cleared (§XXVI g1) — independent critique → Approval 1
- [ ] IMPL-PLAN gate (§XXVI g2): /preflight → 2nd independent critique → Approval 2
- [ ] Read 3 existing substrate patterns (AR-5/AR-6) — state the template
- [ ] /adr-check equivalent — every shape validated vs ADR-008/011/012/004 + framework §3/§6
- [ ] TypeScript types + validators first
- [ ] Schema + migration + services implemented
- [ ] Full error handling — typed fail-loud errors
- [ ] Registered — migration in runner.ts, exports in barrels
- [ ] tsc --noEmit passes — zero errors
- [ ] tests pass — capability/measurement/economy/effects + enum parity
- [ ] /critique → SHIP verdict (independent critiques)
- [ ] Currency Rule (§XXIX) — CURRENT- docs born/refreshed for every context touched

## Build Steps
<!-- ⊞4 (DF-11 increment rule): AR-7 ships as 4 gated build-step increments under LIF-78, dependency order.
     Each increment runs the FULL §XXVI double-gate; LIF-78 closes when the census aligns all 4 homes. -->
- [x] Increment 1 — **effects** rail ✅ (base; AR-5 deferred it here) — `foundation/effects` + schema/migration 004
    - [x] gate-1: baseline + PLAN → independent critique SHIP (3 fold-ins) → **Approval 1** (effect_event_id canonical-string, hash deferred build-phase, grounded)
    - [x] gate-2: IMPLEMENTATION-PLAN → critique REVISE (blocker enum-parity wiring + major handler-tx signature) → fixed → preflight PASSED → **Approval 2**
    - [x] build + verify: @vida/core typecheck 0, tests **140/140** (effects 8/8 + enum-parity applied_effects), root typecheck **10/10**; fixed stale spaces version assertion → Currency `docs/core/effects/current-*` + layer-doc [L]
    - [ ] commit (pending Victor)
- [ ] Increment 2 — **capability** registry (ADR-008/010) — `foundation/capability`
- [ ] Increment 3 — **measurement** (ADR-011) — `foundation/measurement`
- [ ] Increment 4 — **economy** (ADR-012) — `foundation/economy`
_(each increment's §5 authored at its own Approval 2)_

## Route History
- 2026-08-02 — opened as the computed M1.0 head; profile Add Backend Component / scenario default.

