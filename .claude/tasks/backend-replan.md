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
| GG4 reward model | Shipped-default `rules` (static-seed) + `weight_by` descriptor + global `xp_difficulty_weighting` pref w/ per-rule override + achievements-bridge (D3); `grant_currency` untouched; currency integration-ready (M2 owns plumbing) | Victor-approved design-pass; reuses authored substrate, no new economy table, no M2/P2 smuggle | 2026-09-14 |

## Progress
<!-- Campaign phases — the milestone-delivery-planning scenario, gated per §XXVI. -->
- [x] P-1 · Recon + teardown (notes deleted, branch green) + baseline map of the current backend model
- [x] P0 · RATIFY — plan `backend-consolidation-plan.md` (g1 critique REVISE→6 blocking fixed) + **ADR-021** authored → **Approval 1 ✅ (Victor 2026-09-11)**. Standing rule: each phase P1–P6 runs its OWN plan + §XXVI gates ([[backend-replan-per-phase-gates]]).
- [x] P1 · FULL-INTENT SERVICE INTAKE ✅ — plan `PLAN-p1-intake.md` (method-gate REVISE→resolved) → intake workflow (`wf_8b80e345-2d6`: 34 readers → dedup → assembler) → **corpus gate REVISE→SHIP** → `backend-intent/corpus.md` committed `0d36bd7`. **1194 items · 608 deferred-flags · 1045 live-intent · 368 cross-cutting · 154 UNKNOWNs (0 unhomed).** ⚠ gamification reader API-failed mid-run → recovered; §4c merged 4 re-scatter defects. ~~⚠ GG4 (gamification XP fixed-vs-tunable) = unratified design gap → needs-Victor.~~ **✅ RESOLVED pre-P2 (2026-09-14) — see the pre-P2 progress item below.**
- [x] **pre-P2 · GG4 RATIFIED** ✅ — the one unratified gamification gap (XP reward model + difficulty weighting). Victor-approved pre-P2 design-pass `PLAN-gg4-reward-model.md` (§XXVI gate: `/critique` REVISE→6 fixed · `/preflight` PASSED→4 folded). Composite A1+A′1+B2+C1+D3+E1+F1+G1 → **ADR-012 §3.11** amendment + corpus GG4 closed (3 places). Homes: gamification build + Preferences build (`xp_difficulty_weighting` col), F1→Preferences edge for P3. **GG4 no longer blocks P3.**
- [~] P2 · SCHEMA + TYPES RECONCILE — plan `PLAN-p2-schema-reconcile.md` (method-gate REVISE→resolved: 3 blocking [19+12 schema files not 22 · `note.ts` flat path · `_bidx` blind-index filter hole] + 5 folds) → **Approval 1 ✅ (Victor 2026-09-13)**. **NEXT SESSION = P2 EXECUTION** (per-domain audit workflow → `schema-audit.md` → audit-report gate → apply targeted fixes + notes-hub rebuild [`version:33` migration] → DDL parity + typecheck + deleted-symbol sweep → post-impl gate). Reconcile-not-redo; expose authored-but-inert cols (no migration), add-migrate only genuinely-absent.
- [ ] P3 · HORIZONTAL DECOMPOSITION — carve corpus → proper issues (cross-cutting-first + per-module CRUD), acyclic
- [ ] P4 · COVERAGE GATE — independent adversarial critic: ⋃(issues) ⊇ corpus · 0 unhomed · nothing smuggled
- [ ] P5 · LINEAR REORG — create/reshape projects/milestones/issues; retire the module-vertical ① issues
- [ ] P6 · FRONTEND TRACK SCOPING — the separated ② plan (later)
