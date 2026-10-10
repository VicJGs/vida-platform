# Envision — fe-codec-canvas-board (#10, LIF-204)

> Entity Delivery Flow ② · Step 1.5 (Envision Gate, methodology §3.75). **FIRES** — the immersive Canvas frame +
> imagery-first vision board are novel surfaces with no shipped equivalent. Greybox = throwaway, deleted after the
> gate. Reviewer = Victor (blocking).

## Greybox
- Throwaway stories: `packages/ui/src/components/__envision-canvas-board.stories.tsx` (title "ENVISION (throwaway)/
  Canvas Board"). **DELETE after approval.** Composes REAL `@vida/ui` primitives (GalleryView · CalendarView ·
  EmptyState · Button) + fake dreams/calendar data inside a proposed inline `CanvasView` frame.
- Screenshots: `/tmp/vg-canvas-board/*.png` — 8 stories × presets (Editorial/Reader/Quiet Desk) × light/dark via
  Brave. Reviewed cells: vision-board populated (editorial L/D, reader, quietDesk), vision-board empty/loading/error,
  calendar populated (editorial L/D, reader), calendar empty-month/loading.

## Proposed anchored checkpoints

| EC | Screen / state | Assertion (the vision) | Type | Slice(s) | Gate assertion |
|----|----------------|------------------------|------|----------|----------------|
| EC-1 | both · masthead | Reads as an **editorial page masthead**: uppercase eyebrow + serif `$display` title + one quiet meta line; immersive single surface, NOT a dashboard grid or a collection switcher | structural | frame | Visual-Gate MUST |
| EC-2 | vision-board · success | **Imagery-first Gallery**: cover tiles with a tag overlay + serif title; **realized** dreams marked with the accent (`$colorBrandEmphasis`), others muted; featured tiles proportionally larger (`getWeight`) | structural | vision-board | Visual-Gate MUST |
| EC-3 | vision-board · masthead | **Derived-progress line** ("N of M realized") in the masthead meta | structural | frame / vision-board | Visual-Gate MUST |
| EC-4 | both · empty | Empty **vision board** = teaching `EmptyState` with one clear way in ("Add a dream"); empty **calendar** = the designed 42-cell grid, NOT a teaching message (R5) | structural | frame | Visual-Gate MUST |
| EC-5 | calendar · success | Hosts the shipped month `CalendarView` **unchanged**: TZ-safe keying, fixed 42-cell grid, today = accent number + underline, weekend/out-of-month tone | structural | calendar | Visual-Gate MUST |
| EC-6 | both | **Read-only** — month `‹ ›` nav only; NO drag, reorder, check, or move anywhere (writes = owning-module Capability, R1) | structural | frame | Visual-Gate MUST |
| EC-7 | both · presets | Preset swap (Editorial/Reader/Quiet Desk) re-voices fonts + accent; the canvas feels immersive/full-bleed | feel | frame | live Visual Gate (feel) |
| EC-8 | both · all cells | AA contrast (≥4.5 text) across 3 presets × light/dark for masthead, meta, tile status, calendar figures | structural | frame/both | Visual-Gate MUST |
| EC-9 | vision-board · tile | **Every board entity is traceable, MEASURE-DRIVEN**: a tile shows the progress style its `measurement_kind` dictates — `milestone`→steps bar · `quantitative`→value/target · `rate`→ratio · `qualitative`→status · **unmeasured→no bar** (R9; `measurement.ts:5` + `current-business-rules.md:88`). Greybox shows a measured dream (bar + "N of M steps", realized=full accent) beside an unmeasured one (no bar). **Both the bar style AND its label/units follow the measure** (R9a): "N of M steps" is only the `milestone` caption — `quantitative`→"value of target", `rate`→ratio/streak, `qualitative`→state. NB: measure→style+label is the **consumer's `renderItem`** (`fe-purposes`, via ADR-011 `progress()`); **#10's frame bakes NO style** — it hosts any (GV-1). | structural | vision-board | Visual-Gate MUST |

## Calendar title ownership — RESOLVED (A, 2026-10-09)
`CalendarView` renders its own month header; the masthead title duplicated it. **Decision (Victor, "the user chooses
it"): (A)** — the frame title = the **user-given name of the surface** (the saved-view / Space name the user chose,
e.g. "Schedule" / "My Calendar"), stable; the **renderer keeps the month header + nav**. The frame title is user-named
data, never a hard-coded string and never the month (no duplication). Folds into EC-5 + the seam-contract (`title` is a
caller-supplied prop sourced from the saved-view name).

## Day overflow — RESOLVED (not #10's scope → `fe-calendar #19`)
The greybox exposed the shipped `CalendarView` `+N more` as a dead, non-interactive count. A richer treatment was
explored (3 Vida-native directions) but the **docs home it to #19**: `calendar-vision.md:18` — the "Agenda" range
"**Solves the grid's info-crush**"; `:45` + `fe-calendar.md` — the multi-range renderer (incl. Agenda + the Month
range) is **#19's**. #10 hosts the shipped month `CalendarView` with its existing `+N more` (EC-5). The 3 directions
are parked as #19 design input in `calendar-vision.md §6` (2026-10-09). Not deferred-to-avoid-work — doc-homed.

## Approval
Greybox + checkpoints (EC-1…EC-9) approved by **Victor on 2026-10-09**. Calendar title = (A) user-named surface.
Overflow → #19 (parked, `calendar-vision.md §6`). Greybox deleted post-gate. (blocking gate PASSED — decomposition follows)
