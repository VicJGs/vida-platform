# Task: sessions-rescope
# Status: planned
# Profile: Add Frontend Component
# Scenario: entity-rescope
# Project: M1 — Whole Manual OS
# Milestone: M1.2.4 — Live Close: shipped-surface debt
# Source: golive-replan G2 debt-plan.md rev 3 + G3 g3-order.md
# Title: Sessions debt: HUD + runtime live + 2 core reads (entity close → fe-sessions)

## Goal
Sessions debt: HUD + runtime live + 2 core reads (entity close → fe-sessions). Run the entity through `entity-rescope` and close on the Entity Live Close
(`docs/specs/foundation/golive-replan/process.md` ELC-1…9): every pinned Envision EC (incl. inherited) re-verified live;
each ❌ EC corrected or explicitly re-pinned by Victor.

## Scope (census rows → `docs/specs/foundation/golive-replan/coverage-report.md`)
register `sessions` · fe-session-hud legs · fe-session-runtime mark-done/attach/proof port wiring · flow-session consumer + dead `bindFlowIntents` · backend: `findActiveSession` + applied-effects read. Ships its legs live (ELC-3…7); NO ENTITY CLOSE here (process.md §6 exception)

## Ledger home
docs/features/sessions-and-scheduling/delivery/ — entity-rescope writes reconciliation.md + slice-map.md here

## Dependencies
- blocked by `data-plane-wiring`
- (entity close lives in fe-sessions, which is blocked by this unit)
