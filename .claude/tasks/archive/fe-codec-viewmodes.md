# Task: fe-codec-viewmodes
# Status: done
# Linear: LIF-214
# Profile: Add Frontend Component
# Scenario: default
# Project: M1 — Whole Manual OS
# Milestone: M1.2.1 — Hub & Foundation · Frontend
# Source: frontend-replan G0–G6 (reconstructed-structure.md + g6-reshape-runbook.md §2) — supersedes the P6 fe-* grain
# Reshape: G6 net-new · unit #3 · EXTEND ui-2

## Goal
② Frontend — unit #3. CODEC · View-mode renderers — add table + board to the shipped 7.

## Dependencies
- blocked by `fe-codec-theme`
- blocked by `fe-codec-patterns`

## Build log (Entity Delivery Flow ②)
- **Front matter** (`8cf9fc2`) — Decomposition Gate Approval 1. Read-only-lens grounding (ADR-007 §4.3 View vs
  ADR-008 Capability): S1 TableView + S2 BoardView, both read-only; drag-to-move = Capability (OVERFLOWING, not
  deferred); Envision SKIP (doc-grounded). interpretation + slice-map + seam-contract.
- **S1 — TableView** DONE. `table-view.tsx` (read-only `role="table"`, calendar-view divergence, 4 states, aria-sort
  display-only, 375 scroll, designed empty row w/ aria-colspan) + test (11) + stories + barrel + `v8-table-view.md`.
  Gates: contract approved · tsc 0 · @vida/ui 371/371 · 2 code-reviews (findings refuted/by-design, 0 changes) ·
  **Visual Gate PASS** (Brave: AA 4.94–6.53 incl. warm-dark · axe 0 · 375 scroll · aria-colspan serializes) ·
  §XXIX currency (CLAUDE.md + _index.md supersession + memory). **Next: S2 — BoardView.**
- **S2 — BoardView** DONE. `board-view.tsx` (read-only `role="group"` kanban over PRE-GROUPED `groups:BoardGroup<T>[]`;
  per-column `role="list"` via `resolveDataViewState`; board-level loading/error/board-empty direct; per-group count
  derived from `items.length`; per-column empty derives `colState='empty'` to dodge the spine's "pass state=empty" warn;
  column lists named via `useId`-prefixed `aria-labelledby`; NO drag/move — Capability O1; fixed `COLUMN_WIDTH 280` +
  `overflowX:auto` for 375; bordered columns) + test (13) + stories + barrel + `v9-board-view.md`.
  Contract RATIFIED from seam-contract §B (2 doc-resolved points — count rendered/derived · no `loadingCount` prop —
  grounded, not re-decided; `columnEmpty`/`loadingCount` over-proposals dropped). Gates: tsc 0 · @vida/ui **384/384** ·
  eslint 0 · independent code-review **SHIP** (8 risk areas verified, 0 blocking) · `/critique` **SHIP** ·
  **Visual Gate PASS** (Brave programmatic, 3 presets × light/dark: AA muted 4.94–6.53 incl. warm-dark · roles
  group/list/listitem/status correct · 375 scroll 1168>311 · 3 board-level terminal states) · §XXIX currency
  (CLAUDE.md inventory → "all 7 VIEW_LAYOUT renderers ship" + _index.md change log). **① ALL 7 canonical view-mode
  renderers now ship — the unit is COMPLETE. Next: PR → merge.**
