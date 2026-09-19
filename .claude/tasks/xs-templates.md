# Task: xs-templates
# Status: in-progress
# Linear: LIF-176
# Profile: Add Backend Component
# Scenario: Entity Re-scope (Entity Delivery Flow recovery variant)
# Spec: docs/specs/features/xs-templates/_index.md
# Project: M1 — Whole Manual OS
# Milestone: M1.1.1 — Hub & Foundation · Backend
# Source: decomposition.md (P3) + coverage-report.md (P4 SHIP) — backend-replan
# Created: 2026-09-19 (stub from campaign; activated this session)

## Goal
Templates engine — the ADR-009 template capability (fork-on-instantiate). Roster = 14 legs
(`decomposition.md:49`): `xcut-templates` XCU-01…13 + `xcut-spaces` XCU-SP-31.

## Dependencies
- blocked by `xs-capability`
- blocked by `xs-spaces-tags-links`
- blocked by `xs-views`

## Context
Scenario: Entity Re-scope (recovery). Baseline (Step 0) substrate map:
- RATIFY (built + gated): `templates` table `db/schema/foundation/templates.ts` (id · name[E] · bundle[E] ·
  _sync_* · deleted_at) + migration `011_templates.ts` (registered); XCU-06 fork-invariant enforced by absence (no FK).
- EXTEND (owed): NO `TemplatesService`, NO `@vida/types` Template/Bundle/Preset types, NO validators, NO
  capture/instantiate/preset logic. ~11 of 14 legs are service-tier build.
- Baseline: @vida/core typecheck 0, 893/893 tests green (Node 24).
Files involved: packages/core/src/foundation/templates/* (home dir, ADR-018) or services/templates/*;
  @vida/types (new template.ts); @vida/core validators; docs/features/templates/delivery/*.
Integration points: composes xs-capability✅ · xs-spaces-tags-links✅ · xs-views✅. No downstream MOD
  consumer at M1.1 (runtime read-seams: none) → instantiate write-path may be a documented seam.

## Open Questions
- **UNKNOWN-1 (xcut-templates.md:54):** does `TemplatesService` OWN the fork write-path or DELEGATE per-entity
  creation? Source lean = DELEGATE (factory convention). Adjudicate in Step 2 interpretation with a FACT/seam.
- **UNKNOWN-2 (xcut-templates.md:55):** A1 trust-boundary home — routed to ADR-010 (out of xs-templates scope);
  ADR-010 exists (xs-capability #31 built the enforcement tier) → RESOLVED out-of-scope. Confirm at Step 1 gate.

## Decisions Made
| Decision | Choice | Reason | Date |
|----------|--------|--------|------|
| *(logged automatically by /session-log)* | | | |

## Progress
<!-- SESSION checklist — the scenario's ## Task List (what the native panel mirrors). Session-level. -->
- [x] Step 0 — BASELINE done (substrate map above; @vida/core typecheck 0 · 893/893 green). Standards: engineering·process·components loaded (design·motion deferred — pure-backend head).
- [x] Step 1 — ░Documentation Gate░ SHIP. Corpus No-Guessing-clean; both source UNKNOWNs resolved (U-1 DELEGATE via write-seam per precedent; U-2 A1 out-of-scope → ADR-010).
- [x] Step 2 — Interpretation layer written (delivery/interpretation.md; §0 #36-position write-seam invariant + 7 IRs).
- [x] Step 3 — ░Interpretation Gate░ PASS (1 REVISE fixed — XCU-12/13 sharpened: no `presets` store → type+invariant only, not CRUD).
- [x] Step 4 — Reconciliation (delivery/reconciliation.md, DRY pass) — **3 ratify + substrate · 11 gap (extend) · 0 wrong/undoc/ungated**. Inverse of xs-views.
- [x] Step 5 — Re-scope Gate APPROVED (2026-09-19, Victor: "Approved, ground everything on the docs"). 5 backend slices S1–S5.
- [~] Step 6 — Resume by tag (per-slice double-gate + Verification Gate):
  - [x] **S1 (types/terminal-states/errors)** ✅ DONE — full §XXVI double-gate (Approval 1 after a Victor drift-catch fix: removed invented seed sub-schemas → envelope-only `unknown` members per ADR-009:112-115; Approval 2 after preflight caught the Zod `root_tag`-required gap). Verification Gate PASS: tsc 0 (types+core), **901 tests** (+8 S1). Files: `@vida/types/template.ts`, `foundation/templates/{types,index}.ts`, `validators/template.ts`, `__tests__/types.test.ts`, 2 barrels. Built `@vida/types` dist (core consumes dist).
  - [x] **S2 (store CRUD)** ✅ DONE — §XXVI double-gate (Approval 1 + 2). `foundation/templates/service.ts` (createTemplatesService: create/list/get/soft-delete over Repository, empty [E], bundle→JSON TEXT; NO update — fork model). Verification Gate PASS after triage of 2 ISOLATED test-fixture errors (missing `initVault()` — sync-hash needs vault even with empty [E]; `operation` is `create` not `insert`). tsc 0, **907 tests** (+6 S2). Plan corrected §XXVIII.
  - [—] S3/S4/S5 **RECLASSIFIED as first-consumer-pull SEAMS** (2026-09-19 Victor drift-catch #3, "ground everything in the documentation"): capture (XCU-02/03/04/07-serializer), instantiate-execution (XCU-05/11), shipped-asset-source (XCU-08), preset (XCU-12/13) have NO M1.1 consumer — decomposition.md:49 read-seams "—"; capability-framework.md:239 template-capable = *modules* (none built); ADR-019 §3.5 first-consumer-pull. NOT built at #36; NO sibling-service (#34/#35) changes. My reconciliation over-scoped them as 11 build legs → corrected in reconciliation.md §E + slice-map.md. **Head code = S1 + S2 + ratify + documented seams.**
- [x] Step 7 — /critique changed files → **SHIP** (strict-TS clean, live-store tested, grounded, matches corrected docs).
- [x] Step 8 — §XXIX currency: `docs/core/spaces/current-spec.md` + `current-business-rules.md` refreshed with the templates store+types delta (BR-19/20/21) + the seam deferrals. (Templates contract lives under Spaces — no docs/core/templates/.)
- [ ] Commit + push + PR (LIF-176) → merge.
- [ ] Step 6 — Resume by tag (per-slice build + blocking verification)
- [ ] Step 7 — /critique changed files → SHIP
- [ ] Step 8 — Currency Rule §XXIX (refresh CURRENT- docs, commit with code)

## Build Steps
<!-- UNIT-level — mirrors the active spec's §5 Implementation Prompt; filled when spec §5 is approved. -->
- [ ] [filled from the spec §5 once planned]

## Plan
<!-- Only for a SPEC-LESS small task (§XXVI LITE). -->

## Session History
| Date | What was done | Next step |
|------|--------------|-----------|
| 2026-09-19 | Activated campaign stub. Step 0 baseline: mapped substrate (table+011 ratify; service tier owed), green floor 893/893. | Step 1 Documentation Gate (/critique corpus) → Step 2 interpretation |

## Notes
Env: Node 24 via nvm + corepack pnpm. Git: per-issue branch `xs-templates` → PR → merge ([[git-workflow-per-issue-branch-pr-merge]]).
Divergence from [[xs-foundation-heads-trace-to-ar7-ratify]]: xs-templates is build-heavy, NOT ratify-heavy — its AR
increment built only the DB-3 store table, not an engine. Worth a memory update at session close.
