// ============================================================================
// Books ↔ CanvasReader adapter — fe-codec-canvas-reader S6 (the apps/web plane).
//
// The documented CONVENTION + the pure pieces a consumer uses to drive @vida/ui's
// `CanvasReader` shell from the @vida/core Books service. The single @vida/core↔@vida/ui
// crossing for the Reader — the Tamagui-only boundary forbids a @vida/core import in
// @vida/ui (BR-2; the flow/collection/dashboard/entity adapter precedent).
//
// SHIPS (buildable + tested NOW): the DISPLAY-RESOLVE mappers (the heart, EC-14 —
// `resolveLocation`/`groupAnnotations`/`mapChapters`), the state/position/listen mappers,
// the `toReaderProps` assembler, the `BooksReaderPort` + `bindReaderIntents` wiring, and
// `createReaderAdapter`. DOES NOT ship a live data hook — no reader consumer is BUILT yet.
// The concrete `useReader(assetId)` hook (React Query → openReader + getBook +
// listAnnotations + the book-summary Notes page, binding the real `BooksService` to
// `BooksReaderPort`, and flattening `AnnotationView → AnnotationInput`) is built at the
// FIRST consumer — fe-books #36 — the sibling-adapter precedent. See ./CLAUDE.md.
// ============================================================================
import type { ReactNode } from 'react'
import type {
  CanvasReaderProps,
  ReaderChapter,
  AnnotationGroup,
  ReaderAnnotation,
  Nature,
  ReaderState,
  ListenMode,
} from '@vida/ui'
import type { AiRequest } from '@vida/core'

/** The shell's rail state (NOT `ReaderState` — annotations have no access-`unavailable`, canvas-reader.tsx:101). */
type ViewState = NonNullable<CanvasReaderProps['annotationsState']>

// Value shapes mirrored from @vida/core as TYPES (the dashboard mirror-by-value precedent — lighter than importing the
// whole service type; the live hook binds the REAL `BooksService`). Byte-accurate to services/books/types.ts.
/** `addAsset`/`openReader` file outcome (types.ts:135). */
export type AttachmentRef = { status: 'stored'; fileRef: string } | { status: 'attachment-unavailable' }
/** Cross-format position (types.ts:142-144); at M1 always `not-synced` (BK-4 mapping unbuilt). */
export type MappedPosition =
  | { status: 'synced'; position: string; sourceAssetId: string }
  | { status: 'not-synced'; nativePosition: string | null }
/** `convertToSpeech`/`attachPhoto` outcome (types.ts:446-448). */
export type OcrResult =
  | { status: 'ready'; position: string; source: 'ai' }
  | { status: 'ai-unavailable'; reason?: string }
/** The three annotation natures (types.ts:151) — identity-equal to the shell's `Nature`. */
export type AnnKind = 'bookmark' | 'highlight' | 'quote'

/** A TOC chapter projection the mappers read (mirrors the `BookChapter` fields the resolve needs, learning.ts:449). */
export interface ChapterInput {
  id: string
  chapter_number: number
  title: string
  start_page: number | null
  end_page: number | null
  is_completed: boolean
}

/** A FLAT annotation projection (the hook flattens `AnnotationView {kind, annotation, position}` → this, extracting the
 *  per-nature text field: bookmark.label | highlight.captured_text | quote.text). */
export interface AnnotationInput {
  kind: AnnKind
  id: string
  text: string | null
  position: string | null
}

// ── display-resolve (the heart, EC-14 / decision 2) ─────────────────────────────────────────────────────────────

/** The resolved location breadcrumb + its structured anchor. */
export interface ResolvedLocation {
  node: ReactNode
  chapterId?: string
  page?: number
}

/** Parse a page from the native `position` (M1: a LEADING INTEGER only — EPUB CFI / timestamp resolution is the deferred
 *  BK-4 design pass, types.ts:137-144); `null` when absent/unparseable (honest, never a guessed page). */
function parsePage(position: string | null): number | undefined {
  if (position == null) return undefined
  const m = position.match(/^\s*(\d+)/)
  return m ? Number(m[1]) : undefined
}

/** Find the chapter whose `[start_page, end_page]` holds `page` (`end_page` null ⇒ open-ended). */
function chapterForPage(page: number | undefined, chapters: readonly ChapterInput[]): ChapterInput | undefined {
  if (page == null) return undefined
  return chapters.find(
    (c) => c.start_page != null && page >= c.start_page && (c.end_page == null || page <= c.end_page),
  )
}

/** `position` + TOC → a pre-resolved "Ch. N · p. P" breadcrumb + `{chapterId, page}` (EC-14 / decision 3 middle-dot).
 *  Degrade-never-crash: unparseable ⇒ the raw position; null ⇒ "Location unknown" — never a throw, never a guessed page. */
export function resolveLocation(position: string | null, chapters: readonly ChapterInput[]): ResolvedLocation {
  const page = parsePage(position)
  const chapter = chapterForPage(page, chapters)
  if (chapter != null && page != null)
    return { node: `Ch. ${chapter.chapter_number} · p. ${page}`, chapterId: chapter.id, page }
  if (page != null) return { node: `p. ${page}`, page }
  return { node: position != null && position.trim() !== '' ? position : 'Location unknown' }
}

/** Is `currentPage` inside this chapter's page range? */
function isCurrent(chapter: ChapterInput, currentPage: number | undefined): boolean {
  if (currentPage == null || chapter.start_page == null) return false
  return currentPage >= chapter.start_page && (chapter.end_page == null || currentPage <= chapter.end_page)
}

/** TOC → the shell's `ReaderChapter[]` (EC-13), ordered by `chapter_number`; `current` = the chapter holding `currentPage`. */
export function mapChapters(chapters: readonly ChapterInput[], currentPage?: number): ReaderChapter[] {
  return [...chapters]
    .sort((a, b) => a.chapter_number - b.chapter_number)
    .map((c) => ({
      id: c.id,
      number: c.chapter_number,
      title: c.title,
      pageRef: c.start_page != null ? `p. ${c.start_page}` : undefined,
      done: c.is_completed,
      current: isCurrent(c, currentPage),
    }))
}

/** The display text for one annotation (already flattened to the per-nature field); `''` when the [E] field is null. */
function toReaderAnnotation(a: AnnotationInput, location: ReactNode): ReaderAnnotation {
  return { id: a.id, nature: a.kind as Nature, text: a.text ?? '', location }
}

const UNPLACED_GROUP_ID = 'unplaced'

/** Annotations → `AnnotationGroup[]` PRE-GROUPED by resolved chapter in TOC order (the shell never groups, BR-S3-1); an
 *  unresolved / range-unmatched annotation falls into a trailing "Unplaced" group. */
export function groupAnnotations(
  anns: readonly AnnotationInput[],
  chapters: readonly ChapterInput[],
): AnnotationGroup[] {
  const byChapter = new Map<string, ReaderAnnotation[]>()
  const unplaced: ReaderAnnotation[] = []
  for (const a of anns) {
    const loc = resolveLocation(a.position, chapters)
    const row = toReaderAnnotation(a, loc.node)
    if (loc.chapterId != null) {
      const bucket = byChapter.get(loc.chapterId) ?? []
      bucket.push(row)
      byChapter.set(loc.chapterId, bucket)
    } else {
      unplaced.push(row)
    }
  }
  const ordered = [...chapters].sort((a, b) => a.chapter_number - b.chapter_number)
  const groups: AnnotationGroup[] = []
  for (const c of ordered) {
    const rows = byChapter.get(c.id)
    if (rows != null && rows.length > 0) groups.push({ id: c.id, title: c.title, annotations: rows })
  }
  if (unplaced.length > 0) groups.push({ id: UNPLACED_GROUP_ID, title: 'Unplaced', annotations: unplaced })
  return groups
}

// ── state / position / listen mappers ───────────────────────────────────────────────────────────────────────────

/** The ACCESS outcome ONLY (B3): `attachment-unavailable` ⇒ the calm access state, `stored` ⇒ `success`. All of
 *  loading/empty/error — for BOTH the column (`state`) AND the rail (`annotationsState`) — are the deferred hook's
 *  `deriveTerminalState` (BR-2), never the adapter's. */
export function mapReaderState(file: AttachmentRef): ReaderState {
  return file.status === 'attachment-unavailable' ? 'unavailable' : 'success'
}

/** The honest not-synced line (IR-3); `undefined` when synced. */
export function mapPositionNote(pos: MappedPosition): ReactNode | undefined {
  return pos.status === 'not-synced' ? "Reading position isn't synced across formats yet" : undefined
}

/** TTS availability (IR-7): `ai-unavailable` ⇒ the calm `unavailable` state; a `ready`/absent result ⇒ `undefined`
 *  (idle/playing are runtime playback state the hook/consumer owns). At M1 the Books `ai?` port is dormant ⇒ always
 *  `ai-unavailable` ⇒ `unavailable`. */
export function mapListen(result?: OcrResult): ListenMode | undefined {
  return result?.status === 'ai-unavailable' ? 'unavailable' : undefined
}

// ── the assembler → the SHIPPED CanvasReaderProps surface (B2) ──────────────────────────────────────────────────

/** The module-fed source for one reader surface. `summary` is the book-level Notes page (decision 1, hook-resolved);
 *  `state`/`annotationsState` are the hook's `deriveTerminalState` results (B3); the toggle/jump props are shell-owned
 *  state the app threads (R5). Intents are bound via `bindReaderIntents`. */
export interface ReaderSource {
  title: string
  context?: ReactNode
  summary?: ReactNode
  chapters?: ChapterInput[]
  annotations?: AnnotationInput[]
  currentPage?: number
  file?: AttachmentRef
  position?: MappedPosition
  /** runtime idle/playing from the hook; precedence over `listenResult`'s availability map. */
  listen?: ListenMode
  listenResult?: OcrResult
  listenProgress?: number
  listenLabel?: ReactNode
  progress?: number
  progressLabel?: string
  saveStatus?: ReactNode
  action?: ReactNode
  emptyAction?: ReactNode
  renderContent?: () => ReactNode
  // shell-owned state the app threads (R5):
  contentsOpen?: boolean
  onToggleContents?: () => void
  onJumpToChapter?: (chapterId: string) => void
  railOpen?: boolean
  onToggleRail?: () => void
  // the hook's deriveTerminalState results (B3):
  state?: ReaderState
  annotationsState?: ViewState
  // emitted intents (bound via bindReaderIntents):
  onAddNote?: (id: string) => void
  onLinkAnnotation?: (id: string) => void
  onListenToggle?: () => void
  'aria-label'?: string
}

/** THE typed assembler: a reader source → `CanvasReader` props. The display-resolve mappers do the real work; `state`
 *  falls back to `mapReaderState(file)` when not explicitly supplied (an access outcome with no in-flight query). */
export function toReaderProps(src: ReaderSource): CanvasReaderProps {
  return {
    title: src.title,
    context: src.context,
    summary: src.summary,
    chapters: src.chapters != null ? mapChapters(src.chapters, src.currentPage) : undefined,
    annotationGroups: src.annotations != null ? groupAnnotations(src.annotations, src.chapters ?? []) : undefined,
    annotationsState: src.annotationsState,
    state: src.state ?? (src.file != null ? mapReaderState(src.file) : undefined),
    positionNote: src.position != null ? mapPositionNote(src.position) : undefined,
    renderContent: src.renderContent,
    emptyAction: src.emptyAction,
    progress: src.progress,
    progressLabel: src.progressLabel,
    saveStatus: src.saveStatus,
    action: src.action,
    listen: src.listen ?? mapListen(src.listenResult),
    listenProgress: src.listenProgress,
    listenLabel: src.listenLabel,
    contentsOpen: src.contentsOpen,
    onToggleContents: src.onToggleContents,
    onJumpToChapter: src.onJumpToChapter,
    railOpen: src.railOpen,
    onToggleRail: src.onToggleRail,
    onAddNote: src.onAddNote,
    onLinkAnnotation: src.onLinkAnnotation,
    onListenToggle: src.onListenToggle,
    'aria-label': src['aria-label'],
  }
}

// ── intents → writes via a PORT (the flow SessionsPort precedent; NOT a concrete import) ─────────────────────────

/** The subset of `@vida/core` `BooksService` the reader needs. Defined as a PORT (not imported) so S6 stays pure +
 *  testable; the live hook binds the REAL service, where the `@vida/core` edge lives. Signatures transcribe the real
 *  service (types.ts:592-640,696) — notably `convertToSpeech` carries the required `AiRequest` (the hook builds it). */
export interface BooksReaderPort {
  openReader(assetId: string): Promise<{ file: AttachmentRef; sessionId: string; position: MappedPosition }>
  convertToSpeech(assetId: string, req: AiRequest): Promise<OcrResult>
  openAnnotationNote(ref: { kind: AnnKind; id: string }): Promise<unknown>
  linkAnnotations(a: { kind: AnnKind; id: string }, b: { kind: AnnKind; id: string }): Promise<unknown>
  addBookmark(bookId: string, position: string, label?: string): Promise<unknown>
  addHighlight(assetId: string, span: { captured_text: string; position: string }): Promise<unknown>
  addQuote(bookId: string, text: string, position?: string): Promise<unknown>
  endSession(sessionId: string, capture: unknown): Promise<unknown>
}

/** How a consumer resolves the two consumer-owned runtime flows the adapter can't own: `onLink` (a link picker →
 *  `port.linkAnnotations`, since `linkAnnotations` needs TWO refs) + `onListenToggle` (playback transport). */
export interface ReaderIntentOptions {
  onLink?: (id: string) => void
  onListenToggle?: () => void
}

/** The context the intent bindings need: the ids to write against + the id→nature lookup (built from the grouped
 *  annotations — a highlight id never reaches `onAddNote`, IR-1 shell-enforced). */
export interface ReaderIntentContext {
  bookId: string
  assetId: string
  natureById: Record<string, Nature>
}

/** The bound intents (BR-S6-7): the shell/SelectionActions EMIT, here is where the writes happen (the shell never
 *  writes, BR-2). Degrade-never-crash — a missing `opts` callback or an unknown nature no-ops, never throws. */
export function bindReaderIntents(port: BooksReaderPort, ctx: ReaderIntentContext, opts: ReaderIntentOptions = {}) {
  return {
    onAddNote: (id: string) => {
      const kind = ctx.natureById[id]
      if (kind == null) return // unknown id / a highlight (no note, IR-1) — no-op, never throw
      void port.openAnnotationNote({ kind: kind as AnnKind, id })
    },
    onLinkAnnotation: (id: string) => opts.onLink?.(id),
    onListenToggle: () => opts.onListenToggle?.(),
    onHighlight: (span: { captured_text: string; position: string }) => void port.addHighlight(ctx.assetId, span),
    onQuote: (text: string) => void port.addQuote(ctx.bookId, text),
    onBookmark: (position: string) => void port.addBookmark(ctx.bookId, position),
  }
}

// ── the convention ──────────────────────────────────────────────────────────────────────────────────────────────

/** THE CONVENTION a consumer composes to drive `CanvasReader` (the mappers + the assembler + the intent wiring). The
 *  live `useReader(assetId)` hook is built at the first consumer (fe-books #36). */
export interface ReaderAdapter {
  resolveLocation: typeof resolveLocation
  mapChapters: typeof mapChapters
  groupAnnotations: typeof groupAnnotations
  mapReaderState: typeof mapReaderState
  mapPositionNote: typeof mapPositionNote
  mapListen: typeof mapListen
  toReaderProps: typeof toReaderProps
  bindReaderIntents: typeof bindReaderIntents
}

export function createReaderAdapter(): ReaderAdapter {
  return {
    resolveLocation,
    mapChapters,
    groupAnnotations,
    mapReaderState,
    mapPositionNote,
    mapListen,
    toReaderProps,
    bindReaderIntents,
  }
}
