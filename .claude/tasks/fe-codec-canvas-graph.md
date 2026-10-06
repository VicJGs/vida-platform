# Task: fe-codec-canvas-graph
# Status: planned
# Linear: LIF-205
# Profile: Add Frontend Component
# Scenario: default
# Project: M1 — Whole Manual OS
# Milestone: M1.2.1 — Hub & Foundation · Frontend
# Source: frontend-replan G0–G6 (reconstructed-structure.md + g6-reshape-runbook.md §2) — supersedes the P6 fe-* grain
# Reshape: G6 net-new · unit #8 · EXTEND ui-2 neural-graph

## Goal
② Frontend — unit #8. CODEC · Canvas: Graph — Sigma in the editorial ink voice.

## Dependencies
- blocked by `fe-codec-theme`
- blocked by `fe-codec-patterns`

## ⚑ Redesign need — flagged from fe-codec-primitives-refinement audit (2026-10-05, LIF-230)
The `fe-codec-primitives-refinement` pass audited the 6 pre-CODEC views and found **Neural Graph is the one hard
conformance gap** — deferred here by Victor's call (this is its proper home). Concrete findings to resolve when #8 builds:
1. **2 hard-coded WebGL colors** (`neural-graph.tsx:47-48` — `DEFAULT_NODE_COLOR='#6366f1'`, `DEFAULT_EDGE_COLOR='#cbd5e1'`)
   are NOT preset/mode-aware (NG-7 put them outside Tamagui theming). The quality-bar WRONG lens = "a non-themeable
   hard-coded palette." The editorial ink voice must drive node/edge colors from theme tokens (per-preset, light/dark).
   NB: the frame already themes (`$colorSurfacePrimary` flips); only the Sigma canvas content is unthemed.
2. **No `empty?`/`error?` consumer slots** — unlike every other data-view, NeuralGraph hardcodes its `Message` copy, so a
   consumer can't compose the teaching-invitation `EmptyState` (P5). Add the slots to match the spine contract.
3. **Reduced-motion** — the forceAtlas2 layout animation always runs; decide the `prefers-reduced-motion` behaviour
   (settle-instant vs reduced iterations) per quality-bar §2.7.
This is BOTH the conformance fix AND the aesthetic "ink voice" — do them together here, not split.
