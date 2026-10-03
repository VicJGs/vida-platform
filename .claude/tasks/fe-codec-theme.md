# Task: fe-codec-theme
# Status: in-progress — ① slices S1✅ S2✅ · S3 next (Visual Gate) · 2026-10-03
# Linear: LIF-213
# Profile: Add Frontend Component
# Scenario: default
# Project: M1 — Whole Manual OS
# Milestone: M1.2.1 — Hub & Foundation · Frontend
# Source: frontend-replan G0–G6 (reconstructed-structure.md + g6-reshape-runbook.md §2) — supersedes the P6 fe-* grain
# Reshape: G6 net-new · unit #1 · EXTEND ds-2/ds-4

## Goal
② Frontend — unit #1. CODEC · ThemeProvider — N theme presets (Reader·Editorial·Quiet Desk) × density, swappable token families incl. font-family.

## Dependencies
- (codec-only; backend twin done)

## Slice Progress (Entity Delivery Flow ② · branch `fe-codec-theme`)
- [x] Front matter — interpretation · slice-map · seam-contract (`de53d0c`)
- [x] **S1 — Token families + emitter** (`b5946d7`) — 6 scheme-first base themes + 60 sub-themes; per-preset ramps
      (P1-anchored) + per-preset fonts; `build-tokens.mjs` PRESETS loop + `applyOverlay`. B-codec-1. @vida/ui 329 green.
- [x] **S2 — Config + self-hosted fonts** (`feb3ab2`) — `createTamagui({themes:{...}})` (all 66) + 2 var-driven
      `createFont` keys (CSS-var seam, no per-theme font hook in TG 2.6.2); 4 faces woff2 + `@font-face`, Spectral
      preloaded (21.7 KB < 80 KB). B-codec-2. chrome faces deferred w/ chrome role.
- [ ] **S3 — Provider + resolution + density + app rewire** — NEXT. `resolveTheme({preset,mode,density})` → scheme-first
      theme name + sets `--vida-font-*` (S2 seam) + density CSS vars; rewire `App.tsx`; **carries the blocking Visual
      Gate** (presets × light/dark × calm/dense, reduced-motion, a11y). Then **PR for ①**.

## Decided seams (preflight-resolved — do not relitigate in S3)
- **Scheme-first naming is law** (TG 2.6.2 `validSchemes={light,dark}`, scheme=first `_`-segment): editorial=bare
  `light`/`dark`; reader/quietDesk=`${mode}_${preset}`. `resolveTheme` = `preset==='editorial' ? mode : \`${mode}_${preset}\``.
- **Density + font swap are the SAME CSS mechanism** (NOT Tamagui theme/token — DEF-U8-h): the provider sets CSS vars
  (`--vida-font-body/display` + the density `space.inset`/type scale) on the theme root via a data-attr layer. S3 owns this.
- Font var values per preset come from `fonts.ts` (editorial already the var fallback); reader/quietDesk faces swap-in.

## Watch next session
- Sibling `mod-learning-education` runs in its own worktree (`.claude/worktrees/mod-learning-education`); this branch
  owns the MAIN dir. Don't cross them. [[parallel-session-shared-tree-collision-use-worktree]]
- S3 density mechanism in Tamagui v2 was the S1/S2 open seam → resolved to a provider CSS data-attr scale; confirm the
  exact `space.inset`/type-ramp application against the installed `@tamagui/core` at S3 preflight.
