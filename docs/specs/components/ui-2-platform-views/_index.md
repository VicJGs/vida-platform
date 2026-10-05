# Spec: component:ui-2-platform-views
<!-- type ∈ component | feature | bug | hotfix | refactor | script | workflow -->
Status: draft            <!-- draft → approved → implemented -->
Source-repo: /Users/victor/Documents/CODE/vida-platform
No-Guessing: every claim below is labeled [FACT: source] / [INTERP: from fact] / [UNKNOWN: needs X].
Sessions: 2026-08-09-ui-2-platform-views (created; §1–§5 authored at PLAN).

<!--
  FORWARD spec (umbrella) — written BEFORE the build. §1–§4 DESCRIBE the shared model; §5 is the ordered SEQUENCE.
  Each view is built as its own UNIT (V1…V7) with its own sub-spec (v<n>-<view>.md) + /contract + §XXVI gate +
  component Visual Gate, mirroring UI-1's U1…U10. This umbrella fixes the SHARED pattern + the sequence; the
  per-view contracts are authored at each unit's turn.
-->

## 1. Identity
UI-2 (LIF-87) — **Platform views.** The reusable cross-module display surfaces in `@vida/ui`, built ONCE and reused
by every module `[FACT: m1.0-delivery-plan.md:200; capability-framework.md:112 V1; REPO.md:17]`. Seven components:

**5 layout renderers** (the `VIEW_LAYOUT` renderers a saved `views` row selects — ADR-007 §3.3):
`list-view · gallery-view · calendar-view · neural-graph · timeline` `[FACT: capability-framework.md:112 V1]`
**2 non-layout surfaces** (reusable, cross-module, but not `VIEW_LAYOUT` values):
`pomodoro-widget · export-dialog` `[FACT: delivery-plan:200]`

- **The desire:** cross-module view surfaces built once, not re-implemented per module (kills v1's per-module Hub
  sprawl — ADR-007 §2). They compose the UI-1 primitives + DS-2..DS-5 tokens/sub-themes.
- **What it is NOT:**
  - NOT the saved-`views` DATA layer — that's AR-6 (`core/foundation/views`, DONE). These are the **renderers** a
    `views` row *picks* (ADR-007 §3.1). `[FACT: capability-framework.md:112 V1]`
  - ~~NOT `table`/`board` renderers.~~ **SUPERSEDED 2026-10-04 by the G6 frontend-replan** (`g6-edge-ledger.md:46`:
    *"extend ui-2 → add table · board"*). The 2026-08-09 "table/board = graceful-degradation, by design not built"
    stance is **reversed**: `fe-codec-viewmodes` (LIF-214) BUILDS the 2 missing canonical renderers — **`table` (V8,
    DONE S1)** · **`board` (V9, S2)** — completing the `VIEW_LAYOUT` 7 `[FACT: packages/types/src/view.ts:17-25;
    capability-framework.md:114 V3; g6-edge-ledger.md:46; g6-reshape-runbook.md:33]`. Graceful-degradation
    (a layout an entity can't satisfy → "unavailable/degraded, never a crash", ADR-007:62-64) remains the View
    Engine's concern, orthogonal to the renderers now existing. Delivery: `docs/specs/foundation/fe-codec-viewmodes/`.
  - NOT the view DATA services — search/backlink/export/graph-prep are AR-8 (`core/services/{search,export}`, DONE);
    the pomodoro session ENGINE is MOD-sessions (#35, later). These views COMPOSE that logic.
  - NOT module-specific screens (those consume these views); NOT the UI-1 primitives (those are the atoms).

## 2. Business Rules (shared across all data-driven views)
The 5 layout renderers are **data-driven** — the first such components in `@vida/ui` (UI-1 primitives are stateless
shells). This section fixes the ONE shared pattern; per-view rules live in each sub-spec.

- **BR-1 · Generic data prop.** A layout renderer is generic over its row type: `items: readonly T[]` + a
  `renderItem`/slot mechanism (per view). No view hard-codes an entity shape (ADR-007 §3.3 — a view is filter ×
  layout over heterogeneous types). `[INTERP: ADR-007 §3.3.4 cross-type resolution]`
- **BR-2 · Terminal states are RENDERED, not DERIVED (the package→app boundary).** Every data-view renders the four
  states — **loading · empty · error · success** — and receives the resolved state as a prop
  (`state?: ViewState`, `error?` payload). The consuming APP derives it via UX-4's `deriveTerminalState`
  (`apps/web/src/state-conventions`); `@vida/ui` is a **package** and cannot import an app, so it stays presentational.
  Per ADR-007, **`empty` + provider-`error` are the "first-class rendered states, specified at the contract level"**
  (loading/success are states but not so labeled). `state` is typed by a **local `ViewState` union** in `@vida/ui`
  (structurally assignable from `@vida/core`'s `TerminalState` — NO cross-package edge, since `@vida/ui` deps are
  Tamagui-only; see V1 LV-3a). `[FACT: ADR-007:91-92; UX-4 terminal-state.ts:50; packages/ui/package.json:44-46]`
  - **empty** = filter matched nothing (a declared, designed state — the static-skeleton/empty recipe from UX-4
    §3.1, NOT a shared Skeleton component which was superseded, DEF-U5-a).
  - **error** = a provider failed (ADR-007 §3.3.4); rendered, never a crash.
- **BR-3 · Degraded layout is declared, never a crash.** A view whose entity lacks a layout's required field renders
  a declared "unavailable/degraded" state (calendar → needs a date field; gallery → a cover/image field). `[FACT:
  ADR-007:62-64; capability-framework.md:114 V3]`
- **BR-4 · Compose UI-1 + tokens; no raw values.** Rows/cards/headers compose UI-1 primitives (Card, Button, Menu…)
  + DS tokens/sub-themes. Dimension props use the token scale (`$md`/`$lg`/`$12`), color props use theme keys —
  the DEF-U8-h + DEF-U4-e lessons carry. `[FACT: packages/ui/src/CLAUDE.md Rules]`
- **BR-5 · Third-party render surfaces are mounted, not reimplemented.** `neural-graph` = Sigma.js/WebGL;
  any chart = Chart.js/canvas (ADR-001:124-125). These mount inside a Tamagui frame via a ref + effect lifecycle
  (the Tabs `ResizeObserver` boundary, scaled). New deps (`sigma`+`graphology`; `date-fns` for calendar) are added
  at the unit that needs them, flagged at its gate. `[FACT: ADR-001:124-125,250-251; packages/ui/package.json has
  none of these]`
- **BR-6 · A11y + motion inherit the UI-1 contract.** WAI-ARIA per view, jsdom-guarded browser APIs, B12 motion
  (transform/opacity only), reduced-motion `@media`, focus-visible rings. `[FACT: packages/ui/src/CLAUDE.md]`

## 3. Contract (per view — DELEGATED to /contract at each unit)
Each view's `/contract` is authored fresh at its unit (no DS-5 contract exists for the views — DS-5 covered the 10
primitives only). Every contract specifies: props (incl. `items<T>` + `state`/`error` for data-views) · the 8-state
matrix (§VIII) incl. the 4 terminal states · a11y (roles/keyboard/focus) · B12 motion · the sub-theme
(`light_/dark_<View>`, registered in `tamagui.config.ts`). `[FACT: scenario default.md Step 2]`

## 4. Acceptance (umbrella — each unit adds its own)
- [ ] All 7 components implemented in `packages/ui/src/components`, exported from `index.ts`, each with
      `*.test.tsx` (jsdom) + `*.stories.tsx` (Visual-Gate surface) + `internal/<view>-styles.ts` where motion needs it.
- [ ] The 5 data-views implement BR-1..BR-4 (generic `items<T>`, 4 rendered terminal states, degraded-not-crash).
- [ ] Dark-mode verified per view. Sub-theme registration is **CONDITIONAL** — only a view with bespoke color keys
      registers a `light_/dark_<View>` sub-theme (extending DS-5's `component.json`); a view that needs only base
      semantic tokens registers none (e.g. list-view, LV-3). Likely only `neural-graph` needs one.
- [ ] Each unit passes its §XXVI double-gate + the 4-stage component Visual Gate (Storybook, all states, both themes).
- [ ] New deps (`sigma`/`graphology`, `date-fns`) added only at their unit, family-pinned, justified at the gate.
- [ ] `pnpm --filter @vida/ui typecheck && build && test` green; root typecheck 10/10; §XXIX currency (CLAUDE.md refreshed).

## 5. Implementation Prompt — the V1…V7 sequence (ordered simplest → hardest)
Each Vn is its own UNIT: sub-spec `v<n>-<view>.md` → /contract → §XXVI gate-1 → preflight → gate-2 → implement →
component Visual Gate → next. V1 establishes the shared data-view spine (BR-1..BR-4) the rest reuse.

| Unit | View | Notes / new surface |
|------|------|---------------------|
| **V1** | `list-view` | **Establishes the generic `<T>` + item-slot + 4-terminal-state spine.** Pure DOM/Tamagui. |
| **V2** | `gallery-view` | Reuses V1's spine; responsive flex-wrap grid. (Cover/image-field degradation is the VIEW ENGINE's, ADR-007:62-64 — NOT this renderer, which lays out whatever `renderItem` returns.) |
| **V3** | `timeline` | Sequential/temporal DOM layout; reuses the spine. |
| **V4** | `calendar-view` | Date grid — **+`date-fns`**; needs a date field (BR-3). |
| **V5** | `pomodoro-widget` | Presentational shell + **deferred session-engine seam** (MOD-sessions #35); not a data-view. |
| **V6** | `export-dialog` | Composes UI-1 `Dialog` + **`@vida/core` export serializers** (AR-8, cross-package); not a data-view. |
| **V7** | `neural-graph` | **Sigma.js/WebGL** — **+`sigma`+`graphology`**; canvas lifecycle (BR-5); consumed by HARD-3. |

## 6. Open UNKNOWNs / Decisions Needed
- [RESOLVED 2026-08-09] view inventory (7, not table/board — capability-framework V1/V3) · Visual-Gate applies
  (frontend-visual-gate.md:20 "platform views") · grain (7 units, UI-1 precedent).
- [UNKNOWN: needs V1 /contract] the exact generic `items<T>` + `renderItem` vs children-slot shape — settled at V1,
  then reused. `[INTERP: BR-1]`
- [UNKNOWN: needs V7 turn] `@sigma/react` vs raw `sigma`+`graphology` binding — decided at V7 against ADR-001:251.

## 7. Change Log
| Date | Session | Change |
|------|---------|--------|
| 2026-08-09 | ui-2-platform-views | initial stub (task activation) |
| 2026-08-09 | ui-2-platform-views | §1–§5 authored at PLAN: shared data-view pattern (BR-1..BR-6) + V1…V7 sequence; inventory/table-board/visual-gate UNKNOWNs resolved against capability-framework + ADR-007 |
| 2026-10-04 | fe-codec-viewmodes | **G6 supersession:** the "NOT table/board" §1 stance reversed — `table` (V8) built + Visual-Gate PASS; `board` (V9) = S2. 6 of 7 canonical VIEW_LAYOUT renderers now ship. Spec `v8-table-view.md`; delivery `docs/specs/foundation/fe-codec-viewmodes/`. |
| 2026-10-04 | fe-codec-viewmodes | **V9 `board-view` built (S2).** The last canonical renderer — `role="group"` of per-column `role="list"` kanban columns over PRE-GROUPED data (read-only; drag-to-move is a Capability, O1). Hybrid spine reuse: `resolveDataViewState` per column, board-level loading/error/board-empty direct. **All 7 `VIEW_LAYOUT` renderers now ship.** Spec `v9-board-view.md`. |
