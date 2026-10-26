# Task: fe-routines
# Status: planned
# Linear: LIF-197
# Profile: Add Frontend Component
# Scenario: default
# Project: M1 — Whole Manual OS
# Milestone: M1.2.3 — Depth & Recovered · Frontend
# Source: decomposition-p6.md (P6) + PLAN-p6-frontend-track.md (Approval 2 SHIP) — backend-replan
# Reshape: G6 unit #33 — #33 Routines — Collection · routine Entity · run-flow. (gate = the ← mod-routines edge; schema landed, 018_routines.ts — GAP-2 resolved, gap2-schema-gates.md)
# Note: labels `frontend` + `P6` applied post-write via Linear API (tracker sets labels out-of-band, as P5.1 did for `backend`).

## Goal
② Frontend build (add-frontend-component) for routines — the UI/UX tier over the finished ① service (`mod-routines`), 7 UI legs. Consumer-pull: rides its backend twin's wave 1:1. Per-slice blocking Visual Gate (Entity Delivery Flow ② track, ADR-021 §3.5).

## Dependencies
- blocked by `mod-routines`
- blocked by `fe-codec-collection`
- blocked by `fe-codec-entity-facet`
- **Edge from mod-routines ① close (N5, golive process §3/§4):** this entity close owns the composition-root wiring —
  `createRoutinesService({ db, deviceId, registry, tasks, sessions, sessionRegistry, spaces, notes, habits?, prefs?, effects? })` +
  `registerRoutinesJournal(journalRegistry, svc)` + `registerRoutinesDueProvider(sessions, svc)` (shipped in
  `packages/core/src/services/routines/journal.ts`, not called by ①). The Journal agenda shows routines only once journals' Sessions
  `dueIn` bridge lands (borrowed leg, routines slice-map).
