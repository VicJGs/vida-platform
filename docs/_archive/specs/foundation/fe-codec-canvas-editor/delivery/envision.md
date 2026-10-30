# Envision — fe-codec-canvas-editor (CODEC · Canvas: Editor, #7, LIF-234)

> Entity Delivery Flow ② · Step 1.5 — ENVISION GATE. §3.75 ruling: **FIRES** (the editorial document-writing
> canvas is a novel composition surface). Greybox = throwaway standalone mount (`apps/web/envision.html` +
> `src/__envision__/`) of the PROPOSED composition from REAL primitives + fake data. **Human (Victor) approves
> the greybox + checkpoints before Decomposition.**

## Greybox — what it shows

The proposed #7 composition: the shipped `<VidaEditor>` (UI-3) framed in the shipped `CanvasView` (#10) +
`SyncStatus` (patterns S4), driven by the 4 canvas states. Screenshots: `/tmp/vg-canvas-editor-envision/*.png`
(8 cells: Editorial light success/empty/loading/error · Reader light · Quiet Desk light · Editorial dark · Reader dark).

- **Masthead**: `NOTE` eyebrow · serif title "Weekly Review" (the user-named page) · meta "Edited just now · 6 blocks" · `SyncStatus` "Saved on this device" chip in the `actions` slot · hairline.
- **Body (success)**: the real TipTap editor — toolbar (B I U S </> · Heading · Insert · undo/redo) + standard blocks (heading, paragraph, bullet list, blockquote) + two **integration-block placeholders** ("Task checklist", "Daily summary" → "Available when its module ships").
- **Empty**: `EmptyState` teaching invitation ("A blank page — Start writing, or press / for a block. Nothing's required.").
- **Error**: calm, privacy-preserving ("This page couldn't be opened on this device. Your words are safe — try again in a moment.").
- **Preset swap**: voice re-families correctly — Editorial (Spectral/ink-blue) · Reader (Fraunces/oxblood, warm ivory) · Quiet Desk (Source Serif/olive).

## FINDING (greybox caught) — must-fix, feeds a checkpoint

**Dark mode: the editor BODY text renders near-black on the dark surface (unreadable).** The masthead + placeholders
flip correctly (Tamagui `$colorTextPrimary`), but `.ProseMirror` sets no base `color` and `apps/web/src/index.css`
binds none → the contenteditable inherits the browser default (black), which does NOT flip. This is REAL (not a
greybox artifact): the real app sets no token-bound body color either. Resolution (decomposition decides the plane):
either UI-3 `editor-styles.ts` adds `.vida-editor-frame .ProseMirror{color:var(--colorTextPrimary)}` (the token-only
convention it already follows — cleanest), OR #7's canvas wrapper sets `color:$colorTextPrimary`. → **EC-7**.

## Proposed checkpoints (Victor pins/edits/approves)

| EC    | Screen · state     | Checkpoint                                                                                                                            | Type       |
| ----- | ------------------ | ------------------------------------------------------------------------------------------------------------------------------------- | ---------- |
| EC-1  | all                | Masthead = eyebrow + serif title (user-named page, NEVER a filename) + meta + `SyncStatus` in actions slot + hairline                 | structural |
| EC-2  | success            | The shipped `<VidaEditor>` (toolbar + standard blocks) is the hosted canvas body                                                      | structural |
| EC-3  | success            | The 11+11 integration blocks render as calm placeholders ("Available when its module ships"), never crash (RATIFY from UI-3)          | structural |
| EC-4  | empty              | `EmptyState` teaching invitation; masthead retained                                                                                   | structural |
| EC-5  | error              | Calm, privacy-preserving error ("Your words are safe"); masthead retained                                                             | structural |
| EC-6  | loading            | Skeleton; the editor is NOT mounted until the page is ready                                                                           | structural |
| EC-7  | success · **dark** | **Editor body text binds to `--colorTextPrimary` → readable AA in BOTH modes** (the finding)                                          | structural |
| EC-8  | all · presets      | Preset swap re-voices the whole canvas incl. editor content + toolbar accents (Spectral/blue · Fraunces/oxblood · Source Serif/olive) | feel       |
| EC-9  | success            | Content width cap so the frame doesn't go full-bleed on wide screens (`CanvasView` maxWidth 1136)                                     | structural |
| EC-10 | 375 · 768          | Masthead wraps (`SyncStatus`/actions reflow below title), toolbar wraps, no horizontal overflow                                       | structural |

## VERDICT — APPROVED (Victor, 2026-10-10), with a feel correction applied

> "Approved, but it should feel like an editor and a notebook page, which right now it does not."

The greybox was iterated to land the feel (second render in `/tmp/vg-canvas-editor-envision/`): the editor now
sits on a **paper SHEET floating on a desk** — the page = `$colorSurfacePrimary` + soft shadow + generous writing
margins (px `$48` / py `$40`); the desk behind = `$colorSurfaceSecondary`; the shipped `EditorFrame` box is OPENED
(no border/radius, transparent); writing-grade body (18px / 1.8 line-height, preset serif). Confirmed in light AND
dark (EC-7 demonstrated — body text binds `--colorTextPrimary`, readable both modes). This becomes **EC-11**.

### Resolved feel-questions (locked)

- **A — prose measure → FULL frame width (~1136).** No narrow column; lines run the page width.
- **B — masthead → KEEP FULL** (eyebrow + serif title + meta + save-state), consistent with the sibling canvases.
- **C — save-state → TOP-RIGHT actions slot** (the "Saved on this device" chip).

### Added checkpoint

| EC-11 | success · both modes | **Notebook-page / editor feel**: the editor body is an airy PAGE (paper sheet on a desk surface, opened frame — no widget border, generous writing margins, writing-grade serif body + line-height), NOT a bordered widget | feel (+ structural: sheet/desk surfaces + opened frame are greybox-provable) |
