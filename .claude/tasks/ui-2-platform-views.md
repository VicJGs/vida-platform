# Task: ui-2-platform-views
# Profile: Add Frontend Component
# Scenario: Default
# Spec: docs/specs/components/ui-2-platform-views/_index.md
# Created: 2026-08-01
# Updated: 2026-08-09
# Status: in-progress
# Linear: LIF-87
# Project: M1 — Whole Manual OS
# Milestone: M1.0 — Boot & Connective Base
# Phase: 1.0 — Structural Foundation
# Source: docs/roadmap.md → Phase 1.0 ④ UI

## Goal
Build the reusable platform views: calendar, gallery, list, neural-graph (Sigma.js), timeline,
pomodoro-widget, and export-dialog. These are the cross-module display surfaces (every module
reuses list/gallery/calendar) rather than one-off screens — built once in `@vida/ui`.

## Context
Profile: Add Frontend Component (per `m1.0-delivery-plan.md:200` — authoritative per-issue binding, not the
  `#`-table coarse "Design-Sys"). Scenario: Default.
Files involved: `packages/ui/src/components` (home). Intent sources: ADR-001 (Chart.js/Sigma.js), REPO.md.
Integration points: ← UI-1 (primitives, DONE ✅) — views compose the UI-1 primitives + DS-2..DS-5 tokens/
  sub-themes. → Blocks HARD-3 (neural-graph + backlinks). Next head in the `-c` UI wave
  (UI-1 → **UI-2** → UI-3 → UI-4); `-c` prereqs DS-5 ✅ + spine ✅ are met.

## Dependencies
- blocked by `ui-1-vida-ui-primitives` (DONE ✅ — LIF-86)

## Open Questions
- [ ] View inventory & grain — confirm the exact set (calendar/gallery/list/neural-graph/timeline/
      pomodoro-widget/export-dialog per delivery-plan:200 + REPO.md) and per-view grain at PLAN.
- [ ] Chart.js vs Sigma.js boundaries (ADR-001) — which views are canvas (Chart.js) vs WebGL (Sigma.js).
- [ ] Component Visual Gate applicability — UI-2 builds rendered components in `@vida/ui`; likely visual-gated
      (unlike the UX design models). Confirm via the frontend-visual-gate render table at Step 1.

## Decisions Made
| Decision | Choice | Reason | Date |
|----------|--------|--------|------|
| *(logged automatically by /session-log)* | | | |

## Progress
<!-- SESSION checklist — the scenario's ## Task List. -->
- [x] document-context BASELINE — current-* of contexts to touch (ground truth for the gates) — DONE 2026-08-09.
      Ground truth: `packages/ui/src/components` context; currency home = `packages/ui/src/CLAUDE.md` (current thru
      UI-1/Toast, no separate current-*). UI-1 = 10 primitives done/exported/219 tests. The 7 UI-2 view files are
      **0-byte empty stubs, NOT exported** (`CLAUDE.md:114` "pre-Tamagui, migrated by UI-2/UI-3") → from-scratch
      build. Data-layer deps landed: AR-8 = export serializers + backlink resolver + neural-graph data-prep in
      `core/services/{search,export}`; HARD-3 CONSUMES UI-2's graph. Open Qs resolved: (inventory) all 7 surfaces
      are UI-2 view components per delivery-plan:200 [[issue-title-lists-capabilities-not-builds]]; (charts)
      neural-graph=Sigma.js/WebGL, others DOM, likely no Chart.js; (Visual Gate) APPLIES — rendered @vida/ui comps.
      Grain = SET of 7 units V1..V7 (UI-1 U1..U10 precedent). Deferred seams: pomodoro-widget engine→MOD-sessions
      (#35); export-dialog composes @vida/core export cross-package.
- [ ] Forward spec written + Per-Step Build Gate cleared (§XXVI) before any implementation
- [ ] Codebase areas mapped (packages/ui + how UI-1 primitives/sub-themes compose)
- [ ] /integration-check — risks before any code
- [ ] /contract per new view component
- [ ] Component + engineering + (visual, if applicable) gates
- [ ] Currency Rule (§XXIX) — CURRENT- docs refreshed for every context touched

## Build Steps
<!-- UNIT-level — mirrors the active spec's §5 (V1..V7 sequence). -->
- [x] **V1 `list-view`** — DONE. §XXVI double-gate cleared + implemented + **Component Visual Gate PASS** (Victor,
      2026-08-10, both themes). typecheck 10/10 · @vida/ui 235/235 (16 new) · build + build-storybook ✓ · lint 0-err.
      Establishes the data-view spine (generic `items<T>` + `renderItem` + `getKey` + 4 rendered terminal states,
      state-dependent role, local `ViewState`, React-19 ref-prop, no sub-theme, density=gap).
- [x] **V2 `gallery-view`** — DONE. §XXVI double-gate + implemented + **Component Visual Gate PASS** (Victor,
      2026-08-10, both themes). V1's spine + responsive flex-wrap grid (`minWidth` floor, aspect-locked skeleton tiles,
      gap-via-density). typecheck 10/10 · @vida/ui 246/246 (11 new) · build + build-storybook ✓.
- [x] **V3 `timeline` + `internal/data-view` extraction** — DONE. §XXVI double-gate + implemented + **Visual Gate PASS**
      (Victor, 2026-08-10). Part A extracted `internal/data-view` (ViewState + Message + resolveDataViewState), rewired
      V1+V2 behavior-preserving (pre-V3 246 stayed green). Part B = continuous vertical rail (density-as-content-padding,
      fixed-offset dot, 4-branch trim [lone→no line], real temporal label). typecheck 10/10 · @vida/ui **263/263**
      (17 new) · build + build-storybook ✓ · lint 0-err.
- [x] **V4 `calendar-view`** (+date-fns) — DONE. §XXVI double-gate + implemented + **Visual Gate PASS** (Victor,
      2026-08-10). Month grid, `role="table"`, TZ-safe day-keying, always-42 grid, controlled month + opt-in nav,
      maxPerDay "+K more", 375 h-scroll; diverges from the spine (table not list, empty=grid). Added `date-fns ^4.4.0`
      (first dep) + extracted `warnMissingName`. typecheck 10/10 · @vida/ui **277/277** (14 new) · build + build-storybook
      ✓ · lint 0-err.
- [x] **V5 `pomodoro-widget`** — DONE. §XXVI double-gate + implemented + **Visual Gate PASS** (Victor, 2026-08-10). A
      self-timing drift-free countdown widget (ref-armed interval, one-way onComplete latch, single setStatus set-both,
      atomic phase-advance reset, role=timer + polite completion, status-driven controls) with a deferred
      session-engine seam via lifecycle-intent callbacks (ADR-004/ADR-008). typecheck 10/10 · @vida/ui **292/292**
      (15 new) · build + build-storybook ✓ · lint 0-err.
- [x] **V6 `export-dialog`** — DONE. §XXVI double-gate + implemented + **Visual Gate PASS** (Victor, 2026-08-10).
      Presentational export modal: composes UI-1 Dialog (footer+description props) + hand-rolled APG radiogroup + Button;
      emits `onExport(format)` (serialization is the app's — the V1 boundary); local ExportFormat; busy→radios
      tabIndex=-1; derive-selection self-heal. typecheck 10/10 · @vida/ui **306/306** (14 new) · build + build-storybook ✓.
- [~] **V7 `neural-graph`** (+sigma/graphology/forceatlas2) — the LAST view. BUILT + verified. §XXVI double-gate
      (gate-1 REVISE→fixed: B1 content-key + M1/M4 · Victor caught 2 manufactured sign-offs as drift → Rev 3 [a11y
      built in V7, raw-sigma per BR-5] · Approval 1 · preflight PASSED [sigma v3 API verified via context7] · gate-2
      REVISE→fixed: M-A stale-deps-in-impl-step · Approval 2). Sigma WebGL force-directed graph, content-keyed effect +
      kill() lifecycle (WebGL-guarded, jsdom-safe via mock), built-in accessible node-list (§XIV met), presentational
      nodes/edges. typecheck 10/10 · @vida/ui **317/317** (11 new) · build + build-storybook ✓ · lint 0-err.
      **⏳ Component Visual Gate stage 4 (Victor) PENDING.**

## Session History
| Date | What was done | Next step |
|------|--------------|-----------|
| 2026-08-09 | activated planned stub → in-progress (corrected head after UX-6 mis-pick) | load add-frontend-component profile → surface path → Step 0 baseline → PLAN |
| 2026-08-09 | Baseline + verification (table/board = allowed-vocab, not a gap — over-triage corrected). Umbrella spec + V1 list-view spec authored; §XXVI double-gate (gate-1 REVISE→fixed · preflight PASSED · gate-2 SHIP). V1 IMPLEMENTED + verified green. | V1 Component Visual Gate (Victor) → then V2 gallery-view |

## Notes
- Head correction 2026-08-09: UX-6 (#26) was briefly mis-activated off the raw `#`-order rule; reverted —
  the UX wave `-d` is gated behind the UI wave `-c` (`m1.0-delivery-plan.md:129,141` "UX-6 needs UI-4").
  UI-2 is the correct next head (next in `-c`; ← UI-1 ✅). Confirmed by `--next` + `#` order within `-c`.
