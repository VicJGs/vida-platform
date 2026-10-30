# S1 — `CanvasView` immersive frame (fe-codec-canvas-board #10)

> Forward spec (§XXVI gate-1). Home: `@vida/ui`. Plane: frontend. Consumes the approved `seam-contract.md` §1–§2 +
> `slice-map.md` S1. Covers EC-1, EC-3, EC-4, EC-6, EC-7, EC-8.

## 1. Scope

The net-new CODEC **Canvas** archetype frame — a read-only, immersive editorial shell that hosts exactly one view-mode
renderer at canvas scale. Masthead (eyebrow · user-named title · meta · progress slot · read-only action slot ·
hairline) + a hosted-renderer region (`children`) + an optional teaching-`empty` override. No renderer logic, no data,
no writes. The frame `#19` and `fe-purposes` later fill (R3).

## 2. Business rules

- **BR-CB-S1-1** — Non-generic plain component; React-19 ref-as-prop → the region element (dashboard/entity precedent).
- **BR-CB-S1-2** — `role="region"`; accessible name via `aria-label` | `aria-labelledby`; the visible `title` names the
  region by default (`useId` + `warnMissingName`), the data-view convention. (EC-8/§XIV)
- **BR-CB-S1-3** — `title` REQUIRED, rendered as the serif `$display` masthead heading; it is the caller-supplied
  **user-named surface**, never the month, never a hard-coded string (EC-5 resolution A).
- **BR-CB-S1-4** — `eyebrow?` renders uppercase via **CSS `textTransform`** (DOM keeps the readable word for SR), the
  calendar-view `.vida-cal-*` eyebrow precedent. (EC-1)
- **BR-CB-S1-5** — `meta?`, `progress?`, `actions?` are pure **slots** the frame places (meta = quiet `$small` muted
  subline; progress = board-level meter the consumer fills, EC-3; actions = top-right, **read-only only**, EC-6). The
  frame owns the slot, never the slot's content.
- **BR-CB-S1-6** — **State rule (the pinned seam divergence, seam-contract §2) — override-slot selection, not a state
  machine:** the frame does NOT re-implement the renderer's states. It renders the masthead always, and for the body
  selects an **optional override slot by `state`, else delegates to `children`**:
  `state==='empty' && empty → empty` · `state==='error' && error → error` · **else → `children`**. So loading, success,
  and any un-overridden empty/error all fall through to `children` — the hosted renderer shows its OWN tuned state
  (calendar's designed grid for empty, its skeleton for loading, etc.). `state` default `'success'`. **The frame's
  `state` only SELECTS an override slot; the consumer still threads the same `state` to the child renderer** (the child
  owns loading/error/success). (EC-4; R2/R5 — never duplicate the shipped renderer's tuned states.)
- **BR-CB-S1-7** — `empty?` and `error?` are **symmetric optional overrides** (BR-CB-S1-6): `empty?` = the teaching
  invitation (vision-board); `error?` = a calm `role="status"` muted message (the `internal/data-view` `Message`
  precedent — never the danger-red, AA/ds-2 M4 note). Both absent ⇒ the frame intercepts nothing and `children` render.
- **BR-CB-S1-12** — **Responsive masthead (375/768/1440):** the masthead is a flex row (title-group · actions); on
  narrow it must reflow so `actions` wrap below the title-group (never collide), and eyebrow/title/meta/progress never
  overflow. `maxWidth` content cap (the dashboard/entity `marginHorizontal:'auto'` precedent). (§XIII / components)
  **Realized 2026-10-18** (see §Change log): the `Actions` slot is `maxWidth:'100%'` + `flexWrap:'wrap'` so wide actions
  content reflows instead of overflowing the page, and the title pairs `lineHeight="$display"` so a wrapped title never
  overlaps itself.
- **BR-CB-S1-8** — DIRECT semantic tokens only; no sub-theme keys, no hard-coded palette; unnamed `styled` hosts
  (LV-3). Preset-invariant structure; fonts/accent inherit the preset at component scope (EC-7).
- **BR-CB-S1-9** — Read-only: the frame renders NO write affordance; `actions` is a caller slot (the caller is
  responsible it carries only read-only controls). (EC-6/R1)
- **BR-CB-S1-10** — Local types only: `CanvasState` reuses the intra-package `ViewState` canon; no `@vida/core`/
  `@vida/types` import (R6). `children` stays renderer-agnostic (any node) so #19 can drop a range renderer in (R3).
- **BR-CB-S1-11** — `className`/`data-*` measurement hooks on the masthead + body (`vida-canvas-*`) for the Visual Gate.

## 3. Contract

Per `seam-contract.md` §1 (`CanvasViewProps`) + §2 (state rule). No API additions here.

## 4. Acceptance

- tsc 0 · eslint 0 · jsdom tests green (masthead renders all slots; title names region; **empty override shows when
  `state==='empty'`+provided else children; error override shows when `state==='error'`+provided else children; loading/
  success always → children** (BR-CB-S1-6); aria-label warn path; ref forwards).
- **Visual Gate (blocking)** — Brave, 3 presets × light/dark **× 375/768/1440**, with a stub hosted renderer + the real
  `GalleryView`/`CalendarView`:
  - EC-1 masthead reads editorial (eyebrow uppercase · serif `$display` title · quiet meta) — distinct from a grid/switcher.
  - EC-3 progress slot renders (a meter), ordered meta → progress.
  - EC-4 empty: teaching `empty` shows when provided; delegates to children when absent.
  - EC-6 read-only — action slot present, no write affordances.
  - EC-7 preset swap re-voices fonts + accent (instant, reduced-motion-safe).
  - EC-8 AA ≥4.5 for title, eyebrow, meta across the full matrix (incl. warm-dark).
  - **BR-CB-S1-12 responsive — at 375 the `actions` slot reflows below the title-group; no overflow/collision at 375/768/1440.**

## 5. Implementation plan

1. `packages/ui/src/components/canvas-view.tsx` — `CanvasViewProps` (local types) + unnamed `styled` hosts
   (`CanvasRoot`/`Masthead`/`Hairline`) + `CanvasMasthead` (eyebrow/title/meta/progress/actions) + the body switch
   (BR-CB-S1-6) + `useId`/`warnMissingName`/`role="region"`.
2. `canvas-view.stories.tsx` — the Visual-Gate surface: stub-renderer story + a GalleryView-hosted + a CalendarView-
   hosted story × states (success/empty-teaching/empty-delegate), plus a `data-*` MEASURE comment block.
3. `canvas-view.test.tsx` — jsdom: slots, title-names-region, empty behavior (both branches), ref, name-warn.
4. Barrel: export `CanvasView` + `CanvasViewProps` from `packages/ui/src/index.ts`.
5. `/component-audit` → `/critique` → Visual Gate (Brave) → §XXIX currency (`packages/ui/src/CLAUDE.md` digest).

## Change log

| Date       | Session                                                                       | Change                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| ---------- | ----------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 2026-10-18 | fe-calendar #19 S1-chrome fix (`docs/specs/fixes/fe-calendar-s1-chrome-375/`) | Two corrections the #19 Visual Gate surfaced, both making the frame meet BR-CB-S1-12: **(1) title `lineHeight="$display"`** — the title was set on the body `$true` line box (24px for 36px glyphs; `@tamagui/core` `Text` never derives line-height from `fontSize`), so a wrapped title overlapped itself; now 36/41. **(2) `Actions` `maxWidth:'100%'` + `flexWrap:'wrap'`** (keeps `flexShrink:0`) — wide action content (the calendar's 6×48px toolbar + nav at 768; quietDesk at 375) couldn't reflow and overflowed the page. Consumers pass actions as the slot's direct children. Visual Gate PASS (Victor-reviewed): calendar · CanvasView (single + wrapping title) · CanvasEditor, 3 presets × L/D × 375/768/1440 — 0 page overflow, no wrap overlap, axe 0. |
