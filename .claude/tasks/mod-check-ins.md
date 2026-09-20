# Task: mod-check-ins
# Profile: Add Backend Component
# Scenario: Default
# Spec: docs/specs/features/mod-check-ins/_index.md
# Created: 2026-09-19
# Status: in-progress
# Project: M1 — Whole Manual OS
# Milestone: M1.1.1 — Hub & Foundation · Backend
# Linear: LIF-119
# Source: reconstructed-structure.md (Phase V, LIF-110; ADR-016 model)

## Goal
Build the ① backend service tier for the check-ins module — daily check-ins + template
form-builder — over the DB-4 schema (`daily_check_ins`, `check_in_templates`,
`check_in_template_questions`), per the Entity Delivery Flow.

## Context
Profile: Add Backend Component (Entity Delivery Flow — ① backend track)
Files involved:
- `packages/core/src/services/` — the new check-ins service tier
- `packages/types/` — check-in enums/interfaces/validators (colocated in `entities/user.ts` +
  `validators/user.ts` per prior DB-4 work — grep the NAME before declaring net-new)
- `packages/core/src/db/schema/check-ins.ts` — the authored DB-4 schema (migration `026_check_ins`, v26)
- `docs/features/check-ins/` — the 5-aspect corpus (identity · business-rules · contract ·
  structure-data · conventions)
Integration points: `pages` table (reflection notes via polymorphic entity_type/entity_id),
Gamification (streak derivation — E9 moved to derived/`user_profile`, per DB-4 group #16),
journals (daily-dashboard aggregation consumes check-in data).

## Dependencies
- blocked by `mod-journals` ✅ (#39, LIF-127 Done)
- blocked by `mod-notes-and-pages` ✅ (#40, LIF-131 Done)
- blocked by `xs-effect-rail` ✅ (#32, LIF-170 Done)

## Delivery Routing
- Head: `#41 MOD-check-ins` (M1.1.1 — Hub & Foundation · Backend), lowest-`#` not-done.
- Sibling precedents to mirror: `mod-preferences`, `mod-journals`, `mod-notes-and-pages`
  (all `add-backend-component` / Default, Entity Delivery Flow ①).

## Open Questions
- [to be filled as they arise]

## Decisions Made
| Decision | Choice | Reason | Date |
|----------|--------|--------|------|
| *(logged automatically by /session-log)* | | | |

## Progress
<!-- SESSION checklist — the scenario's ## Task List (what the native panel mirrors). Session-level. -->
- [x] document-context BASELINE — current-* born at docs/modules/check-ins/ (schema/types/validators as-is; 4 stale-aspect contradictions + 1 unrealized E9 delta flagged)
- [x] Interpretation layer written — delivery/interpretation.md (deps · needs · organization · 9 implicit rules; CK-11 E9 resolved via CHE-14/17)
- [x] Decomposition Gate cleared — delivery/slice-map.md (5 slices, 28 legs, 0 unhomed) + seam-contract.md; /critique REVISE→2 fixed→SHIP; **Approval 1 ✅ 2026-09-19** ("ground everything in the documentation")
- [ ] Forward spec written + Per-Step Build Gate cleared (§XXVI) before any implementation
- [x] Read the validator pattern found (validators/user.ts:28-105 Preferences precedent; colocation)
- [x] **S1 (types & validators) ✅ DONE 2026-09-19** — §XXVI double-gate (gate-1 REVISE→3 fixed→SHIP · preflight BLOCKED→test-home gap fixed→PASSED · Approval 1+2) + Verification Gate PASS
  - `validators/user.ts:107-193` — 9 schemas (Daily/Template/Question fields + create/update/add + ScheduleConfig); `validators/check-ins.test.ts` 17 tests
  - tsc 0 · core suite **1012 passed** (+17) · ESLint clean · Currency Rule: current-spec §2 refreshed
- [x] **S2 (entry CRUD) ✅ DONE 2026-09-19** — §XXVI double-gate (gate-1 REVISE→CK-2 slot-hole fixed→SHIP · preflight PASSED · gate-2 SHIP · §XXVIII deviation: return DailyCheckIn not Row) + Verification Gate PASS
  - `services/checkins/{types,service,index}.ts` + `__tests__` (9 live-store tests); wired into `@vida/core` index
  - createCheckIn/updateCheckIn/getCheckIn/listCheckIns + CHE-20 gate + CHE-21 reject + JSON (de)serialize
  - live-store gate caught the `Repository.create` input-echo seam (template_id undefined→null) → fixed
  - tsc 0 · core suite **1021 passed** (+9) · ESLint clean · Currency Rule: current-spec §2 refreshed
- [x] **S3 (templates & questions) ✅ DONE 2026-09-19** — §XXVI double-gate (gate-1 REVISE→seedDefaultTemplates pinned to idempotent single default reconciling CHE-12+G3+G5→SHIP · preflight PASSED · gate-2 SHIP · Approval) + Verification Gate PASS. **Template↔type drift-catch:** framed CK-4-vs-CHE-12 as a conflict/asked Victor → he flagged it; intake §Resolution G3/G5 resolve it (built-in columns = type-agnostic default; resolve via is_default; no check_in_type column).
  - getActiveTemplate/createTemplate/updateTemplate/deleteTemplate(app-cascade)/seedDefaultTemplates(idempotent)/addQuestion(dup-key)/reorder/remove/getQuestions/setSchedule
  - gates caught 2 ISOLATED: reduced-column phantom cols (→findById) · nullable icon (→coalesce, toMerged precedent)
  - tsc 0 · core suite **1028 passed** (+7) · ESLint clean · Currency Rule: current-spec §2 refreshed
- [x] **S4 (derivations) ✅ DONE 2026-09-19** — §XXVI double-gate (gate-1 REVISE→current_streak today-relative + asOf restored [seam-contract] · preflight PASSED · gate-2 SHIP) + Verification Gate PASS
  - `getMoodEnergyTrend` + `computeCheckInStreak(asOf?)` + pure `computeStreak(dates,asOf)` helper (exported, 5 unit cases); NO user_profile write (E9)
  - tsc 0 · core suite **1035 passed** (+7; 1 pre-existing vault-1MB flake passes on re-run) · ESLint clean · current-spec refreshed
- [x] **S5 (cross-module seams) ✅ DONE 2026-09-19** — §XXVI double-gate (gate-1 REVISE→hook ordering + IR-13 eventually-consistent failure semantics pinned→SHIP · preflight PASSED · gate-2 SHIP) + Verification Gate PASS
  - optional dormant deps (journal?/effects?); CHE-16 entity_links re-feed (best-effort) · CHE-17 guarded grant_currency emit (emit-only, apply→M1.2) · CHE-15/28 placeholder review · CHE-25/29 covered/deferred
  - gate caught: ReviewData barrel collision w/ journals → renamed CheckInReviewData
  - tsc 0 · core suite green · ESLint clean · current-spec: ① COMPLETE
- [x] Currency Rule (§XXIX) — current-spec refreshed each slice (S1–S5); ① backend COMPLETE (all 28 legs)

## Build Steps
<!-- UNIT-level — mirrors the active spec's §5 Implementation Prompt; what victor:execute-plan-* works.
     Filled when the unit's spec §5 is approved. Distinct from ## Progress (connected-build-loop, R1). -->
- [ ] [filled from the spec §5 once planned]

## Plan
<!-- Only for a SPEC-LESS small task (§XXVI LITE): victor:planning writes its plan here instead of a spec. -->

## Session History
| Date | What was done | Next step |
|------|--------------|-----------|
| 2026-09-19 | initialized task + scaffolded spec stub | Step 0 BASELINE — /document-context on check-ins contexts |
| 2026-09-19 | Step 0 BASELINE done — current-spec + current-business-rules born at docs/modules/check-ins/; flagged 4 stale-aspect contradictions (CK-2/CK-3/CK-10 realized in schema; types exist) + 1 unrealized INTENDED (CK-11 E9 streak split still on user_profile) | Step 1 Interpretation Layer → Step 2 Decomposition Gate (victor:planning) |
| 2026-09-19 | Front matter written (interpretation + slice-map 5 slices/28 legs + seam-contract); Approval 1 ✅. S1 built: 9 Zod entity validators + 17 tests; §XXVI double-gate + Verification Gate PASS; core 1012 green; current-spec refreshed | S2 Entry CRUD (createCheckIn slot-uniqueness + updateCheckIn + get/list + custom_data discipline) |
| 2026-09-19 | S2 gates: gate-1 REVISE (CK-2 slot-key hole → UpdateCheckInSchema omits slot keys; +2 clarifications)→SHIP · preflight PASSED (live-store harness pinned) · gate-2 SHIP · Approval 1+2 ✅. **§XXVIII DEVIATION at impl-prep:** S2 §3 said `DailyCheckInRow` but the approved seam-contract says `DailyCheckIn` (parsed) — the JSON `text()` cols need parse-on-read; corrected S2 §3 to parsed returns (preferences toMerged/serialize precedent). Building. | Implement service + tests → Verification Gate |
| 2026-09-19 | S2 built: `services/checkins/{types,service,index}.ts` + 9 live-store tests, wired into @vida/core. Live-store gate caught the create input-echo seam (template_id undefined→null), fixed. Verification Gate PASS: tsc 0, core **1021 green**, ESLint clean. current-spec refreshed. | S3 Templates & questions (CHE-05..12,22) |
| 2026-09-19 | S3: template↔type DRIFT — I framed CK-4-vs-CHE-12 as a conflict + asked Victor; he flagged it; intake §Resolution G3/G5 resolve it (built-in=type-agnostic default; is_default resolution; no type column). Built template/question engine (10 methods) + 7 tests; gates caught reduced-column + nullable-icon (both fixed). Verification Gate PASS: tsc 0, core **1028 green**, ESLint clean. current-spec refreshed. | S4 Derivations (getMoodEnergyTrend, computeCheckInStreak) |
| 2026-09-19 | S4 built: getMoodEnergyTrend + computeCheckInStreak + pure computeStreak helper (5 unit cases) + live-store smoke; gate-1 caught stale-current-streak → today-relative asOf restored. NO user_profile write (E9). Verification Gate PASS: tsc 0, core **1035 green**, ESLint clean. current-spec refreshed. | S5 Cross-module seams (Journal link · XP emit · placeholder review) — the last slice |
| 2026-09-19 | S5 built (FINAL slice): optional dormant deps (journal?/effects?); CHE-16 entity_links re-feed + CHE-17 guarded grant_currency emit + CHE-15/28 placeholder review + 5 tests (stub journal + real rail/registry spy). gate-1 pinned hook ordering + IR-13 failure semantics; typecheck caught ReviewData↔journals barrel collision → CheckInReviewData. **① BACKEND COMPLETE (all 28 legs).** current-spec: ① COMPLETE. | ① done → /session-end + commit; ② fe-check-ins (LIF, separate); optional design-pass (Wrapped/named-period/cross-module review finalization) |

## Notes
