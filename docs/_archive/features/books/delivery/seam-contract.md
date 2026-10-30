<!-- Entity Delivery Flow (v1) · Step 2 — Decomposition Gate · books ① backend (#51, LIF-117) -->
<!-- The service API the UI (fe-books P6) consumes. Signatures are the contract; internals are per-slice. -->

# Seam Contract — Books ① backend (mod-books #51, LIF-117)

> The `@vida/core` surface `fe-books` (P6) will consume. Grouped by slice. Every signature is doc-grounded
> (`contract.md` + `parts/books.md` BOO-ids). Factory-object shape, `createBooksService(deps) → object`, async
> validating methods. Types reuse `@vida/types` (`BookRow`→`Book` interface via DB-11 reconcile; enums from
> `learning.ts`). **Deferred reach = deny-safe typed states** (never a throw-through, never a silent path).

## Dependency injection — `BooksServiceDeps`

```ts
interface BooksServiceDeps {
  db: DrizzleDb
  deviceId: string
  // required core seams (BUILT, non-optional) ------------------------------------
  spaces: SpacesService // AR-6 — entity_tags + entity_links WRITES (BOO-04/18)
  backlinks: BacklinkResolver // AR-8 — entity_links READS (BOO-18/46)
  notes: NotesService // pages-backed notes on bookmarks/quotes (BOO-16/17)
  sessions: SessionsService // ADR-004 — base `sessions` reading sub-type spine (BOO-23/24/39)
  sessionRegistry: SessionRegistry // AR-5 — register the `reading` sub-type (createSession throws SessionTypeNotFound otherwise; the flashcards precedent)
  // optional deny-safe ports (fail-closed; M2 real reach) ------------------------
  ai?: AiService // ADR-015 — OCR/TTS/transcription (BOO-25/40/41/42) ⇒ ai-unavailable
  ingestion?: IngestionGuard // ADR-014 — ISBN lookup (BOO-07/08)          ⇒ lookup-unavailable
  attachment?: AttachmentPort // ADR-003 — R2 file/photo upload (BOO-09/25) ⇒ attachment-unavailable
  preferences?: PreferencesPort // quote-embed toggles + conflict rule (BOO-22/35) — permissive default
  effects?: { rail: EffectRail; registry: EffectRegistry } // ADR-012 — measurement fan-out ONLY (C-E2: no economy)
}
```

`registerBooksJournal(registry: JournalRegistry, svc: BooksService): void` — the PULL contribution (the
`registerKnowledgeJournal` precedent, `[FACT: services/knowledge/journal.ts]`).

## Service-layer types (NOT @vida/types — the `MasterySource` precedent)

```ts
// BK-4 — the honest cross-format absent-state (a typed state, not an exception).
type MappedPosition =
  | { status: 'synced'; position: string; sourceAssetId: string }
  | { status: 'not-synced'; nativePosition: string | null } // pending|failed|unavailable
// deny-safe port outcomes (the AiAssistResult / AutoPopulateResult precedent) ----
type LookupResult =
  | { status: 'ready'; metadata: BookMetadata; toc?: ChapterSeed[] }
  | { status: 'lookup-unavailable'; reason?: string } // no ingestion dep OR refused
type OcrResult = { status: 'ready'; position: string; source: 'ai' } | { status: 'ai-unavailable'; reason?: string } // no ai dep OR AiDenied
type AttachmentRef = { status: 'stored'; fileRef: string } | { status: 'attachment-unavailable' } // no attachment dep
// BK-8 — the derived conflict queue (no table; React-Query-derived).
type ConflictItem = { id: string; bookId: string; sources: PositionSource[]; blocking: true }
type BooksDayDigest = { pagesRead: number; sessionsLogged: number; onPace: number; behind: number } // Journal /summary
// BOO-39 — the Reader service face outcome (decrypt + session + position; chrome is P6).
type ReaderContext = { file: AttachmentRef; sessionId: string; position: MappedPosition }
```

## Typed errors (BOO-43 governing principle; fail-loud)

`BookNotFoundError` · `BookAssetNotFoundError` · `ChapterUniqueViolation` (book_id,chapter_number) ·
`AnnotationNotFoundError` · `ReadingPlanNotFoundError` · `IntegrationConsentError` (consent not granted;
manual fallback callable, BK-14) · `PositionConflictPending` (write blocked until resolved/preset, BK-8) ·
`TargetUnreachableProposal` (recalc can't meet target — options, never silent rewrite, BK-11) ·
`QuoteEmbedDisabledError` (toggle off, BK-7) · `AssetFileError` (decrypt/download — never an empty book).

## Method surface (by slice)

```ts
interface BooksService {
  // ── S6: sub-type registration (call-once; the registerFlashcards precedent) ──
  registerBooks(): Promise<void> // registers the `reading` SessionTypeDef (allowed_effects: [] — envelope-legal, C-E2-clean); DuplicateSubType-guarded

  // ── S1: Works CRUD + reframe (BOO-01/02/03/48) ──────────────────────────────
  createBook(input: CreateBookInput): Promise<Book> // status/rating validated; progress NOT settable
  updateBook(id: string, patch: UpdateBookInput): Promise<Book>
  softDeleteBook(id: string): Promise<void>
  getBook(id: string): Promise<BookView | null> // work + assets + unified progress (composes S8/S3)
  listBooks(filter?: BookFilter): Promise<Book[]> // status|tags|format-owned|subject
  getCapabilities(id: string): Promise<{ plannable: boolean; readable: boolean }> // BOO-48 gate (no-copy = plannable)

  // ── S2: Chapters/TOC + ISBN lookup (BOO-05/06/07/08) ────────────────────────
  setChapters(bookId: string, chapters: ChapterSeed[]): Promise<BookChapter[]> // UNIQUE(book_id,chapter_number)
  markChapterComplete(chapterId: string, done: boolean): Promise<BookChapter> // is_completed/completed_at
  lookupBook(query: { isbn?: string; text?: string }): Promise<LookupResult> // ingestion? deny-safe; manual fallback
  revokeLookupGrant(): Promise<void> // X9: stop-future, keep-imported

  // ── S3: Assets + positions + mapping (BOO-09/10/11/12/44) ───────────────────
  addAsset(
    bookId: string,
    input: { format: BookAssetFormat; file?: FileBlob },
  ): Promise<{ asset: BookAsset; file: AttachmentRef }>
  updatePosition(assetId: string, nativePosition: string): Promise<BookAsset> // per-asset SSOT
  removeAsset(id: string): Promise<void> // work-level annotations survive
  getMappedPosition(assetId: string, targetAssetId: string): Promise<MappedPosition> // BK-4 NotSyncedState

  // ── S4: Annotations (BOO-15/16/17/18/19/20) ─────────────────────────────────
  addHighlight(assetId: string, span: { capturedText: string; position: string }): Promise<BookHighlight> // NO notes/links
  addBookmark(bookId: string, position: string, label?: string): Promise<BookBookmark> // work-anchored; notes via pages
  addQuote(bookId: string, text: string, position?: string): Promise<BookQuote> // [E] text; notes via pages
  linkAnnotations(a: AnnotationRef, b: AnnotationRef): Promise<EntityLinkRow> // bookmark↔quote only (BK-6)
  openAnnotationNote(ref: AnnotationRef): Promise<PageRow> // notes.ensureEntityNote
  listAnnotations(bookId: string): Promise<AnnotationView[]> // work-anchored, mapping-normalized
  listQuotes(scope: { bookId?: string; tags?: string[] }): Promise<BookQuote[]> // All Quotes library query

  // ── S5: Quote-embed feed (BOO-21/22) ────────────────────────────────────────
  getEmbeddableQuotes(scope: { bookId?: string }): Promise<BookQuote[]> // per-book > global toggle (preferences?)
  // (embed references the stored quote — never copies; QuoteEmbedDisabledError when toggle off)

  // ── S6: Reading sessions (BOO-23/24/25/26) ──────────────────────────────────
  startSession(bookId: string, target: { assetId: string } | { manual: true }): Promise<ReadingSessionView>
  endSession(
    id: string,
    capture: { pages?: number; position?: string; stopPoint?: string },
  ): Promise<ReadingSessionView>
  attachPhoto(sessionId: string, photo: FileBlob): Promise<{ stored: AttachmentRef; ocr: OcrResult }> // photo ALWAYS stores
  getStatistics(scope: { bookId?: string }): Promise<ReadingStatistics> // derived over the sessions ledger
  openReader(assetId: string): Promise<ReaderContext> // BOO-39 service face: decrypt (attachment?) + auto-start reading session + resolve position/NotSyncedState (chrome→P6)

  // ── S7: Reading plans / Quota Planner (BOO-27..33) ──────────────────────────
  createPlan(input: CreatePlanInput): Promise<ReadingPlan> // arrangement/goal/target; NO stored measurement axes
  getTodayQuotas(): Promise<TodayQuotas> // Hub + Journal /summary provider
  recordQuotaProgress(planId: string, sessionRef: string): Promise<void>
  recalculate(planId: string): Promise<ReadingPlan> // reshaped + make-up | TargetUnreachableProposal
  getProjection(planId: string): Promise<PlanProjection> // completion trajectory

  // ── S8: Unified progress + conflict (BOO-13/34/35) ──────────────────────────
  getUnifiedProgress(bookId: string): Promise<number | 'conflicted' | null> // derived; NULL=unmeasured
  getConflicts(bookId: string): Promise<ConflictItem[]> // derived queue (no table)
  resolveConflict(id: string, choice: ConflictChoice): Promise<void> // preset rule via preferences?

  // ── S9: Education partition + measurement + tags + target (BOO-04/14/36/37/38/46) ──
  scopeTag(bookId: string, scopedTag: string): Promise<EntityTagRow> // publisher/genre/category (spaces)
  linkSubject(bookId: string, subjectId: string): Promise<BookSubjectRow> // Education partition junction
  unlinkSubject(bookId: string, subjectId: string): Promise<void>
  listBooksForSubject(subjectId: string): Promise<Book[]> // Books→Education read surface
  getPaceStatus(bookId: string, subjectId: string): Promise<'on-pace' | 'behind' | 'ahead' | null> // null: Education absent
  getReadingMeasureSource(bookId: string): Promise<{ progress: number | null }> // quantitative/derived-pull (advertise/query)

  // ── S10: Integration + close-out (BOO-40/41/42/43/45/47) ────────────────────
  convertToSpeech(assetId: string, req: AiRequest): Promise<OcrResult> // TTS via ai? (deny-safe)
  transcribeForMapping(assetId: string, req: AiRequest): Promise<OcrResult> // transcription via ai? (deny-safe)
  getPlansForConsumer(): Promise<ReadingPlan[]> // Study-Planner read-provider (BOO-45; consumers consume)
  // (BOO-47 local-first + BOO-43 consent-gate + fan-out are cross-cutting invariants, not standalone methods)

  // ── Journal digest (BOO-30/26) ──────────────────────────────────────────────
  getDayBooksDigest(date: string): Promise<BooksDayDigest> // feeds registerBooksJournal summary
}
```

## Consumers (who reads this seam)

- **fe-books (P6)** — every SPLIT leg's render half (Reading Hub, Bookshelf, Book Hub tabs, Reader, wizards).
- **Study Planner** — `getPlansForConsumer` only (never writes; BK-12).
- **Daily Journal** — `registerBooksJournal` → `getTodayQuotas`/`getDayBooksDigest` (`/summary`).
- **Education Subject Hub** — `listBooksForSubject` + `getPaceStatus` (partition read-across).
- **Knowledge / review engine / Skills / Purposes** — Books as a linkable target (`book`/`book_chapter`
  ENTITY_TYPES); they own the link, Books exposes the identity (BOO-46).

## Boundary invariants (enforced by the seam shape)

- Books **owns** plans/annotations/sessions writes; consumers get **read-providers** only (BK-12).
- No cross-module table reads — Education met only via the partition API (BK-13, `conventions.md:55`).
- Every integration method returns a deny-safe typed state + keeps a manual fallback (BK-14) — no throw-through.
- **C-E2**: `effects?` carries measurement signals ONLY; Books emits no economy grant (grant rides base-`sessions`).
