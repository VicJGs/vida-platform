# fe-codec-viewmodes — Slice Map (Decomposition Gate, Step 2) · Decide-mode

> **Unit grain is doc-fixed** (Tier-0 §1.1 view-mode renderers, G5 unit #3 — *"extend → add table · board"*)
> [FACT: decomposition.md:20-24; g6-edge-ledger.md:46; g6-reshape-runbook.md:33]; the **internal slicing is proposed**
> (Decide-mode). All slices are `@vida/ui`, plane = rendered. Both renderers are **READ-ONLY LENSES** (interpretation
> R5; ADR-007 §4.3 read-only-view vs ADR-008 interactive-capability). Grounds: interpretation.md §6 (R1–R6) ·
> packages/ui/src/{components,internal} · ADR-007 §3.3 · the BR-2 boundary.

## The pieces this unit adds (interpretation §0/R1), and their home (R2 = the BR-2 boundary)

| Piece | Kind | Home | Sibling precedent | Gate |
|---|---|---|---|---|
| `TableView<T>` | read-only renderer (state-as-prop) | `@vida/ui` | `calendar-view` (`role="table"` divergence) | Visual |
| `BoardView<T>` | read-only renderer (state-as-prop) | `@vida/ui` | `list-view` spine per column | Visual |

> Both presentational → `@vida/ui`, `state` as a prop, structurally typed (reuse `ViewState` from `internal/data-view`);
> the app derives via the 8-state machine + passes it (BR-2). Neither imports `@vida/core` [FACT: CLAUDE.md:125; list-view.tsx:34-35].

## Gate-resolved homings (read from the docs — not decisions; interpretation §5/§6)

- **H1 — Read-only renderers; NO write, NO interactive mixing.** A view is a read-only lens; drag-to-move/reorder (a
  write) is a **Capability** (ADR-008, INT-2), OVERFLOWING for this unit — homed to the capability tier / module ②
  consumer, **not deferred, not in-renderer** [FACT: quality-bar §4.3:120-123; ADR-008:15,71-72; interpretation O1/R5].
- **H2 — View-chrome controls out.** Sort toggle / layout switch / filter editing = the **Collection shell** (§1.2); the
  bare renderer only renders the current sort as an `aria-sort` display [FACT: decomposition.md:29; interpretation O2].
- **H3 — Envision Gate SKIP (doc-grounded).** As read-only lenses reusing shipped patterns (`calendar-view` grid /
  `list-view` per column), no affordance fails §3.75's "obvious from a shipped surface" test; the one that would have
  (drag) is a Capability (H1) [FACT: entity-delivery-flow.md §3.75; interpretation §8].

## Slices

### S1 — `TableView<T>` (the `table` view-mode) · `@vida/ui` · rendered · READ-ONLY
**Does:** a **read-only** `role="table"` renderer driven by a caller-declared **column set** over generic `items` +
`getKey`. Header row (`role="row"` of `role="columnheader"`, with an `aria-sort` DISPLAY indicator reflecting the view's
current sort — passed in, not toggled here), body rows (`role="row"` of `role="cell"`), each cell rendered by the
column's `render(item)`. **Follows the `calendar-view` divergence** (R3): reuse the spine PIECES (`ViewState`, `Message`,
`warnMissingName`, ref-prop, base tokens) but **NOT `resolveDataViewState`** (a grid's empty is designed, not a
`role="status"`). The 4 rendered terminal states (loading → skeleton rows matching the column box + `aria-busy`; error →
`role="status"` `Message`; empty → designed empty row / `EmptyState` slot; success → the grid). Horizontal overflow via a
`minWidth` table in an `overflowX:auto` wrapper (the calendar 375-usable precedent). **No write, no sort-toggle** — cell
interactivity (click-to-open) is the consumer's `render` (LV-5); the sort *control* is the Collection shell (H2). Tokens
via DIRECT semantic tokens + the token scale (DEF-U8-h).
**Touches:** `packages/ui/src/components/table-view.tsx` (+ `.test.tsx` + `.stories.tsx`); `index.ts` export;
`docs/specs/components/ui-2-platform-views/v8-table-view.md` + `_index.md`.
**Invariants:** `role="table"`; read-only (no write/sort-toggle); `state` is a PROP; React-19 ref-as-prop (no
`forwardRef`); no sub-theme; accessible name required (dev-warn); degrade-never-crash (empty-success self-heals).
**Done when (Visual Gate):** header + rows + all 4 states render; `aria-sort` display reflects the passed sort;
horizontal scroll at 375; light/dark × 375/768/1440; a11y sweep (table semantics, `aria-sort`, accessible name, keyboard
reach of any consumer-composed interactive cells); `tsc` 0; `@vida/ui` tests green; `/critique` SHIP.

### S2 — `BoardView<T>` (the `board` view-mode) · `@vida/ui` · rendered · READ-ONLY
**Does:** a **read-only** grouped-column (kanban) renderer over **already-grouped** data (grouping is provider-delegated
— ADR-007 §3.3; the renderer never groups/filters/sorts). Renders a `role="group"` (named) of **columns**, each a titled
list of cards (`renderCard(item, group)`) with a group header + per-group count + per-column empty. **Each column reuses
the list-shaped spine** (`resolveDataViewState` at the column level — a column IS a list; R4); the **board level** carries
loading (skeleton columns) / error (`role="status"` `Message`) / board-empty (no groups) states. **No write, no
drag-to-move** — card interactivity is the consumer's `renderCard` (LV-5); the interactive move is a Capability (H1/O1).
Tokens via DIRECT semantic tokens + the token scale (DEF-U8-h).
**Touches:** `packages/ui/src/components/board-view.tsx` (+ `.test.tsx` + `.stories.tsx`); `index.ts` export;
`docs/specs/components/ui-2-platform-views/v9-board-view.md` + `_index.md`.
**Invariants:** columns over pre-grouped data (no grouping logic); read-only (no write/drag); `state` as a PROP;
React-19 ref-as-prop; no sub-theme; accessible name required; degrade-never-crash.
**Done when (Visual Gate):** columns + cards + group headers/counts + per-column empty + all board-level states render;
light/dark × 375/768/1440; a11y sweep (column list semantics, accessible name, focus order of consumer-composed cards);
`tsc` 0; `@vida/ui` tests green; `/critique` SHIP.

## Dependency order
**S1 (table) → S2 (board).** Table is the simpler, calendar-precedented grid (establishes the `role="table"` divergence);
board is the larger slice (per-column spine reuse + board-level states). No shared-extraction slice — the two share no
layout code (rows/cells vs columns-of-lists) and the shared logic (`internal/data-view`) already exists. Factor per
rule-of-three only if a third divergent consumer later emerges (not now).

## Out of scope (interpretation O1–O5; doc-homed, NOT deferred)
- **Board drag-to-move / interactive reorder** → a **Capability** (ADR-008, INT-2) — the capability tier / module ②
  consumer (O1) [FACT: quality-bar §4.3:120-123; ADR-008:71-72].
- **View-chrome controls** (sort toggle · layout switch · filter editing) → the **Collection shell** (O2) [FACT: decomposition.md:29].
- **Filter / group / sort LOGIC** → the View Engine / provider (O3) [FACT: ADR-007 §3.3:65-69].
- **Module layout *variants*** (Tasks' 12 layouts) → the owning module's ② track (O4) [FACT: decomposition.md:22-23].
- **The Vision-board / Calendar-grid CANVAS** → `fe-codec-canvas-board` (#10, a later unit) — the immersive Canvas
  archetype, NOT the `board` view-mode (O5) [FACT: g6-reshape-runbook.md:40; g6-edge-ledger.md:52].

## Envision coverage (gate SKIPPED per H3 — no greybox)
No `structural` EC set (Envision skipped, doc-grounded — read-only lenses reusing shipped patterns). The per-slice
**Visual Gate** still verifies each rendered renderer (every state × light/dark × 375/768/1440 + a11y) against the ui-2
sibling specimens.
