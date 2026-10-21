# Task: shell-rescope
# Status: planned
# Linear: LIF-249
# Profile: Add Frontend Component
# Scenario: entity-rescope
# Project: M1 — Whole Manual OS
# Milestone: M1.2.4 — Live Close: shipped-surface debt
# Source: golive-replan G2 debt-plan.md rev 3 + G3 g3-order.md
# Title: Shell (X-CUT) live: dock mounted, placement, Modules panel, search swap, export

## Goal
Shell (X-CUT) live: dock mounted, placement, Modules panel, search swap, export. Run the entity through `entity-rescope` and close on the Entity Live Close
(`docs/specs/foundation/golive-replan/process.md` ELC-1…9): every pinned Envision EC (incl. inherited) re-verified live;
each ❌ EC corrected or explicitly re-pinned by Victor.

## Scope (census rows → `docs/specs/foundation/golive-replan/coverage-report.md`)
mount `ModuleDock` + read moduleVisibility/rename/reduceMotion · placement read/hydrate · Modules panel · #69 ORPHANs: BSE-15 search-provider swap (done-when = SearchProvider seam swap + honest `search-unavailable` state) · BSE-19/20/21 serializers wired · BSE-22 export dialog wired

## Ledger home
docs/specs/foundation/fe-shell/delivery/ — entity-rescope writes reconciliation.md + slice-map.md here

## Dependencies
- blocked by `data-plane-wiring`
- blocked by `preferences-rescope`
- soft: db-8-fts5-search (live FTS completes there; DB-8's close re-verifies ⌘K/notes search live)
