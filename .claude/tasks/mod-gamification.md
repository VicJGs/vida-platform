# Task: mod-gamification
# Status: in-progress
# Linear: LIF-124
# Profile: Add Backend Component
# Scenario: Default (Entity Delivery Flow v1)
# Project: M1 — Whole Manual OS
# Milestone: M1.1.2 — Feature Modules · Backend
# Spec: docs/specs/features/mod-gamification/_index.md
# Source: reconstructed-structure.md #48 (LIF-124; ADR-016 model)
# Branch: mod-gamification (off main, 2026-09-22)
# Created: 2026-09-22 (stub 2026-09-17, backend-replan P5)

## Goal
Build the Gamification module ("the System") backend service tier — the behavioral
incentive & consequence engine — over DB-4 `031_gamification` (`user_profile` ·
`achievements` · `user_achievements`) and the ADR-012 DB-3 economy spine
(`currencies` · `consequence_ledger` · `store` · `rules`). Rules ride ADR-011
bindings; consequences ride the ADR-004 §3.2.5 effect rail (grant/lock currency,
move_money via Finance's guarded handler, surface_notification); currencies expose
four DERIVED quantities (to-distribute · earned · locked · current); achievements =
predicates over the measurement seam + event stream. Invents no new engine.

## Dependencies
- blocked by `mod-journals` ✅
- blocked by `xs-capability` ✅
- blocked by `xs-effect-rail` ✅
- blocked by `xs-measurement-engine` ✅
- blocked by `xs-notifications-delivery` ✅
- blocked by `xs-views` ✅
(all satisfied — #48 is the ready `#`-order head)

## Context
Profile: Add Backend Component
Files involved:
- `packages/core/src/services/gamification/` (new service tier — `createGamificationService`; dir stub exists, CLAUDE.md only)
- `packages/core/src/validators/gamification.ts` (Create/Update Zod pairs)
- `packages/types/src/entities/*` (interfaces/enums — ⚠ likely colocated in `user.ts`;
  grep the exact NAME + READ before declaring net-new — [[db4-types-may-be-colocated-grep-name-before-net-new]])
- `packages/core/src/db/schema/gamification.ts` (031 — read-only substrate) + DB-3 economy
  tables (`currencies`/`consequence_ledger`/`store`/`rules`)
- Composes `foundation/{capability,effects,measurement}` + Finance's guarded `move_money`
- Currency docs to birth: `docs/modules/gamification/current-{spec,business-rules}.md`
Integration points:
- ADR-012 economy (currencies + append-only consequence_ledger; xp_history retired → derived-balance ledger)
- ADR-011 bindings (rule = event-trigger · derived-pull) + ADR-004 effect rail (typed effects)
- Measurement-source seam (achievements read state; the System stores no signals)
- Finance `move_money` guarded handler (money moves only through Finance) — INT-2
- Notifications dispatcher (surface_notification effect)
- Purposes (the meaning-plane partner; Storage boxes → Dreams)

## Aspect corpus (the 5-aspect source — read at Step 1)
`docs/features/gamification/{identity,structure-data,business-rules,contract,conventions}.md`
Intake resolution: `docs/intake/gamification.md` (GG1/GG6/§A/§B/§C — "the System", NOT the 4-table v2 floor)

## Open Questions
- Ratify-mode vs decide-mode per slice: the ADR-012 economy spine is heavily doc-fixed
  (DB-3 authored) → likely RATIFY; net-new derivations resolve at Step 2.
- M1-vs-M2 boundary for Storage boxes (Finance-owned) + user-authored rules (ADR-010 sandbox) —
  ground per-leg in the aspect docs at Step 1 (build-phase flags = resolve-now, not defer).

## Decisions Made
| Decision | Choice | Reason | Date |
|----------|--------|--------|------|
| *(logged automatically by /session-log)* | | | |

## Progress
<!-- SESSION checklist — the scenario's ## Task List (what the native panel mirrors). Session-level. -->
- [x] document-context BASELINE — 7 composed contexts pinned as ground truth (all current-* born + unchanged)
- [x] Interpretation layer — `delivery/interpretation.md` (scope spine RATIFY/BUILD · 13 IMPLICIT RULES · 3 OQs resolved)
- [x] Decomposition Gate — `slice-map.md` + `seam-contract.md` · independent gate-1 critique **SHIP** (2 REVISE + N1 folded) → **Approval 1 GRANTED**
- [x] Per-slice service track (Steps 3–11) S1→S2→S3→S4 — **① backend COMPLETE** (29 live-store tests, @vida/core 1276/1276):
  - [x] **S1** currency surface + level + below-floor clamp — 10/10 live-store; code-review REVISE (R1 shipped-code dup guard + R2 N+1) folded; current-* born
  - [x] **S2** rule engine — CRUD + assertAcyclic + executeRule (parse consequences → rail.applyEffect) + user-authored envelope (fail-closed) + lock clamp; 20/20 live-store; code-review REVISE (R1 honest effectsFired + R2 grant_id→def-id #85 defer + N1 atomicity) folded; current-* refreshed
  - [x] **S3** achievement engine — non-syncable static-seed (direct drizzle) + evaluateAchievements (measure/currency predicate) → unlock (earned-join + registry-guarded reward + dormant notification); 26/26 live-store, 1273/1273, tsc 0, eslint 0; code-review **SHIP** (2 NITs folded); current-* refreshed
  - [x] **S4** journal provider (`createGamificationJournalContribution` `summary(date)→SectionData` snapshot, state-by-type) + `registerGamificationJournal` + `registerGamificationEffects` (call-once economy wiring); 29/29 live-store, 1276/1276, tsc 0, eslint 0; code-review **SHIP** (snapshot-scope ruled acceptable M1 deferral; NIT-2 folded); current-* refreshed → **① COMPLETE**

## Build Steps
<!-- UNIT-level — mirrors the active spec's §5 Implementation Prompt; what victor:execute-plan-* works.
     Filled when the unit's spec §5 is approved. Distinct from ## Progress (connected-build-loop, R1). -->
- [ ] [filled from the slice specs once the Decomposition Gate clears]

## Session History
| Date | What was done | Next step |
|------|--------------|-----------|
| 2026-09-22 | initialized task (expanded P5 stub) + scaffolded spec stub + fresh branch off main | Step 0 BASELINE → Step 1 interpretation layer |
| 2026-09-22 | BASELINE + interpretation layer (13 IR, scope spine) + Decomposition Gate (4 slices, independent critic SHIP) → Approval 1 → **S1 shipped** (currency surface + level curve + below-floor clamp; 10 live-store tests; 2 code-review REVISE folded; current-* born) | S2 rule engine (CRUD + assertAcyclic + executeRule → dispatchConsequence) |
| 2026-09-22 | **S2 shipped** — rule engine: CRUD + acyclicity guard + executeRule/evaluateRules (parse consequences → rail.applyEffect, idempotent) + user-authored envelope (fail-closed) + lock clamp. 20/20 live-store; code-review REVISE folded (R1 honest effectsFired, R2 grant_id→#85, N1 atomicity comment); current-* refreshed | S3 achievement engine (predicate eval → unlock → user_achievement + reward + notification) |
| 2026-09-22 | **S3 shipped** — achievement engine: seedAchievements (direct-drizzle non-syncable, idempotent by key) + listAchievements/getUserAchievements + evaluateAchievements (measure/currency predicate → unlock: earned-join + registry-guarded reward + dormant notification). 26/26 live-store; code-review SHIP (2 NITs folded); current-* refreshed | S4 journal provider (summary→SectionData) + effect-handler wiring + createGamificationService barrel |
| 2026-09-22 | **S4 shipped → ① BACKEND COMPLETE** — journal contribution (summary snapshot, state-by-type) + registerGamificationJournal + registerGamificationEffects (call-once economy wiring). 29/29 live-store, @vida/core 1276/1276, tsc 0, eslint 0; code-review SHIP (snapshot = acceptable M1 deferral; NIT-2 folded); current-* complete (BR-GM-1..22). All 4 slices double-gated + code-reviewed + §XXIX-current. | PR ① → merge · then `/task-complete` (② fe-gamification LIF-181 separate P6) |

## Notes
- Env: Node 24 via nvm (better-sqlite3 ABI for live-store gates); per-issue branch `mod-gamification` → PR when ① completes.
- ② `fe-gamification` (LIF-181) is a separate P6 frontend issue.
- Precedent: mod-finance #47 (LIF-122) — same profile/scenario, 8-slice Entity Delivery Flow.
