// ============================================================================
// services/books — the service (mod-books #51 ①)
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
import type { Book } from '@vida/types'
import { createRepository, type CreateInput, type UpdateInput } from '../../db/repository'
import { books, type BookRow } from '../../db/schema/books'
import { CreateBookSchema, UpdateBookSchema } from '../../validators/books'
import {
  BookNotFoundError,
  type BooksService,
  type BooksServiceDeps,
  type CreateBookInput,
  type UpdateBookInput,
  type BookFilter,
  type BookView,
  type BookCapabilities,
} from './types'

// --- Row → @vida/types interface --------------------------------------------
// The reshaped BookRow maps 1:1 to the reshaped Book interface (S1 @vida/types reconcile); only the plain-text
// `_sync_status` needs the union cast (drizzle-row-not-assignable-to-vida-types-interface).
const toBook = (r: BookRow): Book => ({
  ...r,
  _sync_status: r._sync_status as Book['_sync_status'],
})

export function createBooksService(deps: BooksServiceDeps): BooksService {
  const { db, deviceId } = deps

  // [E] fields (title/author/isbn/review/cover_url) → encryptedFields:[] M1.0 pass-through (dormant → M3/DB-5).
  const booksRepo = createRepository(db, books, { deviceId, softDelete: true, encryptedFields: [] })

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
    // S1 aggregate: assets fill at S3, unifiedProgress derives at S8 (deny-safe not-yet-composed defaults).
    return { book: toBook(book), assets: [], unifiedProgress: null }
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
    // plannable = a page basis exists (TOC-only/no-copy is plannable, BK-17). readable composes S3 (≥1 asset) —
    // false in S1 until book_assets is consumed (the honest M1 state, not a stub).
    return { plannable: book.total_pages != null, readable: false }
  }

  return {
    createBook,
    updateBook,
    softDeleteBook,
    getBook,
    listBooks,
    getCapabilities,
  }
}
