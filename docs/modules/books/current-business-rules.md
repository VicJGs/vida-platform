<!-- CURRENT-BUSINESS-RULES · module: books · living invariants (§XXIX) · never lags the code -->

# Books — CURRENT BUSINESS RULES  (`@vida/core` `services/books`)

> The invariants the code enforces, promoted per slice from the slice PLANs. Inherits the CORE constitution
> (ZK-1/2/3, LF-1/2/3). Born at S1 (LIF-117). Source rules: `docs/features/books/business-rules.md` (BK-1..18)
> + `docs/specs/foundation/db-4-books/_index.md` (BR-BK-1..7).

## Shipped invariants (as of S1)

- **BR-BK-S1-1 (reframe / BR-BK-2)** — `books.progress` is a nullable DERIVED override. It is NEVER settable:
  absent from `CreateBookSchema`/`UpdateBookSchema`, hardcoded `null` on create, absent from the update patch.
  Derivation lands at S8. `[code: service.ts createBook progress:null; validators/books.ts]`
- **BR-BK-S1-2 (retired columns)** — `format` / `current_page` / `genre` / `tags` do not exist on the table,
  the `Book` interface, or the input schemas (DB-4 reframe: → `book_assets` / per-asset `native_position` /
  `entity_tags`). `[code: schema/books.ts; types/learning.ts Book]`
- **BR-BK-S1-3 (validation)** — `status` ∈ {want_to_read,reading,completed,dropped}; `rating` ∈ [1,5];
  `title` non-empty. Enforced in Zod (typed async rejection) above the DB CHECK floor. `[code: validators/books.ts]`
- **BR-BK-S1-4 (default)** — `status` defaults to `want_to_read` when omitted (backfilled on the create-echo for
  a faithful returned row). `[code: service.ts createBook]`
- **BR-BK-S1-5 (no-FK integrity)** — `updateBook`/`softDeleteBook`/`getCapabilities` guard-exists →
  `BookNotFoundError`; `getBook` returns `null` (nullable read). Soft-deleted rows are not resurrectable
  (`findById` excludes them). `[code: service.ts; BR-BK-6]`
- **BR-BK-S1-6 (TOC-only first-class / BK-17)** — a book needs no asset and no page count to exist; `plannable`
  is true on a page basis — a `total_pages` **OR** a TOC (≥1 chapter, resolved at S2/N3). *(S2 carry-forward
  CLOSED — see BR-BK-S2-6.)* `[code: service.ts getCapabilities; business-rules.md:85-87]`
- **BR-BK-S1-7 (soft-delete list exclusion)** — `listBooks` excludes soft-deleted rows via an explicit
  `isNull(deleted_at)` (`findWhere` skips the soft-delete filter). `[code: service.ts listBooks]`
- **BR-BK-S1-8 (M1.0 [E] seam)** — [E] fields (title/author/isbn/review/cover_url) use `encryptedFields:[]`
  pass-through; real field encryption is M3/DB-5. `[code: service.ts booksRepo; BK-1]`

## Shipped invariants (as of S2 — Chapters/TOC + ISBN lookup, BOO-05/06/07/08)

- **BR-BK-S2-1 (declarative TOC upsert / BK-9)** — `setChapters` sets the whole flat TOC, UPSERTING by
  `chapter_number` (the UNIQUE identity): structural fields (`title`/`start_page`/`end_page`/
  `estimated_reading_minutes`/`sort_order`) overwrite; numbers absent from the new list are **hard-deleted**
  (`book_chapters` has no `deleted_at`). Returns the TOC ordered by `chapter_number`. `[code: service.ts setChapters]`
- **BR-BK-S2-2 (anti-lost / BK-17)** — a re-`setChapters` **preserves tracking** (`is_completed` / `completed_at` /
  `actual_reading_minutes`) for every surviving `chapter_number` — a TOC edit never resets reading progress. Tracking
  is set only via `markChapterComplete` / reading sessions, never seeded (`ChapterSeed` carries structural fields
  only). `[code: service.ts setChapters upsert branch; business-rules.md:85-87]`
- **BR-BK-S2-3 (UNIQUE pre-check)** — a duplicate `chapter_number` WITHIN a `setChapters` input is rejected with
  `ChapterUniqueViolation` before any write; the DB `UNIQUE(book_id,chapter_number)` is the backstop (the no-FK
  app-layer integrity pattern). `[code: service.ts setChapters; migration 023_books.ts:85]`
- **BR-BK-S2-4 (chapter completion / BOO-06)** — `markChapterComplete(id, done)` sets `is_completed` +
  `completed_at` (done=false clears both); guards exists → `ChapterNotFoundError`. `[code: service.ts markChapterComplete]`
- **BR-BK-S2-5 (deny-safe ISBN lookup / BK-14)** — `lookupBook` is a device-mediated **public-reference** fetch
  (`sensitiveModules:[]` ⇒ never an egress act; never server-plaintext). No `ingestion` dep OR any refused/failed
  fetch ⇒ `{status:'lookup-unavailable'}` (fail-closed); the manual fallback (`setChapters`/`createBook`) is
  callable regardless. At M1 the substrate has no mediator ⇒ always unavailable; the `FetchResult`→`BookMetadata`
  normalization (Books' XCU-14 contract, `IsbnLookupPayload`) lands at M2 (zero-signature swap). `[code: service.ts
  lookupBook; foundation/ingestion; parts/books.md:138]`
- **BR-BK-S2-6 (plannable honors a TOC / BK-17 — closes the S1-6 carry-forward)** — `getCapabilities.plannable` is
  true when a work-level `total_pages` OR a TOC (≥1 chapter) exists; a TOC-only book with no `total_pages` is
  plannable. `[code: service.ts getCapabilities chapterCount]`
- **BR-BK-S2-7 (X9 revoke / BOO-08)** — `revokeLookupGrant` halts future ISBN lookups (delegates to
  `ingestion.revokeIntegration(BOOKS_ISBN_INTEGRATION_ID)`); already-imported metadata is untouched (revoke reaches
  only the grant). No `ingestion` dep ⇒ no-op (nothing granted at M1). `BOOKS_ISBN_INTEGRATION_ID` is Books-owned
  identity (the `entity_type`/sub-type precedent), inert at M1. `[code: service.ts revokeLookupGrant; ADR-014:70]`

## Shipped invariants (as of S3 — Assets + positions + mapping, BOO-09/10/11/12/44)

- **BR-BK-S3-1 (asset = per-format copy / BK-2/BOO-09)** — `addAsset(bookId, {format, native_position?, file?})`
  (the raw `file` bundled in `input` per the frozen seam-contract; split off before Zod-validating the metadata)
  creates a `book_assets` row (0..n per book); `format` ∈ BOOK_ASSET_FORMAT (Zod + DB CHECK). Guards the book
  exists (`BookNotFoundError`). A book needs no asset (BK-17). `[code: service.ts addAsset; validators/books.ts AddAssetSchema]`
- **BR-BK-S3-2 (R2 upload — deny-safe on ABSENCE, fail-loud on FAILURE / BOO-09/44)** — the digital `file`
  uploads via the optional `attachment?` port, **upload-first so nothing persists on failure**: (a) absent port
  **or** no file ⇒ `file:{status:'attachment-unavailable'}` + `file_ref` null, asset still created (BK-17); (b)
  present port + success ⇒ `file:{status:'stored', fileRef}`, `file_ref` set; (c) present port + `upload()`
  rejects ⇒ **`AssetFileError`** (fail-loud, no asset persisted — a broken file never renders as an empty book).
  M1 ships no R2 substrate ⇒ always (a); M2 swaps the pipeline (zero-signature). `[code: service.ts addAsset;
  business-rules.md:127,97-98]`
- **BR-BK-S3-3 (per-asset position SSOT / BK-2/BOO-10)** — each asset owns exactly ONE `native_position`.
  `updatePosition(assetId, nativePosition)` (non-empty) writes only that column, re-reads, returns the `BookAsset`.
  Guards exists (`BookAssetNotFoundError`). `[code: service.ts updatePosition; validators UpdatePositionSchema]`
- **BR-BK-S3-4 (asset removal preserves work-anchored annotations / BOO-11)** — `removeAsset(id)` soft-deletes
  the asset (`book_assets` HAS `deleted_at`). Work-anchored annotations survive by construction (no FK to the
  asset — `business-rules.md:99-100`); the survival test lands at S4 (annotations don't exist yet). Guards exists
  (`BookAssetNotFoundError`). `[code: service.ts removeAsset]`
- **BR-BK-S3-5 (cross-format mapping NEVER guessed / BK-4/BOO-12)** — `getMappedPosition(assetId, targetAssetId)`
  returns the typed `MappedPosition`. At M1 the mapping algorithm (transcription + TOC-anchor matching) is unbuilt
  (design pass → build), so the result is **ALWAYS `{status:'not-synced', nativePosition}`** carrying the TARGET
  asset's own native position (BK-5 `:28-30`; terminal `:113`) — never a guessed `synced`. Guards both assets exist
  + belong to the **same book** (`BookAssetNotFoundError`). `[code: service.ts getMappedPosition]`
- **BR-BK-S3-6 (file error is typed + fail-loud / BOO-44)** — `AssetFileError` is the typed R2/decrypt error
  (`business-rules.md:127`). Thrown at S3 by `addAsset` on a present-port upload failure; the decrypt/download
  throw site (`openReader`) lands at S6 (terminal `:112`). `[code: types.ts AssetFileError; service.ts addAsset]`
- **BR-BK-S3-7 (N1 fold — BookAsset interface)** — `BookAsset` is a proper `@vida/types` interface mirroring the
  reshaped row (DB-11, the Book/BookChapter precedent); `BookView.assets: BookAsset[]` (was raw `BookAssetRow`).
  `[code: @vida/types learning.ts BookAsset; service.ts toAsset]`
- **BR-BK-S3-8 (B1 fold — chapter READ path, closes the S2 carry-forward)** — `getBook` now returns
  `chapters: BookChapter[]` ordered by `chapter_number`; `getCapabilities.readable` = ≥1 **live** asset
  (soft-delete-filtered; removing the last copy flips it false). `[code: service.ts getBook, getCapabilities]`

## Carry-forward (homed to a later slice)

- **Annotation-survival test** — BR-BK-S3-4's no-FK survival is structural; the delete-test lands at **S4** (when
  bookmarks/highlights/quotes exist). *(S2 "Chapter READ path" carry-forward CLOSED by BR-BK-S3-8.)*

## Deferred (homed, not yet enforced — see delivery/slice-map.md Deferred-by-design)

Unified-progress derivation (S8) · cross-format mapping `NotSyncedState` (S3, algorithm = build-phase design pass)
· ISBN lookup **real fetch + normalization** (M2 — mediator + registry; the S2 port is built deny-safe) · OCR / TTS
/ transcription (deny-safe `ai?` port, S10/M2) · R2 file/photo (deny-safe port, M2) · conflict resolution (S8,
derived) · Education pace (S9, deny-safe null) · measurement source (S9) · C-E2 (no economy grant on Books — grants
ride base-`sessions`) · C-M1 (no stored measurement axes on `reading_plans`).
