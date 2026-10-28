# PLAN — S6 · apps/web Books↔Reader adapter

> Entity Delivery Flow ② · per-slice §XXVI PLAN (gate 1). Slice S6 of 6 (the LAST — the PR lands here). Home:
> `apps/web/src/reader/` (NOT `@vida/ui` — the `@vida/core`↔UI crossing). Grounded in `delivery/seam-contract.md` §B +
> `envision.md` decisions 1–3 + EC-14 + the Books service `packages/core/src/services/books/types.ts` (the real source
> shapes). The sibling-adapter precedent: `apps/web/src/{flow,collection,dashboard,entity}/adapter.ts`.

## §1 · Context

The single `@vida/core`↔`@vida/ui` crossing for the Reader: maps the shipped Books service (`openReader`/`getBook`/
`listAnnotations`/`convertToSpeech`) → the `CanvasReader` props, **owning the display-resolve** (parse `position` + derive
the chapter from the TOC page-range → the EC-14 `location`) + consuming the book summary Notes page (decision 1), and
binds the shell's EMITTED intents to service writes. A **type + convention** unit (the flow/collection/dashboard/entity
precedent): the pure mappers + a `BooksReaderPort` + `bindReaderIntents` ship + test NOW; the **live `useReader(assetId)`
React-Query hook is DEFERRED to the first consumer (fe-books #36)** — no M1.2.1 reader consumer is built yet.

## §2 · Surfacing model (ratifies seam-contract §B)

**DECISION: a pure `apps/web/src/reader/adapter.ts` — the display-resolve mappers + `ReaderSource`/`toReaderProps` +
`BooksReaderPort` + `bindReaderIntents` + `createReaderAdapter`; the live hook deferred.** Grounded: seam-contract §B
homes exactly this ("type + convention (not a live hook): the live `useReader` is the first consumer's — fe-books #36");
the flow S2 adapter is the byte-for-byte precedent (port, not a concrete import, so the unit is pure + testable, the
`@vida/core` edge living in the deferred hook). Gate = **Verification (unit tests)**, NOT a Visual Gate (no new render).

> **Contract authority = the SHIPPED shell, not stale seam-contract §A (B2).** The `@vida/ui` shell diverged from the
> PROPOSED seam-contract §A during S3: annotations ship as **`annotationGroups?: AnnotationGroup[]` + `annotationsState?:
ViewState`** (canvas-reader.tsx:99-101 — NOT the flat `annotations?: ReaderAnnotation[]` / `annotationsState?:
ReaderState` §A still lists). `toReaderProps` targets the shipped `CanvasReaderProps` verbatim (the barrel is the oracle,
> the glyph/§A is not — the slice-map-checkmark lesson).

## §3 · Business rules (S6 scope)

- **BR-S6-1 (display-resolve = the heart, EC-14 / decision 2):** `resolveLocation(position, chapters)` — parse a page from
  the native `position` (M1: a leading integer; EPUB CFI / timestamp stay the deferred BK-4 design pass, `types.ts:137-144`),
  find the `BookChapter` whose `[start_page, end_page]` contains the page (`end_page` null ⇒ open-ended), and return a
  pre-resolved breadcrumb `ReactNode` "Ch. N · p. P" (middle-dot = a genuine location breadcrumb, decision 3) + the
  structured `{ chapterId?, page? }`. **Degrade-never-crash:** an unparseable/absent `position` ⇒ `chapterId: undefined`
  - an honest `location` (the raw position, or "Location unknown" when null) — NEVER a throw, NEVER a guessed page
    (conventions.md:6-8 "positions are honest").
- **BR-S6-2 (group by chapter, EC-14 / BR-S3-1):** `groupAnnotations(anns, chapters)` → `AnnotationGroup[]` PRE-GROUPED by
  resolved chapter (the shell never groups). Group order = TOC order; a resolved-but-unmatched / unresolved annotation
  falls into a trailing **"Unplaced"** group (the adapter's concern per the S3 contract). `nature` = the kind verbatim
  (identity: `'bookmark'|'highlight'|'quote'` ≡ shell `Nature`); `text` = `label` (bookmark) / `captured_text` (highlight) /
  `text` (quote) — the per-nature display field, `''` when the [E] field is null (honest, no placeholder). **Input is the
  PRE-FLATTENED `AnnotationInput` (nit 7):** the deferred hook flattens the real `AnnotationView {kind, annotation, position}`
  (types.ts:159-163 — the row nests under `.annotation`) → `{kind, id, text, position}` by extracting the per-nature text
  field; the pure mapper takes the flat projection (keeps it testable without the nested row).
- **BR-S6-3 (chapters → ReaderChapter, EC-13):** `mapChapters(chapters, currentPage?)` → `{ id, number: chapter_number,
title, pageRef: start_page!=null ? "p."+start_page : undefined, done: is_completed, current: currentPage in [start,end] }`.
  Ordered by `chapter_number`.
- **BR-S6-4 (the state boundary — stated once, B3):** `mapReaderState(file: AttachmentRef): ReaderState` maps the **access
  outcome ONLY** — `'attachment-unavailable' ⇒ 'unavailable'`, `'stored' ⇒ 'success'`. **ALL of loading/empty/error — for
  BOTH the reading column (`state`) AND the rail (`annotationsState: ViewState`) — are the deferred hook's**, derived from
  the React-Query states via UX-4 `deriveTerminalState` and threaded (the list-view state-as-prop precedent, BR-2); the
  adapter does NOT map them (there is no annotations-access concept → `annotationsState` is `ViewState`, not `ReaderState`,
  canvas-reader.tsx:101). `mapPositionNote(pos: MappedPosition): ReactNode | undefined` — `'not-synced' ⇒` "Reading position
  isn't synced across formats yet" (IR-3), `'synced' ⇒ undefined`.
- **BR-S6-5 (listen availability, IR-7):** `mapListen(result?: OcrResult): ListenMode | undefined` — `'ai-unavailable' ⇒
'unavailable'`; a `ready` result or absent ⇒ `undefined` (idle/playing are runtime playback state the hook/consumer owns
  — the adapter only maps the deny-safe unavailable branch). The `OcrResult` comes from the port's `convertToSpeech(assetId,
req: AiRequest)` (B1): **building the `AiRequest` is the deferred hook's concern**; at M1 the Books `ai?` port is dormant
  (types.ts:92) so `convertToSpeech` always returns `'ai-unavailable'` ⇒ listen is `'unavailable'` or absent (never a live
  playback at M1 — honest).
- **BR-S6-6 (summary = a Notes page, decision 1):** the `summary` slot is fed from the book-level Notes page
  (`entity_type='book'`), NOT a schema column — `toReaderProps` accepts a resolved `summary?: ReactNode` the hook reads via
  `notes.ensureEntityNote`/read (conventions.md:20). The adapter never invents a summary column.
- **BR-S6-7 (intents → writes via a PORT, IR-5):** `BooksReaderPort` = the subset of `BooksService` the reader needs
  (`openReader`/`getBook`/`listAnnotations`/`convertToSpeech`/`addBookmark`/`addHighlight`/`addQuote`/`openAnnotationNote`/
  `linkAnnotations`/`endSession`) — defined as a PORT (not a concrete import), the flow `SessionsPort` precedent.
  `bindReaderIntents(port, ctx, opts)` wires the shell's EMITTED intents to writes: `onAddNote(id) → openAnnotationNote({
kind, id})` (nature from a `natureById` lookup — a highlight id never reaches here, IR-1 shell-enforced); `onLinkAnnotation(id)
→ opts.onLink?.(id)` (the consumer opens a link picker → calls `port.linkAnnotations`, the flow `onProof` precedent);
  `onListenToggle → opts.onListenToggle?.()` (runtime playback the consumer/hook owns; the adapter maps availability, not
  transport); and the selection writes (`addHighlight`/`addQuote`/`addBookmark`) are returned bound for the consumer to
  pass to `SelectionActions` (composed in `renderContent`, S4). The shell never writes (BR-2).
- **BR-S6-8 (deferred live hook):** `useReader(assetId)` (React Query → `openReader` + `getBook` + `listAnnotations` + the
  summary Notes page, binding the real `BooksService` to `BooksReaderPort`) is built at the FIRST consumer (fe-books #36) —
  the collection/dashboard/entity/flow sibling precedent. S6 ships the pure mapping + the convention + unit tests.

## §4 · Contract (`apps/web/src/reader/adapter.ts`)

```ts
import type { ReactNode } from 'react'
import type { CanvasReaderProps, ReaderChapter, AnnotationGroup, Nature, ReaderState, ListenMode } from '@vida/ui'
type ViewState = AnnotationGroup extends never ? never : NonNullable<CanvasReaderProps['annotationsState']> // the shell's rail state
// value shapes mirrored from @vida/core (imported as TYPES — the @vida/core edge is real at apps/web; the dashboard
// mirror-by-value precedent). `AiRequest` is re-exported from the Books types barrel (types.ts:105).
type AttachmentRef = { status: 'stored'; fileRef: string } | { status: 'attachment-unavailable' }
type MappedPosition =
  | { status: 'synced'; position: string; sourceAssetId: string }
  | { status: 'not-synced'; nativePosition: string | null }
type OcrResult = { status: 'ready'; position: string; source: 'ai' } | { status: 'ai-unavailable'; reason?: string }
type AnnKind = 'bookmark' | 'highlight' | 'quote' // ≡ BooksService BookAnnotationKind ≡ shell Nature (identity)
interface ChapterInput {
  id: string
  chapter_number: number
  title: string
  start_page: number | null
  end_page: number | null
  is_completed: boolean
}
interface AnnotationInput {
  kind: AnnKind
  id: string
  text: string | null
  position: string | null
} // the hook flattens AnnotationView → this

// ── pure mappers (the heart) ──
interface ResolvedLocation {
  node: ReactNode
  chapterId?: string
  page?: number
}
function resolveLocation(position: string | null, chapters: readonly ChapterInput[]): ResolvedLocation
function mapChapters(chapters: readonly ChapterInput[], currentPage?: number): ReaderChapter[]
function groupAnnotations(anns: readonly AnnotationInput[], chapters: readonly ChapterInput[]): AnnotationGroup[]
function mapReaderState(file: AttachmentRef): ReaderState // access outcome ONLY: unavailable | success (B3)
function mapPositionNote(pos: MappedPosition): ReactNode | undefined
function mapListen(result?: OcrResult): ListenMode | undefined

// ── the assembler → the SHIPPED CanvasReaderProps surface (B2 — enumerated, not hand-waved) ──
interface ReaderSource {
  title: string
  context?: ReactNode
  summary?: ReactNode // summary = the book-level Notes page (decision 1), hook-resolved
  chapters?: ChapterInput[]
  annotations?: AnnotationInput[]
  currentPage?: number
  file?: AttachmentRef
  position?: MappedPosition
  listenResult?: OcrResult
  progress?: number
  saveStatus?: ReactNode
  action?: ReactNode
  // toggle/jump passthroughs (shell-owned state, app threads them — the collection switcher R5 precedent):
  contentsOpen?: boolean
  onToggleContents?: () => void
  onJumpToChapter?: (id: string) => void
  railOpen?: boolean
  onToggleRail?: () => void
  // state overrides (the hook's deriveTerminalState result for BOTH column + rail, B3):
  state?: ReaderState
  annotationsState?: ViewState
  onAddNote?: (id: string) => void
  onLinkAnnotation?: (id: string) => void
  onListenToggle?: () => void
}
// maps → title · context · summary · chapters(mapChapters) · annotationGroups(groupAnnotations) · annotationsState ·
// state(src.state ?? mapReaderState(file)) · positionNote(mapPositionNote) · progress · listen(mapListen) · the toggles.
function toReaderProps(src: ReaderSource): CanvasReaderProps

// ── intents → writes via a PORT (the flow SessionsPort precedent; NOT a concrete import) ──
interface BooksReaderPort {
  openReader(assetId: string): Promise<{ file: AttachmentRef; sessionId: string; position: MappedPosition }>
  convertToSpeech(assetId: string, req: AiRequest): Promise<OcrResult> // B1 — the REAL 2-arg signature
  openAnnotationNote(ref: { kind: AnnKind; id: string }): Promise<unknown>
  linkAnnotations(a: { kind: AnnKind; id: string }, b: { kind: AnnKind; id: string }): Promise<unknown>
  addBookmark(bookId: string, position: string, label?: string): Promise<unknown>
  addHighlight(assetId: string, span: { captured_text: string; position: string }): Promise<unknown>
  addQuote(bookId: string, text: string, position?: string): Promise<unknown>
  endSession(sessionId: string, capture: unknown): Promise<unknown>
}
interface ReaderIntentOptions {
  onLink?: (id: string) => void
  onListenToggle?: () => void
}
function bindReaderIntents(
  port: BooksReaderPort,
  ctx: { bookId: string; assetId: string; natureById: Record<string, Nature> },
  opts?: ReaderIntentOptions,
): {
  onAddNote: (id: string) => void // → openAnnotationNote({ kind: natureById[id], id }); a highlight never reaches here (IR-1 shell-enforced)
  onLinkAnnotation: (id: string) => void // → opts.onLink?.(id) (consumer picker → port.linkAnnotations; linkAnnotations needs TWO refs)
  onListenToggle: () => void // → opts.onListenToggle?.() (runtime playback transport the consumer/hook owns)
  onHighlight: (span: { captured_text: string; position: string }) => void // → port.addHighlight (for SelectionActions, S4)
  onQuote: (text: string) => void
  onBookmark: (position: string) => void
}
interface ReaderAdapter {
  resolveLocation
  mapChapters
  groupAnnotations
  mapReaderState
  mapPositionNote
  mapListen
  toReaderProps
  bindReaderIntents
}
function createReaderAdapter(): ReaderAdapter
```

## §5 · Acceptance (Verification Gate — unit tests, NOT Visual: no new render)

- `resolveLocation`: in-range page → "Ch. N · p. P" + `chapterId` set · boundary (page === start_page / === end_page) ·
  open-ended (`end_page` null) · unparseable position → honest fallback + `chapterId` undefined · null position → "Location
  unknown" · empty chapters → no chapter, page-only breadcrumb.
- `groupAnnotations`: grouped by chapter in TOC order · unresolved → trailing "Unplaced" group · nature identity ·
  per-nature text extraction (label/captured_text/text; null → '').
- `mapChapters`: number/title/pageRef/done · `current` true only for the chapter whose range holds `currentPage`.
- `mapReaderState`: attachment-unavailable → 'unavailable' · stored → 'success'. `mapPositionNote`: not-synced → the IR-3
  line · synced → undefined. `mapListen`: ai-unavailable → 'unavailable' · ready/absent → undefined.
- `bindReaderIntents`: onAddNote → `openAnnotationNote({kind,id})` with the right nature · onLinkAnnotation → `opts.onLink`
  · onListenToggle → `opts.onListenToggle` · onHighlight/onQuote/onBookmark → the right port write · degrade-never-crash
  (a missing `opts` callback no-ops, never throws).
- `toReaderProps`: a near pass-through assembler maps every field.
- tsc 0 · eslint 0 (S6 files) · the `apps/web` reader tests green · full `@vida/core`/`apps/web` suites unregressed.

## §6 · Implementation prompt

1. `apps/web/src/reader/adapter.ts` — the mappers (BR-S6-1…6), `toReaderProps`, `BooksReaderPort`, `bindReaderIntents`
   (BR-S6-7), `createReaderAdapter`. TYPES mirrored from `@vida/core` value shapes (the `AttachmentRef`/`MappedPosition`
   dashboard-adapter precedent — mirror-by-value where importing the whole service type is heavier than the shape).
2. `apps/web/src/reader/adapter.test.ts` — the §5 cases (pure, no live store — stated).
3. `apps/web/src/reader/CLAUDE.md` — the convention + deferred-hook note (the flow/CLAUDE.md shape).
4. tsc + eslint + tests → **Verification Gate** → §XXIX (slice-map S6 ✅ · `canvas-reader.md` S6 rows · the new layer doc)
   → then the **PR for the whole unit** (S1–S6).

## Deviations / open

- Value shapes mirrored (not imported) from `@vida/core` where the whole service type is heavier than the shape (the
  dashboard-adapter `AttachmentRef`/`MappedPosition` precedent); the live hook (fe-books #36) binds the REAL service to
  `BooksReaderPort`, where the concrete `@vida/core` import lives.
- Cross-format position mapping (EPUB CFI / timestamp line resolution) stays the deferred BK-4 design pass (`types.ts:137`);
  M1 resolves a leading-integer page only — honest, never guessed.
- `onListenToggle`/`onLink` are consumer-owned runtime flows (playback transport / a link picker) — the adapter maps
  availability + binds the write entry points, the flow `onProof` precedent.
