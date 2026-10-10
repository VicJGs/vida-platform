# Task: fe-codec-canvas-board
# Status: in-progress
# Linear: LIF-204
# Profile: Add Frontend Component
# Scenario: default
# Project: M1 — Whole Manual OS
# Milestone: M1.2.1 — Hub & Foundation · Frontend
# Source: frontend-replan G0–G6 (reconstructed-structure.md + g6-reshape-runbook.md §2) — supersedes the P6 fe-* grain
# Reshape: G6 net-new · unit #10 · NEW

## Goal
② Frontend — unit #10. CODEC · Canvas: Vision-board + Calendar-grid.

## Dependencies
- blocked by `fe-codec-patterns`
- blocked by `fe-codec-viewmodes`

## Scenario
add-frontend-component / Default (Entity Delivery Flow ②). Worktree `.claude/worktrees/fe-codec-canvas-board` off main. Node 24 for @vida/ui.

## Slice log
- **Front matter — DONE**: interpretation.md (R1–R9a) · **Envision gate FIRED + Victor-approved** (EC-1…EC-9, calendar
  title = A user-named, overflow → #19 parked `calendar-vision.md §6`) · decomposition (slice-map + seam-contract,
  Approval 1). greybox deleted post-gate (record: `/tmp/vg-canvas-board/*.png`).
- **S1 `CanvasView` — DONE** (uncommitted): `@vida/ui` immersive frame — masthead (eyebrow·title[user-named]·meta·
  progress slot·read-only actions slot·hairline) + hosted-renderer region + override-slot state rule (BR-CB-S1-6) +
  responsive (BR-CB-S1-12). `canvas-view.{tsx,stories,test}` + barrel. §XXVI gate-1 /critique REVISE→2 blocking fixed
  (B1 state-rule contradiction · B2 responsive). tsc 0 · eslint 0 · **9/9 tests** · **Visual Gate PASS** (3 presets ×
  light/dark × 375/768/1440; AA title 15.84–17.29 / eyebrow+meta 4.94–6.53 warm-dark; no overflow). Currency: ui CLAUDE.md
  digest + s1-canvas-view.md. Covers EC-1,3,4,6,7,8.
- **S2 compositions — NEXT**: apps/web `VisionBoardCanvas` + `CalendarGridCanvas` (type+convention; measure-driven
  reference tile; live hooks deferred). Covers EC-2,5,9.
