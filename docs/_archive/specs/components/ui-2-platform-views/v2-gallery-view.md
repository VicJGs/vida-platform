# Spec: component:ui-2-platform-views · V2 — gallery-view

<!-- type: component (unit sub-spec of ui-2-platform-views) -->

Status: implemented + Visual Gate PASS (Victor, 2026-08-10) — DONE
Source-repo: /Users/victor/Documents/CODE/vida-platform
No-Guessing: [FACT: source] / [INTERP: from fact] / [UNKNOWN: needs X].
Parent: docs/specs/components/ui-2-platform-views/\_index.md (shared BR-1..BR-6). Reuses the V1 spine (v1-list-view.md).

## 1. Identity

V2 `gallery-view` — the renderer for the `gallery` VIEW_LAYOUT `[FACT: packages/types/src/view.ts:21]`. A
**responsive grid** of imagery-first tiles over a heterogeneous item set — ADR-007 homes the "imagery-first Gallery /
vision board" here `[FACT: ADR-007:61; capability-framework.md:112 V1]`. Currently a 0-byte stub. **It is V1's
data-view spine with a GRID container instead of a vertical stack** — same generics, same four rendered terminal
states, same `role="list"`/`listitem` semantics, same dev-warns.

- **The desire:** one gallery renderer every module + `views` row reuses (the Bucket-List vision board, gallery-
  grouped Notes/Journals) instead of a per-module grid.
- **What it is NOT:** NOT tile CONTENT (the consumer's `renderItem` renders each tile — typically a Card with a cover
  image; gallery-view owns the grid + `listitem` wrapper + terminal states, LV-5 carries). NOT the cover-field
  requirement enforcement — ADR-007:62's "gallery needs an image/cover field, else degraded" is the **view engine's**
  decision (whether to offer gallery for an entity type), not this component's; gallery-view just lays out whatever
  `renderItem` returns. NOT grouping (week/month/year) — layout-independent, deferred with V1 §6.

## 2. Business Rules (V2 — reuses V1 LV-1..LV-7; only the deltas below)

- **GV-1 · Spine reuse (BR-1/BR-2).** Same `items: readonly T[]` + `renderItem(item,index)` + `getKey(item,index)` +
  `state?: ViewState` (**imported from `./list-view`** — intra-package reuse, no second copy; the `@vida/core` edge
  rule was cross-package only) + `empty`/`error` slots + `loadingCount`. Terminal-state precedence, self-heal, and
  the LV-7 dev-warns are identical to V1. `[FACT: v1-list-view.md LV-1,LV-2,LV-3a,LV-7]`
- **GV-2 · Responsive grid layout (the delta from V1's stack).** Container is a `flexDirection:'row'` + `flexWrap:
'wrap'`. Each tile gets `flexGrow:1` + `flexBasis: minTileWidth` + **`minWidth: minTileWidth`** (M1 — the FLOOR that
  makes the name honest; `flexBasis` alone is only a start-size and `flexShrink:1` would collapse tiles below it) +
  `maxWidth: minTileWidth*2` (a lone last-row tile can't stretch absurdly). So a tile lives in `[minTileWidth,
2·minTileWidth]`, grows to fill, and **wraps** when a line can't fit another at `minWidth` (no overflow while
  container ≥ minTileWidth). `minTileWidth?: number` default **200**. RN-safe flexbox grid (not CSS `grid`) — the
  universal-Tamagui goal. `[INTERP: ADR-001 universal Tamagui; RN has no CSS grid]`
  - **Mobile behavior is explicit (M2), reviewed at the Visual Gate:** at the 375 baseline (design.md:202) with the
    default `minTileWidth:200`, only ONE column fits (2·200 > 375) → the gallery **collapses to a single column,
    visually ≈ list-view on mobile**. This is expected/acceptable, not a bug. The `density` gap (`$8/$12/$24`) reduces
    the fit width, so at `spacious` the column count can drop one earlier — a designed interaction, not a defect.
- **GV-3 · Gap via density (BR-4).** `density?: 'compact'|'default'|'spacious'` → the grid **gap** (`$8/$12/$24`, the
  V1/Card scale). No `dividers` (n/a for a grid). `[FACT: v1-list-view.md LV-4; card.tsx:42-44]`
- **GV-4 · Skeleton = tiles, not bars.** `loading` → `loadingCount` (default **6**) skeleton TILES — a placeholder box
  (`$colorSurfaceSecondary`, `$md` radius) sized like a real tile (same `flexGrow/flexBasis/minWidth/maxWidth` as
  GV-2) with **`aspectRatio: 3/2`** (m2 — tracks the grown width so the placeholder doesn't jump-reshape when content
  loads; NOT a fixed height, which drifts aspect as the tile grows) as `aria-hidden` `role="listitem"` + container
  `aria-busy`. `empty`/`error` → the V1 `role="status"` region (unchanged). `[FACT: v1-list-view.md LV-2;
state-conventions.md §3.1 static, no shimmer]`
- **GV-5 · A11y + role (BR-6) — `role="list"`, NOT `role="grid"` (m3, argued).** A flex grid used purely for LAYOUT
  over a homogeneous collection is a `list`, not a WAI-ARIA `grid`: `grid`/`gridcell` obligates the 2D arrow-key
  traversal contract this component deliberately defers (§6). So identical to V1: container role state-dependent
  (`list` in list/loading · `status` for empty+error); tiles `role="listitem"`; name via `aria-label`/
  `aria-labelledby` (dev-warn if absent in a rendered grid); focusables live inside `renderItem` (no roving). Revisit
  only if tiles gain 2D selection (§6). `[FACT: v1-list-view.md LV-5; WAI-ARIA grid is for interactive data grids]`
- **GV-6 · No sub-theme, no motion, no new dep (LV-3/LV-6).** Base semantic tokens on an unnamed styled host; no V1-
  style motion; no new package dep. `[FACT: v1-list-view.md LV-3,LV-6]`

## 3. Contract

```ts
import { type ViewState } from './list-view' // intra-package reuse (GV-1)

export interface GalleryViewProps<T> {
  items: readonly T[]
  /** Renders one tile's CONTENT (gallery-view owns the role="listitem" grid cell). Typically a Card with a cover. */
  renderItem: (item: T, index: number) => ReactNode
  /** Stable key per tile (a UUIDv7 id). REQUIRED — never an index. */
  getKey: (item: T, index: number) => string
  /** Resolved state (app-derived, BR-2). Default 'success'. */
  state?: ViewState
  empty?: ReactNode
  error?: ReactNode
  /** Skeleton tile count while loading. Default 6. */
  loadingCount?: number
  /** Min tile width (px) — the enforced FLOOR (minWidth + flexBasis); tiles grow to [min, 2·min] + wrap. Default 200. */
  minTileWidth?: number
  /** Grid gap. Default 'default'. */
  density?: 'compact' | 'default' | 'spacious'
  ref?: Ref<HTMLDivElement>
  'aria-label'?: string
  'aria-labelledby'?: string
}
export function GalleryView<T>(props: GalleryViewProps<T>): ReactElement // generic; React-19 ref-as-prop (no forwardRef)
```

- 8-state matrix (§VIII): identical to V1 — default(success grid) · loading(skeleton tiles + aria-busy) ·
  empty(`status`) · error(`status`) · hover/focus/active/disabled (n/a container; tile's via renderItem) · dark ·
  responsive (the flex-wrap grid reflows per GV-2 — multi-column desktop → single column at 375).
- Sub-theme: none (GV-6). Export from `index.ts`. `*.test.tsx` (jsdom) + `*.stories.tsx` (Visual-Gate surface).

## 4. Acceptance

- [ ] `GalleryView<T>` renders a `role="list"` flex-wrap grid of `role="listitem"` tiles via `renderItem`.
- [ ] All 4 terminal states (loading skeleton tiles + `aria-busy`; empty/error `role="status"` slot/default; success).
- [ ] `minTileWidth` sets the tile floor (`minWidth` + `flexBasis`); tiles wrap responsively (a jsdom test asserts
      `tile.style.minWidth === "${minTileWidth}px"` + `flexBasis === "${minTileWidth}px"` — React px-suffixes these
      non-unitless props; `flexGrow` stays unitless "1").
- [ ] `density` sets the grid gap; dark mode verified; grid reflows across 375/768/1440.
- [ ] `state`/dev-warn parity with V1 (state/items contradictions + missing name).
- [ ] Storybook covers 4 states + minTileWidth + density, both themes → **component Visual Gate PASS**.
- [ ] `pnpm --filter @vida/ui typecheck && build && test` green; root typecheck 10/10; §XXIX CLAUDE.md paragraph.

## 5. Implementation Prompt (ordered — mirrors V1, grid delta)

1. **Types** — `import { type ViewState } from './list-view'`; `GalleryViewProps<T>` (incl. `ref`); plain generic
   `function GalleryView<T>` (no forwardRef).
2. **styled hosts** — `GalleryRoot` (`flexDirection:'row'`, `flexWrap:'wrap'`, density variant → `gap $8/$12/$24`;
   role set per state), `GalleryTile` (`role="listitem"`), `SkeletonTile` (`$colorSurfaceSecondary`, `$md` radius,
   `aspectRatio:3/2`). The per-tile flex sizing is a memoized `tileStyle: React.CSSProperties` = `{flexGrow:1,
flexBasis:minTileWidth, minWidth:minTileWidth, maxWidth:minTileWidth*2}` passed via **`style={tileStyle}`** (the
   tabs.tsx:314 `style={indicatorStyle}` precedent — inline layout numbers on a `styled(View)` compose with variant
   styles); reused on both `GalleryTile` and `SkeletonTile`. Color→theme keys; the sizing numbers are layout params,
   not design tokens (like tabs' `width: ind.size`) — gap stays tokenized `$8/$12/$24` (DEF-U8-h).
3. **State switch** (reuse V1) — `loading`→`role="list" aria-busy` + N `SkeletonTile role="listitem" aria-hidden`;
   `empty`→`role="status"` slot||default; `error`→`role="status"` slot||default; `success`→`role="list"` +
   `items.map`→`GalleryTile role="listitem" key={getKey(item,i)}` wrapping `renderItem`. Spread `ref` onto root.
4. **A11y + dev-guards** — name via aria; dev-warn on missing name (rendered grid) + the LV-7 state/items contradictions.
5. **Tests** (jsdom) — 4 states incl. state-dependent role; tile flex-basis = minTileWidth; getKey used (not index);
   aria-busy in loading; ref forwarded; dev-warns fire.
6. **Story** — fixture `items` with a cover placeholder, `renderItem`→a Card; controls for state/minTileWidth/density.
7. **Export** (`GalleryView`, `GalleryViewProps`) + CLAUDE.md paragraph.

## 6. Deferred (same as V1 §6)

Selection · grouping (week/month/year — layout-independent) · virtualization. Cover-field degradation is the view
engine's, not this component's (GV-1/§1).

## 7. Change Log

| Date       | Session                                     | Change                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| ---------- | ------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 2026-08-10 | ui-2-platform-views                         | V2 sub-spec authored at PLAN (reuses V1 spine + grid delta; gate-1 next)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| 2026-08-10 | ui-2-platform-views                         | Rev 2 — gate-1 critique REVISE→fixed (no blockers; all V1-reuse claims verified TRUE vs shipped list-view.tsx): M1 (`minWidth:minTileWidth` floor — name now honest), M2 (mobile single-column behavior stated explicitly), m1 (`style={tileStyle}` per tabs precedent), m2 (skeleton `aspectRatio:3/2` not fixed height), m3 (list-not-grid a11y argued), m4 (umbrella §5 V2 row clarified — degradation is the engine's)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| 2026-08-10 | ui-2-platform-views                         | preflight PASSED (inherits V1 substrate; only new surface = standard flexbox, tabs `style=` precedent). Gate-2 critique **SHIP** — `aspectRatio:3/2`(=1.5) confirmed valid CSS not a bug; numeric `style` px-suffix backed by menu/popover precedent; +2 wording minors folded (acceptance asserts `"${n}px"` string; §3 reflow phrasing). **Approval 2 pending.**                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| 2026-10-07 | fe-codec-primitives-refinement P4 (LIF-230) | **CODEC width-weighted tiles** (full §XXVI double-gate + blocking Visual Gate + independent code-review). Added **`getWeight?(item,index)→number`** (default 1, ready affordance): the single `tileStyle` memo → a per-tile `weightStyle(w,min)` = `{flexGrow:w, flexShrink:1, flexBasis:w·min, minWidth:min(base floor), maxWidth:w·min·2}`; `clampWeight` symmetric `[1,8]`+warn; skeletons stay w=1. **Gate caught: `flexShrink` MUST be explicit** (RNW defaults it to 0, not CSS's 1) — else a weighted tile can't shrink → 375 overflow. Editorial tile look (framed cover+kicker+serif title+tabular caption) + cover-intelligence stay the consumer's/view-engine's (GV-1); **masonry FORECLOSED** by RN-safe flex grid (GV-2/ADR-001:111). tsc 0 · eslint 0 · gallery-view **16 tests** · Visual Gate PASS (3 presets × light/dark: title AA 15.84–17.29 + caption/kicker 4.94–6.53 incl. warm-dark · axe 0 · featured 496px vs base 248px = 2× · 375 no-overflow). Review-caught: added the upper clamp (one-sided guard → a bogus large weight silently destroyed the grid). Spec: `…/fe-codec-primitives-refinement/phases/P4-gallery.md`. |
