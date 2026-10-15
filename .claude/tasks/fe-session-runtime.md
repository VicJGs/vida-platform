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
- [x] **Step 2 Decomposition Gate — doc-fixed (ratified).** slice-map.md + seam-contract.md. Delivery scope per `decomposition.md:70` (title+summary · stage · deliverable=`deliverable_note` page · attach=`note_attachments` · mark-done/proof · effect-rail log). Corrected: sessions seam is LIVE in `@vida/core`; the deferral is the repo-wide apps/web data leg (no composition root + worker `values` seam) → `?sample` seed + zero-signature live-swap.
- [x] **S1** (`1e9f2e2`) — `toFlowSource` assembler + `useFlowSession` hook (apps/web/src/flow). Gates: tsc 0 · eslint 0 · flow tests 22/22 · full apps/web 527/528 (1 flake, unrelated, passes in isolation). No Visual Gate (data leg).
- [x] **S2** — runtime page + `/sessions/$id` route (apps/web/src/session-runtime). Split: router-free `session-runtime-surface.tsx` (gated standalone) + thin routed `session-runtime-page.tsx`. Gates: tsc 0 · eslint 0 · surface tests 3/3. **Visual Gate PASS** (Victor-reviewed live: standalone entry, 3 presets × light/dark × 375/768/1440 — AA 4.94–6.03 · no 375 overflow · axe clean; EC-2/4/5/7/8/9/11 live, EC-1/3 shell-inherited, EC-10 live-deferred). Currency §XXIX: `docs/features/sessions-and-scheduling/current-{spec,business-rules}.md` refreshed with the ② frontend surface.

## ✅ UNIT COMPLETE (fe-session-runtime #23 · S1+S2, 2026-10-15)
Both slices shipped on branch `fe-session-runtime`. **Follow-up (Victor, structural/whole-OS):** the shell content region
(`app-shell.tsx` ContentMain) has no vertical padding — content touches the top strip OS-wide. Homed to a separate
`fe-shell` fix-unit (content vertical inset 24/32/40 + close the shell-layout.md spec gap). NOT a #23 change.

## Dependencies
- blocked by `fe-codec-flow-session`
