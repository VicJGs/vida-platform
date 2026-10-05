# Task: fe-codec-collection
# Status: in-progress
# Linear: LIF-207
# Profile: Add Frontend Component
# Scenario: default
# Project: M1 — Whole Manual OS
# Milestone: M1.2.1 — Hub & Foundation · Frontend
# Source: frontend-replan G0–G6 (reconstructed-structure.md + g6-reshape-runbook.md §2) — supersedes the P6 fe-* grain
# Reshape: G6 net-new · unit #4 · EXTEND ui-2 data-view

## Goal
② Frontend — unit #4. CODEC · Collection shell — a SavedView rendered in a view-mode.

## Dependencies
- blocked by `fe-codec-viewmodes`

## Delivery Log
- **Front matter COMPLETE** (Entity Delivery Flow ②). Step 0 baseline · Step 1 interpretation (the Tamagui-only boundary →
  @vida/ui `CollectionView` + apps/web adapter split; local `ViewLayout` union) · Step 1.5 **Envision FIRED** (doc test
  §3.75; greybox rendered Brave/Storybook, Victor approved shape + 8 ECs; 3 sub-questions doc-resolved: label switcher +
  `+`; 375 condense; chrome active) · Step 2 **Decomposition Gate — Approval 1** (independent critic SHIP; 4 citation NITs +
  1 contract tension folded; "no M1.2.1 consumer" false-precision → "no built consumer yet"). Docs:
  `docs/specs/foundation/fe-codec-collection/delivery/{interpretation,envision,slice-map,seam-contract}.md`.
- Slices: **S1** CollectionView core (@vida/ui, Visual) → **S2** view-config chrome (@vida/ui, Visual) → **S3** adapter
  (apps/web, type+convention, Verification). Branch `worktree-fe-codec-collection`, worktree `.claude/worktrees/fe-codec-collection`.
- **S1 — COMPLETE.** `CollectionView` (@vida/ui): label switcher (toolbar ≥768 / condensed Menu <768 via `useTabletUp`
  matchMedia hook) + `renderView(layout,state)` dispatch (agnostic of the 7 shapes) + title/count chrome + 8-state;
  non-generic, local `ViewLayout` union (no @vida/types dep); empty-ownership resolved (`DESIGNED_EMPTY_LAYOUTS=['calendar']`).
  Contract `collection-view.md`. tsc 0 · @vida/ui **394** (+10) · eslint 0 · **Visual Gate PASS** (Brave, 3 presets×light/dark:
  AA 4.94–6.03 incl warm-dark · axe 0 · 7 renderers · toolbar aria-pressed · 375 condense+scroll). Independent code-review
  **SHIP** (4 non-blocking NITs: Narrow375 story annotated · condensed-Menu menuitemradio = documented follow-up · Node-24
  runner). EC-1/3/4/5 demonstrated; EC-2/6 → S2. §XXIX: packages/ui/src/CLAUDE.md.
- **S2 — next** (view-config chrome: Filter/Sort/+ entry points).
