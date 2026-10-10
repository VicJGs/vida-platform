# PLAN — S5 · Listen control

> Entity Delivery Flow ② · per-slice §XXVI PLAN (gate 1). Slice S5 of 6 (the last `@vida/ui` slice; S6 = apps/web
> adapter). Home: `@vida/ui` (extends `canvas-reader.tsx` + the barrel). Grounded in `delivery/seam-contract.md` §A
> lines 55–59 (the proposed `listen`/`listenProgress`/`listenLabel`/`onListenToggle` on `CanvasReaderProps`) +
> `envision.md` EC-7/EC-1/EC-12/EC-15 + `slice-map.md` S5 row + `interpretation.md` IR-7 (TTS deny-safe degrade).

## §1 · Context
The slim **persistent listen bar** — the reader's whole-book text-to-speech control. The envision concept pins listen as
"a slim persistent control" (EC-1) with three honest states (EC-7): **idle** (ready to play) · **playing** (a live
`HonestProgress`) · **unavailable** (a *calm* "Listening isn't available on this device", never an error — IR-7).

**S5 is shell-rendered, the inverse of S4.** S4's selection pieces are consumer-composed because they anchor to a `Range`
inside the `renderContent` slot the shell doesn't own (IR-NEEDS-3). The listen bar has no such constraint — it is
**book-level persistent chrome**, so it lives **on `CanvasReaderProps`** exactly as the seam-contract already proposes.
It is distinct from S4's `SelectionActions.onListenFrom` (listen *from a selection*, selection-seeded): S5 is whole-book
playback + its states. The two coexist; S5 touches neither `SelectionActions` nor `ReaderHighlightMark`.

## §2 · The surfacing model (the S5 design decision — doc-resolved, confirm at Approval 1)
**DECISION: a shell-rendered slim `ListenBar` on `CanvasReader`, driven by the proposed seam-contract props; rendered
only when `listen` is provided (the `progress` render-when-provided precedent, `canvas-reader.tsx:478`).** Grounded:
- **seam-contract §A:55–59** already homes `listen?: ListenMode` / `listenProgress?` / `listenLabel?` / `onListenToggle?`
  on `CanvasReaderProps` — S5 ratifies that proposal (the "proposed-per-slice" clause S2/S3/S4 all used).
- **EC-1 "a slim persistent control" + EC-9 "header + listen bar stack"** → a full-width slim row that is sibling chrome
  to the header, not a floating overlay (no Range to anchor to — the S4 constraint does not apply).
- **state-as-prop (BR-2):** the app derives `listen` (idle/playing/unavailable from the TTS port) + threads it; the shell
  renders the state + emits `onListenToggle`, **never a write** (IR-5).

**Placement:** between `Header` and `Body` (a new `ListenBar` row). It is the first persistent book-level chrome below the
header; the Body's living-margin layout is unchanged.

_(Rejected alternative — "an exported `ListenBar` the consumer composes, mirroring S4": doc-contrary. S4 exported pieces
ONLY because of the Range-anchoring constraint; a persistent book-level bar has no Range, and the seam-contract explicitly
homes its props on `CanvasReaderProps`. Exporting it would fragment the shell's own chrome for no reason.)_

## §3 · Business rules (S5 scope)
- **BR-S5-1 (the bar is shell chrome, EC-1):** `CanvasReader` renders a slim full-width `ListenBar` row between `Header`
  and `Body`, **only when `listen != null`** (render-when-provided; `progress`/`positionNote` precedent). `ListenMode =
  'idle' | 'playing' | 'unavailable'` (a LOCAL union, @vida/ui Tamagui-only — the `ReaderState` precedent).
- **BR-S5-2 (three honest states, EC-7):**
  - **idle** → a `ListenIcon` toggle button (`aria-label` "Listen") + the `listenLabel` (default "Listen to this book");
    `onListenToggle` starts playback.
  - **playing** → a `PauseIcon` toggle button (`aria-label` "Pause") + the `listenLabel` + a `HonestProgress` bar
    (`listenProgress` 0..1, rendered only when provided — honest, no fake fill); `onListenToggle` pauses.
  - **unavailable** → NO button; a `role="status"` **muted** line "Listening isn't available on this device" (IR-7) — a
    calm state, **never `$colorSignalDanger`/error** (the reading column `unavailable` branch precedent,
    `canvas-reader.tsx:209`).
- **BR-S5-3 (real icons, EC-15):** reuse the S4 **`ListenIcon`** (idle, `canvas-reader.tsx:551`) + add one inline
  **`PauseIcon`** (playing) — inline SVG, `aria-hidden`, 16px, `currentColor` (the S4 icon recipe block,
  `canvas-reader.tsx:529`). **Never an emoji.**
- **BR-S5-4 (toggle = intent only, IR-5):** the button emits `onListenToggle`, never writes; it renders only when
  `onListenToggle` is passed (render-when-handler) AND the state is idle/playing (unavailable has no control).
- **BR-S5-5 (a11y, §XIV):** the bar is a named region (`role="region"` aria-label "Listen", OR the toggle button alone
  carries the name — resolve at impl to avoid an empty-named region); the toggle is a ui-1 `Button` (own focus ring +
  keyboard + required `aria-label`); `size="lg"` (≥44×44, §X, the S4 BR-S4-6a floor); playing's `HonestProgress` is
  `role="progressbar"` (valuenow/min/max). Reduced-motion: no new motion (`HonestProgress` determinate fill is a
  `transform:scaleX`, already B12-safe).
- **BR-S5-6 (375 reflow, EC-9):** the bar is a single `flexWrap` row — the label wraps under the control at 375, never a
  mid-control overflow (the flow-session `AffordanceRow` / S4 BR-S4-6b lesson: RNW `flexShrink` defaults to 0).
- **BR-S5-7 (tokens/type, EC-10/11):** DIRECT semantic tokens; the icon + the `HonestProgress` fill carry accent (flips
  per preset); label `$small` muted or `$body` primary (resolve at impl); AA full-matrix incl. warm-dark; the icon is a
  graphical object ≥3:1.

## §4 · Contract (additive `CanvasReaderProps` — ratifies seam-contract §A:55–59)
```ts
export type ListenMode = 'idle' | 'playing' | 'unavailable'

interface CanvasReaderProps {
  // … existing …
  // ── listen (S5) ──
  listen?: ListenMode            // render the bar only when provided; drives the 3 states (BR-S5-1/2)
  listenProgress?: number        // 0..1, shown in 'playing' only, render-when-provided (honest)
  listenLabel?: ReactNode        // default "Listen to this book"
  onListenToggle?: () => void    // intent only; renders the control on idle/playing (BR-S5-4)
}
```
No change to `SelectionActions`/`ReaderHighlightMark` (S4). No new exported component — only the `ListenMode` type joins
the barrel.

## §5 · Acceptance (Visual Gate MUSTs)
- **EC-7:** the three states render — idle (listen affordance) · playing (pause + `HonestProgress`) · unavailable (calm
  muted "Listening isn't available on this device", a `role="status"`, **not** an error colour).
- **EC-15:** every control is a **real inline SVG icon** (ListenIcon / PauseIcon), never an emoji (gate asserts `<svg>`
  present, 0 emoji).
- **EC-12 (feel, live):** toggling idle↔playing reads as immediate (no jarring reload); reduced-motion respected.
- icon + progress fill are graphical objects **≥3:1** (both modes × 3 presets); label AA 0-fail incl. warm-dark ·
- the toggle **≥44×44** (§X) · focus ring + hover on the toggle (§VIII hover visually distinct) ·
- 375 (the bar wraps cleanly, no mid-control overflow) ·
- the bar renders ONLY when `listen` is provided; absent `listen` → no bar (no regression to S1–S4 stories) ·
- tsc 0 · eslint 0 · tests green · **axe 0**.

## §6 · Implementation prompt
1. `canvas-reader.tsx` —
   - add `export type ListenMode = 'idle' | 'playing' | 'unavailable'` near `ReaderState`.
   - add a `PauseIcon` inline-SVG (two bars, `aria-hidden`, 16px, `currentColor`) beside the S4 icons; reuse `ListenIcon`.
   - a `ListenBar` sub-component: a `flexWrap` row (a styled host, DIRECT tokens) — idle/playing render the toggle ui-1
     `Button` intent="ghost" `size="lg"` (icon child + `aria-label` "Listen"/"Pause", render-when `onListenToggle`) + the
     `listenLabel` (default "Listen to this book") + (playing) a `HonestProgress value={listenProgress}` when provided;
     unavailable → a `role="status"` muted `Text` line, no button. Name the region without an empty name (BR-S5-5).
   - add `listen`/`listenProgress`/`listenLabel`/`onListenToggle` to `CanvasReaderProps` + the destructure; render
     `{listen != null && <ListenBar … />}` between `Header` and `Body`.
   - barrel: add `type ListenMode` to `packages/ui/src/index.ts`.
2. Stories (`canvas-reader.stories.tsx`): `ListenIdle` · `ListenPlaying` (with progress) · `ListenUnavailable` — and
   verify an existing full-canvas story with `listen` set shows the bar in context (EC-1 persistent).
3. Tests (`canvas-reader.test.tsx`): the bar renders only when `listen` set · idle shows a Listen toggle that emits
   `onListenToggle` · playing shows a Pause toggle + a `progressbar` when `listenProgress` given · unavailable shows the
   calm `role="status"` line + NO button · **unavailable + NO `onListenToggle` still shows the calm line** (the status
   line renders independent of handler presence — nit 1) · icons are `<svg>` aria-hidden (no emoji) · the toggle is
   absent when `onListenToggle` omitted.
4. tsc + eslint + test → **blocking Visual Gate** (Brave, 3 presets × light/dark + 375; assert EC-7/EC-15 + icon/progress
   3:1 + label AA + ≥44×44 + axe) → §XXIX (`CLAUDE.md` S5 block + `canvas-reader.md` S5 rows + barrel note + slice-map
   ledger ✅).

## Deviations / open
- The §2 surfacing model (shell-rendered bar on `CanvasReader`, NOT an exported piece) is the deliberate inverse of S4 —
  grounded (no Range constraint + seam-contract homes the props on `CanvasReaderProps`). Surfaced for Approval 1.
- Region-naming (`role="region"` vs letting the toggle carry the name) resolved at impl to avoid an empty-named region
  warning in the `unavailable` state (no button to carry a name) — the honest choice is a `role="group"`/`region` with a
  static `aria-label="Listen"` so all three states are named uniformly; confirm at the Visual Gate (axe).
- `listenLabel` default copy ("Listen to this book") is product copy, not a greybox stand-in; VoiceCopy-clean (no overclaim).
- No cross-format / position-sync concerns here — listen playback position is the apps/web adapter's (S6) / BK-4 design pass.
