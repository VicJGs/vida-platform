# Seam contract — fe-codec-canvas-board (#10, LIF-204)

> Entity Delivery Flow ② · Step 2. The API the UI exposes/consumes. `@vida/ui` is Tamagui-only (no `@vida/core`/
> `@vida/types`, R6); all types below are **local** unions structurally ≡ the canon.

## 1. `CanvasView` (S1, `@vida/ui`) — the immersive frame

```ts
type CanvasState = 'loading' | 'empty' | 'error' | 'success' // local ≡ @vida/core TerminalState (R6)

interface CanvasViewProps {
  /** Archetype label, uppercased via CSS (DOM keeps the word for SR). e.g. "Vision board" | "Calendar". */
  eyebrow?: string
  /** REQUIRED. The user-named surface (saved-view / Space name) — NEVER the month, never hard-coded (EC-5/A). */
  title: string
  /** Quiet subline under the title. e.g. "Today · Mon 10 Aug". */
  meta?: ReactNode
  /** Board-level progress slot — consumer-filled (e.g. the realized meter). Frame owns the SLOT, not the content (EC-3). */
  progress?: ReactNode
  /** Read-only action slot (top-right). Month nav etc. NO write affordances (EC-6/R1). */
  actions?: ReactNode
  /** Resolved state (app derives via deriveTerminalState + passes — R4). Default 'success'. */
  state?: CanvasState
  /** Teaching empty override. When state==='empty' AND provided → replaces the hosted region (vision-board).
   *  When absent → children render (calendar delegates empty to its designed grid, EC-4). */
  empty?: ReactNode
  /** Error override (else a calm default). */
  error?: ReactNode
  /** The hosted renderer (GalleryView | CalendarView | #19 range renderer). Rendered in 'success'. */
  children: ReactNode
  /** Accessible name for the canvas region (dev-warns if absent). */
  'aria-label'?: string
  'aria-labelledby'?: string
  ref?: Ref<HTMLDivElement>
}
```

## 2. State ownership (the load-bearing seam rule)
The hosted renderer (`GalleryView`/`CalendarView`) **already owns** loading/empty/error/success via its own `state`
prop. To avoid a double state machine, **`CanvasView` does NOT re-implement them** — it only **selects an optional
override slot by `state`, else delegates to `children`** (R2/R5). The masthead renders in every state. Body:
- `state==='empty' && empty` → render `empty` (the vision-board teaching invitation).
- `state==='error' && error` → render `error` (a calm `role="status"` muted message).
- **else (loading · success · un-overridden empty/error)** → render `children`, so the renderer shows its OWN tuned
  state (calendar's designed 42-cell grid for empty, its skeleton for loading, etc.).

`state` on `CanvasView` ONLY selects an override slot; **the consumer still threads the same `state` to the child
renderer** (the child owns loading/error/success). `empty?`/`error?` are symmetric; both absent ⇒ the frame intercepts
nothing. Rationale: the renderers' terminal states are shipped + tuned (TZ-safe grid, designed empties); the frame
enriches only the archetype-level cases (a teaching empty for an empty board; a calm frame error). (Divergence from the
dashboard shell, which OWNED generic states because its blocks are success-only; here the hosted renderers carry state.)

## 3. S2 composition conventions (`apps/web`) — type + convention, live hook deferred (R7)
- **`VisionBoardCanvas`**: `<CanvasView eyebrow="Vision board" title={savedView.name} progress={<RealizedMeter/>}>
  <GalleryView items={dreams} renderItem={dreamTile} getWeight={…}/></CanvasView>`. `dreamTile` is a **reference**
  renderItem (imagery cover + tag + serif title + measure-driven progress bar+label). The **production** dream tile is
  `fe-purposes`' renderItem (EC-9/R9: measure→style+label via ADR-011 `progress()`); #10 ships the convention + proves
  the frame hosts any style.
- **`CalendarGridCanvas`**: `<CanvasView eyebrow="Calendar" title={savedView.name} meta={todayLine} actions={monthNav}>
  <CalendarView month={…} today={…} getDate renderItem/></CanvasView>`. Renderer keeps month header + nav; `+N more`
  as-is (overflow → #19).
- **Deferred:** `useVisionBoard` / `useCalendar` data hooks (first consumer: `fe-purposes` / `fe-calendar #19`);
  cross-module `dueIn` fan-out (#19); production measure-driven tile (fe-purposes).

## 4. Boundaries
- Read-only lens — all writes (drag, reorder, check, move, create) are owning-module Capabilities (R1, ADR-008).
- No `@vida/types`/`@vida/core` in `@vida/ui` (R6). No new renderers (R2). No overflow reveal (→ #19).
- `#19` consumes this: it drops its multi-range renderer into `CanvasView` as `children` (R3) — so `children` must
  stay renderer-agnostic (any element), which it is.
