# Task: fe-codec-theme
# Status: planned
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
- [x] **S3 — Provider + resolution + density + app rewire** — DONE (2026-10-03). `theme-resolution.ts` (pure resolver +
      types + defaults + density tables) + `provider.tsx` (widened to `selection`; `useLayoutEffect` on documentElement/body)
      + `index.ts` barrel + `App.tsx` rewire. Full §XXVI gate (g1 SHIP → Approval 1 → preflight+spike+Tamagui-docs → g2 SHIP
      → Approval 2) + independent code-review (3 folded) + **blocking Visual Gate** (Storybook codec harness + Playwright/Brave,
      all 12 cells). **2 §XXVIII deviations (Gate-driven):** density A→**A-prime** (injected attr-toggled stylesheet;
      font-size vars are literal-redeclared by `.font_<key>`) + theme-application flat→**scheme-on-html + preset-on-body**
      (Tamagui sub-theme CSS is nested). @vida/ui 342→ (theme-resolution +13) · apps/web 180 · tsc 0.
      **Visual Gate GREEN:** neutrals/surfaces/text · fonts per preset (getComputedStyle) · spacing+type density · runtime
      switch · reduced-motion · full-matrix AA contrast (muted 5.65–6.03 warm-dark).
      **⚠ ONE GAP shipped as RESEARCH (Victor 2026-10-03):** preset ACCENT doesn't reach component sub-themes (buttons =
      editorial accent all presets); Tamagui bakes theme values → emitter-inherit unviable; semantic accent var DOES inherit
      to component scope. Homed → `.claude/tasks/research-preset-accent-on-components.md`. Then **PR for ①.**

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
