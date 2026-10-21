# Task: notifications-rescope
# Status: planned
# Linear: LIF-246
# Profile: Add Frontend Component
# Scenario: entity-rescope
# Project: M1 — Whole Manual OS
# Milestone: M1.2.4 — Live Close: shipped-surface debt
# Source: golive-replan G2 debt-plan.md rev 3 + G3 g3-order.md
# Title: Notifications live close: #46 engine wired

## Goal
Notifications live close: #46 engine wired. Run the entity through `entity-rescope` and close on the Entity Live Close
(`docs/specs/foundation/golive-replan/process.md` ELC-1…9): every pinned Envision EC (incl. inherited) re-verified live;
each ❌ EC corrected or explicitly re-pinned by Victor.

## Scope (census rows → `docs/specs/foundation/golive-replan/coverage-report.md`)
construct the BUILT #46 engine + register `notifications` · 3 STUB legs · quiet-hours inputs · ❌ ECs (2)

## Ledger home
docs/features/notifications/delivery/ — entity-rescope writes reconciliation.md + slice-map.md here

## Dependencies
- blocked by `data-plane-wiring`
- blocked by `sessions-rescope`
- soft: preferences-rescope (`preferences?` port optional, fail-open)
