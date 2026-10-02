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
import type {
  Book,
  BookAsset,
  BookChapter,
  BookBookmark,
  BookHighlight,
  BookQuote,
  ReadingSession,
  ReadingPlan,
} from '@vida/types'
import { createRepository, type CreateInput, type UpdateInput } from '../../db/repository'
import {
  books,
  bookChapters,
  bookAssets,
  bookBookmarks,
  bookHighlights,
  bookQuotes,
  readingSessions,
  readingPlans,
  readingPlanBooks,
  type BookRow,
  type BookChapterRow,
  type BookAssetRow,
  type BookBookmarkRow,
  type BookHighlightRow,
  type BookQuoteRow,
  type ReadingSessionRow,
  type ReadingPlanRow,
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
  StartSessionTargetSchema,
  EndSessionCaptureSchema,
  CreatePlanSchema,
} from '../../validators/books'
import { IngestionDenied, type IngestionAct } from '../../foundation/ingestion'
import { DuplicateSubType, type SessionTypeDef } from '../../foundation/sessions'
import {
  BookNotFoundError,
  ChapterUniqueViolation,
  ChapterNotFoundError,
  BookAssetNotFoundError,
  AssetFileError,
  AnnotationNotFoundError,
  AnnotationNotLinkableError,
  QuoteEmbedDisabledError,
  ReadingSessionNotFoundError,
  BOOKS_ISBN_INTEGRATION_ID,
  BOOKS_OCR_INTEGRATION_ID,
  READING_SESSION_SUB_TYPE,
  BOOK_ENTITY_TYPE,
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
  type StartSessionTarget,
  type ReadingCapture,
  type ReadingSessionView,
  type OcrResult,
  type ReadingStatistics,
  type ReaderContext,
  type FileBlob,
  ReadingPlanNotFoundError,
  TargetUnreachableProposal,
  type CreatePlanInput,
  type QuotaDistribution,
  type RecalculationState,
  type TodayQuotas,
  type PlanProjection,
  type ConflictChoice,
  type ConflictItem,
  type PositionSource,
} from './types'
import { normalize } from '../../foundation/measurement'
import type { BookAssetFormat } from '@vida/types'

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

/** Defensive JSON read (the flashcards `parseJsonArray` boundary): degrade malformed/absent → null, never throw.
 *  `reading_sessions.statistics` is a `json<Record>()` $type lie — the M1.0 repo does not auto-serialize. */
function parseJsonObject(value: string | null): Record<string, unknown> | null {
  if (value == null) return null
  try {
    return JSON.parse(value) as Record<string, unknown>
  } catch {
    return null
  }
}

// reading_sessions → ReadingSession (S6 N-fold). `statistics` parsed on read (dormant M2 write seam); only the
// plain-text `_sync_status` needs the union cast. No `deleted_at` on the extension (F1).
const toReadingSession = (r: ReadingSessionRow): ReadingSession => ({
  ...r,
  statistics: parseJsonObject(r.statistics as unknown as string | null),
  _sync_status: r._sync_status as ReadingSession['_sync_status'],
})

/** IR-1 — the `reading` Session sub-type Books registers (BK-10). Every field is a TRANSCRIPTION of ADR-004 §3.2:
 *  `effects:[]` (§3.2.2 — Books is a non-feeder per C-E2 `rerun books.md:73`, so it declares no effect; the
 *  completion grant rides the base-`sessions` sub-type), the shared lifecycle (§3.2.3 scheduled→in_progress→
 *  completed), `allowed_effects:[]` (§3.2.4 — a module sub-type's envelope ⊆ shipped; `∅` is subset-legal). Mirrors
 *  the flashcards `REVIEW_SESSION_TYPE_DEF`. `[FACT: ADR-004 §3.2.2-3.2.4; rerun C-E2 books.md:73; BK-10]` */
const READING_SESSION_TYPE_DEF: SessionTypeDef = {
  sub_type: READING_SESSION_SUB_TYPE,
  owner_module: 'books',
  attachment_defaults: {},
  effects: [],
  lifecycle: {
    transitions: [
      { from: 'scheduled', to: 'in_progress', event: 'start' },
      { from: 'in_progress', to: 'completed', event: 'complete' },
    ],
  },
  permissions: { allowed_effects: [] },
  default_purpose: 'reading',
}

// reading_plans / reading_plan_books → @vida/types (S7 N-fold). The stored json columns are parsed on read
// (BR-BK-S7-8); only the plain-text `_sync_status` needs the union cast.
const toReadingPlan = (r: ReadingPlanRow): ReadingPlan => ({
  ...r,
  quota_distribution: parseJsonObject(r.quota_distribution as unknown as string | null),
  recalculation_state: parseJsonObject(r.recalculation_state as unknown as string | null),
  _sync_status: r._sync_status as ReadingPlan['_sync_status'],
})
// --- S7 pure date + quota helpers (BR-BK-S7-2/3/5/6) -------------------------
/** Today as YYYY-MM-DD from the real clock — the determinism seam is each method's `asOf?`. */
function todayISO(): string {
  return new Date(Date.now()).toISOString().slice(0, 10)
}
/** Whole days from `fromISO` to `toISO` (both YYYY-MM-DD) — parsed as UTC-day so the diff is TZ-consistent. */
function daysBetween(fromISO: string, toISO: string): number {
  return Math.round((Date.parse(toISO + 'T00:00:00Z') - Date.parse(fromISO + 'T00:00:00Z')) / 86400000)
}
/** `iso` + `n` days as YYYY-MM-DD. */
function addDaysISO(iso: string, n: number): string {
  return new Date(Date.parse(iso + 'T00:00:00Z') + n * 86400000).toISOString().slice(0, 10)
}
/** BR-BK-S7-2 — the auto/manual quota distribution over days-until-target (Calendar reconciliation STUBBED). A book
 *  with no page basis contributes 0 (honest, never guessed). The sequenced/parallel ordering is carried by
 *  `reading_plan_books.sequence`; the M1 per-book daily split is page-proportional either way (the one-at-a-time
 *  sequenced scheduling is a P6/Calendar refinement). */
function computeDistribution(
  entries: { bookId: string; pages: number }[],
  _arrangement: 'sequenced' | 'parallel',
  goalType: 'manual' | 'auto',
  days: number,
  manualQuota?: number,
): QuotaDistribution {
  const totalPages = entries.reduce((s, e) => s + e.pages, 0)
  const dailyQuota = goalType === 'manual' ? (manualQuota ?? 0) : Math.ceil(totalPages / Math.max(1, days))
  const perBook: Record<string, number> = {}
  for (const e of entries) {
    perBook[e.bookId] = totalPages > 0 ? Math.ceil((dailyQuota * e.pages) / totalPages) : 0
  }
  return { dailyQuota, perBook, totalPages, calendarReconciled: false }
}
/** Defensive typed parse of the stored `quota_distribution` / `recalculation_state` json (the $type lie). */
function parseDistribution(value: unknown): QuotaDistribution | null {
  const o = parseJsonObject(value as string | null)
  return o ? (o as unknown as QuotaDistribution) : null
}
function parseState(value: unknown): RecalculationState {
  const o = parseJsonObject(value as string | null) as unknown as RecalculationState | null
  return o ?? { progressBySession: {}, pagesDone: 0 }
}

// S8 — the page-unit formats whose `native_position` normalizes against the work-level `total_pages` (BR-BK-S8-2).
// `epub` (location) / `audiobook` (timestamp) carry non-page units that need the UNBUILT cross-format mapping (BK-4);
// `other` is an unknown unit by definition — all three yield no candidate (unmeasured, never guessed).
const PAGE_UNIT_FORMATS: ReadonlySet<BookAssetFormat> = new Set<BookAssetFormat>(['pdf', 'physical', 'braille'])
// An internal progress candidate = the public PositionSource + `updatedAt` (needed for the `last_valid` tie-break).
type Candidate = PositionSource & { updatedAt: number }

export function createBooksService(deps: BooksServiceDeps): BooksService {
  const { db, deviceId, ingestion, attachment, spaces, notes, preferences, sessions, sessionRegistry, ai } =
    deps

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
  // reading_sessions has NO deleted_at (session extension; the base `sessions` owns lifecycle, F1) → softDelete:false
  // ⇒ delete() is a hard delete and findAll() skips the deleted_at filter. No [E] fields → encryptedFields:[].
  const readingRepo = createRepository(db, readingSessions, { deviceId, softDelete: false, encryptedFields: [] })
  // S7 — reading plans + the plan↔books junction; both softDelete:true, no [E]. json columns (quota_distribution /
  // recalculation_state) are serialized/parsed service-side (BR-BK-S7-8).
  const plansRepo = createRepository(db, readingPlans, { deviceId, softDelete: true, encryptedFields: [] })
  const planBooksRepo = createRepository(db, readingPlanBooks, { deviceId, softDelete: true, encryptedFields: [] })

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
      unifiedProgress: await getUnifiedProgress(id), // S8 — composes the derived progress (BR-BK-S8-9)
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

  // --- Quote-embed feed + toggles (BOO-21/22) -------------------------------

  // BK-7 precedence: a per-book override wins over global; an absent `preferences?` port is permissive (fail-OPEN,
  // the habits `backfillWindowDays` precedent — a convenience policy, not a security gate).
  async function resolveEmbedToggle(bookId: string): Promise<boolean> {
    if (!preferences) return true // deny-safe permissive default (BR-BK-S5-3)
    const override = await preferences.getQuoteEmbedOverride(bookId)
    if (override !== undefined) return override // per-book overrides global (BR-BK-S5-2)
    return preferences.getQuoteEmbedGlobal()
  }

  async function getEmbeddableQuotes(scope: { bookId?: string }): Promise<BookQuote[]> {
    if (scope.bookId) {
      // SCOPED: the "embed from this book" path — a toggle-off book throws (BR-BK-S5-4).
      if (!(await resolveEmbedToggle(scope.bookId))) throw new QuoteEmbedDisabledError(scope.bookId)
      const rows = await quotesRepo.findWhere(
        and(isNull(bookQuotes.deleted_at), eq(bookQuotes.book_id, scope.bookId)) as SQL,
      )
      return rows.map(toQuote) // live rows; never copied (BR-BK-S5-1/5)
    }
    // GLOBAL feed: exclude toggle-off books; never throws (BR-BK-S5-4).
    const rows = await quotesRepo.findWhere(isNull(bookQuotes.deleted_at))
    if (!preferences) return rows.map(toQuote) // permissive fast-path (BR-BK-S5-3)
    const prefs = preferences // capture for narrowing inside the nested closure
    const global = await prefs.getQuoteEmbedGlobal() // read ONCE (not per book)
    const distinct = [...new Set(rows.map((r) => r.book_id))]
    const overrides = new Map(
      await Promise.all(distinct.map(async (b) => [b, await prefs.getQuoteEmbedOverride(b)] as const)),
    )
    return rows.filter((r) => overrides.get(r.book_id) ?? global).map(toQuote) // override > global (BR-BK-S5-2)
  }

  // --- S6: Reading sessions + Reader orchestration (BOO-23/24/25/26/39) ------

  // IR-1 — register the `reading` sub-type (call-once, idempotent). A 2nd call throws DuplicateSubType → no-op.
  // `createSession('reading')` throws SessionTypeNotFound until this runs (service.ts:276, the flashcards gate).
  async function registerBooks(): Promise<void> {
    try {
      await sessionRegistry.register(READING_SESSION_TYPE_DEF)
    } catch (err) {
      if (!(err instanceof DuplicateSubType)) throw err
    }
  }

  // reading_sessions is keyed by `session_id` (the base session id) — the uniform S6 handle (R1). No deleted_at.
  async function findReadingSession(sessionId: string): Promise<ReadingSessionRow> {
    const rows = await readingRepo.findWhere(eq(readingSessions.session_id, sessionId))
    const row = rows[0]
    if (row == null) throw new ReadingSessionNotFoundError(sessionId)
    return row
  }

  async function startSession(bookId: string, target: StartSessionTarget): Promise<ReadingSessionView> {
    const v = StartSessionTargetSchema.parse(target)
    if (!(await booksRepo.findById(bookId))) throw new BookNotFoundError(bookId)
    let assetId: string | null = null
    if ('assetId' in v) {
      const asset = await assetsRepo.findById(v.assetId)
      // same-book guard: a cross-book asset is a miss (the getMappedPosition precedent).
      if (!asset || asset.book_id !== bookId) throw new BookAssetNotFoundError(v.assetId)
      assetId = v.assetId
    }
    // Compose the base spine. R8 — stamp `started_at` at creation: the #32 engine only auto-stamps it on a
    // transition INTO in_progress, but we create directly at in_progress, so getStatistics would have no start
    // clock otherwise (the startFocus precedent). `reading` maps no focus/study extension (extension stays null).
    const session = await sessions.createSession({
      sub_type: READING_SESSION_SUB_TYPE,
      scheduling_mode: 'ad_hoc',
      status: 'in_progress',
      started_at: Date.now(),
    })
    // Books writes its OWN 1:1 extension keyed `session_id` (the base owns lifecycle; R10 — this is a separate write
    // from createSession's tx, the flashcards compose; an orphan base session is harmless + re-drivable, no-FK).
    const reading = await readingRepo.create({
      session_id: session.session.id,
      book_id: bookId,
      asset_id: assetId,
      pages_read: null,
      position_delta: null,
      stop_point: null,
      statistics: null,
    } satisfies CreateInput<typeof readingSessions>)
    // R7 — attach the BOOK as the ADR-004 §3.2.1 target ("this session is about X"); `book_asset` is an excluded
    // ENTITY_TYPE (_registry.ts:87) → attaching it would fail loud. The asset linkage lives in `reading_sessions.asset_id`.
    await sessions.attach(session.session.id, BOOK_ENTITY_TYPE, bookId, 'instance')
    return { session, reading: toReadingSession(reading) }
  }

  async function endSession(id: string, capture: ReadingCapture): Promise<ReadingSessionView> {
    const v = EndSessionCaptureSchema.parse(capture)
    const existing = await findReadingSession(id) // guard (ReadingSessionNotFoundError) + the extension row to patch
    // Complete the base row — the #32 lifecycle engine transitions in_progress→completed + stamps ended_at (R8).
    await sessions.completeSession(id)
    // Update the extension's mode-adaptive capture (R9 — `statistics` stays the dormant M2 seam; not written here).
    const patch: Record<string, unknown> = {}
    if (v.pages !== undefined) patch.pages_read = v.pages
    if (v.position !== undefined) patch.position_delta = v.position
    if (v.stopPoint !== undefined) patch.stop_point = v.stopPoint
    if (Object.keys(patch).length > 0) {
      await readingRepo.update(existing.id, patch as UpdateInput<typeof readingSessions>)
    }
    const session = await sessions.getSession(id)
    if (session == null) throw new ReadingSessionNotFoundError(id) // the base row was just completed → present
    const reading = (await readingRepo.findById(existing.id))! // just updated the row found above
    return { session, reading: toReadingSession(reading) }
  }

  async function attachPhoto(
    sessionId: string,
    photo: FileBlob,
  ): Promise<{ stored: AttachmentRef; ocr: OcrResult }> {
    const reading = await findReadingSession(sessionId) // guard + yields book_id for the upload
    // (a) store — the photo ALWAYS stores when a port is present (BK-10, conventions.md:53-54); absent ⇒
    // attachment-unavailable; a PRESENT port whose upload rejects is a real R2 error ⇒ fail-loud AssetFileError
    // (the addAsset precedent, BR-BK-S3-2).
    let stored: AttachmentRef = { status: 'attachment-unavailable' }
    if (attachment) {
      try {
        const res = await attachment.upload({ blob: photo, bookId: reading.book_id })
        stored = { status: 'stored', fileRef: res.fileRef }
      } catch (err) {
        throw new AssetFileError(`Photo upload failed for session ${sessionId}`, err)
      }
    }
    // (b) OCR — INDEPENDENT of (a): a denied/failed OCR never touches `stored` (BK-10 "the photo still stores").
    // OCR runs on_device (the photo is vault content — ZK-safe, conventions.md:57). M1 dormant (askModel denies ⇒
    // ai-unavailable); at M2 res.content IS the extracted position (source=ai, AI6). The real photo-encoding +
    // position-parsing is the M2 pipeline (zero-signature swap).
    let ocr: OcrResult = { status: 'ai-unavailable' }
    if (ai) {
      try {
        const res = await ai.askModel({ defId: BOOKS_OCR_INTEGRATION_ID, mode: 'on_device' })
        ocr = { status: 'ready', position: res.content, source: 'ai' }
      } catch (err) {
        ocr = { status: 'ai-unavailable', reason: err instanceof Error ? err.message : String(err) }
      }
    }
    return { stored, ocr }
  }

  async function getStatistics(scope: { bookId?: string }): Promise<ReadingStatistics> {
    // BOO-26 — derive over the reading-sessions ledger (per-book or all); never stored (C-E2 — no economy grant).
    const rows = scope.bookId
      ? await readingRepo.findWhere(eq(readingSessions.book_id, scope.bookId))
      : await readingRepo.findAll() // softDelete:false ⇒ no deleted_at filter referenced
    let pagesRead = 0
    let minutesSpent = 0
    for (const r of rows) {
      pagesRead += r.pages_read ?? 0
      // R11 — timing lives on the BASE session (started_at/ended_at), not the extension; completed sessions only
      // (an in-progress session has ended_at=null ⇒ 0 minutes but still counts in sessionsLogged).
      const s = await sessions.getSession(r.session_id)
      const started = s?.session.started_at
      const ended = s?.session.ended_at
      if (started != null && ended != null) {
        minutesSpent += Math.max(0, Math.round((ended - started) / 60000))
      }
    }
    return { sessionsLogged: rows.length, pagesRead, minutesSpent }
  }

  async function openReader(assetId: string): Promise<ReaderContext> {
    const asset = await assetsRepo.findById(assetId)
    if (!asset) throw new BookAssetNotFoundError(assetId)
    // (a) decrypt — deny-safe: absent port OR a physical asset (no file_ref) ⇒ attachment-unavailable; a PRESENT
    // port whose download rejects ⇒ fail-loud AssetFileError (the S6 decrypt throw site, BOO-44). The decrypted
    // bytes stream to the P6 Reader chrome; the service face returns only the access outcome.
    let file: AttachmentRef = { status: 'attachment-unavailable' }
    if (attachment && asset.file_ref) {
      try {
        await attachment.download({ fileRef: asset.file_ref })
        file = { status: 'stored', fileRef: asset.file_ref }
      } catch (err) {
        throw new AssetFileError(`Reader decrypt failed for asset ${assetId}`, err)
      }
    }
    // (b) auto-start a reading session for this asset's book+asset (BK-15 "auto-session tracking").
    const reading = await startSession(asset.book_id, { assetId })
    // (c) resolve the asset's OWN position as a MappedPosition (synced-to-self | not-synced) — never a cross-format
    // guess (BK-4; the cross-format map stays getMappedPosition's deferred NotSyncedState).
    const position: MappedPosition =
      asset.native_position != null
        ? { status: 'synced', position: asset.native_position, sourceAssetId: assetId }
        : { status: 'not-synced', nativePosition: null }
    return { file, sessionId: reading.session.session.id, position }
  }

  // --- S7: Reading plans / Quota Planner (BOO-27..33) ------------------------

  async function createPlan(input: CreatePlanInput): Promise<ReadingPlan> {
    const v = CreatePlanSchema.parse(input)
    // Guard every book exists (no-FK app-layer integrity) + gather the page basis (no total_pages ⇒ 0, honest).
    const pageBasis: { bookId: string; pages: number }[] = []
    for (const b of v.books) {
      const book = await booksRepo.findById(b.bookId)
      if (!book) throw new BookNotFoundError(b.bookId)
      pageBasis.push({ bookId: b.bookId, pages: book.total_pages ?? 0 })
    }
    const days = Math.max(1, daysBetween(todayISO(), v.targetDate))
    const dist = computeDistribution(pageBasis, v.arrangement, v.goalType, days, v.quota)
    const state: RecalculationState = { progressBySession: {}, pagesDone: 0 }
    // R6 — plan row + N junction rows in ONE transaction (both tables Books-local; createInTx, repository.ts:195).
    const planRow = await db.transaction(async (tx) => {
      const plan = await plansRepo.createInTx(tx, {
        arrangement: v.arrangement,
        goal_type: v.goalType,
        target_date: v.targetDate,
        target_completion_date: null,
        // json<T> write boundary (BR-BK-S7-8): stringify + one cast here only.
        quota_distribution: JSON.stringify(dist) as unknown as Record<string, unknown>,
        recalculation_state: JSON.stringify(state) as unknown as Record<string, unknown>,
        deleted_at: null,
      } satisfies CreateInput<typeof readingPlans>)
      for (const b of v.books) {
        await planBooksRepo.createInTx(tx, {
          plan_id: plan.id,
          book_id: b.bookId,
          sequence: b.sequence ?? null,
          quota: dist.perBook[b.bookId] ?? null,
          deleted_at: null,
        } satisfies CreateInput<typeof readingPlanBooks>)
      }
      return plan
    })
    return toReadingPlan(planRow)
  }

  async function getTodayQuotas(asOf?: string): Promise<TodayQuotas> {
    const today = asOf ?? todayISO()
    const plans = await plansRepo.findWhere(isNull(readingPlans.deleted_at)) // active plans only
    const out: TodayQuotas = []
    for (const p of plans) {
      const dist = parseDistribution(p.quota_distribution)
      if (!dist) continue
      const state = parseState(p.recalculation_state)
      // Cumulative expected-by-today vs cumulative done = the pace signal (derived, never stored).
      const startISO = new Date(p.created_at).toISOString().slice(0, 10)
      const daysElapsed = Math.max(0, daysBetween(startISO, today)) + 1 // day 1 = creation day
      const expected = dist.dailyQuota * daysElapsed
      const done = state.pagesDone
      const status = done >= expected ? (done > expected ? 'ahead' : 'on-pace') : 'behind'
      // `target` = today's daily quota (BOO-30 "today's quota"); `done` = cumulative progress; `status` = the pace.
      out.push({ planId: p.id, target: dist.dailyQuota, done, status })
    }
    return out
  }

  async function recordQuotaProgress(planId: string, sessionRef: string): Promise<void> {
    const plan = await plansRepo.findById(planId)
    if (!plan) throw new ReadingPlanNotFoundError(planId)
    // Guard the referenced reading session exists (fail-loud via the S6 helper) — a bogus ref is a caller error,
    // never a silent 0-credit. `sessionRef` = the base reading session id (BR-BK-S7-4).
    const session = await findReadingSession(sessionRef)
    const pages = session.pages_read ?? 0
    const state = parseState(plan.recalculation_state)
    // Idempotent per sessionRef — OVERWRITE (not add), then recompute pagesDone from the map (BR-BK-S7-4).
    state.progressBySession[sessionRef] = pages
    state.pagesDone = Object.values(state.progressBySession).reduce((s, n) => s + n, 0)
    await plansRepo.update(planId, {
      recalculation_state: JSON.stringify(state) as unknown as Record<string, unknown>,
    } as UpdateInput<typeof readingPlans>)
  }

  async function recalculate(planId: string, asOf?: string): Promise<ReadingPlan> {
    const plan = await plansRepo.findById(planId)
    if (!plan) throw new ReadingPlanNotFoundError(planId)
    const dist = parseDistribution(plan.quota_distribution)
    if (!dist || !plan.target_date) return toReadingPlan(plan) // no basis to reshape (TOC-only / no target)
    const today = asOf ?? todayISO()
    const state = parseState(plan.recalculation_state)
    const remainingPages = Math.max(0, dist.totalPages - state.pagesDone)
    const remainingDays = daysBetween(today, plan.target_date)
    const requiredDailyQuota = remainingPages <= 0 ? 0 : Math.ceil(remainingPages / Math.max(1, remainingDays))
    // BR-BK-S7-5 — behind the planned pace (or no days left with pages remaining) ⇒ PROPOSE, never silently rewrite.
    if (remainingPages > 0 && (remainingDays <= 0 || requiredDailyQuota > dist.dailyQuota)) {
      const options: ('extend_date' | 'raise_quota')[] =
        remainingDays <= 0 ? ['extend_date'] : ['extend_date', 'raise_quota']
      // suggestedDate keeps the ORIGINAL pace (extend the date to fit the remaining pages at dist.dailyQuota).
      const suggestedDate = addDaysISO(today, Math.ceil(remainingPages / Math.max(1, dist.dailyQuota)))
      throw new TargetUnreachableProposal(
        planId,
        options,
        suggestedDate,
        remainingDays > 0 ? requiredDailyQuota : undefined, // raise_quota keeps the date at the faster pace
      )
    }
    // On/ahead of pace ⇒ reshape silently: adjust the overall `dailyQuota` pace over the remaining days. `perBook`
    // keeps the original page-share (per-book progress isn't tracked at M1; the derivations read `dailyQuota`, so
    // they stay correct — per-book redistribution is a P6/Calendar refinement).
    const reshaped: QuotaDistribution = { ...dist, dailyQuota: requiredDailyQuota }
    await plansRepo.update(planId, {
      quota_distribution: JSON.stringify(reshaped) as unknown as Record<string, unknown>,
    } as UpdateInput<typeof readingPlans>)
    const updated = (await plansRepo.findById(planId))! // just updated the row guarded above
    return toReadingPlan(updated)
  }

  async function getProjection(planId: string, asOf?: string): Promise<PlanProjection> {
    const plan = await plansRepo.findById(planId)
    if (!plan) throw new ReadingPlanNotFoundError(planId)
    const today = asOf ?? todayISO()
    const dist = parseDistribution(plan.quota_distribution)
    const state = parseState(plan.recalculation_state)
    const totalPages = dist?.totalPages ?? 0
    const remainingPages = Math.max(0, totalPages - state.pagesDone)
    const remainingDays = plan.target_date ? daysBetween(today, plan.target_date) : 0
    const pace = dist?.dailyQuota ?? 0
    const daysToFinish = pace > 0 ? Math.ceil(remainingPages / pace) : null
    const projectedCompletionDate =
      remainingPages === 0 ? today : daysToFinish != null ? addDaysISO(today, daysToFinish) : null
    const onTrack =
      plan.target_date != null && projectedCompletionDate != null
        ? daysBetween(projectedCompletionDate, plan.target_date) >= 0
        : remainingPages === 0
    return { planId, projectedCompletionDate, onTrack, remainingPages, remainingDays }
  }

  // ── S8: Unified progress + conflict resolution (BOO-13/34/35) ───────────────
  // All three methods DERIVE on read — no `book_conflicts` table (interpretation rule 7). Unified progress composes
  // `measurement.normalize` (quantitative × derived-pull, BOO-14) over page-unit asset positions under the BK-8
  // conflict rule; the preset rule is read/written through the deny-safe `preferences?` port (absent ⇒ ask / no-op).

  /** Per-asset progress candidates (BR-BK-S8-2). A page-unit asset with a strict-integer `native_position` and a
   *  work-level `total_pages > 0` normalizes to a 0–100 value; everything else yields no candidate (unmeasured). */
  async function computeCandidates(book: BookRow): Promise<Candidate[]> {
    if (book.total_pages == null || book.total_pages <= 0) return [] // no page basis ⇒ nothing to derive
    const totalPages = book.total_pages
    // findWhere skips the soft-delete filter → isNull(deleted_at) explicit (repository-findwhere-skips-softdelete-filter).
    const assetRows = await assetsRepo.findWhere(
      and(isNull(bookAssets.deleted_at), eq(bookAssets.book_id, book.id)) as SQL,
    )
    const candidates: Candidate[] = []
    for (const asset of assetRows) {
      if (!PAGE_UNIT_FORMATS.has(asset.format as BookAssetFormat)) continue
      const np = asset.native_position
      if (np == null || !/^\d+$/.test(np)) continue // only a clean page integer; audio "01:23:45" / cfi are excluded
      const frac = normalize({
        kind: 'quantitative',
        current: Number.parseInt(np, 10),
        baseline: 0,
        target: totalPages,
        isHigherBetter: true,
      })
      if (frac == null) continue
      candidates.push({
        assetId: asset.id,
        format: asset.format as BookAssetFormat,
        nativePosition: np,
        progress: Math.round(frac * 100),
        updatedAt: asset.updated_at,
      })
    }
    return candidates
  }

  /** Reconcile ≥1 candidates to a single value or `'conflicted'` (BR-BK-S8-4/5). Agreement (rounding absorbs
   *  sub-point drift) ⇒ the value; a genuine clash ⇒ the preset rule resolves it, else `'conflicted'`. */
  async function resolveClash(book: BookRow, candidates: Candidate[]): Promise<number | 'conflicted'> {
    const distinct = new Set(candidates.map((c) => c.progress))
    if (distinct.size === 1) return candidates[0]!.progress // single candidate or full agreement
    // Clash — read the preset rule (absent port / unset ⇒ the BK-8 default `ask`).
    const rule = preferences ? await preferences.getConflictRule(book.id) : undefined
    if (rule == null || rule.rule === 'photo_valid') return 'conflicted' // no rule, or photo source absent at M1
    if (rule.rule === 'source_of_truth') {
      const chosen = candidates.find((c) => c.assetId === rule.assetId)
      return chosen ? chosen.progress : 'conflicted' // asset not in this clash ⇒ honest conflicted (read-side miss)
    }
    // last_valid — greatest updated_at, tie-broken by asset id descending (deterministic, BR-BK-S8-5).
    const latest = [...candidates].sort(
      (a, b) => b.updatedAt - a.updatedAt || (a.assetId < b.assetId ? 1 : -1),
    )[0]!
    return latest.progress
  }

  async function getUnifiedProgress(bookId: string): Promise<number | 'conflicted' | null> {
    const book = await booksRepo.findById(bookId)
    if (!book) throw new BookNotFoundError(bookId)
    // resolveProgress §3.2 semantics, inlined: a non-null stored progress is the manual-override terminal (BR-BK-S8-1).
    // (The generic resolveProgress returns number|null and cannot carry 'conflicted', so the derive branch is inline.)
    if (book.progress != null) return Math.max(0, Math.min(100, book.progress))
    const candidates = await computeCandidates(book)
    if (candidates.length === 0) return null // unmeasured (BR-2) — never coerced to 0
    return resolveClash(book, candidates)
  }

  async function getConflicts(bookId: string): Promise<ConflictItem[]> {
    const book = await booksRepo.findById(bookId)
    if (!book) throw new BookNotFoundError(bookId) // fail-loud parity with getUnifiedProgress (N4)
    const candidates = await computeCandidates(book)
    if (candidates.length === 0) return []
    const resolved = await resolveClash(book, candidates)
    if (resolved !== 'conflicted') return []
    // One book-level clash; `sources` = the competing candidates projected to the public PositionSource (drop updatedAt).
    const sources: PositionSource[] = candidates.map(({ updatedAt: _updatedAt, ...ps }) => ps)
    return [{ id: `conflict:${bookId}`, bookId, sources, blocking: true }]
  }

  async function resolveConflict(id: string, choice: ConflictChoice): Promise<void> {
    // `id` is the deterministic derived key `conflict:<bookId>` (BR-BK-S8-7). Parse → fail-loud on malformed/unknown.
    const prefix = 'conflict:'
    const bookId = id.startsWith(prefix) ? id.slice(prefix.length) : null
    if (bookId == null) throw new BookNotFoundError(id)
    const book = await booksRepo.findById(bookId)
    if (!book) throw new BookNotFoundError(bookId)
    // Structural validation on Books-owned data (port-independent, BR-BK-S8-8): a source_of_truth asset MUST exist on
    // this book — a non-existent/foreign asset is a structural error (distinct from a benign read-side "not in clash").
    if (choice.rule === 'source_of_truth') {
      const asset = await assetsRepo.findById(choice.assetId)
      if (!asset || asset.deleted_at != null || asset.book_id !== bookId) {
        throw new BookAssetNotFoundError(choice.assetId)
      }
    }
    // Persist via the deny-safe port; absent ⇒ no-op (the revokeLookupGrant precedent, BR-BK-S2-6). Real write = M2/P6.
    if (!preferences) return
    await preferences.setConflictRule(bookId, choice)
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
    getEmbeddableQuotes,
    registerBooks,
    startSession,
    endSession,
    attachPhoto,
    getStatistics,
    openReader,
    createPlan,
    getTodayQuotas,
    recordQuotaProgress,
    recalculate,
    getProjection,
    getUnifiedProgress,
    getConflicts,
    resolveConflict,
  }
}
