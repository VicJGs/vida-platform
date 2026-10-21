# Task: preferences-rescope
# Status: planned
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
