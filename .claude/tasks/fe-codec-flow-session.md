# Task: fe-codec-flow-session
# Status: in-progress
# Linear: LIF-210
# Profile: Add Frontend Component
# Scenario: default
# Project: M1 — Whole Manual OS
# Milestone: M1.2.1 — Hub & Foundation · Frontend
# Source: frontend-replan G0–G6 (reconstructed-structure.md + g6-reshape-runbook.md §2) — supersedes the P6 fe-* grain
# Reshape: G6 net-new · unit #11 · NEW (net-new)

## Goal
② Frontend — unit #11. CODEC · Flow/Session shell — deliverable-per-stage · attach(doc/photo/audio) · mark-done/proof · effect-rail log.

## Dependencies
- blocked by `fe-codec-patterns`
- blocked by `fe-codec-entity-facet`

## Slice log (2026-10-07 — WHOLE UNIT shipped)
Full Entity Delivery Flow ②: interpretation → Interpretation Gate ✅ → **Envision Gate FIRED** (greybox, 2 review rounds —
typography correction + header breathing-room; EC-1…EC-11 approved) → Decomposition Gate ✅ (S1 shell + S2 adapter; no
backend track) → §XXVI per-slice.
- **S1 `FlowSessionView`** (`@vida/ui`, `components/flow-session-view.tsx`): the flow FRAME — title-hero header + `HonestProgress`
  bar + staged `Timeline` rail (done/current/upcoming + fulcrum) + `renderStage` slot + standardized affordances (attach ·
  mark-done · require-proof → emit intents) + read-only effect-rail log. 14 jsdom tests. Visual Gate PASS (3 presets ×
  light/dark + 375: title serif AA 15.84 · text AA 4.95–4.96 incl. warm-dark · progress bar · affordances · fulcrum ·
  effect-rail · axe 0 · 375 no overflow — the attach-row flatten fixed an RNW flexShrink:0 overflow the gate caught).
  /critique SHIP.
- **S2 flow adapter** (`apps/web/src/flow/adapter.ts`): `toFlowProps` + `mapEffectLog` (ADR-004 applied_effects → effect-rail)
  + `bindFlowIntents` (shell intents → `SessionsPort`). 9 tests. Live `useFlowSession` hook deferred (R3). @vida/web typecheck clean.
- §XXIX currency: spec `flow-session-view.md` + @vida/ui CLAUDE.md digest + delivery docs (interpretation/envision/slice-map/
  seam-contract) + apps/web/src/flow/CLAUDE.md, committed WITH the code.
- Carried finding → `fix-entity-view-header` (shipped EntityView has the same crammed-header root; Victor's call: separate unit).
- "stages" backend realization = design-intent ext, homed to #23 (O7). Timer/HUD = #16 + pomodoro V5.
