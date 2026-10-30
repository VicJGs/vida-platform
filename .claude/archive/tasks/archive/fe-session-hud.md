# Task: fe-session-hud
# Status: in-progress
# Linear: LIF-217
# Profile: Add Frontend Component
# Scenario: default
# Project: M1 — Whole Manual OS
# Milestone: M1.2.1 — Hub & Foundation · Frontend
# Source: frontend-replan G0–G6 (reconstructed-structure.md + g6-reshape-runbook.md §2) — supersedes the P6 fe-* grain
# Reshape: G6 net-new · unit #16 · NEW (net-new)

## Goal
② Frontend — unit #16. SHELL · Session HUD (persistent region 6) — timer/stage, responsive placement.

## Dependencies
- blocked by `fe-codec-flow-session` ✅
- blocked by `fe-shell` ✅

## Build Progress (Entity Delivery Flow ② · worktree `.claude/worktrees/fe-session-hud`)
- [x] Step 0 BASELINE — worktree off origin/main @ 8c1070d, stacked PR #142 + #143 (routes.tsx union resolved);
  @vida/web 615/615 green on the stacked base; shell/flow/sessions ground truth loaded.
- [x] Step 1 INTERPRETATION — `docs/specs/foundation/fe-session-hud/delivery/interpretation.md` (N1: no
  "active session" read on SessionsService → F-HUD-1 seam; §3.75 trigger YES).
- [x] Step 1.5 ░ENVISION GATE░ — greybox (real AppShell hudSlot, Brave, 3 states × 4 presets × L/D ×
  375/768/1440) **APPROVED by Victor 2026-10-16**; EC-1…EC-10 pinned; 3 answers: idle hidden in M1 prod
  (`?sample` demos) · un-timed count-up plain · pause always-visible ≥768. Post-approval FACT: pause is
  focus-runtime-only (SESSION_STATUS has no 'paused') → canPause gating.
- [x] Step 2 ░DECOMPOSITION GATE░ — seam-contract + slice-map (3 slices); g1 critic REVISE (B1..B5+N1/N2)
  → folded → confirm SHIP; **Victor-directed grounding pass** (pomodoro PD-1..12 + V5 widget spec) overturned
  EC-3c overtime → hold-complete + re-scoped F-HUD-1 (clock is client-ephemeral BY DESIGN) + added EC-3d
  (break phase); **Approval 1 GRANTED 2026-10-16**.
- [x] **S1 substrate** (`d5d6f46`) — types (tri-state HudRead · phase countdown · pausedAt) + deriveHudClock/
  formatHudTime + useHudClock (value-keyed, drift-free) + useActiveSession stub (hidden default, 6 ?sample
  forms captured-once). tsc 0 · eslint 0 · **29/29** (+TZ=Asia/Tokyo run) · g2 REVISE→F1(sample Date.now()
  per render)+4 nits folded · /critique SHIP. Verification Gate PASS.
- [x] **S2 the pill** (`1377cd6`) — 5 forms (idle · countdown[focus/break] · elapsed · paused-frozen ·
  interval-complete) · one real SPA link + sibling pause ghost · transition-only sr announcer · UA
  anchor-decoration reset (measured: child deco-none can't cancel an ancestor's line). 42/42 ·
  **Visual Gate PASSED (Victor)** — 0/108 cells, ring ink preset-distinct.
- [x] **S3 shell mount** (`6ac01bd`) — hudSlot wired (M1 prod honest-hidden); router-subscribed `search`
  (gate catch: window.location reads never update on client-side nav); **D-S3-1 §XXVIII (Victor):** 375
  strip-budget redistribution — scope globe-only + Search→first More row + HUD keeps ring+time (strip
  overcommitted ~80px once the slot filled; Bar-1 scrollW 179 vs clientW 87); F-HUD-1 filed; harness
  deleted. session-hud 46/46 · shell 117/117 · full 660/661 (1 isolated-green flake) · g2 SHIP ·
  **Visual Gate PASSED (Victor)** incl. deep-link walk (HUD persists on /sessions/$id).
- [x] /critique SHIP · **PR #144 open** (base main, STACKED on #142+#143 — merge order 142→143→144;
  CI billing outage still blocks checks). Linear LIF-217 → In Review at next sync.

## Session Log
- 2026-10-16 — STARTED (next ready FE head per `tracker_sync --plan project:M1`; Victor's call). Worktree
  `.claude/worktrees/fe-session-hud`, branch `fe-session-hud` off origin/main @ `8c1070d`, **stacked on the two
  open PRs the HUD builds on** (CI billing outage blocks their merge): `origin/fe-shell-content-inset` (PR #142)
  + `origin/fe-session-runtime` (PR #143; routes.tsx union-conflict resolved). Node 24. Queue anomaly noted:
  `fe-codec-system` #12 absent from Linear (incl. archived) — likely folded in a reshape; dependents shipped.
  Next: Step 1 interpretation (Entity Delivery Flow ② front matter).
