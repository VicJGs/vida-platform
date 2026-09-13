# Task: backend-replan
# Profile: project-foundation
# Scenario: milestone-delivery-planning
# Spec: docs/roadmap/backend-consolidation-plan.md
# Created: 2026-09-11
# Status: in-progress
# Project: M1 — Whole Manual OS
# Milestone: M1.1+ (backend service tier — cross-milestone)
# Linear: (create at P5 Linear reorg)
# Source: session pivot 2026-09-11 (Victor) — reverse module-by-module backend grain

## Goal
**Replace the module-by-module vertical-slice backend grain with a full-intent, service-layer-first
consolidation.** Intake the COMPLETE backend service/logic intent across all ~21 modules + the
cross-cutting services in ONE pass, carve it into proper Linear issues that provably cover 100% of the
intent (nothing left behind), and separate the frontend into its own later track. The DB-4 schema is
**audited against the unified intent + targeted-fixed** (not wholesale redone); the notes schema is
rebuilt (it was torn down). Supersedes the `m1.1-delivery-plan §2/§9` backend ① grain + the Entity
Delivery Flow vertical fork for the service tier.

## Dependencies
- consumes the gated M1.0 foundation: DB-4 schema (117 tables, 21 domains — audit target), the
  cross-cutting substrates (sessions/spaces/views/capability/measurement/economy/effects/review), AR-6/AR-8.
- supersedes (does not block on) the module-vertical MOD-* ① issues (#31–#48+).

## Context
- Branch `backend-replan` off `main` (teardown of notes landed here; main untouched).
- Notes teardown DONE (25 files deleted, 9 reconciled, typecheck 11/11 green) — see session log.
- Profile switched Add-Frontend-Component → project-foundation (this session).

## Open Questions
- [P1] Final decomposition axis — cross-cutting-services-first + per-module-CRUD, vs pure-layer. (Resolve at P3.)
- [P5] Disposition of the existing module-vertical Linear issues (#31–#48) + mod-notes LIF-131.

## Decisions Made
| Decision | Choice | Reason | Date |
|----------|--------|--------|------|
| Teardown depth (notes) | Delete impl + schema + types + validators + docs | Full clean slate; whole-backend re-intake | 2026-09-11 |
| Re-plan scope | Whole backend (data + service) from unified intent | "module by module leaves things undone" | 2026-09-11 |
| Schema action | Audit + targeted fix (NOT wholesale redo of the 117 gated tables) | DB-4 was already built holistically-upfront (Model B); redo = over-engineering | 2026-09-11 |

## Progress
<!-- Campaign phases — the milestone-delivery-planning scenario, gated per §XXVI. -->
- [x] P-1 · Recon + teardown (notes deleted, branch green) + baseline map of the current backend model
- [x] P0 · RATIFY — plan `backend-consolidation-plan.md` (g1 critique REVISE→6 blocking fixed) + **ADR-021** authored → **Approval 1 ✅ (Victor 2026-09-11)**. Standing rule: each phase P1–P6 runs its OWN plan + §XXVI gates ([[backend-replan-per-phase-gates]]).
- [ ] P1 · FULL-INTENT SERVICE INTAKE — consolidated backend-intent corpus (all module 5-aspect docs + intake + m1.1 §9 deferred + cross-cutting service ADRs), organized by capability/layer
- [ ] P2 · SCHEMA AUDIT + RECONCILE — DB-4 vs corpus (targeted fixes) + rebuild notes schema substrate
- [ ] P3 · HORIZONTAL DECOMPOSITION — carve corpus → proper issues (cross-cutting-first + per-module CRUD), acyclic
- [ ] P4 · COVERAGE GATE — independent adversarial critic: ⋃(issues) ⊇ corpus · 0 unhomed · nothing smuggled
- [ ] P5 · LINEAR REORG — create/reshape projects/milestones/issues; retire the module-vertical ① issues
- [ ] P6 · FRONTEND TRACK SCOPING — the separated ② plan (later)
