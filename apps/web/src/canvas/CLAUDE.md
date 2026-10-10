# apps/web/src/canvas — Canvas ↔ CanvasView adapter (fe-codec-canvas-board S2)

The apps/web plane that drives `@vida/ui`'s **`CanvasView`** immersive frame (#10) for its two worked examples —
**Vision-board** (GalleryView over dreams) and **Calendar-grid** (month CalendarView). The Tamagui-only boundary (BR-2)
forbids data/registry types in `@vida/ui`, so the mapping lives here (the collection/dashboard/entity adapter precedent).

## Files
- `adapter.ts` — the pure convention:
  - **`toCanvasHeader(view, eyebrow, meta?)`** → `{ eyebrow, title, meta }`. `title` = the **user-named surface** (the
    saved-view / Space name), NEVER the month (EC-5/A) — the hosted `CalendarView` renders its own month header, so the
    frame title duplicating it would be the bug the greybox caught.
  - **`resolveMeasureProgress(m)`** → `{ showBar, fraction, label }` — the **measure-driven** progress descriptor
    (R9/R9a). The bar style AND the label/units follow the entity's `measurement_kind`: `milestone`→"N of M steps" ·
    `quantitative`→"X of Y"(+unit) · `rate`→"P%" · `qualitative`→the state (no bar) · **unmeasured→no bar, no label**.
    A board can hold mixed OS entities (ADR-011), so a tile is never hard-coded to one style. This is the **reference
    convention** — the production dream tile is fe-purposes' `renderItem` (GV-1); it consumes this resolver.
  - `createCanvasAdapter()` — the pure pieces bundled (the create*Adapter precedent).

## The composition convention (how a surface assembles a canvas)
A canvas surface composes `CanvasView` + a shipped renderer as `children` (read-only; no writes — those are
owning-module Capabilities, R1):
```tsx
// Vision-board (fe-purposes): imagery-first gallery + a board-level realized meter in the progress slot.
<CanvasView {...toCanvasHeader(view, 'Vision board')} progress={<RealizedMeter … />}>
  <GalleryView items={dreams} getKey={d => d.id} renderItem={dreamTile /* uses resolveMeasureProgress */} getWeight={…} />
</CanvasView>
// Calendar-grid (fe-calendar #19 / Global Calendar): user-named title + read-only month nav; the renderer owns the month.
<CanvasView {...toCanvasHeader(view, 'Calendar', todayLine)} actions={monthNav}>
  <CalendarView month={…} today={…} getDate getKey renderItem />
</CanvasView>
```

## Deferred (first-consumer — R7)
`useVisionBoard(spaceId)` / `useCalendar(spaceId)` live data hooks (React Query → the saved view + dreams / `dueIn`
cross-module fan-out + these pieces) are built at the FIRST real consumer — fe-purposes' Dreams vision-board /
`fe-calendar #19` (the cross-module `dueIn` lane). The dense-day overflow treatment is #19's (parked
`calendar-vision.md §6`).

## Verify
`pnpm --filter @vida/web typecheck && pnpm --filter @vida/web test -- canvas` (pure, env node).
