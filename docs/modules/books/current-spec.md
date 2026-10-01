<!-- CURRENT-SPEC · module: books · the living contract (§XXIX Currency Rule) · never lags the code -->

# Books — CURRENT SPEC  (`@vida/core` `services/books`)

> The durable per-context spec `/critique` + `/preflight` + the §XXVII Session Path consult as ground truth.
> Born at mod-books ① S1 (LIF-117, #51). Promoted per slice. Inherits `docs/core/*`.

## What this module is

`createBooksService(deps)` — the ① backend service tier for the **reading Universe** over DB-4 `023_books`
(10 tables). The full design lives in `docs/features/books/` (aspect docs) + `docs/features/books/delivery/`
(interpretation · slice-map · seam-contract). Build state: **S3 of 10 shipped** (Works CRUD + reframe · Chapters/TOC + ISBN lookup port · Assets + positions + mapping absent-state).

## Delivered surface (as of S3)

`createBooksService({ db, deviceId, ingestion?, attachment? }) → BooksService`. Factory-object, hoisted closures,
no `this.`. Deps grow per slice (S4–S10 add spaces/backlinks/notes/sessions/sessionRegistry + more deny-safe ports).

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

**Types/errors:** `BooksServiceDeps`, `BooksService`, `BookView`, `BookFilter`, `BookCapabilities`, `ChapterSeed`,
`AddAssetInput`, `FileBlob`, `AttachmentPort`, `AttachmentRef`, `MappedPosition`, `BookMetadata`, `IsbnLookupPayload`
(the XCU-14 normalization contract Books owns), `LookupResult`, `BOOK_ENTITY_TYPE = 'book'`,
`BOOKS_ISBN_INTEGRATION_ID = 'books.isbn_lookup'` (Books-owned integration identity, inert at M1). Errors:
`BookNotFoundError`, `ChapterUniqueViolation`, `ChapterNotFoundError`, `BookAssetNotFoundError`, `AssetFileError`
(thrown S3 addAsset upload-fail; decrypt site S6). Input Zod: `validators/books.ts` (`CreateBookSchema`,
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
present-port failure (`AssetFileError`); no R2 substrate at M1, real pipeline = M2. Remaining:
S4 annotations (spaces/notes) · S5 quote-embed (`preferences?`) · S6 reading
sessions (`sessions` + `sessionRegistry` + `registerBooks()`) · S7 plans · S8 unified-progress/conflict · S9
Education/measurement · S10 AI integrations (`ai?` — OCR/TTS/transcription) + `registerBooksJournal`. Deferred reach
= deny-safe ports (doc+substrate grounded; see slice-map Deferred-by-design).

## Persistence (S3 addendum)

`book_assets`: `createRepository(db, bookAssets, { deviceId, softDelete: true, encryptedFields: [] })` — HAS
`deleted_at` → `removeAsset` soft-deletes; `getBook`/`getCapabilities` filter it with an explicit
`and(isNull(deleted_at), eq(book_id,id))` (findWhere/count skip the soft-delete filter). `file_ref` is the M1.0
dormant [E] seam.

## `@vida/types` reconcile (S1, DB-11 · S3, N1)

S1: the `Book` interface was reshaped to the reframed table: dropped `format`/`current_page`/`genre`/`tags`;
`progress: number | null`; `total_pages: number | null`. `BOOK_FORMAT`/`BookFormatSchema` kept (P-6). **S3 (N1):**
added the `BookAsset` interface (1:1 mirror of `book_assets`: `book_id`, `format`, `file_ref` [E], `native_position`,
`deleted_at`) — `BookView.assets` narrowed from the raw `BookAssetRow` to `BookAsset[]`.
