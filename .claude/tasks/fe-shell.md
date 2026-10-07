# Task: fe-shell
# Status: planned
# Linear: LIF-226
# Profile: Add Frontend Component
# Scenario: default
# Project: M1 — Whole Manual OS
# Milestone: M1.2.1 — Hub & Foundation · Frontend
# Source: decomposition-p6.md (P6) + PLAN-p6-frontend-track.md (Approval 2 SHIP) — backend-replan
# Reshape: G6 unit #14 — #14 Shell — two positionable content-fit panels + regions (EXTEND ui-4/ux-3). Split-outs: fe-shell-scope #15, fe-session-hud #16; ⌘K reuse ui-4/ux-2.
# Note: labels `frontend` + `P6` applied post-write via Linear API (tracker sets labels out-of-band, as P5.1 did for `backend`).

## Goal
② Frontend build — the **Shell** frame (G6 unit #14): two positionable content-fit panels + regions, extending ui-4/ux-3. Split-outs: `fe-shell-scope` #15, `fe-session-hud` #16; ⌘K reuses ui-4/ux-2. Wires the built M1.0 UI (⌘K search · export dialog · MD/PDF/DOCX serializers · neural-graph · Spaces add-menu · view degradation) to its finished provider seams, all terminal states rendered. The ⌘K search legs (BSE-14/15/16) render `search-unavailable` now — live FTS5 ranked results complete via DB-8/M1.4. Per-slice blocking Visual Gate.

## Dependencies
- blocked by `fe-codec-patterns`
