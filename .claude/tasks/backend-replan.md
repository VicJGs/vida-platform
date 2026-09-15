# Task: backend-replan
# Profile: project-foundation
# Scenario: milestone-delivery-planning
# Spec: docs/roadmap/backend-consolidation-plan.md
# Created: 2026-09-11
# Status: in-progress
# Project: M1 — Whole Manual OS
# Milestone: M1.1+ (backend service tier — cross-milestone)
# Linear: LIF-163
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
- ~~[P1] Final decomposition axis~~ — RESOLVED at P3: cross-cutting-services-first + per-module-CRUD; **module-owned seams fold into their owner MOD** (Victor 2026-09-15).
- [P5] Disposition of the existing module-vertical Linear issues (#31–#48) + mod-notes LIF-131.

## Decisions Made
| Decision | Choice | Reason | Date |
|----------|--------|--------|------|
| Teardown depth (notes) | Delete impl + schema + types + validators + docs | Full clean slate; whole-backend re-intake | 2026-09-11 |
| Re-plan scope | Whole backend (data + service) from unified intent | "module by module leaves things undone" | 2026-09-11 |
| Schema action | Audit + targeted fix (NOT wholesale redo of the 117 gated tables) | DB-4 was already built holistically-upfront (Model B); redo = over-engineering | 2026-09-11 |
| GG4 reward model | Shipped-default `rules` (static-seed) + `weight_by` descriptor + global `xp_difficulty_weighting` pref w/ per-rule override + achievements-bridge (D3); `grant_currency` untouched; currency integration-ready (M2 owns plumbing) | Victor-approved design-pass; reuses authored substrate, no new economy table, no M2/P2 smuggle | 2026-09-14 |
| P3 decomposition axis | Cross-cutting-services-first (XS) + per-module CRUD (MOD); XS = pure-infra engines only; **module-owned seams (summary/dueIn/review/pages/economy) fold into their owner MOD** with consumers build-edging to the owner | Corpus homes cross-cutting work to owning modules; matches the plan's B.11/economy fold rules; XS-first "bag of consumer stubs" avoided | 2026-09-15 |
| P3 edge model | BUILD edges (→XS or seam-owner MOD, acyclicity-checked) vs RUNTIME read-seams (MOD→MOD, may be bidirectional, not build-blockers) | Running acyclicity over runtime seams falsely fails on legit bidirectional provider seams (finance↔projects) | 2026-09-15 |

## Progress
<!-- Campaign phases — the milestone-delivery-planning scenario, gated per §XXVI. -->
- [x] P-1 · Recon + teardown (notes deleted, branch green) + baseline map of the current backend model
- [x] P0 · RATIFY — plan `backend-consolidation-plan.md` (g1 critique REVISE→6 blocking fixed) + **ADR-021** authored → **Approval 1 ✅ (Victor 2026-09-11)**. Standing rule: each phase P1–P6 runs its OWN plan + §XXVI gates ([[backend-replan-per-phase-gates]]).
- [x] P1 · FULL-INTENT SERVICE INTAKE ✅ — plan `PLAN-p1-intake.md` (method-gate REVISE→resolved) → intake workflow (`wf_8b80e345-2d6`: 34 readers → dedup → assembler) → **corpus gate REVISE→SHIP** → `backend-intent/corpus.md` committed `0d36bd7`. **1194 items · 608 deferred-flags · 1045 live-intent · 368 cross-cutting · 154 UNKNOWNs (0 unhomed).** ⚠ gamification reader API-failed mid-run → recovered; §4c merged 4 re-scatter defects. ~~⚠ GG4 (gamification XP fixed-vs-tunable) = unratified design gap → needs-Victor.~~ **✅ RESOLVED pre-P2 (2026-09-14) — see the pre-P2 progress item below.**
- [x] **pre-P2 · GG4 RATIFIED** ✅ — the one unratified gamification gap (XP reward model + difficulty weighting). Victor-approved pre-P2 design-pass `PLAN-gg4-reward-model.md` (§XXVI gate: `/critique` REVISE→6 fixed · `/preflight` PASSED→4 folded). Composite A1+A′1+B2+C1+D3+E1+F1+G1 → **ADR-012 §3.11** amendment + corpus GG4 closed (3 places). Homes: gamification build + Preferences build (`xp_difficulty_weighting` col), F1→Preferences edge for P3. **GG4 no longer blocks P3.**
- [x] **P2 · SCHEMA + TYPES RECONCILE ✅ COMPLETE (2026-09-14)** — plan `PLAN-p2-schema-reconcile.md` (method-gate REVISE→resolved: 3 blocking [19+12 schema files not 22 · `note.ts` flat path · `_bidx` blind-index filter hole] + 5 folds) → **Approval 1 ✅ (Victor 2026-09-13)**.
  - **P2 audit DONE** (2026-09-14) — audit Workflow `wf_f7ecb25f-a91` (31 auditors + triage, 32 agents, 2.43M tok, ~105 min) → **`schema-audit.md`** (+ `-appendix.md` 435-item roster + `-deferred-homes.md`). **435 items: 312 ALIGNED · 117 DEFERRED (0 unhomed) · 6 DIVERGENT · 0 GAP · 8 bidx.** Reconcile thesis CONFIRMED (Model-B holds; overwhelmingly expose-only + parity-verify). **Only new DDL migration = `033_notes.ts`** (notes hub); everything else expose-in-types / verify / defer-to-module-build.
  - **Audit-report gate (Approval 2): both critics SHIP** — independent adversarial critic (`ad0eec1e`, falsification-tested every claim vs files on disk → SHIP, 2 NITs folded) + `/critique` design-director (SHIP). O1–O5 dispositions ratifiable as leaned; O4 critic mildly favors unify-now.
  - **Approval 2 GRANTED (Victor 2026-09-14)** — O1/O2/O5 adopted as leaned; **O3 = DEFER the 2 add-DDL (daily_cap split → MOD-knowledge M1.2 · nutrition name_bidx → nutrition M1.2), flagged prominently** (`schema-audit-deferred-homes.md` § DO-NOT-LOSE); **O4 = UNIFY provenance to `manual|ai|import` now** (`'llm'`→`'ai'`). **Scope refinement:** the 112-item expose sweep + `progress→number|null` batch DEFER to DB-11 / module builds (plan Acceptance = types-colocation *correct* + notes hub, not speculative expose). **P2 fix set = notes-hub `033_notes.ts` + O4 unify + parity/§8 verify + green tree.**
  - [x] **FIXES APPLIED** (§XXVI IMPLEMENT, 2026-09-14) — **O4 unify:** `'llm'`→`'ai'` in `PHYSICAL_ROLE_AUTHORING_SOURCE`/`SKILL_FILL_SOURCE` tuples + 3 migration CHECKs (021/027/029); no stray `'llm'` in source. **Notes-hub rebuild:** `schema/notes.ts` + `migrations/033_notes.ts` (`version:33`, appended not slot-012) + `@vida/types/note.ts` (REDUCED — pomodoro re-homed to session.ts, Tag/PageTag/EntityLink dropped as Spaces-owned; keeps PAGE_TYPE/ENTITY_LINK_TARGET-ref/Page/PageLink/NoteAttachment) + `validators/note.ts` (REDUCED) + 4 barrels + runner `ALL_MIGRATIONS` + `enum-parity` `pages.type` row + new `notes-introspection.test.ts`. Restored as SHAPE-reference from pre-teardown git (`eaf64f8^`), reconciled to corpus §11 + current re-homing.
  - [x] **VERIFY GREEN** — **typecheck 11/11** (Node 24); **isolated tests 177 passed** (enum-parity 159 · notes-introspection 12 · migrations-runner 6); V1 (`check_in_streak*` absent from user_profile) ✓ · V3 (`page_tags`/`pomodoro_sessions`/`pages.slug` absent from schema/) ✓ · V4 dist ghosts regenerated ✓. `LATEST_VERSION`→33 derives. [full @vida/core suite running for authoritative count.]
  - [x] **post-impl gate SHIP** (`/critique` §7.3) — independent critic (`ad3ea4bf`) adversarially verified the applied diff on disk (even injected a mirror-default drift to prove the introspection test catches it → it did); all 6 areas CLEAN, 1 NIT folded (note.ts EntityLink comment). **§XXIX currency:** `docs/infrastructure/database-layer/current-spec.md` refreshed (notes→033, `LATEST_VERSION=33`, O4 unify). **✅ P2 COMPLETE** — reconcile confirmed (0 GAP), notes hub rebuilt, O4 unified, green tree (typecheck 11/11 · @vida/core 796/796). Uncommitted on branch `backend-replan` (awaiting Victor's commit call).
- [x] **P3 · HORIZONTAL DECOMPOSITION ✅ COMPLETE (2026-09-15)** — plan `PLAN-p3-decomposition.md` (method-gate: independent critic + `/preflight` REVISE→2 blocking+4 nits fixed → `/critique` SHIP → **Approval 1 ✅ Victor 2026-09-15**). Carve Workflow `wf_d28406db-35c` (34 readers → deterministic assembler → verifier; resumed 5× as the assembler was fixed, readers cached). **33 issues = 11 XS + 22 MOD** (`decomposition.md` + `traceability.md`). **1200 canonical ids (disk-verified, 2 independent sweeps 0-diff — supersedes the stale corpus header 1194 which undercounted `*u` split-UI rows) · 0 unhomed · acyclic(build)=true · 0 dangling · partition closes (985+401−186=1200).** Homed-out: 222 P6 · 105 DEFERRED · 98 RIDE. **Gate 2 (Decomposition Gate): both in-workflow + independent on-disk critics SHIP.** 5 REVISE rounds all corpus-cited: namespacing · build-vs-runtime edge split · sessions fold · module-owned-seam fold (Victor) · 2 directional edge fixes. **Accepted (Victor 2026-09-15).**
- [ ] P4 · COVERAGE GATE — independent adversarial critic: ⋃(issues) ⊇ corpus · 0 unhomed · nothing smuggled (P3's `traceability.md` 1200-key set = the join key)
- [ ] P5 · LINEAR REORG — create/reshape projects/milestones/issues; retire the module-vertical ① issues
- [ ] P6 · FRONTEND TRACK SCOPING — the separated ② plan (later)
