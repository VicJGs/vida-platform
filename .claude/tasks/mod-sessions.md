# Task: mod-sessions
# Status: in_progress
# Linear: LIF-139
# Profile: Add Backend Component
# Scenario: Default (Entity Delivery Flow — default path)
# Project: M1 — Whole Manual OS
# Milestone: M1.1.1 — Hub & Foundation · Backend
# Source: reconstructed-structure.md (Phase V, LIF-110; ADR-016 model)

## Goal
Sessions & Scheduling (Pomodoro=sub-type) — session/pomodoro surface

## Dependencies
- blocked by `xs-effect-rail` ✅ done
- blocked by `xs-measurement-engine` ✅ done

## Scope (① backend — `m1.1-delivery-plan.md:238-249`, RATIFY)
7 backend slices in `docs/features/sessions-and-scheduling/{delivery,service}/`:
S1 CRUD+attach · S2 registry-validation+completion-wiring · S3 Pomodoro focus runtime ·
S4 availability · S5 plan-batch endpoints · S6 session_templates CRUD · S7 dueIn aggregator+analytics.
② UI = separate `fe-sessions`. Deferrals homed: handlers→#46 · generatePlan algorithm→M1.2 · Calendar→M2.

## Build log
- **S1 ✅ DONE (2026-09-18, commit `5c961c4`).** `services/sessions/` (first real services/* build) —
  session CRUD (atomic spine+extension via `createInTx`), spine-only soft-delete/restore (extensions carry
  no `deleted_at`, B2′), idempotent attach + hard detach, `resolveTargets` re-export. Structural validation
  only. Gated: g1 /critique (1 REVISE→3 fixed) · preflight PASSED · g2 · §XXVIII deviation (deleted_at
  correction) · Verification Gate PASS (10 tests, live unlocked vault, incl. tx-rollback AC2) · §XXIX
  current-* promoted (BR-13..BR-17). `@vida/core` 849/849. tsc clean (Node 24).

- **S2 ✅ DONE (2026-09-18, commit pending).** createSession sub_type registry gate (`registry.get` →
  `SessionTypeNotFound`; roster = AR-5-shipped + `register()` seam, NO seeding — delivery-plan:239) · attach
  entity_type gate (`entityRegistry.isRegistered` → `UnknownEntityType`) · `completeSession`/`transitionSession`
  delegate to the #32 `transition()` (IR-1, no second path). Factory gained `rail` + `entityRegistry` deps.
  Gated: g1 /critique (1 REVISE→B1 fixed: the fail-loud rail means `completeSession('focus')`→`NoEffectHandler`
  in M1.1, handlers deferred #46) · preflight PASSED · g2 · Verification Gate PASS (16 tests, live vault, incl.
  AC4b fire+ledger, AC4c fail-loud) · §XXIX current-* promoted (BR-18..BR-20). `@vida/core` 855/855.
  **⚠ S3 must resolve M1.1 focus-completion behavior** (stub handlers / narrow effects / complete-sans-fire).
  Also caught: manufactured a shipped-roster scope fork Victor closed via delivery-plan:239 → memory
  [[sparse-foundation-seed-is-extension-seam-not-a-gap]].

- **S3 ✅ DONE (2026-09-18, commit pending).** Pomodoro focus runtime over `focus_sessions`:
  `startFocus` (create-or-resume) · `pause`/`resume` (pause-exclusion PD-5) · `nextInterval` (cadence PD-4,
  long-break every `sessions_before_long`) · `completeFocus` (run-complete + `completed_count`) · `cancelFocus`
  (interruption PD-6). Config template→user_preferences→PD-3 defaults (IR-3). New errors
  `InvalidFocusTransition`/`SessionMissing`. **S2 flag RESOLVED** (intake:166,179 "stub the contract, wire
  later"): `completeFocus` finalizes the RUN only — session stays `in_progress`, effect-firing stays S2's
  `completeSession` path (deferred #46); shipped `focus` def untouched (registry.test-pinned). Gated: g1 (1
  REVISE→B1 resume-path + B2 completed_count + nit) · preflight PASSED · g2 · Verification Gate PASS (23
  sessions tests; AC2 caught a resumeTimer no-op/illegal-move divergence → fixed) · §XXIX (BR-21..BR-25).
  `@vida/core` 862/862.

## Next step
- **S4 — Availability** (`setAvailability`/`addException`/`listAvailability` over `study_availability` +
  `availability_exceptions`; SS-9, BR-5c range CHECKs, `reason` `[E]` seam). Independent CRUD slice (only needs
  the factory). Author `service/S4-*.md` → g1 → preflight → g2 → build → Verification Gate. Env: Node 24 via nvm.
  Remaining after S4: S6 (session_templates CRUD) · S5 (plan-batch endpoints) · S7 (dueIn + analytics).

## Route History
- 2026-09-18: baseline (current-* refreshed for DB-4 substrate) → interpretation → decomposition gate
  (7 slices, ratify, approved) → S1 g1/preflight/g2 (approved) → build → Verification Gate PASS → commit
  `5c961c4` on branch `mod-sessions` (off main; PR at issue close per git workflow).
