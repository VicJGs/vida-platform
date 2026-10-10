# PLAN — S1 · CanvasReader frame + reading column + states

> Entity Delivery Flow ② · per-slice §XXVI PLAN (gate 1 = this spec). Slice S1 of 6 (slice-map.md). Home: `@vida/ui`.
> Grounded in `seam-contract.md` §A + `envision.md` EC-1/2/3/8/9/10/11 + the `flow-session-view.tsx` pattern.

## §1 · Context
The shell skeleton for the Canvas: Reader — the 5th archetype shell. S1 ships the FRAME + the reading-column slot +
the shell-owned terminal states. The Contents panel (S2), rail (S3), selection (S4), listen (S5) compose INTO the
frame's named zones in later slices; S1 renders their **placeholders/slots** so the layout + states are gate-able now.
Presentational, state-as-prop, LOCAL types, React-19 ref-prop — the `flow-session-view` shape.

## §2 · Business rules (S1 scope)
- **BR-S1-1 (title-hero header, EC-2):** serif `$display` title carries alone (no eyebrow, no middle-dot meta) + ONE
  plain-language `context` line + a `HonestProgress` reading-% **bar rendered ONLY when `progress` is provided** (a reader
  has no stages to derive from — the flow-session derivation does NOT apply) + a `saveStatus` slot + `⋯` `action` slot;
  `TitleGroup gap:'$16'` (the fix-entity-view-header rhythm).
- **BR-S1-2 (not-synced line, IR-3):** `positionNote` renders a quiet `$small` muted line under the context when provided.
- **BR-S1-3 (frame + reading column, EC-1/3/9 — S1 scope):** a `Body` flex-wrap row whose S1 content is the **reading
  column** (the hero: serif measure, `maxWidth` ~660, generous leading, centered). **S2 (Contents) + S3 (rail) EXTEND the
  `Body` with their shell-owned zones** (driven by `chapters`/`annotations` props — NOT consumer slots); the FULL 3-zone
  living-margin + its 375 reflow completes at S3 (coverage map). S1 proves the header + column reflow at 375 (flexBasis +
  `flexShrink:1` — the dashboard/gallery RNW lesson, never collapse to 0).
- **BR-S1-4 (reading body slot, EC-3):** `renderContent()` supplies the format-agnostic body; called **only on
  `state==='success'`** (the flow-session `renderStage` precedent).
- **BR-S1-5 (terminal + access states, EC-8):** shell owns `loading` (calm skeleton + `aria-busy`) · `empty` (teaching
  `EmptyState`) · `error` (`role="status"` MUTED, never `$colorSignalDanger` — the dashboard AA lesson) · **`unavailable`**
  (access — a distinct calm `role="status"` line, NOT empty). `renderContent` runs only for `success`.
- **BR-S1-6 (tokens/type, EC-10/11):** DIRECT semantic tokens (preset-inherit); semantic type scale, NO arbitrary px;
  designed dark; preset accent flips on the progress bar; full-matrix AA.
- **BR-S1-7 (a11y):** the root is a `role="region"` named via `aria-label`/`aria-labelledby`→titleId (`warnMissingName`).

## §3 · Contract (S1 subset of `CanvasReaderProps`)
`title` · `context?` · `progress?` · `progressLabel?` · `saveStatus?` · `action?` · `positionNote?` · `state?:ReaderState`
(`'loading'|'empty'|'error'|'unavailable'|'success'`) · `renderContent?` · `emptyAction?` (the EmptyState way-in) ·
`aria-label?`/`aria-labelledby?` · `ref`. Local `ReaderState` union (extends `ViewState` with `'unavailable'`).
**No zone-slot props** — Contents (S2) + rail (S3) extend the `Body` as shell-owned zones driven by their own props
(`chapters`/`annotations`), added when those slices land. S1 introduces no prop it will later delete.

## §4 · Acceptance (the blocking Visual Gate MUSTs)
- EC-2 title-hero (serif `$display`, no eyebrow/meta, 16px rhythm) · EC-3 measured serif column on success ·
  EC-8 all 5 states render (loading/empty/error/unavailable/success) with `unavailable` ≠ `empty` ·
  EC-1 3-zone layout · EC-9 375 reflow (zones stack, no overflow) · EC-10 dark × 3 presets, accent flips, AA ≥4.5 ·
  EC-11 semantic scale. · tsc 0 · eslint 0 · `@vida/ui` tests green · axe 0.

## §5 · Implementation prompt (build order)
1. `packages/ui/src/components/canvas-reader.tsx` — types first (`ReaderState` local union) → the styled hosts
   (`CanvasRoot`/`Header`/`TitleGroup gap:$16`/`MetaGroup`/`Body`/`ReadingColumn maxWidth:660`, all `name:`-less, DIRECT
   tokens) → the header (title-hero, composing `HonestProgress` conditionally + the saveStatus/action slots) → the `Body`
   holding the reading column (S2/S3 extend it) → the 5-state switch for the reading column (skeleton / EmptyState / muted
   `role=status` error / muted `role=status` unavailable / `renderContent` on success) → region a11y (`warnMissingName`, `useId`).
2. Barrel: export `CanvasReader` + `CanvasReaderProps` + `ReaderState` from `packages/ui/src/index.ts`.
3. `canvas-reader.stories.tsx` — the Visual-Gate surface: `Reading` (success, full) · `States` (loading/empty/error/
   unavailable) · `375` reflow. Fake data; the Contents/rail zones show placeholder content.
4. `canvas-reader.test.tsx` — the 5 states render the right role/host; `renderContent` only on success; a11y name guard;
   `unavailable` ≠ `empty`.
5. tsc + eslint + test → then the blocking Visual Gate (Brave, 3 presets × light/dark + 375).
6. §XXIX: refresh `packages/ui/src/CLAUDE.md` (a CanvasReader entry) + the component spec.

## Deviations / open
None — S1 follows `flow-session-view` directly. Deferred to later slices: the real Contents panel (S2), rail (S3),
selection (S4), listen bar (S5) — S1 renders their slots so the frame + states gate independently.
