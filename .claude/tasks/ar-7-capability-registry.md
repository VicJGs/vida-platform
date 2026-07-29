# Task: ar-7-capability-registry
# Status: planned
# Cluster: M1.0 Boot & Connective Base
# Milestone: Substrates
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

