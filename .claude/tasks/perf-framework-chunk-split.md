# Task: perf-framework-chunk-split
# Profile: Feature Enhancement
# Scenario: Default
# Created: 2026-08-17
# Status: planned
# Project: M1 — Whole Manual OS
# Milestone: (hygiene follow-up — un-homed until a perf pass)
# Linear: LIF-158

## Goal
Split React + Tamagui + TanStack Router into a dedicated **framework chunk** (Vite `build.rollupOptions.output.
manualChunks`) so the `apps/web` INITIAL chunk meets performance-strategy.md §6's budgets (Initial < 80 KB /
Framework < 120 KB, gzipped). Surfaced by UI-4 / S5: after the BR-7 sigma lazy-split, the initial chunk measured
~154 KB gzipped (React + Tamagui + router, unsplit) — over the < 80 KB "Initial" target.

## Why this is NOT part of UI-4 / S5
BR-7 is scoped to "sigma never enters the initial bundle" — DONE + measured (42 KB lazy `graph-*` chunk). The
framework-split is a distinct, general perf-hardening concern (touches `apps/web/vite.config.ts`, affects every
route's initial load), not sigma-specific. Folding it into S5 would violate the per-unit discipline. Homed here as
a sibling to `tsconfig-strict-index-access` (another repo-wide hygiene follow-up filed from a UI-* build).

## Scope (at pickup)
- `apps/web/vite.config.ts` — add `build.rollupOptions.output.manualChunks` grouping `react`/`react-dom`,
  `@tamagui/*`, `@tanstack/*` into a `framework` chunk; MEASURE gzipped initial vs §6 budgets before/after.
- Confirm no regression to the S5 `/graph` lazy split (sigma must stay in its own lazy chunk, not fold into framework).
- Runs under its own §XXVI gate; the acceptance is a MEASURED gzipped build against §6.

## Notes
- Reference measurement (2026-08-17, S5 branch): initial chunk 154 KB gz (post-sigma-split), graph chunk 42 KB gz.
- Ground truth: `docs/core/architecture/performance-strategy.md` §6.
