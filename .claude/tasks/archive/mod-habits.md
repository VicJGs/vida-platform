# Task: mod-habits
# Status: done
# Linear: LIF-125
# Profile: Add Backend Component
# Scenario: Default (Entity Delivery Flow v1)
# Project: M1 — Whole Manual OS
# Milestone: M1.1.2 — Feature Modules · Backend
# Spec: docs/specs/features/mod-habits/_index.md
# Source: reconstructed-structure.md #49 (LIF-125; ADR-016 model)
# Branch: mod-habits (off main) → PR #68 MERGED (528ebff, 2026-09-23)
# Created: 2026-09-23 (stub 2026-09-17, backend-replan P5)

## Goal
Build the Habits module ① backend service tier (`createHabitsService`) over the DB-4 habits schema
(`habits` + `habit_completions` + `project_habits`): definition CRUD, recurrence/schedule, quantified
completion ledger, derived streak / completion-rate / mood analytics, build-vs-break, and the cross-module
seams (contributions/economy effect emit · journal contribution · pages/entity_tags/project_habits). ①
backend only — ② `fe-habits` (LIF-182) is a separate P6 frontend issue.

## Dependencies
- blocked by `mod-notes-and-pages` ✅ · `xs-effect-rail` ✅ · `xs-measurement-engine` ✅ · `xs-notifications-delivery` ✅ · `xs-spaces-tags-links` ✅ (all Done)

## Outcome — ① BACKEND COMPLETE (PR #68 merged `528ebff`)
Entity Delivery Flow: front matter (Interpretation Gate SHIP · Decomposition Gate SHIP + Approval 1) → 5 backend
slices, each §XXVI double-gated (g1 critique + Verification Gate) + independent g2 code-review:
- **S1** `d6b80c7` — definition CRUD + validators + `@vida/types` reconcile (+measurement_kind/binding_mode/success_criteria/difficulty, −retired `tags`; +completion updated_at/location/completion_time)
- **S2** `581c2d7` — completion ledger + streak-recompute engine (deterministic from ledger; `days_of_week` schedule; done-gate; grace/reset; generalizes checkins computeStreak)
- **S3** `2b9bf41` — backfill + window (permissive/fail-OPEN Preferences port; future/beyond-window reject)
- **S4** `a2fdae1` — derived reads (today-list/streak/completion-rate/mood/calendar) + ADR-011 M5 measure seam
- **S5** `fcaa749` — effect fan-out (guarded/idempotent/post-commit/isolated; emit-only producer) + entity_tags + project_habits + Journal contribution; ① COMPLETE

@vida/core **1322/1322** (46 habits live-store + 12 introspection) · tsc 11/11 · eslint 0 · gitleaks clean.
Currency `docs/modules/habits/current-*` (BR-HB-1…34). Delivery docs `docs/features/habits/delivery/`.

## Deferred (homed)
- weekly/biweekly/monthly `rate` MEASURE value + goal-vs-habit target model → **design-pass** (rerun §5:146)
- `[E]` field encryption wiring → M3/DB-5 · backfill-window setting → Preferences · purpose/economy WRITES → Purpose/Gamification handlers (M2) · sync → foundation substrate · pages linking → ②/Notes
- ② `fe-habits` (LIF-182) — all UI (4 view surfaces)

## Key decisions
- Scheduled-occurrence model = `days_of_week` (daily=every day); the weekly/biweekly/monthly PERIOD is the documented `rate` design-pass, NOT a streak input (rerun §5:146) — Victor drift-catch resolved (the question was doc-answered, not a decision).
- Habits is an effect PRODUCER (emit-only, R2) → NO `registerHabitsEffects`. Effect fan-out fires on EVERY done-leaving mutation (log/detailed/backfill/edit), idempotent via the rail (safe re-fire).
- Backfill window is a PERMISSIVE (fail-OPEN) port — the OPPOSITE of the fail-closed security ports (HB-10 "user owns the policy").
- Two `@vida/core` barrel collisions fixed: `DateRange`→`HabitDateRange`; `EffectsPort` not re-exported (checkins owns it).

## Session History
| Date | What was done | Next step |
|------|--------------|-----------|
| 2026-09-23 | ① COMPLETE — front matter + S1–S5 all gated + committed; PR #68 merged (`528ebff`); @vida/core 1322 | ② fe-habits (LIF-182) = separate P6. Next `#`-order head via `/begin`. |
