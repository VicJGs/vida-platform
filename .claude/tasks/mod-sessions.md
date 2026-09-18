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

## Next step
- **S2 — createSession registry validation + completion wiring** (the delivery-plan:249 ⚠ boundary,
  resolved as IR-1: route completion through the existing #32 `transition()`, no second firing path).
  Uses the `registry` dep already injected into `createSessionsService`. Author `service/S2-*.md` → g1 →
  preflight → g2 → build → Verification Gate. Env: Node 24 via nvm.

## Route History
- 2026-09-18: baseline (current-* refreshed for DB-4 substrate) → interpretation → decomposition gate
  (7 slices, ratify, approved) → S1 g1/preflight/g2 (approved) → build → Verification Gate PASS → commit
  `5c961c4` on branch `mod-sessions` (off main; PR at issue close per git workflow).
