# Task: fe-home
# Status: planned
# Linear: LIF-187
# Profile: Add Frontend Component
# Scenario: default
# Project: M1 — Whole Manual OS
# Milestone: M1.2.1 — Hub & Foundation · Frontend
# Source: decomposition-p6.md (P6) + PLAN-p6-frontend-track.md (Approval 2 SHIP) — backend-replan
# Reshape: G6 unit #18 — #18 Home — 4-region (schedule·stats·day-actions·quick-actions) + arrangement toggle + journal Editor facet; built on UX-6 model. (+ Wrapped reviews.)
# Note: labels `frontend` + `P6` applied post-write via Linear API (tracker sets labels out-of-band, as P5.1 did for `backend`).

## Goal
② Frontend build — the **Home** surface (G6 unit #18): a 4-region dashboard (schedule · stats · day-actions · quick-actions) + arrangement toggle + journal Editor facet, built on the UX-6 model (+ Wrapped reviews). Consumes `mod-journals` ① + cross-module providers. Per-slice blocking Visual Gate (Entity Delivery Flow ② track, ADR-021 §3.5).

## Dependencies
- blocked by `fe-codec-dashboard`
- blocked by `fe-codec-entity-facet`
