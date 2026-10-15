# Task: fe-session-runtime
# Status: planned
# Linear: LIF-218
# Profile: Add Frontend Component
# Scenario: default
# Project: M1 — Whole Manual OS
# Milestone: M1.2.1 — Hub & Foundation · Frontend
# Source: frontend-replan G0–G6 (reconstructed-structure.md + g6-reshape-runbook.md §2) — supersedes the P6 fe-* grain
# Reshape: G6 net-new · unit #23 · NEW (discovered)

## Goal
② Frontend — unit #23. X-CUT · Session runtime page — deliverable-per-stage (title·stage·deliverable+desc·attach·proof·log).

## Build Progress (Entity Delivery Flow ② · worktree `.claude/worktrees/fe-session-runtime` branch `fe-session-runtime`, off main @1458b67)
Front matter at `docs/specs/foundation/fe-session-runtime/delivery/`:
- [x] **Step 0/1** interpretation.md — deps · needs · organization · implicit rules. **Corrected a self-inflicted drift** (framed the stages realization as an open fork; it is doc-fixed — frontend-quality-bar §4.5 "assemble existing primitives, no new plumbing" + slice-map O7 homes per-module stages OUT of #23).
- [x] **Step 1.5 Envision Gate — RATIFIED** (Victor): inherit the shipped shell's EC-1…EC-11 (`fe-codec-flow-session/delivery/envision.md`, Victor 2026-10-07); no fresh greybox.
- [ ] **Step 2 Decomposition Gate — AWAITING APPROVAL.** slice-map.md + seam-contract.md written. 2 slices: **S1** live `useFlowSession` hook (apps/web/src/flow — data, no Visual Gate) · **S2** runtime page + `/sessions/:id` route (apps/web/src/session-runtime — surface, blocking Visual Gate re-asserts EC-1…EC-11). M1 constraint flagged: AR-7 transition/effects deferred → S1 degrades honestly.
- [ ] S1 · [ ] S2

## Dependencies
- blocked by `fe-codec-flow-session`
