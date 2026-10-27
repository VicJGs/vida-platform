# CollectionView — component contract (fe-codec-collection S1)

> The CODEC **Collection shell** (decomposition.md:29 §1.2, "the workhorse"): a Saved View rendered in a view-mode.
> `@vida/ui`, presentational, state-as-prop (BR-2). COMPOSES the 7 shipped view-mode renderers via a render-prop; it is
> NOT a renderer. Delivery: `docs/specs/foundation/fe-codec-collection/delivery/`. Ratifies seam-contract Seam A.

## Purpose
Give every module one consistent top-view: a **view-mode switcher** + the **active renderer** (dispatched by the Saved
View's `layout`) + shared **chrome** (title · count · filter/sort/new-view entry points — S2), threading the 8-state. The
renderers (list·table·board·gallery·calendar·graph·timeline) already ship; this composes them.

## API (S1 scope = switcher + dispatch + states + title/count; S2 adds the chrome affordances)

```ts
type ViewLayout = 'list' | 'table' | 'board' | 'gallery' | 'calendar' | 'graph' | 'timeline' // LOCAL (no @vida/types dep)
type ViewState = 'loading' | 'empty' | 'error' | 'success'                                   // reused from internal/data-view

interface CollectionViewProps {
  title: string
  titleRef?: Ref<HTMLElement>                 // notes-rescope R3: the title element (tabIndex -1) — a focus target after a recovered read
  count?: number                              // success → shown; else rendered '—' (honest)
  layout: ViewLayout                          // CONTROLLED
  layouts: readonly ViewLayout[]              // available subset; order = switcher display order
  onLayoutChange: (next: ViewLayout) => void  // view-config change (app persists via ViewsService — Seam B)
  renderView: (layout: ViewLayout, state: ViewState) => ReactNode  // consumer renders the active renderer w/ its real props
  state: ViewState
  empty?: ReactNode                           // OPTIONAL collection-level empty override (default below)
  error?: ReactNode                           // OPTIONAL error override (default: delegate to renderView)
  // — S2 chrome entry points (logic is the app's) —
  onFilter?: () => void; filterActive?: boolean
  sortLabel?: ReactNode; onSort?: () => void
  onNewView?: () => void
  'aria-label'?: string; 'aria-labelledby'?: string
  ref?: Ref<HTMLDivElement>                   // React-19 ref-as-prop (no forwardRef — generic)
}
```

## RESOLVED: state ownership (the critic's open contract point — pinned here)

The shell threads `state` into `renderView(layout, state)`; **renderers own `loading`, `error`, `success`** (every shipped
renderer already renders these internally — list-view.tsx:34-35; calendar folds empty into its grid). For **`empty`** the
shell provides a **consistent collection-level empty** so modules don't each re-decide it (the CODEC's job):

- `state === 'empty'` AND `layout ∉ DESIGNED_EMPTY_LAYOUTS` → render the **`empty` slot** (default = `EmptyState`,
  teaching-invitation). *(EC-3 — consistent invitation empties.)*
- `state === 'empty'` AND `layout ∈ DESIGNED_EMPTY_LAYOUTS` (`= ['calendar']`) → **delegate to `renderView(layout,
  'empty')`** so calendar keeps its designed grid. *(EC-3 — "calendar keeps its designed grid".)*
- all other states → `renderView(layout, state)` (renderer owns). A consumer-supplied `empty`/`error` always overrides.

`DESIGNED_EMPTY_LAYOUTS = ['calendar']` — the one shipped renderer whose empty is a meaningful structure (the month grid),
not an absence [FACT: calendar-view.tsx — empty folds into success/the grid]. Documented, single-location rule; no
per-consumer decision, no double-render.

## Switcher (EC-1 · EC-4 · EC-6 · EC-7 · EC-8)
- A `role="toolbar"` (named) of inline-**label** toggle `Button`s over `layouts` — active = `intent="primary"` (filled) +
  `aria-pressed="true"`; rest = `ghost`. **NOT `Tabs`** (tabs swap different content; a view-switch re-renders the same
  data in another layout — distinct ARIA semantics). Roving per the toolbar pattern.
- **≥44×44 touch targets at all widths** [shell-layout.md:87]. **At 375 the switcher CONDENSES to an overflow/menu**
  (compose UI-1 `Menu`: trigger "View: {label} ▾" → `role="menu"` of the layouts) — the shell global-bar control-reflow
  precedent [shell-layout.md:67]; NOT wrap, NOT horizontal-scroll (that's the wide-data pattern).
- Switch is instant + calm; any transition is transform/opacity + reduced-motion-gated (B12; `useReducedMotion`). (EC-7/8.)

## Chrome layout (title/count here S1; Filter/Sort/`+` S2)
- Row 1: `title` (`$display`) + muted `count` (left) · Filter / Sort / `+` entry points (right, S2).
- Row 2: the switcher.
- Reflows at 375 (chrome stacks as needed; switcher condenses).

## States (threaded; EC-5)
`loading`/`error`/`success` → `renderView(layout, state)` (renderer owns). `empty` → per the ownership rule above.
`error`/`degraded` are calm `role="status"`, never a crash/blank (ADR-007 degrade-never-crash) — the renderer's own error
(or the `error` override).

## A11y
Collection region named (`aria-label`/`aria-labelledby`, dev-warn if absent, the data-view precedent); switcher toolbar
named + `aria-pressed` per button; count announced with the title; focus order title → chrome → switcher → content.

## Tokens
DIRECT semantic tokens; dimensions via the token scale (DEF-U8-h, never a sub-theme key); no hard-coded palette; preset-
and density-aware via the theme (B-codec-6).

## Invariants
Shell not renderer (composes; never renders rows) · `layout`/`state` CONTROLLED props · local `ViewLayout` union (no
`@vida/types` dep) · switcher is a labeled toolbar (not Tabs) · `onLayoutChange` is the only switch path (a view-config
change) · degrade-never-crash · React-19 ref-as-prop.

## Known follow-up (non-blocking, code-review NIT)
The condensed (<768) switcher is a UI-1 `Menu` of `role="menuitem"` with a visual ✓ on the active layout; the current
value is announced via the trigger label ("View: {label}"), but the items lack `aria-checked`/`menuitemradio` (single-
select SR parity with the toolbar's `aria-pressed`). `Menu` ships no radio variant today → a follow-up when it does. The
toolbar path (≥768) conveys the active layout via `aria-pressed`.

## Done when (S1 Visual Gate)
Switcher + all 7 dispatched renderers + all 4 states render; empty-ownership rule correct (EmptyState for list/table/…,
grid for calendar); 375 condense proven + ≥44×44; light/dark × 375/768/1440 × 3 presets; AA full-matrix (incl. warm-dark);
a11y sweep (toolbar `aria-pressed`, accessible names, keyboard reach, no axe violations); `tsc` 0; `@vida/ui` tests green;
`/critique` SHIP. EC-1/3/4/5/7/8 demonstrated.
