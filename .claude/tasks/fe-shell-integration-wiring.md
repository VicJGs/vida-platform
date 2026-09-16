# Task: fe-shell-integration-wiring
# Status: planned
# Linear: LIF-199
# Profile: Add Frontend Component
# Scenario: default
# Project: M1 — Whole Manual OS
# Milestone: M1.2.1 — Hub & Foundation · Frontend
# Source: decomposition-p6.md (P6) + PLAN-p6-frontend-track.md (Approval 2 SHIP) — backend-replan
# Note: labels `frontend` + `P6` applied post-write via Linear API (tracker sets labels out-of-band, as P5.1 did for `backend`).

## Goal
Thin VISIBLE shell-integration issue (RIDE bucket, 11 legs) — wire the already-built M1.0 UI (⌘K search · export dialog · MD/PDF/DOCX serializers · neural-graph · Spaces add-menu · view degradation) to its finished provider seam, all terminal states rendered. Done-when = seam wired + states correct; the ⌘K search legs (BSE-14/15/16) render `search-unavailable` now — live FTS5 ranked results complete via DB-8/M1.4. Per-slice blocking Visual Gate.

## Dependencies
- blocked by `db-8-fts5-search`
- blocked by `ui-2-platform-views`
- blocked by `ui-3-vida-editor`
- blocked by `ui-4-app-shell-components`
- blocked by `ux-2-command-bar-search`
