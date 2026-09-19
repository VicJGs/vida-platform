# Task: xs-views
# Status: done
# Linear: LIF-177
# Profile: Add Backend Component
# Scenario: Entity Re-scope (Entity Delivery Flow recovery variant)
# Spec: docs/specs/features/xs-views/_index.md
# Project: M1 — Whole Manual OS
# Milestone: M1.1.1 — Hub & Foundation · Backend
# Source: decomposition.md (P3) + coverage-report.md (P4 SHIP) — backend-replan
# Created: 2026-09-18

## Goal
Views engine — saved views / layouts across modules (XCU-SP-34, views XCU-01…22). Ratify/extend the AR-6 ADR-007 view engine against its docs and finish any owed legs under per-slice Verification Gates.

## Dependencies
- (none)

## Context
Head: #35 XS-views (reconstructed-structure.md, M1.1.1 Backend) · Linear LIF-177 · build-deps: none
Files involved:
  - packages/core/src/foundation/views/{engine,provider-registry,service}.ts + CLAUDE.md (AR-6 ViewEngine V3/4/5, ADR-007)
  - packages/core/src/validators/view.ts
  - docs/features/<views>/ aspect corpus (source) + delivery/{interpretation,reconciliation,slice-map}.md (to author)
Integration points: ADR-007 (views/layouts allowed-vocabulary + graceful degradation) · AR-6 Spaces (ViewEngine born there) · XS decomposition legs XCU-01…22 + XCU-SP-34 (sizes ratify vs extend)

## Open Questions
- Ratify vs extend: RESOLVED by the Documentation Gate (Step 1) — ratify (15 FACT legs) + ONE thin extend (`cloneView`, XCU-05) + 4 documented seams (XCU-06/13/14/SP-34). Confirmed at Step 4 reconciliation.

## Resolved (doc-fixed — not decisions)
- **XCU-06 seed owner** = ADR-009 Templates (#36), zero code in xs-views. `[FACT]` XCU-SP-31 (template bundle `{…views…}`) + xcut-templates XCU-02 (`captureFromSpace` DELEGATES → ViewsService) + XCU-08 (`listShipped` = "OS ships default set" as bundled assets) + ADR-009 "Builds on ADR-007". xs-views owns `createView` (XCU-01, built) = the delegated write-path. #35-position agrees (templates=#36). *(I drifted here — floated a 3-way fork the docs close; Victor drift-catch. See [[decide-dont-ask-when-docs-give-the-answer]].)*
- **XCU-13** exclude-mode/per-type predicate = contract-only; predicate-DSL grammar explicitly build-time (ADR-007:96, current-spec.md:34). No code.
- **XCU-14** field-declaration = seam; derivation needs not-yet-built provider field metadata, renderer→P6 (ADR-020). No code (consumerless map = premature).
- **XCU-SP-34** = documented consumption seam (dueIn/journal-contribution register at Sessions/Journals builds; ViewEngine fan-out XCU-09 built). Mirrors #33's XCU-SP-33 ruling. No code.

## Decisions Made
| Decision | Choice | Reason | Date |
|----------|--------|--------|------|
| Head selection | #35 xs-views over --next's mod-journals | repo rule: lowest-`#` ready issue wins; deps none, peers higher-# | 2026-09-18 |
| Scenario | Entity Re-scope (recovery variant) | ViewEngine pre-built by AR-6 → reconcile-then-scope, not from-zero | 2026-09-18 |

## Progress
<!-- SESSION checklist — the scenario's ## Task List (what the native panel mirrors). -->
- [x] document-context BASELINE done — built engine (260 LOC) + ADR-007 + corpus (22 legs) + spaces current-* (fresh) read. Cross-plane standards load DEFERRED WITH CAUSE (corpus homes every UI concern OUT: XCU-14 renderer→P6, XCU-21→Preferences; xs-views = pure-backend service tier → no frontend/shared slice; load iff reconciliation surfaces one).
- [x] ░Documentation Gate░ PASS — /critique REVISE→resolved: source sound; 5 UNKNOWNs all doc-resolvable (XCU-06 drift-catch → doc-fixed seam). Reductions folded to Step 2.
- [x] Interpretation layer written — delivery/interpretation.md (5 cited adjudications + #35 invariant + IR-1…6)
- [x] ░Interpretation Gate░ PASS — /critique REVISE→resolved: XCU-14 seam re-grounded (ADR-007:94/106/127 + engine layout-agnostic; BR-10 tag reconciled) + IR-5/IR-6 added + IR-1 cite firmed. cloneView = only owed code.
- [x] ░Envision Gate░ SKIP (stated) — pure-backend substrate, no user affordance; every UI concern → P6/Preferences.
- [x] Reconciliation ledger complete + EXHAUSTIVE (dry pass) — delivery/reconciliation.md: RATIFY 21 · EXTEND 1 (cloneView) · 0 ❌/📄/⛔
- [x] Re-scope Gate cleared — Victor approved (1 backend slice S1). Spec §XXVI double-gated: Gate 1 REVISE→resolved (FACT/INTERP mislabel → targetSpaceId required) · preflight PASSED · Gate 2 SHIP (F1/F2 folded). Spec `docs/specs/features/xs-views/_index.md`.
- [x] S1 implemented + Verification Gate PASS — `service.ts` cloneView (PICK 6 fields, no this., raw copy) + 7 tests in spaces.test.ts. Node 24 via nvm. typecheck 0 · @vida/core 893 green (+7, 0 regression) · eslint 0.
- [x] /critique [changed files] → SHIP (post-impl, 6/6 checks; tests prove the 6 BRs, TS strict clean)
- [x] Currency Rule (§XXIX) — refreshed `docs/core/spaces/current-spec.md:28` (ViewsService + clone) + added **BR-18** (BR-16/17 were taken by XCU-SP-27 — verified live, not the spec's stale "BR-16")

## Build Steps
<!-- UNIT-level — mirrors spec §5 (approved). ALL DONE. -->
- [x] `nvm use 24` (node v20 < required; better-sqlite3 ABI) + corepack pnpm
- [x] Add `cloneView(sourceId, targetSpaceId): Promise<ViewRow>` to `ViewsService` interface
- [x] Implement (closure over `repo`, NO `this.`): findById→ViewNotFound→repo.create PICK 6 fields
- [x] +7 tests in `spaces.test.ts` (reuse :127-144 sync_queue pattern)
- [x] Verification Gate: typecheck 0 · @vida/core 893 green (+7) · eslint 0
- [x] §XXIX: current-spec.md ViewsService line + **BR-18** (not BR-16 — live-verified)

## Outcome
SHIP → PR #42 merged to main (`701eca8` → merge `5e23b17`). LIF-177 → Done. RATIFY 21 legs + one EXTEND (`cloneView`, XCU-05); 4 documented seams + 1 Preferences boundary. 16 XS/MOD downstream dependents unblocked.

## Session History
| Date | What was done | Next step |
|------|--------------|-----------|
| 2026-09-18 | initialized task from P6 stub; head #35 resolved via `#`-order rule; scenario = Entity Re-scope | run Step 0 baseline (document-context on views + cross-plane standards load) |
| 2026-09-18 | full Entity Re-scope recovery: baseline → Doc Gate → Interp Gate → Envision SKIP → reconciliation (RATIFY 21 + EXTEND 1) → Re-scope Gate → spec double-gate → impl `cloneView` + 7 tests → post-impl SHIP → §XXIX. PR #42 merged, LIF-177 Done. | COMPLETE — next head via `#`-order (peers: xs-templates #36 [now unblocked], mod-preferences #37, mod-journals #39) |

## Notes
- Env: Node 24 via nvm + corepack pnpm. Branch `xs-views` off `main` → PR → merge (per-issue git workflow).
- Prior XS heads: #31 xs-capability (ratify+extend), #32 xs-effect-rail (ratify+extend), #33 xs-measurement-engine (FULL RATIFY, no code). Memory [[xs-foundation-heads-trace-to-ar7-ratify]].
