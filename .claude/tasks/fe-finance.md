# Task: fe-finance
# Status: planned
# Linear: LIF-180
# Profile: Add Frontend Component
# Scenario: default
# Project: M1 — Whole Manual OS
# Milestone: M1.2.3 — Depth & Recovered · Frontend
# Source: decomposition-p6.md (P6) + PLAN-p6-frontend-track.md (Approval 2 SHIP) — backend-replan
# Reshape: G6 unit #41 — #41 Finance ⊕split — Dash(switch) · account Entity · All-* · Chart · Store tree · Commitments · Import wizard. ⛔ blocked on store·import_staging·budget·multi-currency schema.
# Note: labels `frontend` + `P6` applied post-write via Linear API (tracker sets labels out-of-band, as P5.1 did for `backend`).

## Goal
② Frontend build (add-frontend-component) for finance — the UI/UX tier over the finished ① service (`mod-finance`), 29 UI legs. Consumer-pull: rides its backend twin's wave 1:1. Per-slice blocking Visual Gate (Entity Delivery Flow ② track, ADR-021 §3.5).

## Dependencies
- blocked by `fe-codec-dashboard`
- blocked by `fe-codec-entity-facet`
- blocked by `fe-codec-canvas-graph`
