# apps/web/src/reader — the Books ↔ CanvasReader adapter (fe-codec-canvas-reader S6)

## What this is
The `apps/web` plane of the CODEC Canvas: Reader shell (#9). Binds `@vida/ui`'s presentational `CanvasReader` to the
`@vida/core` Books service — the single `@vida/core`↔UI crossing (the Tamagui-only boundary forbids a `@vida/core` import
in `@vida/ui`, BR-2). The flow/collection/dashboard/entity adapter precedent.

## Pattern in use
- **The display-resolve (the heart, EC-14)** — `@vida/ui` renders a pre-resolved location; this plane owns the resolve:
  - `resolveLocation(position, chapters)` — parse a page from the native `position` (M1: a LEADING INTEGER; EPUB CFI /
    timestamp line-resolution is the deferred BK-4 design pass) → the `BookChapter` whose `[start_page,end_page]` holds it
    → a "Ch. N · p. P" breadcrumb (decision 3 middle-dot) + `{chapterId, page}`. **Degrade-never-crash:** unparseable → the
    raw string; null → "Location unknown" — never a throw, never a guessed page (conventions.md:6-8 "positions are honest").
  - `groupAnnotations(anns, chapters)` — PRE-GROUP by resolved chapter in TOC order + a trailing **"Unplaced"** group (the
    shell never groups, BR-S3-1); nature is identity (`BookAnnotationKind` ≡ shell `Nature`); text = the per-nature field.
  - `mapChapters(chapters, currentPage)` — the `ReaderChapter[]` TOC (number/title/pageRef/done/current).
- **The state boundary (B3)** — `mapReaderState(file)` maps the ACCESS outcome ONLY (`attachment-unavailable → 'unavailable'`,
  `stored → 'success'`). ALL loading/empty/error — for BOTH the column (`state`) and the rail (`annotationsState: ViewState`)
  — are the deferred hook's `deriveTerminalState` (BR-2). `mapPositionNote` = the IR-3 not-synced line; `mapListen` =
  `ai-unavailable → 'unavailable'` (IR-7, the rest of listen is runtime).
- **`toReaderProps(src)`** — the assembler → the SHIPPED `CanvasReaderProps` (the shell's `annotationGroups` + `annotationsState:
  ViewState`, NOT the stale seam-contract §A flat `annotations[]`); explicit `state`/`listen` override the derived map.
- **`BooksReaderPort` + `bindReaderIntents(port, ctx, opts)`** — the shell/SelectionActions EMIT, here is where writes happen
  (BR-2): `onAddNote → openAnnotationNote({kind, id})` (nature from `natureById`; a highlight never reaches here, IR-1
  shell-enforced); `onLinkAnnotation → opts.onLink` (a consumer link picker → `port.linkAnnotations`, which needs TWO refs);
  `onListenToggle → opts.onListenToggle` (runtime playback transport); and the bound selection writes
  (`addHighlight`/`addQuote`/`addBookmark`) the consumer passes to `SelectionActions` (S4). `convertToSpeech` carries the
  real `AiRequest` (the hook builds it; M1 `ai?` dormant → always `ai-unavailable`). The PORT (not a concrete import) keeps
  S6 pure + testable — the `@vida/core` edge lives in the deferred hook (the flow `SessionsPort` precedent).

## Deferred (first consumer — fe-books #36)
The live **`useReader(assetId)`** hook — React Query → `openReader` + `getBook` + `listAnnotations` + the book-summary Notes
page (decision 1, `notes.ensureEntityNote`/read), binding the real `BooksService` to `BooksReaderPort`, flattening
`AnnotationView {kind, annotation, position}` → `AnnotationInput {kind, id, text, position}`, and deriving the terminal
states. Also the live selection Range→rect anchoring (S4 `SelectionActions` composed in `renderContent`). The
collection/dashboard/entity/flow sibling precedent.

## Imports
- `CanvasReaderProps`/`ReaderChapter`/`AnnotationGroup`/`ReaderAnnotation`/`Nature`/`ReaderState`/`ListenMode` from `@vida/ui`.
- `type AiRequest` from `@vida/core` (via the `foundation/ai` barrel re-export) — the only `@vida/core` edge in S6, type-only;
  the concrete service binding is the deferred hook's.
- `AttachmentRef`/`MappedPosition`/`OcrResult`/`ChapterInput`/`AnnotationInput` are mirror-by-value projections of the
  `@vida/core` Books shapes (the dashboard-adapter mirror-by-value precedent).

## Spec
`docs/specs/components/ui-2-platform-views/canvas-reader.md` · delivery `docs/specs/foundation/fe-codec-canvas-reader/`.
