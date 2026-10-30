# Task: fe-sessions
# Status: planned
# Linear: LIF-198
# Profile: Add Frontend Component
# Scenario: default
# Project: M1 — Whole Manual OS
# Milestone: M1.2.3 — Depth & Recovered · Frontend
# Source: decomposition-p6.md (P6) + PLAN-p6-frontend-track.md (Approval 2 SHIP) — backend-replan
# Reshape: G6 unit #34 — #34 Sessions ⊕split — Agenda/My-Week · Availability · config · templates · Pomodoro (runtime/HUD split → fe-session-runtime/hud).
# Note: labels `frontend` + `P6` applied post-write via Linear API (tracker sets labels out-of-band, as P5.1 did for `backend`).

## Goal
② Frontend build (add-frontend-component) for sessions — the UI/UX tier over the finished ① service (`mod-sessions`), 5 UI legs. Consumer-pull: rides its backend twin's wave 1:1. Per-slice blocking Visual Gate (Entity Delivery Flow ② track, ADR-021 §3.5).

## Dependencies
- blocked by `fe-codec-collection`
- blocked by `fe-session-runtime`
- blocked by `fe-session-hud`
- blocked by `sessions-rescope`
- **Inherited from sessions-rescope (LIF-248) — must close at this ENTITY CLOSE (ELC-9):** Flow EC-5 `⋯` action set (hidden there — no documented session actions) · Flow EC-2 proof + target-less attach (the BORROWED capture flow, E21) · HUD EC-3/3c/3d countdown live re-verification with THIS unit's timer driver as the focus-runtime store's production writer (`apps/web/src/stores/focus-runtime-ui-store.ts`) · HUD idle (Begin) form once the start flow ships. Source: `docs/features/sessions-and-scheduling/delivery/{interpretation,reconciliation}.md` §6 / R-40, R-46.
