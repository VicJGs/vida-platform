# Spec: component:ui-2-platform-views · V3 — timeline (+ shared data-view extraction)
<!-- type: component (unit sub-spec of ui-2-platform-views) — TWO parts: A refactor-extract, B new component -->
Status: implemented + Visual Gate PASS (Victor, 2026-08-10) — DONE
Source-repo: /Users/victor/Documents/CODE/vida-platform
No-Guessing: [FACT: source] / [INTERP: from fact] / [UNKNOWN: needs X].
Parent: docs/specs/components/ui-2-platform-views/_index.md (shared BR-1..BR-6). Reuses the V1 spine.

## 1. Identity
V3 has **two parts** — the rule-of-three trigger fires here:
- **Part A — extract `packages/ui/src/internal/data-view.tsx`** (the shared data-view spine now duplicated 2× across
  list-view + gallery-view) and **rewire V1 + V2 to consume it** (behavior-preserving; the 246 existing tests are the
  regression guard). `[FACT: list-view.tsx:21,84,108-126 ≡ gallery-view.tsx equivalents — byte-identical logic]`
- **Part B — `timeline`** — the renderer for the `timeline` VIEW_LAYOUT `[FACT: view.ts:24; ADR-007:60]`: a
  **chronological vertical sequence** — items on a vertical rail with markers + an optional temporal label. The
  temporal analogue of list (Tasks "Timeline/Gantt", Projects "Timeline", CRM interaction timeline).
  `[FACT: view-intent-harvest.md:21,24,35]`

## 2. Part A — the shared `internal/data-view` extraction
The `internal/` folder is where @vida/ui puts non-component shared code (`toast-store.ts` precedent). `data-view.tsx`
exports exactly the 3× (soon-to-be) duplicated pieces — NOT a mega-component (the container/wrapper/skeleton layout
GENUINELY differs per view, so the 4-branch switch stays local; only the error-prone shared logic is extracted).

- **DV-1 · Exports.**
  - `export type ViewState = 'loading' | 'empty' | 'error' | 'success'` — moves here (canonical home). `list-view.tsx`
    **re-exports** it (`export { type ViewState } from '../internal/data-view'`) so the barrel (`index.ts:36`, exports
    ViewState from `./list-view`) is **unchanged**. gallery-view + timeline import it from `../internal/data-view`.
  - `export const Message` — the muted, centered, full-width `styled(Text)` default empty/error copy. `width:'100%'`
    keeps it a full-row status region in a grid (gallery) and is harmless-but-benign-delta in a column: **list-view's
    current `Message` has NO `width:'100%'`** (gallery's does), so the shared one adds it to list-view's empty/error
    message — a minor VISUAL improvement (consistent full-width), not a test-observable change (M3, disclosed so DV-3's
    "behavior-preserving" is honest: 246 stay green, one benign visual delta).
  - `export function resolveDataViewState(args): { role: 'list'|'status'; effectiveEmpty: boolean }` — a PLAIN function
    (not a hook — no React state/effects; it computes + fires dev-warns during render, exactly as the components do
    now). Args: `{ state, itemCount, ariaLabel?, ariaLabelledby?, name: string }`. Computes `effectiveEmpty` + `role`
    and fires the **3 dev-warns** (prefixed `[vida/ui] ${name}:`). `[FACT: card.tsx warns during render]`
- **DV-2 · Preserve the tested warn substrings (regression-critical).** The extracted warnings MUST still contain
  `` `empty `items`` ``, `stale render`, and `accessible name` — the existing list/gallery tests assert
  `stringContaining(...)` on these. `[FACT: list-view.test.tsx / gallery-view.test.tsx dev-warn assertions]`
- **DV-3 · Rewire V1 + V2 (behavior-preserving).** list-view + gallery-view: delete their local `ViewState`/`Message`/
  `effectiveEmpty`/dev-guards/`role`; import + call `resolveDataViewState({ state, itemCount: items.length,
  ariaLabel: rest['aria-label'], ariaLabelledby: rest['aria-labelledby'], name: 'ListView'|'GalleryView' })`. The
  per-view 4-branch switch (which element renders per phase) + container + wrapper + skeleton **stay local**. No
  public API change; no test change expected (green 246 must stay green — the guard).
- **DV-4 · A `data-view.test.ts`** unit-tests `resolveDataViewState` directly (role per state, effectiveEmpty
  self-heal, each dev-warn fires/does-not-fire, per-`name` prefix) — the pure logic tested once at the source, not
  only via consumers. `.test.ts` (not `.tsx`) is correct: it imports + calls ONLY the pure function, never renders
  `Message` (JSX). `aria-busy` stays a **local one-liner** per view (`state==='loading'`) — trivial, not returned by
  the helper (M1, deliberate).

## 3. Part B — timeline (Business Rules; reuses V1 spine via the Part-A helper)
- **TL-1 · Spine reuse.** `items`/`renderItem`/`getKey`/`state`/`empty`/`error`/`loadingCount` + terminal states +
  `role="list"`/`listitem` + `resolveDataViewState` + React-19 ref-prop — identical to V1/V2. `[FACT: v1-list-view.md]`
- **TL-2 · The temporal layout (the delta) — a CONTINUOUS rail (B1 fix).** A vertical sequence. Each item is a
  `role="listitem"` ROW = `[rail column | content]`. The continuity trick: **`TimelineRoot` has `gap:0`**; the
  inter-item spacing is `paddingBottom` on the **content column** (TL-4), so the **rail columns sit FLUSH** (no gap
  between them) and their lines meet into one unbroken rail — an absolute line scoped to an item CANNOT cross a root
  `gap`, so the gap must not be on the root.
  - **Rail column** (fixed width `$24`, `position:relative`, `alignSelf:'stretch'` so it spans the full padded row
    height, decorative `aria-hidden`): a **connecting line** (absolute, centered, `width:2`, `$colorBorderDefault`,
    behind the dot) + a **marker dot** at a FIXED `top:$12` (a `12×12` circle — width AND height 12 —
    `borderRadius:'$full'`, `$colorTextMuted`, `zIndex:1` [local: dot over line]; dot-center = 18px from the row top,
    aligned near the label). Line trim — a **4-branch** rule (no measurement — the dot is at a fixed offset), checked
    lone-FIRST so a single item can't fall through to the `first` branch:
    - **`isFirst && isLast` (lone item)** → **NO line** (dot only) — else a spurious dangling nub (gate-2 B-fix).
    - **first** `{top:18,bottom:0}` (starts at the dot, no overhang above).
    - **last** `{top:0,height:18}` (ends at the dot, no overhang below).
    - **middle** `{top:0,bottom:0}` (full → connects flush to both neighbours).
    `[INTERP: standard vertical-timeline, fixed-offset construction]`
  - **Content** (`flex:1`, `paddingBottom` = density gap [except the last item]): an optional **`getLabel?(item,index)`
    temporal label** rendered as REAL content (muted `$small`, first in DOM order, **NOT aria-hidden** — B2: the
    temporal datum is meaningful row content) + `renderItem` output. Row interactivity stays the consumer's, LV-5.
- **TL-3 · Skeleton = rail + bar.** `loading` → `loadingCount` (default 5) skeleton rows: the **same `RailDot` at
  `top:$12`** (so the loading→loaded transition doesn't jump the dot) but **no connecting line** (a dot-only rail is
  conventional for the aria-hidden loading state) + a `$colorSurfaceSecondary` `$md` bar (fixed `$24` h, the list-view
  precedent) in the content column. `aria-hidden` `role="listitem"` + container `aria-busy`. empty/error → the shared
  `Message` `role="status"` region.
- **TL-4 · Density = content paddingBottom, NOT root gap (B1).** `density?` → `$8/$12/$24` applied as the content
  column's `paddingBottom` (skipped on the last item), so the rail stays continuous (TL-2). No `dividers` (the rail IS
  the separator). This deliberately diverges from V1/V2's `root.gap` density model — required for rail continuity.
- **TL-5 · No sub-theme / no motion / no new dep / dimension-tokens (BR-4/LV-3/LV-6).** Base tokens on unnamed hosts;
  `$full` radius for the dot via the token scale (DEF-U8-h). `[FACT: packages/ui/src/CLAUDE.md]`
- **TL-6 · A11y.** Same state-dependent role (`list`/`status`); the **rail column** (line + dot) is `aria-hidden`
  (decorative), but the **`getLabel` temporal label is NOT** — it's real content inside the `role="listitem"`, in DOM
  order before `renderItem`, so a screen reader announces "[label], [item]" as one row (B2). The consumer owns whether
  the label duplicates content already in `renderItem`; this renderer only places it. Name via aria (dev-warn if
  absent, via the shared helper). `[FACT: v1-list-view.md LV-5]`

## 4. Contract (Part B)
```ts
import { type ViewState, resolveDataViewState, Message } from '../internal/data-view'

export interface TimelineProps<T> {
  items: readonly T[]
  renderItem: (item: T, index: number) => ReactNode
  getKey: (item: T, index: number) => string
  /** Optional temporal label rendered beside each marker (e.g. a formatted date). */
  getLabel?: (item: T, index: number) => ReactNode
  state?: ViewState
  empty?: ReactNode
  error?: ReactNode
  loadingCount?: number            // default 5
  density?: 'compact' | 'default' | 'spacious'
  ref?: Ref<HTMLDivElement>
  'aria-label'?: string
  'aria-labelledby'?: string
}
export function Timeline<T>(props: TimelineProps<T>): ReactElement   // generic; React-19 ref-as-prop
```
- 8-state matrix (§VIII): identical coverage to V1 (default(success sequence) · loading(rail skeletons + aria-busy) ·
  empty/error(`status`) · hover/focus/active/disabled n/a-container · dark · responsive — a vertical stack reflows
  trivially). Sub-theme: none. Export `Timeline`/`TimelineProps` from `index.ts`. `*.test.tsx` + `*.stories.tsx`.

## 5. Acceptance
- [ ] **Part A:** `internal/data-view.tsx` (ViewState + Message + resolveDataViewState) + `data-view.test.ts`;
      list-view + gallery-view rewired; **the pre-V3 @vida/ui suite (246) stays green unchanged** (behavior-preserving
      regression guard), + new data-view + timeline tests raise the total; barrel ViewState export unchanged.
- [ ] **Part B:** `Timeline<T>` renders a `role="list"` of `role="listitem"` rows = rail(dot+line, aria-hidden) +
      content(optional label [real, not hidden] + renderItem); the rail is **CONTINUOUS across items** (gap on content
      paddingBottom, not root; rail columns flush) and trims to the dot at first/last (no overhang).
- [ ] All 4 terminal states (rail skeletons + aria-busy; empty/error `role="status"`; success sequence).
- [ ] `getLabel` renders beside the marker when provided; `density` sets the gap; dark mode + responsive verified.
- [ ] dev-warn parity (via the shared helper); Storybook covers 4 states + getLabel + density, both themes → Visual Gate.
- [ ] `pnpm --filter @vida/ui typecheck && build && test` green; root typecheck 10/10; §XXIX CLAUDE.md paragraph.

## 6. Implementation Prompt (ordered)
1. **Part A first** — create `internal/data-view.tsx` (move ViewState + Message + resolveDataViewState, preserving warn
   substrings DV-2); add `data-view.test.ts`; rewire list-view (re-export ViewState) + gallery-view; **run the full
   suite → 246 green** BEFORE Part B (proves the refactor is clean).
2. **Types** (Part B) — import from `../internal/data-view`; `TimelineProps<T>`; plain generic `function Timeline<T>`.
3. **styled hosts** — `TimelineRoot` (column, **`gap:0`**; role per state), `TimelineItem` (`role="listitem"`, row),
   `Rail` (`width:'$24'`, `position:relative`, `alignSelf:'stretch'`, aria-hidden), `RailLine` (absolute, centered
   `left:'50%'`, `width:2`, `$colorBorderDefault`; top/bottom via per-item inline `style` for first/mid/last trim),
   `RailDot` (`width:12, height:12` circle, `borderRadius:'$full'`, `$colorTextMuted`, absolute `top:'$12'`,
   `zIndex:1`), `Content` (`flex:1`; `paddingBottom` = density, skipped on last), `Label` (muted `$small`),
   `SkeletonBar` (`$colorSurfaceSecondary`, `$md`, `$24` h).
4. **State switch** (via `resolveDataViewState`) — loading→rail skeleton rows; empty/error→`Message` role=status;
   success→`items.map((item,i)=>{ const isFirst=i===0, isLast=i===items.length-1;
   const lineStyle = isFirst&&isLast ? null : isFirst ? {top:18,bottom:0} : isLast ? {top:0,height:18} : {top:0,bottom:0};
   ... })`→`TimelineItem` with Rail (dot + `RailLine` rendered ONLY when `lineStyle!==null`) + `Content`
   (paddingBottom unless isLast; optional `getLabel` label + renderItem). `aria-busy={state==='loading'||undefined}` on root.
5. **A11y + dev-guards** — via the shared helper; rail column (line+dot) aria-hidden; the `getLabel` label is real
   content (not hidden), first in DOM order inside the listitem (TL-6/B2).
6. **Tests** — 4 states; rail dot+line present + first/last trim (assert the inline top/bottom/height style per
   position); **lone item → dot but NO RailLine**; getLabel renders as content (not aria-hidden); ref forwarded; role per state.
7. **Story** — fixture with dates via getLabel, renderItem→Card; controls for state/density.
8. **Export** + CLAUDE.md paragraph (+ note the Part-A extraction in the layer doc).

## 7. Deferred (same as V1 §6)
Selection · grouping · virtualization. Gantt/duration bars (a richer timeline variant) → later if a consumer needs it.

## 8. Change Log
| Date | Session | Change |
|------|---------|--------|
| 2026-08-10 | ui-2-platform-views | V3 sub-spec authored at PLAN — Part A (extract internal/data-view, rewire V1+V2) + Part B (timeline); gate-1 next |
| 2026-08-10 | ui-2-platform-views | Rev 2 — gate-1 critique REVISE→fixed (Part A validated clean): **B1** (rail was discontinuous — line-in-item can't cross root gap → moved density to content paddingBottom, root gap:0, rail columns flush + fixed-offset dot trim, no measurement), **B2** (temporal label = real content in the listitem, not aria-hidden), M1 (aria-busy stays local), M2 (`.test.ts` tests pure fn only), M3 (disclosed Message `width:100%` benign visual delta to list-view), minors (RailDot 12×12, rail `width:'$24'` token) |
| 2026-08-10 | ui-2-platform-views | preflight PASSED (`$full` token verified emitted; position/absolute precedent). Gate-2 critique **REVISE**→fixed: geometry + Part A behavior-preservation confirmed CORRECT; 1 blocker = **lone-item trim** (isFirst&&isLast fell through to `first` → dangling nub) → 4-branch rule (lone → NO line) + test; minors: skeleton reuses RailDot@$12 no-line, zIndex local-comment, test-count framing. **Approval 2 pending.** |
