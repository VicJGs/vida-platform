# Task: fe-relationships
# Status: planned
# Linear: LIF-196
# Profile: Add Frontend Component
# Scenario: default
# Project: M1 — Whole Manual OS
# Milestone: M1.2.3 — Depth & Recovered · Frontend
# Source: decomposition-p6.md (P6) + PLAN-p6-frontend-track.md (Approval 2 SHIP) — backend-replan
# Reshape: G6 unit #42 — #42 Relationships — Dash⇄Graph⇄Contacts · contact Entity(health band) · Network · Reminders · All-Events. ⛔ blocked on network_groups·closeness_tier schema.
# Note: labels `frontend` + `P6` applied post-write via Linear API (tracker sets labels out-of-band, as P5.1 did for `backend`).

## Goal
② Frontend build (add-frontend-component) for relationships — the UI/UX tier over the finished ① service (`mod-relationships`), 3 UI legs. Consumer-pull: rides its backend twin's wave 1:1. Per-slice blocking Visual Gate (Entity Delivery Flow ② track, ADR-021 §3.5).

## Dependencies
- blocked by `fe-codec-dashboard`
- blocked by `fe-codec-canvas-graph`
- blocked by `fe-codec-entity-facet`
