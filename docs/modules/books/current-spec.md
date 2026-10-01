<!-- CURRENT-SPEC · module: books · the living contract (§XXIX Currency Rule) · never lags the code -->

# Books — CURRENT SPEC  (`@vida/core` `services/books`)

> The durable per-context spec `/critique` + `/preflight` + the §XXVII Session Path consult as ground truth.
> Born at mod-books ① S1 (LIF-117, #51). Promoted per slice. Inherits `docs/core/*`.

## What this module is

`createBooksService(deps)` — the ① backend service tier for the **reading Universe** over DB-4 `023_books`
(10 tables). The full design lives in `docs/features/books/` (aspect docs) + `docs/features/books/delivery/`
(interpretation · slice-map · seam-contract). Build state: **S5 of 10 shipped** (Works · Chapters/TOC + ISBN lookup · Assets + mapping · Annotations + notes/links · Quote-embed feed + toggles).

## Delivered surface (as of S5)

`createBooksService({ db, deviceId, spaces, notes, ingestion?, attachment?, preferences? }) → BooksService`.
Factory-object, hoisted closures, no `this.`. `spaces`+`notes` are required from S4 (annotation links/notes); the
narrow deny-safe `preferences?` port landed at **S5** (two quote-embed toggle reads). Deps grow per slice (S6–S10
add sessions/sessionRegistry + `ai?`/`effects?`; `backlinks` → S9/BOO-46).

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

**Types/errors:** `BooksServiceDeps`, `BooksService`, `BookView`, `BookFilter`, `BookCapabilities`, `ChapterSeed`,
`AddAssetInput`, `FileBlob`, `AttachmentPort`, `AttachmentRef`, `MappedPosition`, `BookMetadata`, `IsbnLookupPayload`
(the XCU-14 normalization contract Books owns), `LookupResult`, `PreferencesPort` (S5 — narrow quote-embed toggle
reads), `BOOK_ENTITY_TYPE = 'book'`, `BOOKS_ISBN_INTEGRATION_ID = 'books.isbn_lookup'` (Books-owned integration
identity, inert at M1). Errors: `BookNotFoundError`, `ChapterUniqueViolation`, `ChapterNotFoundError`,
`BookAssetNotFoundError`, `AssetFileError` (thrown S3 addAsset upload-fail; decrypt site S6),
`QuoteEmbedDisabledError` (S5 — scoped embed of a toggle-off book). Input Zod: `validators/books.ts` (`CreateBookSchema`,
`UpdateBookSchema`, `ChapterSeedSchema`, `SetChaptersSchema`, `AddAssetSchema`, `UpdatePositionSchema`).
Row→interface: `toBook` / `toChapter` / `toAsset` (single `_sync_status` union cast each — no json columns).

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
change). Remaining: S6 reading sessions (`sessions` + `sessionRegistry` + `registerBooks()`) · S7 plans · S8
unified-progress/conflict · S9 Education/measurement · S10 AI integrations (`ai?` — OCR/TTS/transcription) +
`registerBooksJournal`. Deferred reach = deny-safe ports (doc+substrate grounded; see slice-map Deferred-by-design).

## Persistence (S3–S4 addendum)

`book_assets`: `createRepository(db, bookAssets, { deviceId, softDelete: true, encryptedFields: [] })` — HAS
`deleted_at` → `removeAsset` soft-deletes; `getBook`/`getCapabilities` filter it with an explicit
`and(isNull(deleted_at), eq(book_id,id))` (findWhere/count skip the soft-delete filter). `file_ref` is the M1.0
dormant [E] seam. **S4:** `book_bookmarks`/`book_highlights`/`book_quotes` repos (same config; [E] =
`label`/`captured_text`/`text`); `listAnnotations`/`listQuotes` filter soft-deletes explicitly. S4 composes the
REAL `foundation/spaces` (entity_links WRITE) + `services/notes` (`ensureEntityNote`) — exercised by the live gate.

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
Validators: `AddBookmarkSchema`/`AddHighlightSchema`/`AddQuoteSchema` (snake_case `captured_text`).
