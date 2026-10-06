# Task: fe-codec-controls-refinement
# Status: planned
# Linear: (unfiled — DEFERRED; scoped `--sync` blocked by pre-existing ci-228/229 map drift, see note below)
# Profile: Change Frontend Component
# Scenario: default
# Project: M1 — Whole Manual OS
# Milestone: M1.2.1 — Hub & Foundation · Frontend
# Source: fe-codec-primitives-refinement audit (2026-10-05, LIF-230) — orphan-control split, Victor's call
# Reshape: G6 enhancement sibling — codec conformance + aesthetic-refinement pass for the pre-CODEC CONTROLS

## Goal
Sibling of `fe-codec-primitives-refinement` (which covers the 6 pre-CODEC VIEWS). This task homes the pre-CODEC
**controls/overlays** that have NO refinement home in the G6 extend map and were built Aug 2026 before the CODEC
theme/patterns existed: bring them to the established model + patterns (fe-codec-theme, fe-codec-patterns, conventions,
quality bar) — conformance + aesthetic refinement, same bar.

## Scope (the orphaned controls)
From the primitives-refinement audit's component-set check (g6-edge-ledger.md §2 has NO refinement home for these):
- **export-dialog** (ui-2 · V6) — not in the extend map at all.
- **pomodoro-widget** (ui-2 · V5) — its SEAM feeds #11/#16/#23, but those MINT new runtime/HUD; the widget itself is unhomed.
- **The 9 other UI-1 primitives** — Button · Input · Checkbox · Select · Menu · Tabs · Dialog · Popover · Toast.

> **Already token-conformant.** All were **accent-fixed** in fe-codec-theme (the 21-usage × 10-primitive migration to
> DIRECT semantic tokens), so this is NOT urgent conformance work — it's the aesthetic-refinement lift (shape, spacing
> rhythm, hierarchy, elevation, motion feel) on the current token system. LOW-to-moderate headroom (small contract-bound
> controls), unlike the composition-facing views.

## Rubric (same as the views pass)
Theme (DIRECT semantic tokens, no hard-coded palette, preset + density aware) · honest 8-state (state-as-prop) ·
reduced-motion · voice/microcopy · a11y §XIV (WCAG 2.2 AA) · aesthetic refinement — graded at the full-matrix Visual
Gate (preset × mode × density). **No palette-VALUE churn** — real brand colors land via Figma at M4/P2.

## Approach
Same as the views pass: `/design-audit` + `/component-consistency` on the set → grounded gap+refinement list → agree
scope → retrofit per control through `change-frontend-component` (per-component contract → implement → Visual Gate →
`/critique`) → worktree → PR → merge. Each control is a small gated slice.

## Sequencing
AFTER `fe-codec-primitives-refinement` (the views are the higher-value, composition-facing set + the shared spine).
Still ahead of the heavy surface builds where it matters, but not blocking them (controls are already conformant).

## Dependencies / coordination
- Blocked-by: none (refines shipped components). Soft-after: `fe-codec-primitives-refinement` (shared rubric/precedent).
- Does NOT cover Neural Graph (→ #8 `fe-codec-canvas-graph`, flagged) nor the 6 views (→ `fe-codec-primitives-refinement`).

## Open at pickup
1. Confirm the control set (all 11, or trim the already-tight ones — e.g. Toast/Dialog may need nothing).
2. Order (likely the most-composed first: Button → Input → Select/Menu → the overlays → export-dialog/pomodoro).

## ⚠ Linear filing deferred — tracker map drift (2026-10-05)
`tracker_sync --sync --task fe-codec-controls-refinement --allow-orphan-create --dry-run` would create THIS issue
**plus two duplicates**: `ci-prettier-reformat` + `ci-workers-build-config`. Those two carry `LIF-228`/`LIF-229` in
their task-file headers (filed last session, PR #84) but **`tracker.json`'s issue map has no entry for them** → `--sync`
re-creates them, and `--link` can't fix it (`LIF-228 not found in the issue map`). `--task` does NOT scope the create
set past orphans. To file THIS issue cleanly, first reconcile the map (confirm LIF-228/229 exist in Linear → re-pull /
re-add to the map), then `--sync --task fe-codec-controls-refinement --allow-orphan-create --confirm-initiative`.
Until then this sibling is homed as a task file only — safe, no duplicate risk.
