# Task: fe-codec-controls-refinement
# Status: in-progress
# Linear: LIF-231
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

## Scope RESOLVED (Session 1 — 2026-10-06, Step-1 audit + Victor's 2 calls)
Step-1 grounded audit (all 11 controls read vs the model + quality bar + conformance greps):
- **No hard conformance gap.** All 11 are token-clean (0 hard-coded hex/rgb — accent-fixed in fe-codec-theme).
  reduced-motion is fully covered (10 `internal/*-styles.ts` carry `@media prefers-reduced-motion`; pomodoro
  doesn't CSS-animate — its fill steps per tick, no rm gap). state-as-prop honored (invalid/disabled/busy). So —
  like the views sibling — **this is a PURE AESTHETIC pass, not conformance firefighting.**
- **Tabular figures used NOWHERE in the DS** (grep-confirmed) → the highest-value cross-cutting refinement: the
  pomodoro countdown jitters every 250ms tick with proportional digits; any numeric meta inherits the same.
- **Overlay titles use `$body` weight-600, not `$display`** → serif-display-title headroom (Dialog/Popover/export-dialog).
- **Headroom is concentrated, not uniform.** Rank: pomodoro-widget (high) > export-dialog · Dialog/Popover/Menu
  (moderate) > Select/Tabs/Button/Input/Checkbox/Toast (low — already tight atoms).

**Victor's 2 calls (2026-10-06):**
1. **Scope = prioritized tiers** (not all-11 uniform). Tier A = build with real headroom; Tier B atoms = one quick
   audit each, refine-or-skip if already at the bar.
2. **Depth = Layer-1 + selective Layer-2.** Layer-1 polish (serif titles · eyebrows · tabular figures · hairlines ·
   elevation) everywhere it helps; a targeted Layer-2 capability add is allowed where clearly worth it (e.g. a
   pomodoro progress-RING) — each Layer-2 hook is a CONTRACT change → its own `/contract` + §XXVI gate + Visual Gate.

## Build Steps — PHASED (most-headroom / cross-cutting first; each = its own §XXVI gate + Visual Gate + PR)
Every phase runs the `change-frontend-component` spine (Step 0 document-context BASELINE → forward spec
`/documentation-component` [+ `/contract` for any Layer-2 API change] → `/critique` → Approval 1 → `/preflight` →
`/critique` → Approval 2 → implement types-first → Visual Gate [Brave, preset × mode] → `/critique` SHIP + code-review
→ §XXIX currency → PR → merge).

| Phase | Target | Tier | Layer-1 polish | Layer-2 (contract change) |
|---|---|---|---|---|
| **P0** | **tabular-figures convention** | cross-cutting | a `font-variant-numeric:tabular-nums` utility/convention so numeric UI stops jittering; consumed by P1 + any numeric meta | — (convention only) |
| **P1** ✅ | **pomodoro-widget** | A (high) | ✅ tabular countdown · eyebrow phase · 6px hairline track · resting elevation | ✅ `progress?: 'bar'\|'ring'` (useTheme-resolved SVG ring) |
| **P2** ✅ | **export-dialog** | A (mod) | ✅ hover state (§VIII gap) · neutral selected border · 4pt rhythm (title/desc = P3; no tabular — .ext not numeric) | ✅ selected accent BAR (Toast model, no shift) |
| **P3** ✅ | **Dialog · Popover · Menu** (overlay chrome) | A (mod) | ✅ Level-3 elevation (`shadow.overlay`); serif titles + menu hover = RATIFY (already shipped) | — |
| **P4** | **atoms** — Button · Input · Checkbox · Select · Tabs · Toast | B (low) | per-atom quick audit → one concrete refinement OR skip if at the bar (Toast/Checkbox likely skip) | — |

## Phase log
- **P1 · pomodoro-widget — ✅ COMPLETE (2026-10-06).** Full §XXVI gate (spec → gate-1 REVISE→fold → Approval 1 →
  preflight PASSED [2 doc-grounding finds: tabular = v5 §4:144 spec'd-but-unbuilt; ring = v5 §6 deferred] → gate-2
  REVISE→fold [ring colors via `useTheme().get('web')`, not `$token`/hex — the NG anti-regression] → Approval 2).
  Delivered `progress?: 'bar' | 'ring'` (default 'bar', non-breaking; local `ProgressRing` two-circle `<svg>`,
  aria-hidden, stepped offset) + L1 polish (tabular `Time`, eyebrow `PhaseLabel`, 6px track, `shadow.resting` elevation);
  internal fraction renamed `fraction`; timer/latch/controls UNTOUCHED. tsc 0 · @vida/ui **411 tests** · eslint 0 ·
  **Visual Gate PASS** (Brave, 3 presets × light/dark: tabular + eyebrow all cells · ring accent flips per preset+mode
  [editorial blue / reader oxblood / quietDesk olive] · AA 4.94–6.03 incl. warm-dark · axe 0 · 375 no-overflow). Spec
  `phases/P1-pomodoro-widget.md`; currency `packages/ui/src/CLAUDE.md` + `v5-pomodoro-widget.md`. Next: P2 export-dialog.
- **P2 · export-dialog — ✅ COMPLETE (2026-10-06).** Full §XXVI gate (gate-1 REVISE→fold → Approval 1 → preflight
  PASSED [R2→Toast absolute-bar not `borderLeft`, avoids a 2px shift on a bordered box] → gate-2 REVISE→fold [selected =
  NEUTRAL border + bar as sole accent, not a doubled brand edge] → Approval 2). Grounding reshaped the speculative plan:
  **title/description are Dialog's → P3** (not touched); **`.ext` isn't numeric → no tabular**. Delivered: **hover state**
  (`$colorSurfaceSecondary`, disabled cancels — select.tsx:82) closing a §VIII gap + **selected accent BAR** (`aria-hidden`
  absolute 3px `.vida-export-accent`, Toast precedent, `position:relative`+`overflow:hidden`). Logic (ED-2…ED-5)
  UNTOUCHED. tsc 0 · @vida/ui **412 tests** (+1) · eslint 0 · **Visual Gate PASS** (Brave, 3 presets × light/dark: hover
  bg change · bar flips per preset · 1 bar/selected · AA 4.94–6.53 · axe 0 · 375 fit). Spec `phases/P2-export-dialog.md`;
  currency `CLAUDE.md` + `v6-export-dialog.md`. Next: P3 overlay chrome.
- **P3 · overlay chrome (Dialog · Popover · Menu) — ✅ COMPLETE (2026-10-06).** Audit found most bullets already shipped
  (**RATIFY**: Dialog title `$display` serif; Menu item hover+active+disabled — the P2 pattern). The one real design §V
  gap: **no overlay panel had elevation**; `shadow.overlay` (the token named for it) was unused. Applied a **static
  `box-shadow:shadow.overlay`** to each panel's base rule in `internal/{dialog,popover,menu}-styles.ts` (Card precedent;
  transition stays explicit opacity,transform so no B12 shadow-animation). Dark self-cancels (hue = dark surface, §XI).
  Full §XXVI gate (gate-1 REVISE→fold [dark = self-cancel by construction] → Approval 1 → preflight PASSED → gate-2 SHIP →
  Approval 2). tsc 0 · @vida/ui **412 tests** · eslint 0 · **Visual Gate PASS** (3 overlays × 3 presets × light/dark:
  shadow present all 18 · light lift · dark self-cancel screenshot-confirmed · axe 0 bar 1 pre-existing). Spec
  `phases/P3-overlay-chrome.md`; currency `CLAUDE.md`. **⚠ Pre-existing follow-up filed below.** Next: P4 atoms.


## Follow-ups (pre-existing, surfaced during this task — NOT regressions)
- **danger-signal contrast (M4/Figma):** the danger label `#ef4444` on surface = **3.63** contrast (< 4.5 AA) — surfaced
  by the P3 Menu Visual Gate (axe). It's the **provisional ds-2 signal palette** (indigo/slate/emerald placeholder); real
  brand/signal VALUES land via the Figma source-of-truth, release-gated M4/P2 (`frontend-source-of-truth.md`). Fixing it =
  palette-VALUE churn, explicitly out of scope for this whole refinement task. Affects every danger-red-on-surface usage
  (menu danger item, etc.), not just Menu. Home: the M4 Figma palette pass. Unfiled in Linear (like `ci-prettier-reformat`).

## Open at pickup (RESOLVED above — kept for audit trail)
1. ~~Confirm the control set~~ → prioritized tiers (Victor call 1).
2. ~~Order~~ → P0 tabular-figures → P1 pomodoro → P2 export-dialog → P3 overlays → P4 atoms (cross-cutting + highest-headroom first).

## ✅ Linear filing RESOLVED (2026-10-06) — issue filed as LIF-231 (header updated). History below kept for audit.

## ⚠ Linear filing deferred — tracker map drift (2026-10-05) [HISTORICAL — resolved above]
`tracker_sync --sync --task fe-codec-controls-refinement --allow-orphan-create --dry-run` would create THIS issue
**plus two duplicates**: `ci-prettier-reformat` + `ci-workers-build-config`. Those two carry `LIF-228`/`LIF-229` in
their task-file headers (filed last session, PR #84) but **`tracker.json`'s issue map has no entry for them** → `--sync`
re-creates them, and `--link` can't fix it (`LIF-228 not found in the issue map`). `--task` does NOT scope the create
set past orphans. To file THIS issue cleanly, first reconcile the map (confirm LIF-228/229 exist in Linear → re-pull /
re-add to the map), then `--sync --task fe-codec-controls-refinement --allow-orphan-create --confirm-initiative`.
Until then this sibling is homed as a task file only — safe, no duplicate risk.
