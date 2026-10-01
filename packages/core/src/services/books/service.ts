// ============================================================================
// services/books — the service (mod-books #51 ①)
//
// S4: Annotations + notes/links (BOO-15/16/17/18/19/20). Three natures (BK-6): highlights are light (NO notes/links
// — the entity-type registry EXCLUDES `book_highlight`, so `spaces`/`notes` reject it fail-loud); bookmarks + quotes
// take pages-notes (`notes.ensureEntityNote`) + inter-link (`spaces.createLink`, page_id = generic source anchor).
// Bookmarks/quotes are work-anchored (BK-5); a highlight derives book_id from its asset. `listAnnotations` unions
// the three (ordered by created_at); `listQuotes` is the All Quotes library (tags? → S9). `spaces`+`notes` required.
//
// S3: Assets + positions + mapping (BOO-09/10/11/12/44) + N1/B1 folds. `addAsset` uploads via the deny-safe
// `attachment?` port FIRST (nothing persists on failure): absent port/no file ⇒ attachment-unavailable + file_ref
// null (BK-17); present port + reject ⇒ fail-loud AssetFileError (business-rules.md:127). `updatePosition` writes
// the single per-asset native_position (SSOT, BK-2). `removeAsset` soft-deletes (annotations survive, no-FK).
// `getMappedPosition` NEVER guesses — at M1 the mapping algorithm is unbuilt ⇒ always not-synced with the TARGET's
// native position (BK-4/BK-5). `getBook` now carries live assets (N1 BookAsset interface) + the flat TOC (B1 — the
// chapter READ path, closing the S2 carry-forward); `getCapabilities.readable` = ≥1 live asset.
//
// S2: Chapters/TOC (BOO-05/06) + ISBN lookup port (BOO-07/08) + N3 plannable fold. `setChapters` is a declarative
// UPSERT by chapter_number (structural overwrite, tracking preserved, absent numbers hard-deleted — book_chapters
// has NO deleted_at); UNIQUE pre-checked in-array above the DB backstop. `lookupBook`/`revokeLookupGrant` compose
// the deny-safe `ingestion?` port (absent/no-mediator ⇒ `lookup-unavailable`/no-op; normalization = M2).
//
// S1: Works CRUD + the DB-4 reframe (BOO-01/02/03/48). Factory-object, hoisted closures, no `this.` (the ②
// destructure shape; the knowledge/habits/finance precedent). Persistence: DB-6 Repository, `encryptedFields:[]`
// M1.0 pass-through ([E] title/author/isbn/review/cover_url → M3/DB-5). `books` → softDelete:true (deleted_at;
// list reads filter it explicitly — findWhere skips the soft-delete filter, repository-findwhere-skips-softdelete-filter).
//
// create() ECHOES the input row (not a DB re-read), so createBook backfills every notNull-default column
// (status default, deleted_at null) → the returned row is FAITHFUL (repository-create-returns-input-row seam).
// update() echoes only the patch → updateBook re-reads for a faithful full row (the knowledge updateObject seam).
//
// BR-BK-2 — `progress` is NEVER written (nullable derived-override; NULL ⇒ derive-on-read at S8). No retired
// column (`format`/`current_page`/`genre`/`tags`) exists on the table or the input.
// ============================================================================

import { and, eq, isNull, type SQL } from 'drizzle-orm'
import type { Book, BookAsset, BookChapter, BookBookmark, BookHighlight, BookQuote } from '@vida/types'
import { createRepository, type CreateInput, type UpdateInput } from '../../db/repository'
import {
  books,
  bookChapters,
  bookAssets,
  bookBookmarks,
  bookHighlights,
  bookQuotes,
  type BookRow,
  type BookChapterRow,
  type BookAssetRow,
  type BookBookmarkRow,
  type BookHighlightRow,
  type BookQuoteRow,
} from '../../db/schema/books'
import type { EntityLinkRow } from '../../db/schema/foundation/spaces'
import type { PageRow } from '../../db/schema/notes'
import {
  CreateBookSchema,
  UpdateBookSchema,
  SetChaptersSchema,
  AddAssetSchema,
  UpdatePositionSchema,
  AddBookmarkSchema,
  AddHighlightSchema,
  AddQuoteSchema,
} from '../../validators/books'
import { IngestionDenied, type IngestionAct } from '../../foundation/ingestion'
import {
  BookNotFoundError,
  ChapterUniqueViolation,
  ChapterNotFoundError,
  BookAssetNotFoundError,
  AssetFileError,
  AnnotationNotFoundError,
  AnnotationNotLinkableError,
  BOOKS_ISBN_INTEGRATION_ID,
  type BooksService,
  type BooksServiceDeps,
  type CreateBookInput,
  type UpdateBookInput,
  type BookFilter,
  type BookView,
  type BookCapabilities,
  type ChapterSeed,
  type AddAssetArgs,
  type AttachmentRef,
  type MappedPosition,
  type AnnotationRef,
  type AnnotationView,
  type QuoteScope,
  type BookAnnotationKind,
  type LookupResult,
  type IsbnLookupPayload,
  type BookMetadata,
} from './types'

// --- Row → @vida/types interface --------------------------------------------
// The reshaped BookRow maps 1:1 to the reshaped Book interface (S1 @vida/types reconcile); only the plain-text
// `_sync_status` needs the union cast (drizzle-row-not-assignable-to-vida-types-interface).
const toBook = (r: BookRow): Book => ({
  ...r,
  _sync_status: r._sync_status as Book['_sync_status'],
})

// book_chapters maps 1:1 to the BookChapter interface (already reshaped in DB-4 — no S2 DB-11 reconcile); only the
// plain-text `_sync_status` needs the union cast. `is_completed` is boolInt(mode:'boolean') → already a boolean.
const toChapter = (r: BookChapterRow): BookChapter => ({
  ...r,
  _sync_status: r._sync_status as BookChapter['_sync_status'],
})

// book_assets maps 1:1 to the BookAsset interface (S3 N1 reconcile); only the plain-text `_sync_status` casts.
const toAsset = (r: BookAssetRow): BookAsset => ({
  ...r,
  _sync_status: r._sync_status as BookAsset['_sync_status'],
})

// S4 annotation mappers (N-fold) — 1:1 row→interface, only the plain-text `_sync_status` casts.
const toBookmark = (r: BookBookmarkRow): BookBookmark => ({
  ...r,
  _sync_status: r._sync_status as BookBookmark['_sync_status'],
})
const toHighlight = (r: BookHighlightRow): BookHighlight => ({
  ...r,
  _sync_status: r._sync_status as BookHighlight['_sync_status'],
})
const toQuote = (r: BookQuoteRow): BookQuote => ({
  ...r,
  _sync_status: r._sync_status as BookQuote['_sync_status'],
})

export function createBooksService(deps: BooksServiceDeps): BooksService {
  const { db, deviceId, ingestion, attachment, spaces, notes } = deps

  // [E] fields (title/author/isbn/review/cover_url) → encryptedFields:[] M1.0 pass-through (dormant → M3/DB-5).
  const booksRepo = createRepository(db, books, { deviceId, softDelete: true, encryptedFields: [] })
  // book_chapters has NO deleted_at (child, FACT floor) → softDelete:false ⇒ delete() is a HARD delete (F1). [E]
  // title → encryptedFields:[] M1.0 pass-through.
  const chaptersRepo = createRepository(db, bookChapters, { deviceId, softDelete: false, encryptedFields: [] })
  // book_assets HAS deleted_at → softDelete:true (removeAsset soft-deletes; reads filter it). [E] file_ref →
  // encryptedFields:[] M1.0 pass-through.
  const assetsRepo = createRepository(db, bookAssets, { deviceId, softDelete: true, encryptedFields: [] })
  // S4 annotation repos — all softDelete:true; [E] fields (label/captured_text/text) → encryptedFields:[] M1.0.
  const bookmarksRepo = createRepository(db, bookBookmarks, { deviceId, softDelete: true, encryptedFields: [] })
  const highlightsRepo = createRepository(db, bookHighlights, { deviceId, softDelete: true, encryptedFields: [] })
  const quotesRepo = createRepository(db, bookQuotes, { deviceId, softDelete: true, encryptedFields: [] })

  // --- Works CRUD (BOO-01) --------------------------------------------------

  async function createBook(input: CreateBookInput): Promise<Book> {
    const v = CreateBookSchema.parse(input)
    // create() echoes the input → backfill defaults for a faithful returned row.
    const row = await booksRepo.create({
      title: v.title,
      author: v.author ?? null,
      isbn: v.isbn ?? null,
      status: v.status ?? 'want_to_read', // notNull default 'want_to_read' — backfill (echo)
      total_pages: v.total_pages ?? null,
      progress: null, // BR-BK-2 — never settable; derived-on-read (S8)
      start_date: v.start_date ?? null,
      end_date: v.end_date ?? null,
      rating: v.rating ?? null,
      review: v.review ?? null,
      cover_url: v.cover_url ?? null,
      deleted_at: null, // faithful echo (a new row is not deleted)
    } satisfies CreateInput<typeof books>)
    return toBook(row)
  }

  async function updateBook(id: string, patch: UpdateBookInput): Promise<Book> {
    const v = UpdateBookSchema.parse(patch)
    const existing = await booksRepo.findById(id)
    if (!existing) throw new BookNotFoundError(id)
    const dbPatch: Record<string, unknown> = {}
    if (v.title !== undefined) dbPatch.title = v.title
    if (v.author !== undefined) dbPatch.author = v.author
    if (v.isbn !== undefined) dbPatch.isbn = v.isbn
    if (v.status !== undefined) dbPatch.status = v.status
    if (v.total_pages !== undefined) dbPatch.total_pages = v.total_pages
    if (v.start_date !== undefined) dbPatch.start_date = v.start_date
    if (v.end_date !== undefined) dbPatch.end_date = v.end_date
    if (v.rating !== undefined) dbPatch.rating = v.rating
    if (v.review !== undefined) dbPatch.review = v.review
    if (v.cover_url !== undefined) dbPatch.cover_url = v.cover_url
    // `progress` + retired columns are absent from UpdateBookSchema — never reach here (BR-BK-2).
    await booksRepo.update(id, dbPatch as UpdateInput<typeof books>)
    // update() echoes only the patch → re-read for a faithful full row.
    const updated = await booksRepo.findById(id)
    return toBook(updated as BookRow)
  }

  async function softDeleteBook(id: string): Promise<void> {
    const existing = await booksRepo.findById(id)
    if (!existing) throw new BookNotFoundError(id)
    await booksRepo.delete(id) // softDelete:true → sets deleted_at
  }

  async function getBook(id: string): Promise<BookView | null> {
    const book = await booksRepo.findById(id) // null if not found or soft-deleted
    if (!book) return null
    // S3 aggregate: live assets (N1) + the flat TOC (B1, closes the S2 chapter-READ gap). unifiedProgress derives
    // at S8. findWhere skips the soft-delete filter → isNull(deleted_at) explicit for assets (book_chapters has none).
    const assetRows = await assetsRepo.findWhere(and(isNull(bookAssets.deleted_at), eq(bookAssets.book_id, id)) as SQL)
    const chapterRows = await chaptersRepo.findWhere(eq(bookChapters.book_id, id))
    chapterRows.sort((a, b) => a.chapter_number - b.chapter_number)
    return {
      book: toBook(book),
      assets: assetRows.map(toAsset),
      chapters: chapterRows.map(toChapter),
      unifiedProgress: null,
    }
  }

  async function listBooks(filter?: BookFilter): Promise<Book[]> {
    // findWhere skips the soft-delete filter → add isNull(deleted_at) explicitly (repository-findwhere-skips-softdelete-filter).
    const where: SQL = filter?.status
      ? (and(isNull(books.deleted_at), eq(books.status, filter.status)) as SQL)
      : isNull(books.deleted_at)
    const rows = await booksRepo.findWhere(where)
    return rows.map(toBook)
  }

  async function getCapabilities(id: string): Promise<BookCapabilities> {
    const book = await booksRepo.findById(id)
    if (!book) throw new BookNotFoundError(id)
    // N3 (S2 fold) — plannable = a PAGE BASIS exists: a work-level total_pages OR a TOC (≥1 chapter). A TOC-only
    // book with no total_pages IS plannable (BK-17). readable (S3) = ≥1 LIVE asset (business-rules.md:97-98 "no
    // assets → no Reader affordance"; removing the last copy flips it back to false).
    const chapterCount = await chaptersRepo.count(eq(bookChapters.book_id, id))
    const assetCount = await assetsRepo.count(and(isNull(bookAssets.deleted_at), eq(bookAssets.book_id, id)) as SQL)
    return { plannable: book.total_pages != null || chapterCount > 0, readable: assetCount > 0 }
  }

  // --- Chapters / TOC (BOO-05/06) -------------------------------------------

  async function setChapters(bookId: string, chapters: ChapterSeed[]): Promise<BookChapter[]> {
    // Validate input FIRST (the updateBook parse-then-guard order), then guard the book exists.
    const seeds = SetChaptersSchema.parse(chapters)
    if (!(await booksRepo.findById(bookId))) throw new BookNotFoundError(bookId)
    // UNIQUE pre-check (app-layer; the DB UNIQUE(book_id,chapter_number) is the backstop): a duplicate
    // chapter_number WITHIN the input is rejected before any write (the no-FK integrity pattern).
    const nums = seeds.map((s) => s.chapter_number)
    const dupe = nums.find((n, i) => nums.indexOf(n) !== i)
    if (dupe !== undefined) throw new ChapterUniqueViolation(bookId, dupe)
    // Declarative upsert by chapter_number (the stable identity). No deleted_at → reads are unfiltered, deletes hard.
    // NOTE: prune + per-row upserts are separate repo transactions (no bulk-tx path on the Repository; the
    // knowledge/habits per-row precedent). A declarative set is idempotent → a mid-loop infra failure is
    // eventually-consistent: re-calling setChapters re-converges to the input (the no-FK app-layer convention).
    const existing = await chaptersRepo.findWhere(eq(bookChapters.book_id, bookId))
    const byNum = new Map(existing.map((r) => [r.chapter_number, r]))
    const keep = new Set(nums)
    // Prune chapters whose number is absent from the new list (HARD delete — book_chapters has no deleted_at).
    for (const row of existing) {
      if (!keep.has(row.chapter_number)) await chaptersRepo.delete(row.id)
    }
    const result: BookChapter[] = []
    for (const seed of seeds) {
      const prev = byNum.get(seed.chapter_number)
      if (prev) {
        // Surviving number: overwrite STRUCTURAL fields; PRESERVE tracking (is_completed/completed_at/
        // actual_reading_minutes) — a TOC edit never resets reading progress (anti-lost, BK-17).
        await chaptersRepo.update(prev.id, {
          title: seed.title,
          start_page: seed.start_page ?? null,
          end_page: seed.end_page ?? null,
          estimated_reading_minutes: seed.estimated_reading_minutes ?? null,
          sort_order: seed.sort_order ?? prev.sort_order,
        } as UpdateInput<typeof bookChapters>)
        // update() echoes only the patch → re-read for a faithful full row (the updateObject seam).
        const updated = await chaptersRepo.findById(prev.id)
        result.push(toChapter(updated as BookChapterRow))
      } else {
        // New number: create() echoes input → backfill notNull-default + tracking columns for a faithful row.
        const row = await chaptersRepo.create({
          book_id: bookId,
          title: seed.title,
          chapter_number: seed.chapter_number,
          start_page: seed.start_page ?? null,
          end_page: seed.end_page ?? null,
          estimated_reading_minutes: seed.estimated_reading_minutes ?? null,
          actual_reading_minutes: null,
          is_completed: false, // notNull default — backfill (echo)
          completed_at: null,
          sort_order: seed.sort_order ?? 0, // notNull default — backfill (echo)
        } satisfies CreateInput<typeof bookChapters>)
        result.push(toChapter(row))
      }
    }
    return result.sort((a, b) => a.chapter_number - b.chapter_number)
  }

  async function markChapterComplete(chapterId: string, done: boolean): Promise<BookChapter> {
    const existing = await chaptersRepo.findById(chapterId)
    if (!existing) throw new ChapterNotFoundError(chapterId)
    await chaptersRepo.update(chapterId, {
      is_completed: done,
      completed_at: done ? Date.now() : null,
    } as UpdateInput<typeof bookChapters>)
    // update() echoes only the patch → re-read for a faithful full row.
    const updated = await chaptersRepo.findById(chapterId)
    return toChapter(updated as BookChapterRow)
  }

  // --- ISBN/metadata lookup (BOO-07/08) — deny-safe ingestion port ----------

  async function lookupBook(query: { isbn?: string; text?: string }): Promise<LookupResult> {
    // No ingestion dep ⇒ unavailable; the manual fallback (setChapters/createBook) stays callable (BK-14).
    if (!ingestion) return { status: 'lookup-unavailable', reason: 'no-ingestion' }
    // A device-mediated PUBLIC-REFERENCE fetch (ADR-014 X1/X2/X3): a public dataset carries no sensitive read
    // (sensitiveModules:[] ⇒ never an egress act) and never needs server plaintext (X1 refuse-not-downgrade).
    const act: IngestionAct = {
      defId: BOOKS_ISBN_INTEGRATION_ID,
      source: {
        integrationId: BOOKS_ISBN_INTEGRATION_ID,
        layer: 'public-reference',
        normalizationContractId: 'books.isbn.v1',
      },
      dataScope: { sensitiveModules: [] },
      requiresServerPlaintext: false,
    }
    const params: Record<string, string> = query.isbn ? { isbn: query.isbn } : { q: query.text ?? '' }
    const request = { path: 'lookup', params }
    try {
      const res = await ingestion.fetchThroughMediator(act, request)
      // The mediator emits Books' XCU-14 normalization contract. UNREACHABLE at M1 (the unregistered def ⇒
      // CapabilityNotFound, or an absent mediator ⇒ IngestionDenied — both caught below). A minimal fail-closed
      // shape guard here; the FULL normalization/validation is the M2 adapter's (zero-signature swap).
      const payload = res.data as Partial<IsbnLookupPayload> | null
      if (!payload || typeof payload.metadata !== 'object' || payload.metadata === null) {
        return { status: 'lookup-unavailable', reason: 'lookup-failed' }
      }
      return { status: 'ready', metadata: payload.metadata as BookMetadata, toc: payload.toc }
    } catch (e) {
      // Fail-closed: ANY failure (deny, unregistered grant → CapabilityNotFound, mediator-absent, network) folds to
      // the typed absent-state. `reason` is diagnostic; the status contract (unavailable) is what callers rely on.
      const reason = e instanceof IngestionDenied ? e.reason : 'lookup-failed'
      return { status: 'lookup-unavailable', reason }
    }
  }

  async function revokeLookupGrant(): Promise<void> {
    // X9 stop-future / keep-imported: revoke reaches only the GRANT, never an imported row. No ingestion dep ⇒
    // nothing was granted at M1 ⇒ no-op. `[FACT: ADR-014:70 (§3.4); parts/books.md BOO-08]`
    if (!ingestion) return
    await ingestion.revokeIntegration(BOOKS_ISBN_INTEGRATION_ID)
  }

  // --- Assets + positions (BOO-09/10/11) — deny-safe R2 upload -----------------

  async function addAsset(
    bookId: string,
    input: AddAssetArgs,
  ): Promise<{ asset: BookAsset; file: AttachmentRef }> {
    // Split the raw blob off the metadata (the blob is bytes, not a validated value) — frozen-contract bundled shape.
    const { file, ...meta } = input
    const v = AddAssetSchema.parse(meta)
    if (!(await booksRepo.findById(bookId))) throw new BookNotFoundError(bookId)
    // Upload FIRST so nothing persists on a failure (fail-loud). Absent port OR no file ⇒ deny-safe no-store
    // (asset still created, file_ref null, BK-17). Present port + reject ⇒ AssetFileError (BR-BK-S3-2, :127).
    let fileRef: string | null = null
    let fileResult: AttachmentRef = { status: 'attachment-unavailable' }
    if (file && attachment) {
      try {
        const res = await attachment.upload({ blob: file, bookId })
        fileRef = res.fileRef
        fileResult = { status: 'stored', fileRef: res.fileRef }
      } catch (e) {
        // A real R2 write error is NOT the deny-safe absent-state — fail loud, persist nothing.
        throw new AssetFileError(`Asset file upload failed for book ${bookId}`, e)
      }
    }
    const row = await assetsRepo.create({
      book_id: bookId,
      format: v.format,
      file_ref: fileRef,
      native_position: v.native_position ?? null,
      deleted_at: null, // faithful echo (a new asset is not deleted)
    } satisfies CreateInput<typeof bookAssets>)
    return { asset: toAsset(row), file: fileResult }
  }

  async function updatePosition(assetId: string, nativePosition: string): Promise<BookAsset> {
    const pos = UpdatePositionSchema.parse(nativePosition)
    const existing = await assetsRepo.findById(assetId)
    if (!existing) throw new BookAssetNotFoundError(assetId)
    // SSOT — only native_position is written (BK-2). Progress derivation (S8) is a read-time DERIVATION, nothing to bust.
    await assetsRepo.update(assetId, { native_position: pos } as UpdateInput<typeof bookAssets>)
    // update() echoes only the patch → re-read for a faithful full row.
    const updated = await assetsRepo.findById(assetId)
    return toAsset(updated as BookAssetRow)
  }

  async function removeAsset(id: string): Promise<void> {
    const existing = await assetsRepo.findById(id)
    if (!existing) throw new BookAssetNotFoundError(id)
    // Soft-delete (book_assets HAS deleted_at). Work-anchored annotations survive by construction (no FK to the
    // asset) — BR-BK-S3-4; the survival test lands at S4. Blob GC rides the R2 pipeline (M2).
    await assetsRepo.delete(id)
  }

  async function getMappedPosition(assetId: string, targetAssetId: string): Promise<MappedPosition> {
    const source = await assetsRepo.findById(assetId)
    if (!source) throw new BookAssetNotFoundError(assetId)
    const target = await assetsRepo.findById(targetAssetId)
    // A mapping is only meaningful between two assets of the SAME work (BK-5 annotations anchor to the work).
    if (!target || target.book_id !== source.book_id) throw new BookAssetNotFoundError(targetAssetId)
    // BK-4 — at M1 the cross-format mapping algorithm (transcription + TOC-anchor matching) is unbuilt (design
    // pass → build). NEVER guess a mapped position: return the honest not-synced state carrying the TARGET's own
    // native position (BK-5 :28-30; terminal :113). The `synced` variant is the M2 shape (zero-signature swap).
    return { status: 'not-synced', nativePosition: target.native_position }
  }

  // --- Annotations + notes/links (BOO-15/16/17/18/19/20) ---------------------

  const annotationEntityType = (kind: BookAnnotationKind): string => `book_${kind}`

  async function annotationExists(ref: AnnotationRef): Promise<boolean> {
    // findById excludes soft-deleted rows.
    if (ref.kind === 'bookmark') return (await bookmarksRepo.findById(ref.id)) != null
    if (ref.kind === 'quote') return (await quotesRepo.findById(ref.id)) != null
    return (await highlightsRepo.findById(ref.id)) != null
  }
  async function assertAnnotationExists(ref: AnnotationRef): Promise<void> {
    if (!(await annotationExists(ref))) throw new AnnotationNotFoundError(ref.kind, ref.id)
  }
  // BK-6 — a highlight is never linkable/noteable, at EITHER endpoint. The registry backstops the TARGET /
  // note-entity; it does NOT validate a link SOURCE anchor — so enforce the full rule here (conventions.md:50).
  function assertLinkable(ref: AnnotationRef): void {
    if (ref.kind === 'highlight') throw new AnnotationNotLinkableError(ref.id)
  }

  async function addBookmark(bookId: string, position: string, label?: string): Promise<BookBookmark> {
    const v = AddBookmarkSchema.parse({ position, label: label ?? null })
    if (!(await booksRepo.findById(bookId))) throw new BookNotFoundError(bookId)
    const row = await bookmarksRepo.create({
      book_id: bookId,
      position: v.position,
      label: v.label ?? null,
      deleted_at: null,
    } satisfies CreateInput<typeof bookBookmarks>)
    return toBookmark(row)
  }

  async function addHighlight(
    assetId: string,
    span: { captured_text: string; position: string },
  ): Promise<BookHighlight> {
    const v = AddHighlightSchema.parse(span)
    const asset = await assetsRepo.findById(assetId)
    if (!asset) throw new BookAssetNotFoundError(assetId)
    // book_id DERIVED from the asset (work-anchored, BK-5); asset_id records the digital-content source (BK-6).
    const row = await highlightsRepo.create({
      book_id: asset.book_id,
      asset_id: assetId,
      captured_text: v.captured_text,
      position: v.position,
      deleted_at: null,
    } satisfies CreateInput<typeof bookHighlights>)
    return toHighlight(row)
  }

  async function addQuote(bookId: string, text: string, position?: string): Promise<BookQuote> {
    const v = AddQuoteSchema.parse({ text, position: position ?? null })
    if (!(await booksRepo.findById(bookId))) throw new BookNotFoundError(bookId)
    const row = await quotesRepo.create({
      book_id: bookId,
      text: v.text,
      position: v.position ?? null,
      deleted_at: null,
    } satisfies CreateInput<typeof bookQuotes>)
    return toQuote(row)
  }

  async function linkAnnotations(a: AnnotationRef, b: AnnotationRef): Promise<EntityLinkRow> {
    // BK-6 — neither endpoint may be a highlight (the registry backstops the target only; the source is unchecked).
    assertLinkable(a)
    assertLinkable(b)
    await assertAnnotationExists(a)
    await assertAnnotationExists(b)
    // entity_links.page_id = a generic SOURCE anchor (the knowledge linkObject precedent).
    return spaces.createLink(a.id, annotationEntityType(b.kind), b.id)
  }

  async function openAnnotationNote(ref: AnnotationRef): Promise<PageRow> {
    assertLinkable(ref) // BK-6 — no notes on highlights (the registry also backstops via createPage validation)
    await assertAnnotationExists(ref)
    // Seed (B3): bookmark→label, quote→text (the knowledge openObjectNote({title}) precedent; ensureEntityNote
    // folds the seed into content, keyed idempotently on the entity). A highlight ref → 'book_highlight'
    // (unregistered) fails loud in ensureEntityNote→createPage registry validation (BK-6; conventions.md:50).
    const seed =
      ref.kind === 'bookmark'
        ? { title: (await bookmarksRepo.findById(ref.id))?.label ?? '' }
        : ref.kind === 'quote'
          ? { title: (await quotesRepo.findById(ref.id))?.text ?? '' }
          : {}
    return notes.ensureEntityNote('note', annotationEntityType(ref.kind), ref.id, seed)
  }

  async function listAnnotations(bookId: string): Promise<AnnotationView[]> {
    // findWhere skips the soft-delete filter → explicit isNull(deleted_at) per table. Work-anchored (book_id).
    const [bm, hl, qt] = await Promise.all([
      bookmarksRepo.findWhere(and(isNull(bookBookmarks.deleted_at), eq(bookBookmarks.book_id, bookId)) as SQL),
      highlightsRepo.findWhere(and(isNull(bookHighlights.deleted_at), eq(bookHighlights.book_id, bookId)) as SQL),
      quotesRepo.findWhere(and(isNull(bookQuotes.deleted_at), eq(bookQuotes.book_id, bookId)) as SQL),
    ])
    const views: AnnotationView[] = [
      ...bm.map((r): AnnotationView => ({ kind: 'bookmark', annotation: toBookmark(r), position: r.position })),
      ...hl.map((r): AnnotationView => ({ kind: 'highlight', annotation: toHighlight(r), position: r.position })),
      ...qt.map((r): AnnotationView => ({ kind: 'quote', annotation: toQuote(r), position: r.position })),
    ]
    // BOO-19 ordered by created_at (findWhere has no orderBy → sort in JS, the getBook chapters precedent).
    return views.sort((x, y) => x.annotation.created_at - y.annotation.created_at)
  }

  async function listQuotes(scope?: QuoteScope): Promise<BookQuote[]> {
    // bookId filter OR all; soft-delete filtered. `tags?` deferred to S9 (the S1 BookFilter precedent).
    const where: SQL = scope?.bookId
      ? (and(isNull(bookQuotes.deleted_at), eq(bookQuotes.book_id, scope.bookId)) as SQL)
      : isNull(bookQuotes.deleted_at)
    const rows = await quotesRepo.findWhere(where)
    return rows.map(toQuote)
  }

  return {
    createBook,
    updateBook,
    softDeleteBook,
    getBook,
    listBooks,
    getCapabilities,
    setChapters,
    markChapterComplete,
    lookupBook,
    revokeLookupGrant,
    addAsset,
    updatePosition,
    removeAsset,
    getMappedPosition,
    addBookmark,
    addHighlight,
    addQuote,
    linkAnnotations,
    openAnnotationNote,
    listAnnotations,
    listQuotes,
  }
}
