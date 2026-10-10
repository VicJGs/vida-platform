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
- S3 — margin rail (annotations, IR-1). · S4 — selection affordance.
- S5 — listen control (SVG icons). · S6 — apps/web Books↔Reader adapter (display-resolve; `apps/web`).

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
