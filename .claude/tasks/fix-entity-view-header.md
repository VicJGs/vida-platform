# Task: fix-entity-view-header
# Status: planned
# Profile: Change Frontend Component
# Scenario: default
# Project: M1 — Whole Manual OS
# Milestone: M1.2.1 — Hub & Foundation · Frontend
# Source: flow-session Envision review (2026-10-07) — Victor flagged the shipped EntityView header as a left-behind design defect

## Goal
Fix the shipped `EntityView` (#6, LIF-209) header: the metadata **subtitle is crammed against the serif `$display`
title** (no vertical rhythm), and it follows the generic-tell pattern (a middle-dot meta-string "Project · 3 milestones ·
updated 2h ago"). Establish the **canonical shell-header typographic pattern** and apply it.

## Root cause (grounded)
- `packages/ui/src/components/entity-view.tsx:72` — `TitleGroup = styled(View, { flexShrink: 1 })` sets **no `gap`**
  between the `$display` title (`:148`) and the `$small` subtitle (`:151-155`) → they render flush, the subtitle jammed
  under the display title's descenders. Violates `design.md §IV` (proximity / 4pt rhythm) + §I (hierarchy / breathing room).
- The subtitle has no pinned pattern — consumers pass a middle-dot meta-string (a `frontend-design` generic tell).

## Fix (scope)
- Add vertical rhythm to the header: `TitleGroup` gap (`$4` eyebrow→title region) + a `$12` title→metadata gap
  (the flow-session greybox pattern, Envision-approved).
- Decide/pin the subtitle pattern: a single quiet `$small` muted line, NOT a dot-pile; progress/metadata that is a
  quantity → a `HonestProgress` bar, not text (the flow-session resolution).
- No interface change beyond what the pattern needs; re-run the EntityView Visual Gate (3 presets × light/dark + 375).

## Dependencies
- (none — EntityView #6 is shipped; this is a §XXVI-gated fix on the shipped component)

## Notes
- This is the DOC-canonical shell-header pattern; once pinned, the other shells (collection/dashboard) should be swept
  for the same cram (a follow-up check, not necessarily this unit).
- Unfiled in Linear — assign a LIF on `--sync` at pickup.
