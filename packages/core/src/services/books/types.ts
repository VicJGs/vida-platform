// ============================================================================
// services/books — types (mod-books #51 ① · the reading Universe service tier)
//
// Deps + the BooksService interface + input/view types + typed errors. Factory-object shape, hoisted closures,
// no `this.` (the ② destructure-consumption shape; the knowledge/habits/finance precedent). S1 declares the
// Works-CRUD surface; S2–S10 APPEND (chapters · assets · annotations · quote-embed · sessions · plans ·
// progress/conflict · Education/measurement · integrations/Journal) per docs/features/books/delivery/slice-map.md.
// Deps grow the same way — S1 needs only { db, deviceId }; later slices add spaces/backlinks/notes/sessions/
// sessionRegistry + the optional deny-safe ports (ai?/ingestion?/attachment?/preferences?/effects?).
// ============================================================================

import type { z } from 'zod'
import type { Book, BookChapter, BookStatus } from '@vida/types'
import type { DrizzleDb } from '../../db/adapter'
import type { BookAssetRow } from '../../db/schema/books'
import type { IngestionGuard } from '../../foundation/ingestion'
import type { CreateBookSchema, UpdateBookSchema, ChapterSeedSchema } from '../../validators/books'

/** The `entity_type` a book registers in the shared taggable/pages/links registries (pre-seeded by DB-4
 *  `ENTITY_TYPES`, db-4-books/_index.md:116 — Books injects the registry, never re-registers). Consumed by
 *  S4 (annotations/links) + S9 (tags/subjects). */
export const BOOK_ENTITY_TYPE = 'book'

export interface BooksServiceDeps {
  db: DrizzleDb
  deviceId: string
  /** S2 — ADR-014 ISBN/metadata public-reference lookup (BOO-07/08). Optional deny-safe port: absent ⇒
   *  `lookupBook` returns `lookup-unavailable` and `revokeLookupGrant` is a no-op. At M1 even when injected the
   *  fetch folds to `lookup-unavailable` (fail-closed) — the def is unregistered (⇒ CapabilityNotFound) and there
   *  is no mediator; the real grant + normalization land at M2 (zero-signature swap). `[FACT: foundation/ingestion
   *  CLAUDE.md; parts/books.md:138]` */
  ingestion?: IngestionGuard
  // S3–S10 append: spaces / backlinks / notes / sessions / sessionRegistry (required) +
  //   ai? / attachment? / preferences? / effects? (optional deny-safe ports).
}

// --- Zod-inferred input shapes (validators/books.ts) ------------------------
export type CreateBookInput = z.infer<typeof CreateBookSchema>
export type UpdateBookInput = z.infer<typeof UpdateBookSchema>
/** setChapters seed (BOO-05) — structural chapter fields only; tracking state is never seeded (preserved across
 *  a re-set). `z.infer` of `ChapterSeedSchema`. */
export type ChapterSeed = z.infer<typeof ChapterSeedSchema>

/** listBooks filter (BOO-02) — S1 owns `status` ONLY. The `tags`/`subject`/`format-owned` keys are NOT
 *  advertised until S9/S3 build them (never advertise an unimplemented filter → no silent-wrong-result). */
export interface BookFilter {
  status?: BookStatus
}

/** getBook aggregate (BOO-03) — work + per-format assets + unified progress. S1 returns the work row with
 *  `assets: []` (fills at S3) and `unifiedProgress: null` (derives at S8) — deny-safe not-yet-composed defaults,
 *  the incremental-slice aggregate (the knowledge getObject precedent). Service-layer shape (not @vida/types). */
export interface BookView {
  book: Book
  /** S1: always `[]` (assets land at S3). Typed as the schema row until S3 adds a `BookAsset` @vida/types
   *  interface (the raw-Row-in-seam precedent, knowledge listLinks:EntityLinkRow). */
  assets: BookAssetRow[]
  unifiedProgress: number | null
}

/** BOO-48 — capability gating (plannable vs readable). `plannable` = has a page basis (total_pages/TOC), so a
 *  TOC-only/no-copy book is plannable (BK-17); `readable` = has ≥1 asset (composes S3 — false until a copy exists,
 *  the honest M1 state, not a stub). */
export interface BookCapabilities {
  plannable: boolean
  readable: boolean
}

// --- S2: ISBN/metadata lookup (BOO-07/08) — service-layer types (the MasterySource precedent, NOT @vida/types) ---

/** The Books-owned integration identity for the ADR-014 "Books ISBN" public-reference dataset (X10 / XCU-14). It
 *  names Books' OWN integration — the `entity_type='book'` / `reading` sub-type precedent — NOT a synthesized
 *  downstream grant-map id (No-Guessing). Inert at M1 (no enforcer registration; the grant + mediator are M2). Used
 *  as both the capability `defId` and the `IngestionSource.integrationId`. `[FACT: business-rules.md:69-76 (BK-14);
 *  ADR-014 X1/X2/X3/X5/X9]` */
export const BOOKS_ISBN_INTEGRATION_ID = 'books.isbn_lookup'

/** The subset of book fields an ISBN/metadata lookup can populate (a `lookupBook` result shape, not a DB row). */
export interface BookMetadata {
  title: string
  author?: string | null
  isbn?: string | null
  total_pages?: number | null
  cover_url?: string | null
}

/** The XCU-14 normalization contract Books OWNS: the shape the ingestion mediator/adapter emits for an ISBN lookup
 *  (both ingestion layers conform to it). At M1 UNREACHABLE (no mediator); the M2 adapter fills + validates it. */
export interface IsbnLookupPayload {
  metadata: BookMetadata
  toc?: ChapterSeed[]
}

/** `lookupBook` outcome (BOO-07) — the deny-safe port result (the `AiAssistResult` precedent). `ready` carries the
 *  normalized metadata + optional TOC; `lookup-unavailable` = no ingestion dep OR the fetch was refused/failed
 *  (fail-closed). The manual fallback (`setChapters`/`createBook`) is callable regardless (BK-14). */
export type LookupResult =
  | { status: 'ready'; metadata: BookMetadata; toc?: ChapterSeed[] }
  | { status: 'lookup-unavailable'; reason?: string }

// --- typed errors (BOO-01; no-FK app-layer integrity, the knowledge precedent) ---

/** BOO-01 — a book id did not resolve (guard-exists at update/get/capability). */
export class BookNotFoundError extends Error {
  constructor(public readonly id: string) {
    super(`Book not found: ${id}`)
    this.name = 'BookNotFoundError'
  }
}

/** BOO-05 — a `chapter_number` collided within a `setChapters` call (the app-layer pre-check above the DB
 *  `UNIQUE(book_id, chapter_number)` backstop; the no-FK integrity pattern, BR-BK-S1-5). */
export class ChapterUniqueViolation extends Error {
  constructor(
    public readonly bookId: string,
    public readonly chapterNumber: number,
  ) {
    super(`Duplicate chapter_number ${chapterNumber} for book ${bookId}`)
    this.name = 'ChapterUniqueViolation'
  }
}

/** BOO-06 — a chapter id did not resolve (guard-exists at `markChapterComplete`; the `BookNotFoundError` pattern). */
export class ChapterNotFoundError extends Error {
  constructor(public readonly id: string) {
    super(`Chapter not found: ${id}`)
    this.name = 'ChapterNotFoundError'
  }
}

export interface BooksService {
  // ── S1: Works CRUD + reframe (BOO-01/02/03/48) ──────────────────────────────
  /** BOO-01 — create a WORK row. `progress` is never accepted (derived, BR-BK-2); `status` defaults to
   *  'want_to_read'; `rating` 1–5. A book needs no asset (TOC-only is first-class, BK-17). */
  createBook(input: CreateBookInput): Promise<Book>
  /** BOO-01 — patch a work; guards exists (BookNotFoundError). `progress`/retired columns never settable. */
  updateBook(id: string, patch: UpdateBookInput): Promise<Book>
  /** BOO-01 — soft-delete a work (`deleted_at`). */
  softDeleteBook(id: string): Promise<void>
  /** BOO-03 — the Book Hub aggregate read: work + assets + unified progress. S1: assets `[]`, progress `null`
   *  (compose S3/S8). Returns null when the id does not resolve (or is soft-deleted). */
  getBook(id: string): Promise<BookView | null>
  /** BOO-02 — the Bookshelf query half (soft-delete filtered). S1: `status` filter only. */
  listBooks(filter?: BookFilter): Promise<Book[]>
  /** BOO-48 — plannable vs readable. `plannable` = a page basis exists — a work-level `total_pages` OR a TOC
   *  (≥1 chapter, S2 fold); `readable` composes S3 (≥1 asset; false until assets land). Guards exists. */
  getCapabilities(id: string): Promise<BookCapabilities>

  // ── S2: Chapters/TOC + ISBN lookup (BOO-05/06/07/08) ─────────────────────────
  /** BOO-05 — set the flat TOC (declarative). UPSERTS by `chapter_number` (the UNIQUE key): structural fields
   *  overwrite, tracking (`is_completed`/`completed_at`/`actual_reading_minutes`) is PRESERVED for surviving
   *  numbers, absent numbers are hard-deleted (no `deleted_at`). An in-array duplicate number ⇒ `ChapterUniqueViolation`.
   *  Guards book exists (`BookNotFoundError`). Returns the TOC ordered by `chapter_number`. */
  setChapters(bookId: string, chapters: ChapterSeed[]): Promise<BookChapter[]>
  /** BOO-06 — record chapter completion (`is_completed` + `completed_at`). Guards exists (`ChapterNotFoundError`). */
  markChapterComplete(chapterId: string, done: boolean): Promise<BookChapter>
  /** BOO-07 — device-mediated public-reference ISBN/metadata lookup. Deny-safe: no `ingestion` dep OR a
   *  refused/failed fetch ⇒ `lookup-unavailable` (fail-closed); the manual fallback stays callable (BK-14). */
  lookupBook(query: { isbn?: string; text?: string }): Promise<LookupResult>
  /** BOO-08 — X9 revoke: halt future ISBN lookups; already-imported metadata is untouched (keep-imported). No
   *  `ingestion` dep ⇒ no-op (nothing was granted at M1). */
  revokeLookupGrant(): Promise<void>
}
