# Seam-contract — fe-codec-canvas-reader (#9, Canvas: Reader)

> Entity Delivery Flow ② · Step 2. The seam = (A) the `CanvasReader` **component contract** (`@vida/ui`,
> presentational, LOCAL types) + (B) the **apps/web adapter** that wires it to the shipped Books service. No
> `@vida/core` import in `@vida/ui` (Tamagui-only boundary). Types below are PROPOSED — ratified/refined per slice
> at each `/contract` step. Mirrors the flow-session seam-contract shape.

## A · `CanvasReader` component contract (`@vida/ui`)

```ts
// LOCAL unions (no @vida/core / @vida/types import — structural typing makes core values assignable).
type ReaderState = 'loading' | 'empty' | 'error' | 'unavailable' | 'success' // extends ViewState with 'unavailable' (access, IR-NEEDS-4)
type Nature = 'highlight' | 'bookmark' | 'quote'
type ListenMode = 'idle' | 'playing' | 'unavailable' // IR-7 (TTS deny-safe)

interface ReaderChapter {
  id: string
  number: number
  title: ReactNode
  pageRef?: ReactNode
  done?: boolean
  current?: boolean
}
// location is ALREADY RESOLVED by the adapter (S6) — the shell only renders it (EC-14; no parsing in @vida/ui).
interface ReaderAnnotation {
  id: string
  nature: Nature
  text: ReactNode
  location: ReactNode
}

interface CanvasReaderProps {
  // ── header (S1) ──
  title: string
  context?: ReactNode // ONE plain-language location line (EC-2; no middle-dot meta-string)
  progress?: number // 0..1 reading fraction → HonestProgress bar (derived if omitted)
  progressLabel?: string
  saveStatus?: ReactNode // a SyncStatus slot
  action?: ReactNode // the ⋯ slot
  positionNote?: ReactNode // the honest not-synced line (IR-3); rendered only when provided

  // ── reading column (S1 / S4) ──
  state?: ReaderState // BR-2 state-as-prop; shell owns loading/empty/error/unavailable; renderContent only on 'success'
  renderContent?: () => ReactNode // the format-agnostic reading body (the consumer supplies it — the renderStage precedent)

  // ── Contents panel (S2) ──
  summary?: ReactNode // the book summary (from a book-level Notes page — decision 1)
  chapters?: ReaderChapter[]
  contentsOpen?: boolean // toggleable; app owns the state (R5, the collection switcher precedent)
  onToggleContents?: () => void
  onJumpToChapter?: (chapterId: string) => void

  // ── margin rail (S3) ──
  annotations?: ReaderAnnotation[]
  annotationsState?: ReaderState // BR-2; empty → teaching EmptyState
  railOpen?: boolean
  onToggleRail?: () => void
  onAddNote?: (annotationId: string) => void // SHELL ENFORCES IR-1: never offered on a highlight row
  onLinkAnnotation?: (annotationId: string) => void // ditto — bookmark & quote only

  // ── selection (S4) ── the action set; the shell emits intents, never writes
  onHighlightSelection?: () => void
  onQuoteSelection?: () => void
  onBookmarkSelection?: () => void
  onListenFromSelection?: () => void

  // ── listen (S5) ──
  listen?: ListenMode
  listenProgress?: number // 0..1 when playing
  listenLabel?: ReactNode
  onListenToggle?: () => void

  'aria-label'?: string
  'aria-labelledby'?: string
  ref?: Ref<HTMLDivElement> // React-19 ref-as-prop → the region element
}
```

**Contract rules (from the IRs / ECs):**

- **IR-1 is shell-enforced** (EC-5): a `nature:'highlight'` row renders **no** Add-note/Link affordance, regardless of
  whether `onAddNote`/`onLinkAnnotation` are passed. The gate FAILS if a highlight shows one.
- **State-as-prop (BR-2):** the app derives `state`/`annotationsState`/`listen` + threads them; the shell owns the
  generic terminal states and emits intents — **never a write** (IR-5; the flow-session precedent).
- **`'unavailable'` ≠ `'empty'`** (IR-NEEDS-4): access-unavailable (physical copy / no file) is a distinct calm state.
- **Location is pre-resolved** (EC-14): `ReaderAnnotation.location` is a ready `ReactNode` — the shell does **not**
  parse `position` or derive chapters (that's S6's job).
- **Accent on BOTH** (EC-11, Victor): the nature markers AND the live signals (progress · listen · current chapter ·
  highlight) carry accent.

## B · apps/web adapter (S6 — type + convention, `apps/web`)

The only `@vida/core` ↔ `@vida/ui` crossing. Pure mapping; **owns the display-resolve** (decisions 1 & 2).

```
openReader(assetId) → ReaderContext {file, sessionId, position}
  → file.status==='attachment-unavailable'  ⇒ state:'unavailable'
  → file.status==='stored'                  ⇒ state:'success' + renderContent(decrypted bytes)
  → position.status==='not-synced'          ⇒ positionNote: "Reading position isn't synced across formats yet" (IR-3)

book + book_chapters(bookId)   → title · context · chapters[] (current = the chapter whose [start_page,end_page] holds the native position)
book summary Notes page        → summary   (notes.ensureEntityNote / read 'book' page — decision 1; conventions.md:20)
listAnnotations(bookId)        → annotations[]  with location RESOLVED:
                                   page   = parse native `position` (format-interpreted: page | EPUB CFI | timestamp)
                                   chapter = the book_chapters row whose page-range contains `page` (TOC points, never duplicated — structure-data.md:73)
                                   line   = from `position` when the format encodes it (EPUB CFI); else omitted (honest, conventions.md:8)
convertToSpeech(assetId)       → listen intents; 'ai-unavailable' ⇒ listen:'unavailable' (IR-7)

intents → service writes: onHighlight→addHighlight · onQuote→addQuote · onBookmark→addBookmark ·
          onAddNote→openAnnotationNote · onLink→linkAnnotations · onListenToggle→convertToSpeech/stop ·
          (session end on unmount/leave → endSession ⇒ the measurement fan-out, IR-5)
```

- **`ReaderAdapter` convention** (not a live hook): the live `useReader` React-Query hook is the **first consumer's**
  (fe-books #36) — deferred, the collection/dashboard/entity precedent. S6 ships the pure mapping + the convention +
  unit tests (location-resolve · degrade-never-crash · the `unavailable`/`not-synced` branches).
- **Degrade-never-crash:** a null/absent field maps to the honest state, never throws (the dashboard-adapter precedent).
