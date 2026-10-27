# DashboardView — the CODEC Dashboard shell (fe-codec-dashboard S1)

> **Unit:** LIF-208 · ② Frontend CODEC #5 · the 2nd archetype shell (decomposition.md §1.2 — "a grid of integration
> blocks"). Delivery: `docs/specs/foundation/fe-codec-dashboard/`. Status: **S1 shipped** (Visual Gate PASS).

## What it is

A presentational `@vida/ui` SHELL that lays out a grid of blocks the consumer supplies via a `renderBlock` render-prop.
It is **not** a block renderer — the 11 `standalone` integration-block widgets ship elsewhere (ADR-008; types-only
today). Archetype sibling of `CollectionView`: Collection switches ONE renderer over the same data; Dashboard composes
MANY blocks at once in a grid.

## Boundary

`@vida/ui` is Tamagui-only (no `@vida/core`/`@vida/types`). So `CellSize` is a LOCAL union and the block state reuses the
intra-package `ViewState` canon (the gallery-view precedent). The app-plane adapter (`apps/web`, S2) binds the SHIPPED
`block_instances`/`capability_definitions`/`CapabilityRegistry`/`RenderTarget` canon → the shell props.

## API (Seam A)

- `title: string` — names the region (`aria-labelledby`) + renders as the `$heading` serif heading.
- `blocks: readonly DashboardBlock[]` — `{ id, title, size: 'sm'|'md'|'lg'|'full', state: ViewState, action? }`. Order =
  grid order. `size` + `state` are the app's (BR-2, resolved from the placement + the 8-state machine).
- `renderBlock(block) => ReactNode` — the **SUCCESS body only** (the shell owns the generic terminal states).
- `empty?`/`emptyAction?` — empty-DASHBOARD override + add affordance (default = a teaching `EmptyState`).
- `blockLoading?`/`blockEmpty?`/`blockError?` — optional per-block terminal-state overrides.
- `density?`, `aria-label?`/`aria-labelledby?`, `ref?` (React-19 ref-as-prop, no forwardRef — non-generic).

## Invariants (business rules)

- **BR-D-1 Shell, not a renderer** — composes blocks via `renderBlock`; owns the grid + per-cell Card frame + state
  threading, never a block's internals [decomposition.md:30 §1.2].
- **BR-D-2 State-as-prop** — each block's `state` is derived by the app (8-state machine) + passed; the shell never derives.
- **BR-D-3 Shell owns the generic terminal states** — it renders a uniform skeleton (`loading`, `aria-busy`), a teaching
  empty, and a calm **`role="status"`** error (**muted text**, NOT `$colorSignalDanger` — which fails AA 4.5 in light, the
  known ds-2 M4 fix; the role carries the semantics, the `Message` precedent); `renderBlock` is called **only for
  `success`**. Per-block `blockLoading`/`blockEmpty`/`blockError` are optional overrides. Extends Collection's
  shell-owned-empty to all three generic states.
- **BR-D-4 RN-safe flex grid, never CSS grid** — `flexDirection:'row'` + `flexWrap:'wrap'` + density→`gap`; per-cell
  `SPAN[size]` = `{flexGrow, flexShrink:1 (EXPLICIT — RNW defaults 0), flexBasis, minWidth floor, maxWidth cap}`.
- **BR-D-5 Span model** — `sm {25%, 200, 360}` · `md {42%, 280, 520}` · `lg {60%, 320, 760}` · `full {100%, 280, no cap}`.
  A per-span `maxWidth` caps a lone non-`full` cell so it never silently fills the row (EC-6); `full` fills. Floors < 375
  content width → single-column cleanly at 375 (EC-8).
- **BR-D-6 Empty dashboard teaches** — no blocks → an `EmptyState` + add affordance, never a blank (EC-5).
- **BR-D-7 Tokens + a11y** — DIRECT semantic tokens (no hard-coded palette); named region (`warnMissingName`); the ⋯
  block-action slot rides the cell header. No motion in S1 (static layout → reduced-motion n/a).

## Out of scope (homed by the docs)

Placement edit (add/remove/drag/resize = a `block_instances` write → a Capability, O1) · the 11 block widgets + registry
(O2) · per-module/per-Space block sets + live data wiring + the live `useDashboard` hook (module ② track / first consumer,
O3) · the Home arrangement toggle (O4) · the Spaces page (O5) · the other archetype shells (O6).

## Visual Gate (blocking) — PASS

Brave, 3 presets × light/dark + EC-specific stories: heading serif AA 15.84–17.29 · cell text MIN AA **4.52–5.22** (incl.
warm-dark) · **axe 0** · 7 cells with `data-size` (EC-1) · 7 ⋯ slots (EC-2) · per-block loading/error independent (EC-3) ·
**EC-6 lone `lg` capped (760 < 1136 grid)** · EC-5 empty teach · **375 single-column, no overflow** (EC-4/EC-8).
Gate caught 2 real issues code-gates passed: the `$h3`/`$h4` undefined token (→ `$heading`/`$subheading`) + the
`$colorSignalDanger` error text failing light-mode AA (→ muted, the `Message` precedent).

## Files

`packages/ui/src/components/dashboard-view.tsx` · `.stories.tsx` (gate surface) · `.test.tsx` (9 jsdom) ·
exported from `index.ts`. **S2 (the `apps/web` adapter) is the next slice.**
