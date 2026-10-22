# Task: preferences-rescope
# Status: in-progress
# Linear: LIF-247
# Profile: Add Frontend Component
# Scenario: entity-rescope
# Project: M1 — Whole Manual OS
# Milestone: M1.2.4 — Live Close: shipped-surface debt
# Source: golive-replan G2 debt-plan.md rev 3 + G3 g3-order.md
# Title: Preferences live close: Settings + onboarding writes persist (the hub)

## Goal
Preferences live close: Settings + onboarding writes persist (the hub). Run the entity through `entity-rescope` and close on the Entity Live Close
(`docs/specs/foundation/golive-replan/process.md` ELC-1…9): every pinned Envision EC (incl. inherited) re-verified live;
each ❌ EC corrected or explicitly re-pinned by Victor.

## Scope (census rows → `docs/specs/foundation/golive-replan/coverage-report.md`)
register `preferences` · fe-settings 6 STUB legs persist · theme persistence · home arrangement persist/hydrate · locale readers · gamification persona setter · `usePreferences` fake success (ELC-6) · fe-settings ❌ ECs · onboarding writes (module/theme selections) + its ❌ EC + EmptyState first consumers

## Ledger home
docs/features/preferences/delivery/ — entity-rescope writes reconciliation.md + slice-map.md here

## Dependencies
- blocked by `data-plane-wiring`
- (none beyond data-plane-wiring — the hub)

## Progress (entity-rescope path) — worktree `.claude/worktrees/preferences-rescope` (branch `preferences-rescope` @ c025710)
- [x] Step 0 baseline: `docs/modules/preferences/current-*` (② surface plane added)
- [x] Step 1 Documentation Gate: `delivery/documentation-gate.md` rev 4
- [x] Steps 2–3 Interpretation + Gate: `delivery/interpretation.md` rev 5 (Victor: U1 → intake G5; A6 = drift; A13 → architecture)
- [x] Step 3.5 Envision: SKIP, ECs carried (EC-P1 withdrawn: `game` is a module, not a theme)
- [x] Step 4 Reconciliation: `delivery/reconciliation.md`, DRY at pass 9 (72 rows after Re-scope Gate corrections)
- [x] Step 5 Re-scope Gate: `delivery/slice-map.md` re-scope slices **APPROVED by Victor 2026-10-21** (R1 → R8 + R-T)
- [x] R1 write integrity — Verification Gate PASS 2026-10-21 (PLAN-R1 §8); awaiting Victor's commit go
- [x] R2 live preferences seam — Verification Gate PASS 2026-10-22 (PLAN-R2 §7); committed + pushed
- [ ] Step 6 slices (remaining): R2 live seam → R3 boot/Appearance → R4 reduce-motion → R5 Modules+⌘K → R6 Locale/Notif → R7 onboarding → R-T transition → R8 entity close (ELC-1…9)
- [ ] Owed at close (from the main checkout): mint the i18n platform unit (task + Linear) · write cross-unit edges onto owning tasks

## Route History
- 2026-10-21 Victor corrections: U1 (intake G5) · A13 (architecture > planning artifacts) · `game` = module, not theme (fe-gamification EC-1/2 re-pinned).

- 2026-10-22: paused after R2 at Victor's request (commit + push, review before R3). Next: PLAN-R3.
