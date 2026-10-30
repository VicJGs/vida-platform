# Spec: component:ui-2-platform-views · V8 — table-view

<!-- type: component (unit sub-spec of ui-2-platform-views) -->

Status: draft → PLAN (fe-codec-viewmodes S1, 2026-10-04)
Source-repo: /Users/victor/Documents/CODE/vida-platform
No-Guessing: [FACT: source] / [INTERP: from fact] / [UNKNOWN: needs X].
Parent: docs/specs/components/ui-2-platform-views/\_index.md (shared BR-1..BR-6).
Delivery: docs/specs/foundation/fe-codec-viewmodes/delivery/ (interpretation · slice-map · seam-contract).

## 0. Supersession note (currency)

This unit **reverses** the umbrella `_index.md:29-33` 2026-08-09 stance ("table/board = graceful-degradation, by design
not built"). The **G6 frontend-replan (2026-10-01)** created `fe-codec-viewmodes` to **build** them — _"extend ui-2 →
add table · board"_ `[FACT: g6-edge-ledger.md:46; g6-reshape-runbook.md:33; decomposition.md:20-24]`. The
capability-framework always listed all 7 as canonical view anatomy `[FACT: capability-framework.md:114 V3]`. The
umbrella `_index.md` is refreshed to match at this unit's §XXIX currency (Step 11).

## 1. Identity

V8 `table-view` — the renderer for the **`table`** VIEW_LAYOUT `[FACT: packages/types/src/view.ts:19; ADR-007 §3.3:60]`.
A **columnar grid**: caller-declared columns × rows, the tabular lens a saved `views` row selects (Books All-Books
table, Tasks table layout, any dense record list) `[FACT: decomposition.md:21; surface-map.md:62 "Books … table"]`.
Currently absent (`@vida/ui` ships 5 of 7).

- **The desire:** one tabular renderer every module + `views` row reuses — no per-module table re-implementation.
- **The sibling (build against it):** `calendar-view` (V4) — the existing **`role="table"`** 2D-grid renderer. Table-view
  reuses its exact divergence shape: reuse the spine PIECES (`ViewState`, `Message`, `warnMissingName`, React-19 ref-prop,
  base tokens, no sub-theme) but **NOT `resolveDataViewState`** (a grid's empty is a _designed_ state, not a status
  message) `[FACT: calendar-view.tsx:4,9-11; CLAUDE.md:157-161]`.
- **READ-ONLY LENS (the governing boundary).** A view is a read-only lens; interaction-that-writes is a Capability
  `[FACT: frontend-quality-bar/_index.md:120-123 §4.3; ADR-007:94; ADR-008:71-72]`. So table-view renders; it does not
  filter, sort, or write.
- **What it is NOT:** NOT sorting/filtering LOGIC (the View Engine, ADR-007 §3.3); NOT the **sort-toggle control** (the
  Collection shell — table-view only _reflects_ the current sort via `aria-sort`); NOT row interactivity (the consumer's
  `column.render` composes a clickable Card — LV-5); NOT a data-grid with inline-edit / drag-resize (that's a Capability).

## 2. Business Rules

- **TV-1 · Read-only lens.** `table-view` renders resolved + sorted + (optionally pre-grouped-elsewhere) rows. It does
  **not** sort, filter, group, or write. The sort _toggle_ is the Collection shell's; a clickable cell is the consumer's
  `column.render`. `[FACT: ADR-007 §3.3; quality-bar §4.3:120-123; list-view.tsx:10-18 LV-5]`
- **TV-2 · Generic columns × rows (BR-1).** Generic over the row type: `items: readonly T[]` + `getKey(item,i)` +
  `columns: readonly Column<T>[]`, where `Column<T> = { key; header: ReactNode; render(item,i): ReactNode; width?:
number|string; align?: 'start'|'center'|'end'; sort?: 'asc'|'desc'|null }`. Each `render` returns one cell's CONTENT
  (table-view owns the `role="cell"` wrapper). No entity shape is hard-coded. `[INTERP: BR-1; ADR-007 §3.3.4]`
- **TV-3 · `role="table"` divergence (the calendar precedent).** Root `role="table"`; a header `role="row"` of
  `role="columnheader"`; body `role="row"`s of `role="cell"`. Reuses the spine PIECES but **NOT `resolveDataViewState`**
  (empty is designed, not a status role). `[FACT: calendar-view.tsx:9-11,133,152-154,170]`
- **TV-4 · Terminal states (BR-2; `state?: ViewState`, default `'success'`).**
  - `loading` → **skeleton rows** (N `SkeletonRow` bars matching the settled row box, no shimmer — the UX-4 §3.1 /
    calendar recipe) + `aria-busy`; the header row still renders. `loadingCount?: number` (default 5).
  - `error` → the shared `Message` in a **`role="status"`** region (not the grid). `error?: ReactNode` slot.
  - `empty` (incl. **success-with-no-rows** self-heal) → a **designed empty row** spanning the table (NOT a status
    message — the calendar "designed empty" divergence); richer `empty?: ReactNode` slot (compose `EmptyState`).
  - `success` → the grid. `[FACT: calendar-view.tsx:120-127,182-183; list-view.tsx:110-126; internal/data-view.tsx:9]`
- **TV-5 · `aria-sort` is DISPLAY-only.** A `columnheader` whose `column.sort` is `'asc'|'desc'` sets `aria-sort`
  accordingly (`none` when `null`); table-view **does not toggle** sort (no `onSortChange` prop) — the sort control is
  view-chrome (Collection shell, O2); the renderer only reflects the resolved sort. `[FACT: ADR-007 §3.3:65; interpretation O2]`
- **TV-6 · Horizontal scroll at 375 (the CV-8 precedent).** The table has a **`minWidth`** (sum of column `minWidth`s /
  a sensible floor) inside an **`overflowX:auto, maxWidth:100%`** wrapper, so narrow viewports scroll rather than crush
  columns. `[FACT: calendar-view.tsx:48,76,150]`
- **TV-7 · Column layout.** Each header/body cell is `flexGrow:1, flexBasis:0, minWidth:<floor>` (the calendar `HeadCell`
  precedent); `column.align` sets the cell's `alignItems`; `column.width` (a layout number/string via `style=`, the
  gallery/tabs precedent — NOT a token) overrides grow for a fixed column. `[FACT: calendar-view.tsx:50; gallery-view tileStyle]`
- **TV-8 · Density = row rhythm.** `density?: 'compact'|'default'|'spacious'` (default `'default'`) sets the cell
  **vertical padding** via the `$space` scale (`$8/$12/$24`). Cells are contiguous (a grid, hairline row borders via
  `$colorBorderDefault`) — no inter-row gap. (If a consumer composes a padded Card in `column.render`, that's its
  choice — the LV-4 double-pad caveat is the consumer's.) `[FACT: list-view.tsx:63-73 density scale; CLAUDE.md DEF-U8-h]`
- **TV-9 · Tokens + ref + a11y.** DIRECT semantic tokens; dimensions via the token scale (`$md`, `$12`), never a
  sub-theme key (DEF-U8-h); **no sub-theme** (base tokens on unnamed hosts). **React-19 ref-as-prop, NO `forwardRef`**
  (erases `<T>`). `warnMissingName('TableView', …)` fires whenever the table renders (loading/success), not for error —
  a name is required. `{...rest}` spread BEFORE the computed `role`/`aria-busy` so state wins (the list/calendar N1
  precedent). `[FACT: list-view.tsx:15,130; calendar-view.tsx:98-99,133; CLAUDE.md:127,271-278]`
- **TV-10 · No motion in V8.** Static layout; reduced-motion n/a (no animation) — the list-view LV-6 precedent. (A
  future sort/row animation, if ever, is a separate change.) `[FACT: list-view.tsx LV-6]`

## 3. Contract (props)

```ts
import { type ViewState } from '../internal/data-view' // reuse the spine type — NO @vida/core import (BR-2)
type Density = 'compact' | 'default' | 'spacious'

interface Column<T> {
  key: string
  header: ReactNode
  render: (item: T, index: number) => ReactNode // cell CONTENT; table-view owns the role="cell" wrapper (TV-2)
  width?: number | string // layout number via style= (TV-7), not a token
  align?: 'start' | 'center' | 'end' // → cell alignItems
  sort?: 'asc' | 'desc' | null // DISPLAY-only → aria-sort (TV-5); not toggled here
}
interface TableViewProps<T> {
  items: readonly T[] // already filtered + sorted upstream (View Engine)
  columns: readonly Column<T>[]
  getKey: (item: T, index: number) => string // stable UUIDv7 id — never an index
  state?: ViewState // app derives + passes (BR-2); default 'success'
  empty?: ReactNode // richer empty slot (EmptyState); else a designed empty row
  error?: ReactNode // else a default Message
  loadingCount?: number // skeleton rows; default 5
  density?: Density // default 'default'
  ref?: Ref<HTMLDivElement> // React-19 ref-as-prop (no forwardRef)
  'aria-label'?: string // required when the table renders (dev-warn)
  'aria-labelledby'?: string
}
```

No `onSortChange` / `onRowClick` / write callbacks — read-only lens (TV-1); interactivity composes in `column.render` (LV-5).

## 4. Acceptance

- [ ] `TableView<T>` in `packages/ui/src/components/table-view.tsx`; exported from `index.ts` (`TableView`, `TableViewProps`, `Column`).
- [ ] `role="table"/row/columnheader/cell`; reuses `ViewState`/`Message`/`warnMissingName`; NOT `resolveDataViewState` (TV-3).
- [ ] 4 terminal states render per TV-4 (designed empty row, not a status message); `aria-sort` display per TV-5.
- [ ] Horizontal scroll at 375 (TV-6); column grow/align/width (TV-7); density (TV-8).
- [ ] React-19 ref-as-prop; base tokens, token-scale dimensions, no sub-theme; `warnMissingName` guard (TV-9).
- [ ] `*.test.tsx` (jsdom): roles, 4 states + empty self-heal, aria-sort mapping, name dev-warn, column render/align.
- [ ] `*.stories.tsx`: the Visual-Gate surface (all states × 3 presets × light/dark × 375/768/1440).
- [ ] `pnpm --filter @vida/ui typecheck && build && test` green; **Visual Gate PASS** (Brave harness); `/critique` SHIP.
- [ ] §XXIX: refresh `packages/ui/src/CLAUDE.md` (+ `_index.md` supersession note) at Step 11.

## 5. Open UNKNOWNs

- [RESOLVED] build table (not degrade) — G6 supersession (§0). · read-only (no sort-toggle/write) — quality-bar §4.3.
- [INTERP, confirm at Visual Gate] density = cell vertical padding (vs list's gap) — a table is contiguous, so padding
  is the row rhythm; verified visually at Step 10.
