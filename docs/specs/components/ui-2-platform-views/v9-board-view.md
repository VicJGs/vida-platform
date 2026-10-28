# Spec: component:ui-2-platform-views · V9 — board-view

<!-- type: component (unit sub-spec of ui-2-platform-views) -->

Status: draft → PLAN (fe-codec-viewmodes S2, 2026-10-04)
Source-repo: /Users/victor/Documents/CODE/vida-platform
No-Guessing: [FACT: source] / [INTERP: from fact] / [UNKNOWN: needs X].
Parent: docs/specs/components/ui-2-platform-views/\_index.md (shared BR-1..BR-6).
Delivery: docs/specs/foundation/fe-codec-viewmodes/delivery/ (interpretation · slice-map · seam-contract).

## 0. Supersession note (currency)

Same G6 supersession as V8 (§0 there): the umbrella `_index.md:29-33` 2026-08-09 "table/board = graceful-degradation,
by design not built" stance is **reversed** by the G6 frontend-replan — _"extend ui-2 → add table · board"_
`[FACT: g6-edge-ledger.md:46; g6-reshape-runbook.md:33; decomposition.md:20-24]`. `board` is the **last** canonical
`VIEW_LAYOUT` renderer; after this unit all 7 ship `[FACT: packages/types/src/view.ts:17-25; capability-framework.md:114 V3]`.

## 1. Identity

V9 `board-view` — the renderer for the **`board`** VIEW_LAYOUT `[FACT: packages/types/src/view.ts:20; ADR-007 §3.3:60]`.
A **grouped-column (kanban) grid**: PRE-GROUPED columns, each a titled list of cards — the lens a saved `views` row
selects when it groups by a field (Tasks by status, a pipeline by stage) `[FACT: decomposition.md:21-22; seam-contract.md:64-92]`.
Currently absent (`@vida/ui` ships 6 of 7 after V8).

- **The desire:** one kanban renderer every module + `views` row reuses — no per-module board re-implementation.
- **The siblings (build against them):** `list-view` (V1, the spine — a column IS a list) + `calendar-view`/`table-view`
  (V4/V8, the board-level divergence — a 2D surface owns its own terminal states). board-view is a **hybrid**: each
  COLUMN reuses `resolveDataViewState` (the list path); the BOARD level owns loading/error/board-empty directly (the
  table path) `[FACT: internal/data-view.tsx:36-68; calendar-view.tsx:9-11; seam-contract.md:90-91; interpretation R4]`.
- **READ-ONLY LENS (the governing boundary).** A view is a read-only lens; interaction-that-writes is a Capability
  `[FACT: frontend-quality-bar/_index.md:120-123 §4.3; ADR-007:94; ADR-008:71-72]`. So board-view renders; it does not
  group, filter, sort, or write.
- **What it is NOT:** NOT grouping LOGIC (the View Engine groups upstream, ADR-007 §3.3 — the renderer receives
  `groups`, never a `groupBy`); NOT drag-to-move / cross-column reorder (that changes the group-by = an entity write =
  a **Capability**, ADR-008/INT-2, homed OUT — interpretation O1); NOT card interactivity (the consumer's `renderCard`
  composes a clickable Card — LV-5); NOT the immersive Vision-board **Canvas** (`fe-codec-canvas-board` #10, O5).

## 2. Business Rules

- **BV-1 · Read-only lens.** `board-view` renders already-grouped columns. It does **not** group, filter, sort, or
  write. The interactive move (drag-to-move across columns) is a Capability (ADR-008, INT-2); a clickable card is the
  consumer's `renderCard`. **No `onItemMove`/drag/write props.** `[FACT: ADR-007 §3.3; quality-bar §4.3:120-123; ADR-008:71-72; interpretation O1/R5]`
- **BV-2 · Generic pre-grouped columns (BR-1).** Generic over the card type: `groups: readonly BoardGroup<T>[]` where
  `BoardGroup<T> = { id: string; title: ReactNode; items: readonly T[] }` + `renderCard(item, group): ReactNode` +
  `getKey(item): string`. The provider groups UPSTREAM (ADR-007 §3.3); the renderer never derives groups. `renderCard`
  returns one card's CONTENT (board-view owns the `role="listitem"` wrapper). `[FACT: seam-contract.md:69-88; ADR-007 §3.3.4]`
- **BV-3 · Hybrid spine reuse (the list spine per column; the board level diverges).** Each column reuses
  `resolveDataViewState` — a column IS a `role="list"` of `role="listitem"` cards, with a per-column empty resolving to
  `role="status"`. The BOARD level does **not** run through `resolveDataViewState`: it owns loading (skeleton columns),
  error (`role="status"`), and board-empty (no groups → `role="status"`) directly (the table/calendar divergence).
  `[FACT: internal/data-view.tsx:36-68; seam-contract.md:90-91; interpretation R4; slice-map S2]`
- **BV-4 · Terminal states (BR-2; `state?: ViewState`, default `'success'`).**
  - `loading` → **skeleton columns** (a fixed `SKELETON_COLUMNS` count, headerless + skeleton cards, no shimmer — the
    UX-4 §3.1 / list recipe) + `aria-busy`; **data-independent** (ignores `groups`, the table skeleton precedent — so
    there is no `loadingCount` prop, deliberately asymmetric with table's §A). `role="group"`.
  - `error` → the shared `Message` in a **`role="status"`** region (not the group). `error?: ReactNode` slot.
  - `board-empty` — `state='empty'` OR **success-with-no-groups** self-heal → a **`role="status"`** region (NOT a
    designed grid: a board's columns ARE the data, so zero groups = nothing to keep — the list-view empty model, the
    inverse of table's designed-empty-row). Richer `empty?: ReactNode` slot (compose `EmptyState`).
  - `success` → the columns. `[FACT: list-view.tsx:110-126; table-view.tsx:136-174; internal/data-view.tsx:9,47]`
- **BV-5 · Per-column empty is normal in a success board.** A column with zero items is LEGITIMATE while the board is
  `success`. The renderer derives each column's effective state (`items.length === 0 ? 'empty' : 'success'`) before
  calling `resolveDataViewState`, so the empty column resolves to `role="status"` WITHOUT tripping the spine's
  "pass state=empty" dev-warn (which assumes success+0-items is a caller bug). `[FACT: internal/data-view.tsx:52-54; interpretation §2.2]`
- **BV-6 · Per-group count (derived, not passed).** Each column header renders its title + a muted **count = `items.length`**
  — derived, never a prop. `[FACT: seam-contract.md:73 "count is derived from items.length (not passed)"; slice-map S2:56]`
- **BV-7 · Horizontal scroll at 375 (the table/calendar precedent).** Columns have a fixed `COLUMN_WIDTH` (a layout
  number, not a token) inside an **`overflowX:auto, maxWidth:100%`** wrapper, so narrow viewports scroll rather than
  crush columns. `[FACT: table-view.tsx:66,90; calendar-view.tsx:48,150]`
- **BV-8 · Density = card rhythm.** `density?: 'compact'|'default'|'spacious'` (default `'default'`) sets the
  between-card **gap** within a column via the `$space` scale (`$8/$12/$24` — the list-view density scale). `[FACT: list-view.tsx:58-64 density scale]`
- **BV-9 · Tokens + ref + a11y.** DIRECT semantic tokens; dimensions via the token scale (`$lg`, `$12`), never a
  sub-theme key (DEF-U8-h); **no sub-theme** (base tokens on unnamed hosts). **React-19 ref-as-prop, NO `forwardRef`**
  (erases `<T>`). Root `role="group"` named by `aria-label`/`aria-labelledby`; **each column list is named by its
  header** via `aria-labelledby` → a per-instance **`useId`-prefixed, index-keyed** DOM id (collision-free; NOT keyed
  off `group.id`, which may contain spaces). `warnMissingName('BoardView', …)` fires when the group renders
  (loading/non-empty success), not for the status terminal states. `{...rest}` spread BEFORE the computed `role`/`aria`
  so state wins (the list/table N1 precedent). `[FACT: list-view.tsx:15,130; table-view.tsx:124,140; internal/data-view.tsx:26-30; CLAUDE.md:127,271-278]`
- **BV-10 · No motion in V9.** Static layout; reduced-motion n/a (no animation) — the list-view LV-6 precedent.
  (Board drag-to-move — which _would_ carry motion + its systemic reduced-motion reminder, surface-map.md:140 — is the
  Capability tier, OUT of this unit.) `[FACT: list-view.tsx LV-6; interpretation O1]`

## 3. Contract (props)

```ts
import { type ViewState } from '../internal/data-view' // reuse the spine type — NO @vida/core import (BR-2)
type Density = 'compact' | 'default' | 'spacious'

interface BoardGroup<T> {
  id: string // group-by value (provider-resolved); React key per column
  title: ReactNode // column header; also the column list's accessible name
  items: readonly T[] // PRE-GROUPED by the provider (ADR-007 §3.3); count = items.length (BV-6)
}
interface BoardViewProps<T> {
  groups: readonly BoardGroup<T>[]
  renderCard: (item: T, group: BoardGroup<T>) => ReactNode // card CONTENT; board-view owns the role="listitem" (BV-2)
  getKey: (item: T) => string // stable UUIDv7 id — never an index
  state?: ViewState // app derives + passes (BR-2); default 'success'
  empty?: ReactNode // board-empty slot (EmptyState); else a default Message
  error?: ReactNode // else a default Message
  density?: Density // card gap within a column; default 'default'
  ref?: Ref<HTMLDivElement> // React-19 ref-as-prop (no forwardRef)
  'aria-label'?: string // required when the group renders (dev-warn)
  'aria-labelledby'?: string
}
```

No `onItemMove` / drag / write callbacks, and **no `loadingCount`** — read-only lens (BV-1); the move is a Capability
(O1); interactivity composes in `renderCard` (LV-5); loading is data-independent (BV-4).

## 4. Acceptance

- [ ] `BoardView<T>` in `packages/ui/src/components/board-view.tsx`; exported from `index.ts` (`BoardView`, `BoardViewProps`, `BoardGroup`).
- [ ] Root `role="group"` of per-column `role="list"`/`role="listitem"`; each column reuses `resolveDataViewState` (BV-3); board level owns loading/error/board-empty (NOT resolveDataViewState).
- [ ] 4 board states render per BV-4 (board-empty = status region, NOT a designed grid — the inverse of table); per-column empty = status (BV-5), no spurious "pass state=empty" warn.
- [ ] Per-group count derived from `items.length` (BV-6); horizontal scroll at 375 (BV-7); density = card gap (BV-8).
- [ ] React-19 ref-as-prop; base tokens, token-scale dimensions, no sub-theme; each column list named via `aria-labelledby` (useId-prefixed id); `warnMissingName` guard (BV-9).
- [ ] `*.test.tsx` (jsdom): roles, 4 board states + self-heal, per-column vs board empty distinction, aria-labelledby wiring, name dev-warn, no-spurious-warn, read-only (no buttons), ref.
- [ ] `*.stories.tsx`: the Visual-Gate surface (all states + empty-column × 3 presets × light/dark × 375/768/1440).
- [ ] `pnpm --filter @vida/ui typecheck && build && test` green; **Visual Gate PASS** (Brave harness); `/critique` SHIP.
- [ ] §XXIX: refresh `packages/ui/src/CLAUDE.md` (+ `_index.md` change log) at Step 11.

## 5. Open UNKNOWNs

- [RESOLVED] build board (not degrade) — G6 supersession (§0). · read-only (no drag/move/write) — quality-bar §4.3 / ADR-008 (interpretation O1/R5).
- [RESOLVED] per-group count rendered, derived from items.length — seam-contract §B:73. · loading data-independent, no `loadingCount` prop — seam-contract §B omits it (table §A asymmetry).
- [INTERP, confirm at Visual Gate] bordered columns (1px `$colorBorderDefault` + `$lg` radius) read as a kanban board; verified visually at Step 10 across preset × mode.
