# Task: fe-health
# Status: planned
# Linear: LIF-223
# Profile: Add Frontend Component
# Scenario: default
# Project: M1 — Whole Manual OS
# Milestone: M1.2.3 — Depth & Recovered · Frontend
# Source: decomposition-p6.md (P6) + PLAN-p6-frontend-track.md (Approval 2 SHIP) — backend-replan
# Reshape: G6 unit #40 — #40 Health (umbrella ⊕split: Core·Training·Nutrition sub-tabs). FOLDS fe-health-nutrition + fe-health-training. ⛔ blocked on the ~12 Health Core tables + Training/Nutrition schema (0%).
# Note: labels `frontend` + `P6` applied post-write via Linear API (tracker sets labels out-of-band, as P5.1 did for `backend`).

## Goal
② Frontend build — the **Health** umbrella surface (G6 unit #40, ⊕split Core · Training · Nutrition sub-tabs); folds `fe-health-nutrition` + `fe-health-training`. ⛔ blocked on the ~12 Health Core + Training/Nutrition schema tables (0%). Consumes `mod-health-*` ①. Per-slice blocking Visual Gate (Entity Delivery Flow ② track, ADR-021 §3.5).

## Dependencies
- blocked by `fe-codec-dashboard`
- blocked by `fe-codec-collection`
- blocked by `fe-codec-entity-facet`
