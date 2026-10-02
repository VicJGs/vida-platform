<!-- CURRENT-SPEC · module: books · the living contract (§XXIX Currency Rule) · never lags the code -->

# Books — CURRENT SPEC  (`@vida/core` `services/books`)

> The durable per-context spec `/critique` + `/preflight` + the §XXVII Session Path consult as ground truth.
> Born at mod-books ① S1 (LIF-117, #51). Promoted per slice. Inherits `docs/core/*`.

## What this module is

`createBooksService(deps)` — the ① backend service tier for the **reading Universe** over DB-4 `023_books`
(10 tables). The full design lives in `docs/features/books/` (aspect docs) + `docs/features/books/delivery/`
(interpretation · slice-map · seam-contract). Build state: **S6 of 10 shipped** (Works · Chapters/TOC + ISBN lookup · Assets + mapping · Annotations + notes/links · Quote-embed feed + toggles · Reading sessions + Reader orchestration).

## Delivered surface (as of S6)

`createBooksService({ db, deviceId, spaces, notes, sessions, sessionRegistry, ingestion?, attachment?, preferences?, ai? }) → BooksService`.
Factory-object, hoisted closures, no `this.`. `spaces`+`notes` are required from S4 (annotation links/notes);
`sessions`+`sessionRegistry` are required from **S6** (the ADR-004 `reading` sub-type spine); the narrow deny-safe
`preferences?` port landed at S5, the `ai?` OCR port at **S6**. Deps grow per slice (S7–S10 add `effects?`;
`backlinks` → S9/BOO-46).

| Method | Leg | Contract |
|---|---|---|
| `createBook(input)` | BOO-01 | create a WORK; `status` default `want_to_read`; `progress` never settable (derived); `rating` 1–5; TOC-only ok (BK-17) |
| `updateBook(id, patch)` | BOO-01 | guard-exists → `BookNotFoundError`; patch non-derived/non-retired columns; re-read for faithful row |
| `softDeleteBook(id)` | BOO-01 | guard-exists → `BookNotFoundError`; sets `deleted_at` |
| `getBook(id)` | BOO-03 | `BookView` (work + live `assets` [N1] + `chapters` ordered [B1] + `unifiedProgress:null` [S8]) \| `null` |
| `listBooks(filter?)` | BOO-02 | soft-delete filtered; S1 `filter = { status? }` only |
| `getCapabilities(id)` | BOO-48 | `{ plannable: total_pages != null \|\| chapterCount > 0, readable: liveAssetCount > 0 }`; guard-exists |
| `setChapters(bookId, ChapterSeed[])` | BOO-05 | declarative UPSERT by `chapter_number`: structural overwrite · tracking preserved · absent pruned (hard delete, no `deleted_at`); in-array dup → `ChapterUniqueViolation`; guard-book; returns TOC ordered by number |
| `markChapterComplete(chapterId, done)` | BOO-06 | set `is_completed`/`completed_at` (done=false clears); guard-exists → `ChapterNotFoundError` |
| `lookupBook({isbn?, text?})` | BOO-07 | deny-safe `ingestion?` public-reference fetch → `LookupResult`; no dep / refused / failed ⇒ `lookup-unavailable` (fail-closed); manual fallback always callable (BK-14) |
| `revokeLookupGrant()` | BOO-08 | X9 stop-future/keep-imported; no `ingestion` dep ⇒ no-op |
| `addAsset(bookId, {format, native_position?, file?})` | BOO-09 | create a per-format copy; deny-safe `attachment?` upload (absent/no file ⇒ `attachment-unavailable` + `file_ref` null; present+reject ⇒ `AssetFileError`, nothing persisted); guard-book |
| `updatePosition(assetId, nativePosition)` | BOO-10 | SSOT native position (non-empty); re-read; guard-exists → `BookAssetNotFoundError` |
| `removeAsset(id)` | BOO-11 | soft-delete; work-anchored annotations survive (no-FK); guard-exists |
| `getMappedPosition(assetId, targetAssetId)` | BOO-12 | `MappedPosition`; M1 always `not-synced` + TARGET native position (BK-4 never guessed); guard both + same-book |
| `addBookmark(bookId, position, label?)` | BOO-16 | work-anchored marker (`label` [E]); `position` non-empty; guard-book |
| `addHighlight(assetId, {captured_text, position})` | BOO-15 | derives `book_id` from the asset (guard-asset); `captured_text` [E]; no notes/links (BK-6) |
| `addQuote(bookId, text, position?)` | BOO-17 | per-book quote (`text` [E], required); guard-book |
| `linkAnnotations(a, b)` | BOO-18 | `spaces.createLink` (page_id=source anchor); guard both exist + **neither a highlight** (`AnnotationNotLinkableError`; registry backstops target only) |
| `openAnnotationNote(ref)` | BOO-16/17 | idempotent `notes.ensureEntityNote('note', 'book_'+kind, id, seed)`; rejects highlight (BK-6) |
| `listAnnotations(bookId)` | BOO-19 | all three natures work-anchored (soft-delete filtered), ordered by `created_at`; cross-format normalization = P6 |
| `listQuotes({bookId?})` | BOO-20 | All Quotes library per-book or all (soft-delete filtered); `tags?` → S9 |
| `getEmbeddableQuotes({bookId?})` | BOO-21/22 | quote-embed feed; live `BookQuote` rows (never copied), soft-delete filtered; per-book > global toggle via deny-safe `preferences?` (absent ⇒ permissive); SCOPED `{bookId}` toggle-off ⇒ `QuoteEmbedDisabledError`; GLOBAL `{}` feed EXCLUDES toggle-off books (no throw) |
| `registerBooks()` | BOO-23/IR-1 | call-once, `DuplicateSubType`-guarded registration of the `reading` `SessionTypeDef` (an ADR-004 §3.2 transcription: `effects:[]` §3.2.2 + C-E2; lifecycle §3.2.3; `allowed_effects:[]` §3.2.4). `createSession('reading')` throws `SessionTypeNotFound` until it runs. Only the sub-type (no study_method) |
| `startSession(bookId, {assetId}\|{manual})` | BOO-23 | base `sessions` `reading` row (`in_progress`, `started_at` stamped) + Books `reading_sessions` extension keyed `session_id` + attach the **book** (`entity_type='book'`, §3.2.1); guards book (+ asset same-book for `{assetId}`) → `BookNotFoundError`/`BookAssetNotFoundError` |
| `endSession(id, {pages?,position?,stopPoint?})` | BOO-24 | `id`=base `session_id`; `completeSession` (stamps `ended_at`) + update extension capture (`pages_read`/`position_delta`/`stop_point`; `statistics`=dormant M2 seam); guard-exists → `ReadingSessionNotFoundError` |
| `attachPhoto(sessionId, photo)` | BOO-25 | photo ALWAYS stores (`attachment?` deny-safe; present-reject ⇒ `AssetFileError`) + OCR via `ai?` on_device (deny-safe ⇒ `ai-unavailable`), the two INDEPENDENT (OCR fail never discards photo, BK-10); guard-session. Durable photo row + Journal feed = S10/M2 |
| `getStatistics({bookId?})` | BOO-26 | derived `{sessionsLogged, pagesRead, minutesSpent}` over the reading-sessions ledger (+ base session clock for minutes, completed only); never stored; no economy grant (C-E2) |
| `openReader(assetId)` | BOO-39 | Reader service face: decrypt (`attachment?.download` deny-safe; present-reject ⇒ `AssetFileError`) + auto-start reading session + resolve the asset's own `MappedPosition` (native⇒synced-to-self, null⇒not-synced); chrome → P6 |

**Types/errors:** `BooksServiceDeps`, `BooksService`, `BookView`, `BookFilter`, `BookCapabilities`, `ChapterSeed`,
`AddAssetInput`, `FileBlob`, `AttachmentPort`, `AttachmentRef`, `MappedPosition`, `BookMetadata`, `IsbnLookupPayload`
(the XCU-14 normalization contract Books owns), `LookupResult`, `PreferencesPort` (S5 — narrow quote-embed toggle
reads), `BOOK_ENTITY_TYPE = 'book'`, `BOOKS_ISBN_INTEGRATION_ID = 'books.isbn_lookup'` (Books-owned integration
identity, inert at M1). Errors: `BookNotFoundError`, `ChapterUniqueViolation`, `ChapterNotFoundError`,
`BookAssetNotFoundError`, `AssetFileError` (thrown S3 addAsset upload-fail; decrypt site S6),
`QuoteEmbedDisabledError` (S5 — scoped embed of a toggle-off book). **S6:** `READING_SESSION_SUB_TYPE`,
`BOOKS_OCR_INTEGRATION_ID` (Books-owned OCR identity, on_device, M1-inert), `StartSessionTarget`, `ReadingCapture`,
`ReadingSessionView`, `OcrResult`, `ReadingStatistics`, `ReaderContext`; `AttachmentPort` extended additively with
`download` (Reader decrypt); error `ReadingSessionNotFoundError` (`AssetFileError` reused as the S6 decrypt throw
site). Input Zod: `validators/books.ts` (`CreateBookSchema`, `UpdateBookSchema`, `ChapterSeedSchema`,
`SetChaptersSchema`, `AddAssetSchema`, `UpdatePositionSchema`, `StartSessionTargetSchema`, `EndSessionCaptureSchema`).
Row→interface: `toBook` / `toChapter` / `toAsset` (single `_sync_status` cast — no json columns) + `toReadingSession`
(S6 — parses the `statistics` json<Record> boundary + `_sync_status` cast).

## Persistence

`books`: `createRepository(db, books, { deviceId, softDelete: true, encryptedFields: [] })`. `book_chapters`:
`createRepository(db, bookChapters, { deviceId, softDelete: false, encryptedFields: [] })` — **no `deleted_at`**
(child, FACT floor) → `delete()` is a HARD delete; `setChapters` prune + `UNIQUE(book_id,chapter_number)` upsert ride
this. `encryptedFields:[]` = M1.0 dormant [E] seam (→ M3/DB-5). No FK → app-layer guard-exists. `findWhere` skips the
soft-delete filter → `listBooks` adds `isNull(deleted_at)` explicitly (chapters need no such filter).

## Composition seams (not yet wired — per slice-map)

S2 chapters wired (no cross-module dep; chapters are module-local). `ingestion?` port wired at **S2** for ISBN
lookup (BOO-07/08) — deny-safe, M1-dormant (no mediator ⇒ `lookup-unavailable`; normalization = M2). `attachment?`
port wired at **S3** for R2 file upload (BOO-09) — deny-safe (absent ⇒ `attachment-unavailable`), fail-loud on a
present-port failure (`AssetFileError`); no R2 substrate at M1, real pipeline = M2. **`spaces` + `notes` wired at
S4** (annotation inter-links + pages-notes; required deps, REAL substrates). **`preferences?` port wired at S5**
(quote-embed toggles, BOO-22) — narrow deny-safe (two reads, NIT-3), absent ⇒ permissive (fail-OPEN, the habits
precedent); real Preferences-backed adapter = M2/P6. S8 appends the conflict preset-rule read (zero signature
change). **`sessions` + `sessionRegistry` wired at S6** (required) — the ADR-004 base `reading` sub-type spine +
`registerBooks()`; the `ai?` OCR port landed at S6 (deny-safe, on_device, M1-dormant). Remaining: S7 plans · S8
unified-progress/conflict · S9 Education/measurement · S10 AI integrations (TTS/transcription) + `effects?` fan-out +
`registerBooksJournal`. Deferred reach = deny-safe ports (doc+substrate grounded; see slice-map Deferred-by-design).

## Persistence (S3–S4 addendum)

`book_assets`: `createRepository(db, bookAssets, { deviceId, softDelete: true, encryptedFields: [] })` — HAS
`deleted_at` → `removeAsset` soft-deletes; `getBook`/`getCapabilities` filter it with an explicit
`and(isNull(deleted_at), eq(book_id,id))` (findWhere/count skip the soft-delete filter). `file_ref` is the M1.0
dormant [E] seam. **S4:** `book_bookmarks`/`book_highlights`/`book_quotes` repos (same config; [E] =
`label`/`captured_text`/`text`); `listAnnotations`/`listQuotes` filter soft-deletes explicitly. S4 composes the
REAL `foundation/spaces` (entity_links WRITE) + `services/notes` (`ensureEntityNote`) — exercised by the live gate.

## Persistence (S6 addendum)

`reading_sessions`: `createRepository(db, readingSessions, { deviceId, softDelete: false, encryptedFields: [] })` —
**NO `deleted_at`** (session extension; the base `sessions` owns lifecycle, F1 / BR-BK-4) → `softDelete:false` ⇒
`findAll()` skips the deleted-filter (used by `getStatistics({})`). `statistics` is a `json<Record>` column parsed on
read (`toReadingSession` / `parseJsonObject`) but **never written at M1** (the dormant M2 granular-capture seam). S6
composes the REAL `services/sessions` (`createSession`/`completeSession`/`attach`/`getSession`) + the AR-5
`SessionRegistry` — the live gate exercises the createSession sub-type gate + the completeSession lifecycle stamp.

## S4 BK-6 enforcement note

Highlights are never linkable/noteable (`conventions.md:50`). The entity-type registry (`_registry.ts:85-96`,
`book_highlight` excluded) backstops a highlight as a link TARGET / note-entity — but `spaces.createLink` validates
only the target, **not the source anchor** — so Books enforces the full rule via `assertLinkable` →
`AnnotationNotLinkableError` (both endpoints). The registry remains a backstop. (Verification-Gate-caught, §XXVIII.)

## `@vida/types` reconcile (S1, DB-11 · S3, N1)

S1: the `Book` interface was reshaped to the reframed table: dropped `format`/`current_page`/`genre`/`tags`;
`progress: number | null`; `total_pages: number | null`. `BOOK_FORMAT`/`BookFormatSchema` kept (P-6). **S3 (N1):**
added the `BookAsset` interface (1:1 mirror of `book_assets`: `book_id`, `format`, `file_ref` [E], `native_position`,
`deleted_at`) — `BookView.assets` narrowed from the raw `BookAssetRow` to `BookAsset[]`. **S4 (N-fold):** added
`BookBookmark`/`BookHighlight`/`BookQuote` (1:1 mirrors of the annotation rows). Service-layer types: `AnnotationRef`,
`AnnotationView`, `BookAnnotationKind`, `QuoteScope`. Errors: `AnnotationNotFoundError`, `AnnotationNotLinkableError`.
Validators: `AddBookmarkSchema`/`AddHighlightSchema`/`AddQuoteSchema` (snake_case `captured_text`). **S6 (N-fold):**
added the `ReadingSession` interface (1:1 mirror of `reading_sessions`: `session_id`, `book_id`, `asset_id`,
`pages_read`, `position_delta`, `stop_point`, `statistics: Record<string,unknown>|null`; NO `deleted_at` — session
extension, F1).
