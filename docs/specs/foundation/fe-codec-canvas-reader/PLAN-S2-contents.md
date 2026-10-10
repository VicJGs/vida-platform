# PLAN — S2 · Contents panel (summary + TOC)

> Entity Delivery Flow ② · per-slice §XXVI PLAN (gate 1). Slice S2 of 6. Home: `@vida/ui` (extends `canvas-reader.tsx`).
> Grounded in `seam-contract.md` §A + `envision.md` EC-13 + the resolved summary decision (book-level Notes page).

## §1 · Context
Extends the S1 frame with the toggleable **Contents** panel — a book **summary** slot ("About") + a shell-owned **TOC**
rendered from `chapters`. This is the first slice to turn the S1 centered column into the **living-margin** layout (the
panel becomes the left zone; the reading column flanks it). The rail (S3) adds the right zone next.

## §2 · Business rules (S2 scope)
- **BR-S2-1 (shell-owned TOC, EC-13):** renders `chapters: ReaderChapter[]` — each row = completion mark (✓ when `done`)
  · `number. title` · optional `pageRef` · the **current** chapter accent+weighted (`aria-current="true"`). Scales to
  many chapters (no cap; scrolls with the page).
- **BR-S2-2 (summary slot):** `summary?: ReactNode` under a quiet "About" label (the book-level Notes page content —
  decision 1; the shell renders the slot, the adapter supplies it). Panel renders iff `summary` OR `chapters` present.
- **BR-S2-3 (jump intent):** a chapter row is pressable **only when `onJumpToChapter` is given** (the `collection onFilter`
  precedent) → emits `onJumpToChapter(id)`; the shell owns no scroll. Display-only otherwise.
- **BR-S2-4 (toggle, R5 app-owned):** `contentsOpen?` (default `true` when content exists) + `onToggleContents`; a
  "Contents" header toggle (`aria-pressed`, the collection switcher precedent). Panel renders only when open.
- **BR-S2-5 (layout/reflow, EC-9):** the panel = the left zone of the Body flex-wrap row (`flexBasis:260 minWidth:220
  flexShrink:1` — the RNW never-collapse lesson); the reading column flanks it; at 375 the panel **stacks above** the
  column (flexWrap). Body `justifyContent` flips center→flex-start when the panel is present.
- **BR-S2-6 (a11y):** the panel is a labeled region (`aria-label="Contents"`); the TOC is a `role="list"`; pressable rows
  are `role="button"` + keyboard (the card.tsx interactive precedent) with `aria-current` on the current chapter.
- **BR-S2-7 (tokens/type, EC-10/11):** DIRECT tokens; semantic scale; current chapter uses `$colorBrandEmphasis`
  (the accent-on-both decision); AA full-matrix incl. warm-dark.

## §3 · Contract (added to `CanvasReaderProps`)
```ts
interface ReaderChapter { id: string; number: number; title: ReactNode; pageRef?: ReactNode; done?: boolean; current?: boolean }
// + on CanvasReaderProps:
summary?: ReactNode
chapters?: ReaderChapter[]
contentsOpen?: boolean          // default true when summary/chapters exist; app owns the state
onToggleContents?: () => void
onJumpToChapter?: (chapterId: string) => void
```

## §4 · Acceptance (Visual Gate MUSTs)
- EC-13: summary ("About") + a TOC that scales to many chapters · completion ✓ · **current chapter marked (accent +
  aria-current)** · jump affordance when `onJumpToChapter` given · the toggle shows/hides the panel ·
- the living-margin layout reads (panel ∣ reading column) · 375 reflow (panel stacks, no overflow) ·
- dark × 3 presets · AA MEASURED 0-fail incl. warm-dark · tsc 0 · eslint 0 · tests green · axe 0.

## §5 · Implementation prompt
1. `canvas-reader.tsx` — add `ReaderChapter` + the 5 props → a `ContentsPanel` sub-component (labeled region · "About"
   summary · `role=list` TOC; a `ChapterRow` = pressable-when-jump via role=button + Enter/Space + aria-current, else a
   plain row) → insert it as the Body's left zone when `(contentsOpen ?? hasContent)` → add the "Contents" header toggle
   (in MetaGroup, `aria-pressed`) → flip Body `justifyContent` when the panel renders.
2. Stories: `ContentsOpen` (panel + column) · `ContentsMany` (long TOC, scale) · `Contents375` (reflow). Fake summary + 10 chapters.
3. Tests: TOC renders N chapters · current has aria-current · jump emits id (pressable only when onJumpToChapter) ·
   toggle hides/shows (onToggleContents) · panel absent when no content.
4. tsc + eslint + test → blocking Visual Gate (Brave, 3 presets × light/dark + 375) → §XXIX (CLAUDE.md + canvas-reader.md).

## Deviations / open
None expected — follows the dashboard/collection shell-owned-zone + toggle patterns. The summary CONTENT source (Notes
page) is the adapter's (S6); S2 renders the slot.
