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
import type { Book, BookStatus } from '@vida/types'
import type { DrizzleDb } from '../../db/adapter'
import type { BookAssetRow } from '../../db/schema/books'
import type { CreateBookSchema, UpdateBookSchema } from '../../validators/books'

/** The `entity_type` a book registers in the shared taggable/pages/links registries (pre-seeded by DB-4
 *  `ENTITY_TYPES`, db-4-books/_index.md:116 — Books injects the registry, never re-registers). Consumed by
 *  S4 (annotations/links) + S9 (tags/subjects). */
export const BOOK_ENTITY_TYPE = 'book'

export interface BooksServiceDeps {
  db: DrizzleDb
  deviceId: string
  // S2–S10 append: spaces / backlinks / notes / sessions / sessionRegistry (required) +
  //   ai? / ingestion? / attachment? / preferences? / effects? (optional deny-safe ports).
}

// --- Zod-inferred input shapes (validators/books.ts) ------------------------
export type CreateBookInput = z.infer<typeof CreateBookSchema>
export type UpdateBookInput = z.infer<typeof UpdateBookSchema>

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

// --- typed errors (BOO-01; no-FK app-layer integrity, the knowledge precedent) ---

/** BOO-01 — a book id did not resolve (guard-exists at update/get/capability). */
export class BookNotFoundError extends Error {
  constructor(public readonly id: string) {
    super(`Book not found: ${id}`)
    this.name = 'BookNotFoundError'
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
  /** BOO-48 — plannable vs readable. `plannable` = a page basis exists (BK-17); `readable` composes S3 (≥1 asset;
   *  false in S1 until assets land). Guards exists (BookNotFoundError). */
  getCapabilities(id: string): Promise<BookCapabilities>
}
