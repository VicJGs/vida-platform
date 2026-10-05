# fe-codec-viewmodes — Seam Contract (Decomposition Gate, Step 2)

> The API the two **read-only** view-mode renderers expose to **surfaces** (every `fe-*` unit that picks the
> `table`/`board` layout inherits it). Boundary governed by **BR-2** + the **read-only-lens** model: **`@vida/ui`
> renders (resolved data + `state` as props, NO `@vida/core` edge, NO write); the View Engine / provider resolves
> filter × layout × grouping × sort UPSTREAM; the app derives `ViewState` and passes it; interactive mutation is a
> Capability (ADR-008), not these renderers** [FACT: CLAUDE.md:125; list-view.tsx:34-35; ADR-007 §3.3; quality-bar §4.3:120-123].

## The upstream/downstream boundary (what the renderer receives vs what it must NOT do)

```
Saved View (filter × layout × grouping/sort, ADR-007 §3.3)
  → View Engine / provider: applies filter, resolves sort, GROUPS the rows      ← NOT the renderer's (O3)
  → app derives ViewState via the 8-state machine / deriveTerminalState         ← the app owns the @vida/core edge
    → TableView / BoardView: PURE READ-ONLY RENDER of resolved rows/groups + state-as-prop   ← this unit
       → consumer composes click-to-open via render/renderCard (LV-5)           ← per-cell/card interactivity
───── OUT (homed by the docs, NOT here) ──────────────────────────────────────
  · drag-to-move / reorder (a write)          → a Capability (ADR-008), writes via the module API (INT-2) — O1
  · sort toggle / layout switch / filter edit → the Collection shell (view chrome) — O2
```
A renderer **renders what it is given**. It does not filter, group, sort, write, or own the interactive mixture. Absent a
declared field (table columns / board group-by), the layout is *unavailable/degraded* upstream — a declared, non-error
outcome [FACT: ADR-007 §3.3:60-69; interpretation R5, O1-O3].

## A. `TableView<T>` — `@vida/ui/components/table-view.tsx` (S1) · READ-ONLY

```ts
import { type ViewState } from '../internal/data-view'   // reuse the spine type — NO @vida/core import (BR-2)

type Density = 'compact' | 'default' | 'spacious'

interface Column<T> {
  key: string
  header: ReactNode
  /** Renders one cell's CONTENT (TableView owns the role="cell" wrapper). Compose an interactive control here when a
   *  cell is clickable (the LV-5 boundary — the renderer doesn't re-solve interactivity). */
  render: (item: T, index: number) => ReactNode
  width?: number | string          // a LAYOUT number (the tabs/gallery `style=` precedent), not a token
  align?: 'start' | 'center' | 'end'
  /** DISPLAY-only: the view's current sort for this column → drives aria-sort on the columnheader. The renderer does
   *  NOT toggle sort (that's the Collection shell, O2); it only reflects the resolved sort. */
  sort?: 'asc' | 'desc' | null
}

interface TableViewProps<T> {
  items: readonly T[]                                     // already filtered + sorted upstream (View Engine)
  columns: readonly Column<T>[]
  getKey: (item: T, index: number) => string              // stable UUIDv7 id — never an index
  state?: ViewState                                        // the app derives + passes (BR-2); default 'success'
  empty?: ReactNode                                        // richer empty slot (EmptyState); else a designed empty row
  error?: ReactNode
  loadingCount?: number                                    // skeleton row count; default 5
  density?: Density                                        // row rhythm via the $space scale (the list-view precedent)
  ref?: Ref<HTMLDivElement>                                // React-19 ref-as-prop (no forwardRef — erases <T>)
  'aria-label'?: string                                    // required when the table renders (dev-warn via warnMissingName)
  'aria-labelledby'?: string
}
```
- Renders `role="table"` → `role="row"` → `role="columnheader"`/`role="cell"` (the `calendar-view` divergence; NOT
  `resolveDataViewState` — a grid's empty is designed). Horizontal overflow = `minWidth` table in an `overflowX:auto`
  wrapper (calendar precedent). Base semantic tokens; dimensions via the token scale (DEF-U8-h). **No `onSortChange`** —
  sort toggling is view-chrome (O2); the renderer only *reflects* `column.sort` via `aria-sort`.

## B. `BoardView<T>` — `@vida/ui/components/board-view.tsx` (S2) · READ-ONLY

```ts
import { type ViewState } from '../internal/data-view'

interface BoardGroup<T> {
  id: string                       // the group-by value (provider-resolved)
  title: ReactNode
  items: readonly T[]              // PRE-GROUPED by the provider (ADR-007 §3.3) — the renderer never groups
  // count is derived from items.length (not passed)
}

interface BoardViewProps<T> {
  groups: readonly BoardGroup<T>[]
  /** Renders one card's CONTENT (BoardView owns the column listitem). Compose an interactive Card here (LV-5). */
  renderCard: (item: T, group: BoardGroup<T>) => ReactNode
  getKey: (item: T) => string
  state?: ViewState                                        // board-level state (loading/error/empty/success); default 'success'
  empty?: ReactNode                                        // board-level empty (no groups / all-empty)
  error?: ReactNode
  density?: Density
  ref?: Ref<HTMLDivElement>
  'aria-label'?: string
  'aria-labelledby'?: string
}
```
- Renders a `role="group"` (named) of **columns**; each column reuses the list-shaped spine (`resolveDataViewState` →
  `role="list"`/`status`, per-column empty/warn). Cards are listitems via `renderCard`. **No `onItemMove`, no drag** —
  the interactive move is a Capability (O1); this renderer is a read-only lens. Base tokens; dimensions via the token scale.

## Consumption
- **Surfaces (every `fe-*` picking `table`/`board`):** pass provider-resolved `items`/`groups` + the app-derived `state`;
  compose click-to-open cells/cards in `render`/`renderCard`. **No surface re-implements the grid, the columns, or the
  terminal states.** Interactive move/sort/filter are wired by the Collection shell + a Capability, not by passing
  callbacks into these renderers.
- **Module layout variants** (Tasks' 12) compose these base renderers; they do not fork them (O4).

## Invariants (contract-level)
- **Read-only lens** — no filter/group/sort/write; the renderer renders resolved data (interpretation R5) [FACT: quality-bar §4.3:120-123; ADR-007:94].
- **State is a prop across the boundary** — `@vida/ui` never derives; the app derives + passes (BR-2).
- **`table` diverges to `role="table"`** (not `resolveDataViewState`); **`board` reuses the list spine per column**
  (`resolveDataViewState`) [FACT: calendar-view.tsx:9-11; internal/data-view.tsx:36-68].
- **React-19 ref-as-prop, no `forwardRef`**; **no sub-theme**; **dimensions via the token scale** (DEF-U8-h); DIRECT
  semantic tokens, no hard-coded palette.
- **Degrade, never crash** — every state renders; empty-success self-heals; accessible name dev-warned when a region renders.
- Interactive mutation (drag-to-move) + view chrome (sort/filter/layout switch) are **out** — Capability (ADR-008) + Collection shell (O1/O2).
