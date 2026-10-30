# Slice map — fe-codec-canvas-board (#10, LIF-204)

> Entity Delivery Flow ② · Step 2 (Decomposition Gate). Mode = **Decide** (G6 net-new unit, no prescribed sub-split).
> All slices are `frontend` (no backend track — the view-mode registry + the hosted renderers are frozen/shipped;
> cross-module data is deferred to first consumer / #19). Every `structural` EC maps to ≥1 slice (plane-aware).

## What #10 builds (and what it does not)

- **Builds:** the net-new immersive **Canvas frame** (`@vida/ui`) + the two worked-example composition conventions
  (`apps/web`). The frame hosts the already-shipped `GalleryView` (vision-board) and month `CalendarView`
  (calendar-grid). Read-only throughout (R1).
- **Does NOT build:** new renderers (R2) · the dense-day overflow treatment (→ #19, `calendar-vision.md §6`) · the
  production dream-tile `renderItem` with measure-driven progress (that's the consumer's, `fe-purposes`; #10 ships a
  reference convention + guarantees the slot hosts any style, R9/R9a) · live data hooks (deferred to first consumer, R7).

## Slices

### S1 — `CanvasView` immersive frame · plane: **frontend** · home: `@vida/ui`

The net-new shell. A read-only editorial frame that hosts exactly one view-mode renderer at canvas scale.

- **Masthead:** `eyebrow?` (uppercase archetype label) · `title` (REQUIRED, user-named surface — never the month,
  EC-5 resolution A) · `meta?` (quiet subline) · `progress?` slot (consumer-filled board-level meter, EC-3) ·
  `actions?` slot (read-only only — e.g. month nav, EC-6) · a hairline divider.
- **Hosted region:** `children` = the shipped renderer.
- **Terminal states (the seam rule, see seam-contract §2):** the hosted renderer owns loading/error/success of the
  content; the frame adds ONE affordance — an optional **teaching `empty`** override (vision-board owns it; calendar
  passes none → its designed grid shows, EC-4). The frame never re-implements the renderer's shipped states (R2/R5).
- **Read-only:** no write affordances anywhere (EC-6, R1).
- Local types only (no `@vida/core`/`@vida/types`, R6). Stories + jsdom tests + **blocking Visual Gate**.
- **Covers:** EC-1 (editorial masthead) · EC-3 (progress slot) · EC-4 (empty ownership) · EC-6 (read-only/action
  slot) · EC-7 (preset feel) · EC-8 (AA full matrix).

### S2 — canvas composition conventions + adapters · plane: **frontend** · home: `apps/web`

Type + convention (no live data hook — deferred to first consumer, R7; the collection/dashboard adapter precedent).

- **`VisionBoardCanvas` convention:** `CanvasView` hosting `GalleryView` over dreams — imagery-first tiles; a
  **reference `renderItem`** demonstrating the measure-driven progress bar **and** label (EC-9/R9/R9a: `milestone`→
  steps bar, unmeasured→none, etc.); the board-level realized meter wired into the `progress?` slot; `title` from the
  saved-view name.
- **`CalendarGridCanvas` convention:** `CanvasView` hosting the shipped month `CalendarView` — `title` = user-named
  surface; the renderer keeps its month header + nav; existing `+N more` truncation as-is (overflow → #19).
- Pure mapping + convention + types; degrade-never-crash; live `useVisionBoard`/`useCalendar` hooks = first consumer.
- **Covers:** EC-2 (imagery-first gallery, realized=accent — as the reference convention) · EC-5 (month CalendarView
  unchanged, title=user-named) · EC-9 (measure-driven progress style+label convention).

## EC → slice coverage (plane-aware)

| EC                                                     | Type       | Slice(s)               | Plane    | Gate                    |
| ------------------------------------------------------ | ---------- | ---------------------- | -------- | ----------------------- |
| EC-1 editorial masthead                                | structural | S1                     | frontend | Visual-Gate MUST        |
| EC-2 imagery-first gallery                             | structural | S2 (S1 hosts)          | frontend | Visual-Gate MUST        |
| EC-3 progress slot                                     | structural | S1 (slot) · S2 (fills) | frontend | Visual-Gate MUST        |
| EC-4 empty ownership (vision=teaching / calendar=grid) | structural | S1                     | frontend | Visual-Gate MUST        |
| EC-5 month CalendarView unchanged + user-named title   | structural | S2 (S1 title prop)     | frontend | Visual-Gate MUST        |
| EC-6 read-only / action slot                           | structural | S1                     | frontend | Visual-Gate MUST        |
| EC-7 preset re-voice                                   | feel       | S1                     | frontend | live Visual Gate (feel) |
| EC-8 AA full matrix                                    | structural | S1 (+S2 reference)     | frontend | Visual-Gate MUST        |
| EC-9 measure-driven progress style+label               | structural | S2 (convention)        | frontend | Visual-Gate MUST        |

All 8 `structural` ECs are homed; EC-7 (feel) → live gate. No unhomed intent.

## Build order

S1 (the frame) → S2 (compositions that consume it). S1's Visual Gate must PASS before S2.
