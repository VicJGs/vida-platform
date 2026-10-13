# Task: fe-gamification
# Status: planned
# Linear: LIF-181
# Profile: Add Frontend Component
# Scenario: default
# Project: M1 — Whole Manual OS
# Milestone: M1.2.2 — Feature Modules · Frontend
# Source: decomposition-p6.md (P6) + PLAN-p6-frontend-track.md (Approval 2 SHIP) — backend-replan
# Reshape: G6 unit #32 — #32 Gamification — System Dash · rule-authoring Flow (conditional).
# Note: labels `frontend` + `P6` applied post-write via Linear API (tracker sets labels out-of-band, as P5.1 did for `backend`).

## Goal
② Frontend build (add-frontend-component) for gamification — the UI/UX tier over the finished ① service (`mod-gamification`), 7 UI legs. Consumer-pull: rides its backend twin's wave 1:1. Per-slice blocking Visual Gate (Entity Delivery Flow ② track, ADR-021 §3.5).

## Dependencies
- blocked by `fe-codec-dashboard` ✅ (LIF-208 Done)
- blocked by `fe-codec-flow-session` ✅ (LIF-210 Done)

## Downstream dependency — adaptive register (FLAGGED 2026-10-12, verified)
The documented intent is a **dual, user-adaptive register** (game-like for students/teens · calm for adults
turning their life around — `gamification/identity.md:11,6`). v1 builds the **calm/editorial baseline + a
`RegisterMode`/intensity seam**; the game-like register is NOT buildable in this unit and is a genuine
cross-unit dependency. See `docs/specs/foundation/fe-gamification/delivery/interpretation.md §7`.
- **D-REG-1 · vivid/game `ThemePreset`** — does NOT exist (`theme-resolution.ts:6` = reader·editorial·quietDesk,
  all calm). Owner: fe-codec-theme follow-up. **UNTRACKED in Linear → recommend filing an issue.**
- **D-REG-2 · `motivation_style` setter** — `fe-settings` (LIF-193, Backlog); the field reads `null` with no
  live setter today. This unit builds a deny-safe Preferences read port (absent/`null` ⇒ `calm`); live swap
  at fe-settings.
