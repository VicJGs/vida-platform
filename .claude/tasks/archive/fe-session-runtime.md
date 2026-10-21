# Task: fe-session-runtime
# Status: done
# Linear: LIF-218
# Profile: Add Frontend Component
# Scenario: default
# Project: M1 — Whole Manual OS
# Milestone: M1.2.1 — Hub & Foundation · Frontend
# Source: frontend-replan G0–G6 (reconstructed-structure.md + g6-reshape-runbook.md §2) — supersedes the P6 fe-* grain
# Reshape: G6 net-new · unit #23 · NEW (discovered)

## Goal
② Frontend — unit #23. X-CUT · Session runtime page — deliverable-per-stage (title·stage·deliverable+desc·attach·proof·log).

## ✅ COMPLETE (2026-10-15) — branch `fe-session-runtime`, PR #143 (base main)
Entity Delivery Flow ② · both slices shipped, each through the per-step build gate + per-slice Visual Gate.
- **S1** `1e9f2e2` — `toFlowSource` + `useFlowSession` (apps/web/src/flow). Data leg: single-stage default (EC-9),
  total SESSION_STATUS→StageStatus map, proof from attachments, effects via mapEffectLog. M1 stub (no composition
  root + worker `values` seam) → `?sample` seed + zero-signature live swap. tsc 0 · eslint 0 · tests 22/22.
- **S2** `e9c9bff` — runtime page + `/sessions/$id` route (apps/web/src/session-runtime). Router-free surface +
  thin routed wrapper. **Visual Gate PASS** (Victor-reviewed: 3 presets × light/dark × 375/768/1440, AA 4.94–6.03,
  no overflow, axe clean). tsc 0 · eslint 0 · surface tests 3/3.
- Envision RATIFIED (shell EC-1…EC-11). Stages realization doc-fixed (frontend-quality-bar §4.5, no new plumbing).
  Currency §XXIX: `docs/features/sessions-and-scheduling/current-*` refreshed with the ② frontend surface.
- **Spawned follow-up:** `fe-shell` content vertical inset (24/32/40) — whole-OS structural fix Victor flagged at
  the #23 review. Branch `fe-shell-content-inset`, `815bd20`, PR #142. (Separate unit, not #23.)

## Dependencies
- blocked by `fe-codec-flow-session` (done)
