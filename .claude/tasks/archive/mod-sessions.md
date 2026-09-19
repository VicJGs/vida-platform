# Task: mod-sessions
# Status: done
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

- **S4 ✅ DONE (2026-09-18, commit pending).** Availability CRUD (7 methods) over `study_availability` +
  `availability_exceptions` (SS-9); hard-delete (no `deleted_at` — corrected `_index` nuance-1 which wrongly
  listed these as softDelete:true); fail-loud range/format validation (day 0..6, score 1..5, PRESET_BLOCK,
  HH:MM+end>start, YYYY-MM-DD). **Victor drift-catch:** my 2 "non-blocking nits" (uniqueness, is_available+times)
  were actually doc-resolved specs — `is_available:false`+times = valid blackout (orthogonal); no uniqueness/
  overlap (SS-9/G5 input, stored as-is). Folded in as FACTs + AC6/AC7. Gated: g1 SHIP (after the nit-recheck) ·
  preflight PASSED · g2 · Verification Gate PASS (28 sessions tests) · §XXIX (BR-26..BR-28). `@vida/core` 867/867.

- **S6 ✅ DONE (2026-09-18, commit pending).** `session_templates` CRUD (create/update/delete/list/setDefault),
  focus presets (PD-3); hard-delete (no `deleted_at`); `name`/`description` `[E]` seam; `is_default`
  single-winner via `unsetOtherDefaults`; fail-loud validation (name non-empty, minutes/intervals ≥1, no DDL
  CHECK); `create` sets DDL-mirrored defaults so returned row == DB row (AC1 caught the create-returns-constructed-
  row behavior). **Victor drift-check applied:** doc-checked `usage_count`/`last_used_at` bump → genuinely a ②
  concern (homed, not dismissed). **§XXVIII reconciliation:** S6 surfaced that S3's `resolveFocusConfig`
  `templateId→...` branch was DEAD (no `template_id` on focus_sessions; PD-3 = config Preferences-owned) →
  removed it; templates are ②-applied presets; docs (S3 spec/current-spec/BR-24) reconciled. Gated: g1 SHIP
  (doc-checked nits) · preflight PASSED · g2 · Verification Gate PASS (32 sessions tests) · §XXIX (BR-29..BR-31).
  `@vida/core` 871/871.

- **S5 ✅ DONE (2026-09-18, commit pending).** Plan-batch endpoints (`generatePlan`/`approve`/`activate`/`recalc`)
  = the `study_plan_batches` state machine (`pending_approval→approved→active`, recalc self-loop); fail-loud
  `InvalidBatchTransition`; `softDelete:false`; `name` `[E]`; explicit-default create (returned==DB, S6 lesson).
  Doc-grounded per Victor's instruction: `generatePlan→pending_approval` = minimal traversable shell (intake:169-170
  defers the full batch lifecycle to an M1.2 mini-intake); placement algorithm + SS-8 bridge + completed/failed →
  M1.2 (AC4 proves no planned_blocks written). `window` param omitted (algorithm-only, avoids S3-templateId
  dead-surface). Gated: g1 (1 REVISE→window omitted) · preflight PASSED · g2 · Verification Gate PASS (36 sessions
  tests) · §XXIX (BR-32..BR-33). `@vida/core` 875/875.

- **S7 ✅ DONE (2026-09-18, commit pending).** `dueIn(range)` shared platform primitive (own `planned_blocks` ∪
  live provider reads, empty registry seam N5, SS-7 per-lane degrade) + `registerDueProvider` + `getSessionAnalytics`
  (derived-on-read SS-12/IR-6: total/completed/completionRate/avgFocusRating/totalFocusSeconds, `deleted_at`-
  filtered). `DueItem`/`DueProvider`/`SessionAnalytics`/`TimeRange` in service types (barrel-exported; @vida/types
  promotion deferred). Doc-grounded g1 caught 2 dead-surface/correctness items (removed unused `ProviderUnavailable`
  class; analytics `deleted_at` filter). Gated: g1 (1 REVISE ×2) · preflight PASSED · g2 · Verification Gate PASS
  (40 sessions tests) · §XXIX (BR-34..BR-35). `@vida/core` 879/879.

## ✅ ① BACKEND COMPLETE — all 7 slices built (S1–S7)
`packages/core/src/services/sessions/` = the full MOD-sessions ① service tier. `@vida/core` 879/879, tsc clean.
current-* promoted BR-13..BR-35. 8 slice commits on branch `mod-sessions` (off main, not pushed).

## Next step — ENTITY CLOSE
- **PR** `mod-sessions` → main (per git workflow: own branch → PR → merge). Then **`/task-complete mod-sessions`**
  (tracker --sync → LIF-139 Done; unblocks the 22 dependents). ② UI = separate `fe-sessions` issue.
- Deferred/homed beyond ①: effect handlers → #46 · placement algorithm + SS-8 bridge → M1.2 · live dueIn provider
  lanes → owning modules · richer analytics → later · view layer → G9 · `[E]` encryption → M3/DB-5.

## Route History
- 2026-09-18: baseline (current-* refreshed for DB-4 substrate) → interpretation → decomposition gate
  (7 slices, ratify, approved) → S1 g1/preflight/g2 (approved) → build → Verification Gate PASS → commit
  `5c961c4` on branch `mod-sessions` (off main; PR at issue close per git workflow).
