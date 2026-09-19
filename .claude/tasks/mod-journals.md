# Task: mod-journals
# Profile: Add Backend Component
# Scenario: Default
# Spec: docs/specs/features/mod-journals/_index.md
# Created: 2026-09-19
# Status: in-progress
# Linear: LIF-127
# Project: M1 — Whole Manual OS
# Milestone: M1.1.1 — Hub & Foundation · Backend
# Source: reconstructed-structure.md (Phase V, LIF-110; ADR-016 model)

## Goal
Build the ① backend service tier for mod-journals #39 (LIF-127) — the Notes & Journals integration-layer service: one journal/day daily dashboard that owns `summary(date)`, aggregates agenda + entry, over `journal_snapshots` (DB-4 #20), composing `pages`/`entity_links` and the runtime module-contribution registry.

## Context
Profile: Add Backend Component
Head: mod-journals #39 (M1 / M1.1.1 — Hub & Foundation · Backend) · 20 direct dependents
Files involved:
- `packages/core/src/services/journals/` (currently only a 16-line CLAUDE.md scaffold stub — net-new service)
- `packages/types/src/` (journal types/validators — grep before net-new; may be colocated, [[db4-types-may-be-colocated-grep-name-before-net-new]])
- Composes: `journal_snapshots` (schema/journals.ts, migration 030), `pages`, `entity_links`, the journal-contribution registry seam (apps/web/src/home from UX-6)
Integration points: to be determined (interpretation layer, Step 1)

## Dependencies
- blocked by `mod-sessions` ✅ (LIF-139 → Done)
- blocked by `xs-measurement-engine` ✅ (LIF-173 → Done)

## Open Questions
- [to be filled as they arise]

## Decisions Made
| Decision | Choice | Reason | Date |
|----------|--------|--------|------|
| Scenario = Default (not Entity Re-scope) | Default | services/journals/ holds only a 16-line CLAUDE.md scaffold — no service code built | 2026-09-19 |

## Progress
<!-- SESSION checklist — the scenario's ## Task List (what the native panel mirrors). Session-level. -->
- [x] document-context BASELINE — ground truth of the composed substrate gathered (journals service is from-zero → no prior current-* to refresh; substrate facts in Notes below + interpretation.md)
- [x] Interpretation layer written — delivery/interpretation.md (dependencies · needs · organization · implicit rules)
- [x] Interpretation Gate (/critique on interpretation.md) — REVISE (R1–R4) → applied → PASS
- [x] Decomposition Gate — slice-map.md + seam-contract.md authored (DECIDE mode, 4 slices S1→S2→S3→S4); Approval 1 GRANTED 2026-09-19 ("ground everything in the documentation")
- [x] **S1 Registry + types + errors — SHIPPED (this session).** gate-1 REVISE(R1–R3)→SHIP · Approval 1 · preflight PASSED · gate-2 SHIP · impl (`services/journals/{types,registry,index}.ts` + `@vida/core` barrel) · Verification Gate PASS (typecheck 0 · 8/8 S1 tests · **940/940** full suite · eslint clean) · post-impl SHIP · §XXIX currency born (`docs/modules/journals/current-*`). Node 24.
- [x] Read 3 existing services — pattern: factory-object (`createXService`→object literal), hoisted closures not `this.`, async validators, one repo per table, `./types` errors; registry = ADR-004 factory (`createEffectRegistry`). Precedents: sessions/preferences/effects.
- [x] **S2 buildDashboard + pure selection — SHIPPED (this session).** gate-1 REVISE(assumption-A normalize)→SHIP · preflight caught+fixed the resolveDashboardStates per-module mismatch · gate-2 SHIP · impl (`dashboard.ts`/`selection.ts` + `types.ts` JournalSelection/DashboardData + barrel) · Verification Gate PASS (tsc 0 · 18/18 journals · **950/950** · eslint clean) · post-impl SHIP · §XXIX currency refreshed. **Grounding correction:** selection STORAGE doesn't exist (no Preferences field / summary_config still 5-toggle) → getSelection/setSelection are SEAMS; buildDashboard takes selection as a param + pure resolveSelection.
- [x] **S3 Snapshot store + service shell — SHIPPED (this session).** `createJournalsService` + captureSnapshot/getJournal over journal_snapshots. gate-1 REVISE(today=live tension, degraded-capture)→SHIP · **preflight BLOCKER** (reduced-column table vs Repository createInTx) investigated via **probe** → resolved (Drizzle drops phantom created_at/updated_at; BR-S3-9) · gate-2 SHIP · impl (`service.ts` + types) · **live-store Verification Gate PASS** (tsc 0 · 27/27 journals · **959/959** · eslint clean; real store + initVault + sync_queue enqueue asserted) · post-impl SHIP · §XXIX refreshed.
- [x] **S4 buildReview compose-skeleton — SHIPPED (this session).** gate-1 SHIP (throw-InsufficientHistory grounded; design-pass boundaries) · preflight PASSED · gate-2 SHIP · impl (`service.ts` buildReview + ReviewPeriod/ReviewData) · Verification Gate PASS (tsc 0 · 33 journals · **965/965** · eslint clean) · post-impl SHIP · §XXIX refreshed. **① BACKEND COMPLETE (S1–S4).**
- [x] /adr-check — registry-home @vida/core lift consistent with ADR-004 (registry pattern) + ADR-018 (boundaries); NO new ADR (structure-data.md:44 "reuses ADR-004"). PASS.
- [x] Pre-ship /critique (whole ①, cross-slice) → SHIP (2 currency fixes: stale services/journals/CLAUDE.md + service.ts header) · engineering quality-gate PASS (TS strict 0 · no any · typed errors · states+failure paths covered · §XXIX current).
- [ ] Commit + PR (awaiting Victor's go) — branch `mod-journals`, `feat(journals): mod-journals #39 ① — journal engine (registry+dashboard+snapshots+review)`
- [ ] ② fe-journals (frontend) — separate issue (Journal views, Wrapped UI, selection controls, apps/web registry migration)
- [ ] Currency Rule (§XXIX) — CURRENT-SPEC + CURRENT-BUSINESS-RULES refreshed for every context touched

## Build Steps
<!-- UNIT-level — mirrors the active spec's §5 Implementation Prompt; what victor:execute-plan-* works.
     Filled when the unit's spec §5 is approved. Distinct from ## Progress (connected-build-loop, R1). -->
- [ ] [filled from the spec §5 once planned]

## Plan
<!-- Only for a SPEC-LESS small task (§XXVI LITE): victor:planning writes its plan here instead of a spec. -->

## Session History
| Date | What was done | Next step |
|------|--------------|-----------|
| 2026-09-19 | initialized task (preserved LIF-127 stub metadata); confirmed Default scenario (no service code exists) | Step 0: document-context BASELINE of journals + composed contexts |
| 2026-09-19 | Steps 0–2: baseline (substrate ground truth) · interpretation.md + Interpretation Gate (REVISE R1–R4→PASS) · slice-map + seam-contract (4 slices, DECIDE); Decomposition Gate Approval 1 GRANTED. S1 spec + gate-1 (REVISE R1–R3→SHIP). Grounding corrections: types→@vida/core (layering), TerminalState reuse (success not populated), registry=ADR-004 factory | Approval 1 on S1 spec → preflight + gate-2 → implement |
| 2026-09-19 | **S1 SHIPPED** (registry+types+errors; 940/940) then **S2 SHIPPED** (buildDashboard+resolveSelection+journalStillRenders; 950/950). Both full §XXVI double-gate + Verification Gate + §XXIX currency. Grounding correction S2: selection storage is a SEAM (no Preferences field / summary_config still 5-toggle). | S3 Snapshot store (captureSnapshot/getJournal) — **live-store Verification Gate** + createJournalsService shell |

## Notes
- Journals is the **integration layer** (CLAUDE.md module #8) — the daily-dashboard connective tissue that aggregates from all modules. Likely composes heavily (pages/entity_links/summary blocks) + a runtime provider registry; DB-4 #20 landed only `journal_snapshots` (frozen daily record — no created_at/updated_at/deleted_at; `captured_at` is the timestamp).
- The journal-contribution registry seam was designed at UX-6 (apps/web/src/home/journal-contribution) — names no module (`JournalSeamNotActivated` per AR-9). This backend tier likely OWNS or feeds that registry.
- Env: Node 24 via nvm + corepack pnpm. Per-issue branch → PR → merge.
