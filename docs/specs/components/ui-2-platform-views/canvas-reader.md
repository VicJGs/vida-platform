# CanvasReader — component spec (durable · §XXIX)

> `@vida/ui` CODEC **Canvas: Reader** shell (fe-codec-canvas-reader #9, LIF-206) — the 5th archetype shell. Built
> slice-by-slice; this spec grows per slice. Delivery/front-matter: `docs/specs/foundation/fe-codec-canvas-reader/`.

## Intent
A long-form **read · listen · annotate** reading surface — *"the reading column with a living margin."* Text is the
hero; annotations live in a margin rail aligned to the text; a Contents panel (summary + TOC) and a slim listen bar
frame it. Presentational, state-as-prop (BR-2), LOCAL types (no `@vida/core` import), non-generic (React-19 ref-prop).
Consumes the shipped `@vida/core` Books service via the apps/web adapter (S6) — never directly.

## Slices
- **S1 ✅ — frame + reading column + states.** title-hero header · `renderContent` slot (success-only) · the 5 states.
- **S2 ✅ — Contents panel (summary + TOC).** `ReaderChapter` + `summary`/`chapters`/`contentsOpen`/`onToggleContents`/
  `onJumpToChapter`; shell-owned TOC (completion ✓ · current accent+`aria-current` · pressable-when-jump) · "Contents"
  toggle (`aria-pressed`) · realizes the living-margin layout · Header `flexWrap`+floor fix (375 word-wrap).
- **S3 ✅ — margin rail (annotations).** `Nature`/`ReaderAnnotation`/`AnnotationGroup` + `annotationGroups`/
  `annotationsState`/`railOpen`/`onToggleRail`/`onAddNote`/`onLinkAnnotation`; the right Body zone (completes the
  living margin): annotations **pre-grouped by chapter** (counts total + per-chapter) · three natures visually distinct
  (shape-differentiated accent markers + labels) · pre-resolved location · **IR-1 shell-enforced** (highlight never
  linkable) · 4-state `RailBody` · "Annotations" toggle.
- **S4 ✅ — selection affordance.** two exported pieces the consumer composes in `renderContent` (the shell can't own/
  anchor into the body it doesn't render): **`SelectionActions`** (a `role="toolbar"` of real-SVG icon buttons —
  Highlight · Quote · Bookmark · Listen-from-here, `size="lg"` 44×44, render-when-handler, emits intents) +
  **`ReaderHighlightMark`** (a 2px accent-underline inline mark, text held). The 4 `on*Selection` live on `SelectionActions`,
  NOT `CanvasReaderProps`.
- **S5 ✅ — listen control.** a slim persistent **listen bar** (book-level chrome ON `CanvasReaderProps` — the inverse of
  S4's exported pieces: no `Range` to anchor): `listen?: ListenMode` drives idle (Listen toggle) / playing (Pause +
  `HonestProgress`) / unavailable (calm `role=status`, IR-7); real SVG icons, `onListenToggle` intent. · S6 — apps/web
  Books↔Reader adapter (display-resolve).

## S1 contract
```ts
type ReaderState = ViewState | 'unavailable'   // 'loading'|'empty'|'error'|'unavailable'|'success'
interface CanvasReaderProps {
  title: string                 // serif $display H1; names the region
  context?: ReactNode           // ONE plain-language location line ($small muted)
  progress?: number             // 0..1 → HonestProgress bar; rendered ONLY when provided
  progressLabel?: string
  saveStatus?: ReactNode        // SyncStatus slot
  action?: ReactNode            // ⋯ slot
  positionNote?: ReactNode      // honest not-synced line (IR-3)
  state?: ReaderState           // default 'success'
  renderContent?: () => ReactNode // success-only
  emptyTitle?: string           // default "Nothing to read yet"
  emptyAction?: ReactNode       // EmptyState way-in
  'aria-label'?, 'aria-labelledby'?, ref?
}
```

## S1 business rules
- **BR-S1-1** title-hero: serif `$display` title alone (no eyebrow / no middle-dot meta); progress BAR only when `progress` given.
- **BR-S1-2** `positionNote` → quiet `$small` muted line (IR-3), only when provided.
- **BR-S1-3** Body = centered reading column (`maxWidth:660`); S2/S3 extend into the 3-zone living-margin row.
- **BR-S1-4** `renderContent` runs ONLY on `state==='success'`.
- **BR-S1-5** 5 states: loading skeleton (`aria-busy`) · empty teaching `EmptyState` · error `role=status` muted ·
  **`unavailable` = a DISTINCT calm access status, NOT empty** (physical copy / no file) · success.
- **BR-S1-6** DIRECT semantic tokens; semantic type scale, no px; designed dark; preset accent on the bar; AA full-matrix.
- **BR-S1-7** region named via `aria-label`/`aria-labelledby`→titleId (`warnMissingName`).

## S1 verification
Visual Gate PASS (Brave, editorial/reader/quietDesk × light/dark + 375: title-hero · serif column · 5 states
unavailable≠empty · accent flip · **AA MEASURED 0-fail incl. warm-dark** · 375 reflow). tsc 0 · eslint 0 · 9/9 tests.

## S3 contract (added to `CanvasReaderProps`)
```ts
type Nature = 'highlight' | 'bookmark' | 'quote'
interface ReaderAnnotation { id: string; nature: Nature; text: ReactNode; location: ReactNode } // location pre-resolved (S6)
interface AnnotationGroup  { id: string; title: ReactNode; annotations: ReaderAnnotation[] }     // pre-grouped by chapter
// + on CanvasReaderProps:
annotationGroups?: AnnotationGroup[]
annotationsState?: ViewState            // loading|empty|error|success; default 'success' (NOT ReaderState)
railOpen?: boolean                      // default true when annotations exist; app owns the state
onToggleRail?: () => void
onAddNote?: (annotationId: string) => void        // IR-1: never offered on a highlight row
onLinkAnnotation?: (annotationId: string) => void // bookmark & quote only
```

## S3 business rules
- **BR-S3-1 (pre-grouped, EC-14):** renders `annotationGroups` the **adapter** builds (S6); the shell NEVER groups/sorts/
  parses (board-view/list-view `sections` precedent). Chapter derivation + an "Unplaced" bucket are S6's.
- **BR-S3-2 (IR-1 shell-enforced, EC-5):** `linkable = nature !== 'highlight'` gates both affordances BEFORE handler
  presence → a highlight shows neither Add-note nor Link even if the handlers are passed (`AnnotationNotLinkableError`
  is thus UI-unreachable dead defence).
- **BR-S3-3 (three distinct natures, EC-6/EC-11):** a `$caption` uppercase **nature label** (non-colour signal) + a
  per-nature **accent marker** (graphical object, ≥3:1): highlight = filled block · bookmark = outlined · quote =
  accent bar. Token-pure (no accent-surface tint).
- **BR-S3-3a (bounded text):** the excerpt is `numberOfLines={3}` clamped (house idiom) — the full text lives in the
  opened annotation note, not the rail.
- **BR-S3-4 (location, EC-14/IR-8):** `annotation.location` is a ready `ReactNode` — the shell never parses `position`.
- **BR-S3-5 (counts + scale, EC-14/IR-10):** total count + per-chapter count; non-virtualized (>100 → data layer,
  consistent with every UI-2 renderer).
- **BR-S3-6 (states, BR-2):** `annotationsState` loading (`aria-busy`) / empty (teaching `EmptyState` `titleLevel=3`) /
  error (`role=status` muted) / success (success+no-groups degrades to empty).
- **BR-S3-7 (toggle, R5):** `railOpen` (default true) + `onToggleRail`; an "Annotations" header toggle (`aria-pressed`).
- **BR-S3-8 (layout/reflow, EC-9):** the right Body zone mirrors `ContentsZone` (`borderLeftWidth` + `flexShrink:1`);
  stacks below the column at 375/768; Body `justifyContent` → `flex-start` when either zone is present.
- **BR-S3-9 (intents, IR-5):** `onAddNote`/`onLinkAnnotation` emit ids only; the shell never writes.
- **BR-S3-10 (a11y):** `role="region"` "Annotations" → per-chapter `role="list"` `aria-labelledby` a `useId`-prefixed,
  index-keyed eyebrow id (NOT `group.id` — may hold spaces) → `role="listitem"` rows; markers `aria-hidden`.
- **BR-S3-11 (tokens/type/motion):** DIRECT semantic tokens; semantic scale; designed dark; accent flips per preset;
  AA full-matrix incl. warm-dark; no new motion.

## S3 verification
Visual Gate PASS (Brave, editorial/reader/quietDesk × light/dark + 390 + 768: grouped-by-chapter · counts · 3 distinct
markers · **IR-1 highlight-no-affordance every cell** · text AA 0-fail (worst 4.52) · **marker 3:1 0-fail (4.95–6.41,
incl. warm-dark)** · rail states · rail stacks below at 390/768 · no overflow · **axe 0**). tsc 0 · eslint 0 · 26/26
canvas-reader tests · full `@vida/ui` **496/496** (2 concurrency flakes in untouched files, green on isolation + re-run).

## S4 contract (NEW exports — NOT on `CanvasReaderProps`)
```ts
type Nature = 'highlight' | 'bookmark' | 'quote'   // (also now barrel-exported; was shipped in S3)
interface SelectionActionsProps {
  onHighlight?: () => void; onQuote?: () => void; onBookmark?: () => void; onListenFrom?: () => void
  listenAvailable?: boolean        // default true; false ⇒ Listen-from-here omitted (IR-7)
  'aria-label'?: string            // default "Turn selection into"
  ref?: Ref<HTMLDivElement>
}
function SelectionActions(p: SelectionActionsProps): JSX.Element
interface ReaderHighlightMarkProps { children: ReactNode; ref?: Ref<HTMLElement> }
function ReaderHighlightMark(p: ReaderHighlightMarkProps): JSX.Element
```

## S4 business rules
- **BR-S4-surfacing (IR-NEEDS-3 / EC-12):** the reading body is the consumer's `renderContent` slot — the shell can't own
  it, detect a selection, or anchor an overlay. So S4 ships `SelectionActions` + `ReaderHighlightMark` as **pieces the
  consumer composes INSIDE `renderContent`** (anchored at the `Range` they own); the 4 callbacks move off `CanvasReaderProps`.
- **BR-S4-1 (action set, EC-4):** `role="toolbar"` (Tab-stops, the collection-view switcher precedent) of icon Buttons —
  Highlight · Quote · Bookmark · Listen-from-here; each renders **only when its handler is passed**; emits intent, never
  writes (IR-5).
- **BR-S4-2 (real icons, EC-15):** inline SVGs (no icon-set dep; no emoji), `aria-hidden`, `currentColor` → the ghost
  `$colorBrandPrimary` via `ButtonText` (the Button-spinner precedent).
- **BR-S4-3 (listen degrade, IR-7):** Listen-from-here renders iff `onListenFrom && listenAvailable !== false`.
- **BR-S4-4 (inline mark, EC-3):** `ReaderHighlightMark` = a **2px accent `borderBottom`** (`$colorBrandPrimary`); font +
  colour **inherit** from the enclosing paragraph (hold the text); token-pure (no accent-surface bg). Use inside a `<Text>`.
- **BR-S4-6a (touch target, §X):** icon buttons `size="lg"` → 48px (icon-only ≈ 56×48 ≥ 44×44).
- **BR-S4-6b (375):** the toolbar is a `flexWrap` row (no mid-control overflow — the flow-session `AffordanceRow` lesson).

## S4 verification
Visual Gate PASS (Brave, editorial/reader/quietDesk × light/dark + 390: **EC-15 real SVG icons, 0 emoji** · **icon 3:1
0-fail 4.95–6.41 incl. warm-dark** · 56×48 ≥ 44×44 · **mark underline 3:1 5.63–6.41@2px · mark text AA 15.84–17.29 held** ·
body text AA 0-fail · **axe 0**). tsc 0 · eslint 0 (S4 files) · 33/33 canvas-reader tests · full `@vida/ui` **503/503**
(the known untouched-file concurrency flake, green on re-run). Live Range→rect anchoring = apps/web (S6 / fe-books #36).

## S5 contract (added to `CanvasReaderProps`)
```ts
type ListenMode = 'idle' | 'playing' | 'unavailable'   // LOCAL union (the ReaderState precedent); barrel-exported
// + on CanvasReaderProps:
listen?: ListenMode            // the slim listen bar renders ONLY when provided (the `progress` render-when-provided precedent)
listenProgress?: number        // 0..1; the HonestProgress bar shows in 'playing' ONLY + only when provided (honest, no fake fill)
listenLabel?: ReactNode        // default "Listen to this book"
onListenToggle?: () => void    // intent only; the control renders on idle/playing only when provided
```

## S5 business rules
- **BR-S5-surfacing (inverse of S4):** the listen bar is **book-level persistent chrome** — there is no `Range` to anchor,
  so (unlike S4) it lives ON `CanvasReaderProps` (the seam-contract §A homing), NOT a consumer-composed export. `ListenBar`
  renders between `Header` and `Body` **only when `listen != null`**.
- **BR-S5-1 (the bar, EC-1):** a slim `flexWrap` row (`$colorSurfaceSecondary` surface); `ListenMode` is a LOCAL union.
- **BR-S5-2 (three honest states, EC-7):** idle → `ListenIcon` toggle (reused from S4) + `listenLabel`, starts; playing →
  `PauseIcon` toggle (`aria-pressed`) + `listenLabel` + `HonestProgress` (shown only when `listenProgress` given);
  unavailable → a CALM `role="status"` muted line "Listening isn't available on this device", **no button, never
  `$colorSignalDanger`** (IR-7; the reading-column `unavailable` precedent).
- **BR-S5-3 (real icons, EC-15):** reuse `ListenIcon` + a new inline `PauseIcon` (the S4 icon recipe: 16px, `aria-hidden`,
  `currentColor`); never an emoji.
- **BR-S5-4 (intent only, IR-5):** the toggle renders on idle/playing only when `onListenToggle` passed (render-when-handler);
  emits, never writes.
- **BR-S5-5 (a11y, §XIV):** **all three states are a `role="group" aria-label="Listen"`** so `unavailable` (no button to
  carry a name) is never an empty-named region; the toggle is a ui-1 `Button size="lg"` (56×48 ≥ 44×44); `HonestProgress`
  is `role="progressbar"`; no new motion (determinate `transform:scaleX`, B12-safe).
- **BR-S5-6 (375, EC-9):** single `flexWrap` row; the label wraps under the control, never a mid-control overflow (the
  flow-session `AffordanceRow` / RNW `flexShrink:0`-default lesson).
- **BR-S5-7 (tokens/type, EC-10/11):** DIRECT semantic tokens; the icon + the progress fill carry accent (flips per preset);
  AA full-matrix incl. warm-dark; the icon is a graphical object ≥3:1.

## S5 verification
Visual Gate PASS (Brave, editorial/reader/quietDesk × light/dark + 375: 3 named Listen groups every cell · toggle 56×48 ≥
44×44 · **real SVG 0-emoji** · **icon 3:1 0-fail 4.39–5.27 incl. warm-dark** · label AA 0-fail 4.52–5.22 (incl. the muted
line on `$colorSurfaceSecondary`) · progressbar in playing · calm `role=status` unavailable · no 375 overflow · **axe 0**).
tsc 0 · eslint 0 (S5 files) · 42/42 canvas-reader tests · full `@vida/ui` **512/512**. Live TTS wiring
(`convertToSpeech` + playback position) = apps/web (S6 / fe-books #36).
