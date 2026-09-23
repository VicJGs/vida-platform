# Task: mod-habits
# Status: in-progress
# Linear: LIF-125
# Profile: Add Backend Component
# Scenario: Default (Entity Delivery Flow v1)
# Project: M1 — Whole Manual OS
# Milestone: M1.1.2 — Feature Modules · Backend
# Spec: docs/specs/features/mod-habits/_index.md
# Source: reconstructed-structure.md #49 (LIF-125; ADR-016 model)
# Branch: mod-habits (off main, 2026-09-23)
# Created: 2026-09-23 (stub 2026-09-17, backend-replan P5)

## Goal
Build the Habits module ① backend service tier (`createHabitsService`) over the DB-4 habits schema
(`habits` + `habit_completions`): definition CRUD, recurrence/schedule + time-of-day, quantified
completion ledger (target_count/unit/count/value + mood), derived streak / completion-rate / mood
analytics, build-vs-break semantics, and the cross-module seams (weighted `contributions` to a linked
Purpose metric · guarded `grant_currency(XP)` effect · journal contribution · `pages`/`entity_tags`
consumers). ① backend only — ② `fe-habits` (LIF-182) is a separate P6 frontend issue.

## Dependencies
- blocked by `mod-notes-and-pages`
- blocked by `xs-effect-rail`
- blocked by `xs-measurement-engine`
- blocked by `xs-notifications-delivery`
- blocked by `xs-spaces-tags-links`
_(all five blockers are Done — head is READY per `--plan issue:mod-habits`)_

## Context
Profile: Add Backend Component (scenario: Default · Entity Delivery Flow v1)
Files involved:
- `packages/core/src/services/habits/` (new service tier)
- `packages/core/src/validators/habits.ts` (Create/Update Zod validators)
- `packages/core/src/db/schema/` habits tables (`habits` + `habit_completions`) — READ (schema owned by M1.0)
- `packages/types/src/habit.ts` (interfaces/enums — extend only if the roster says so)
- `docs/features/habits/delivery/{interpretation,slice-map,seam-contract}.md` + `service/` spec set (Steps 1–2)
- `docs/modules/habits/current-*` (birthed at D6, kept current at §XXIX)
Integration points:
- Gamification effect rail — emit `grant_currency(XP)`, never write `consequence_ledger` (R2)
- Purpose & Goals — completion → weighted `contributions` primitive (metric owned by Purpose, HB-8)
- Journals — habits summary contribution provider (registry seam)
- Notes/`pages` (`entity_type='habit'`) + `entity_tags` (`entity_type='habit'`) — consumer-only
- Foundation: Repository/Drizzle, EffectRegistry, measurement engine (`rate`/`event-trigger`)

## Open Questions
- [ ] Ratify-vs-decide per slice — resolved at the Decomposition Gate (Step 2) against the decomposition/traceability corpus
- [ ] Exact `@vida/types` extension surface (if any) vs DB-11 reconcile — grounded in the parts/ roster at Step 2

## Decisions Made
| Decision | Choice | Reason | Date |
|----------|--------|--------|------|
| *(logged automatically by /session-log)* | | | |

## Progress
<!-- SESSION checklist — the scenario's ## Task List (what the native panel mirrors). Session-level. -->
- [x] document-context BASELINE — corpus gathered (schema 3 tables · BR HB-1…13 · HAB-01…28 roster · service pattern), all [FACT]-cited
- [x] Interpretation layer written — delivery/interpretation.md (4 sections · 9 implicit rules · 2 UNKNOWNs) → Interpretation Gate SHIP (folded B1+N1–N4)
- [x] Decomposition Gate SHIP + **Approval 1 (Victor, 2026-09-23)** — 5 backend slices ratified
- [~] **S1** (Definition CRUD + validators + `@vida/types` reconcile): PLAN g1 SHIP → implemented → Verification Gate PASS (typecheck repo 11/11 · @vida/core **1285** · eslint 0 · 9 habits live-store tests) → g2 code-review running
- [ ] Read 3 existing services — state the pattern found
- [ ] /api-contract (service API) approved before any code
- [ ] /adr-check validates approach against existing decisions
- [ ] /adr-new recorded (if significant architectural choice)
- [ ] TypeScript types/validators written first
- [ ] Service logic implemented (per slice)
- [ ] Error handling implemented (typed errors, fail-loud)
- [ ] tsc --noEmit passes — zero errors
- [ ] Per-slice Verification Gate PASS (Vitest logic + ≥2 failure paths + live-store smoke) before the next slice
- [ ] /critique → SHIP verdict
- [ ] Currency Rule (§XXIX) — current-spec + current-business-rules refreshed for every context touched

## Build Steps
<!-- UNIT-level — mirrors the active spec's §5 Implementation Prompt; what victor:execute-plan-* works.
     Filled when the unit's spec §5 is approved. Distinct from ## Progress (connected-build-loop, R1). -->
- [ ] [filled from the slice specs' §5 once the Decomposition Gate + per-slice plans are approved]

## Plan
<!-- Only for a SPEC-LESS small task (§XXVI LITE). N/A — this is a full gated build. -->

## Session History
| Date | What was done | Next step |
|------|--------------|-----------|
| 2026-09-23 | initialized task from P5 stub; branch mod-habits off main; Linear LIF-125 bound; scenario surfaced | Step 0 BASELINE (document-context habits) → Step 1 Interpretation layer |
| 2026-09-23 | Step 0 BASELINE (3 parallel gatherers: schema/corpus · HAB-01…28 roster · service pattern) → Step 1 interpretation.md → Interpretation Gate SHIP (folded) → Step 2 slice-map.md + seam-contract.md (5 backend slices, Ratify+detail) | Decomposition Gate critic verdict → Approval 1 → per-slice build S1 |

## Notes
- ② `fe-habits` = LIF-182 (separate P6 frontend issue) — all Habits UI (4 view surfaces) lives there.
- Env: Node 24 via nvm for tests (better-sqlite3 ABI). Per-issue branch → PR → merge (foreground).
- Aspect corpus: `docs/features/habits/{identity,business-rules,contract,structure-data,conventions}.md`.
- Delivery-plan per-module scope: `docs/roadmap/m1.1-delivery-plan.md` §9 MOD-habits (② NOW / later-HOMED buckets).
