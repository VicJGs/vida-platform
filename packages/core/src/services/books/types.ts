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
import type { Book, BookAsset, BookChapter, BookStatus } from '@vida/types'
import type { DrizzleDb } from '../../db/adapter'
import type { IngestionGuard } from '../../foundation/ingestion'
import type {
  CreateBookSchema,
  UpdateBookSchema,
  ChapterSeedSchema,
  AddAssetSchema,
} from '../../validators/books'

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
  /** S3 — ADR-003 R2 encrypted file/photo upload (BOO-09). Optional deny-safe port: absent ⇒ `addAsset` stores
   *  no file (`file_ref` null, `attachment-unavailable`), the asset is still created (BK-17). A PRESENT port whose
   *  `upload()` rejects is a real R2 error ⇒ fail-loud `AssetFileError` (BR-BK-S3-2, `business-rules.md:127`). No
   *  R2 substrate exists at M1 (`grep foundation/ = none`) — the real pipeline lands at M2 (zero-signature swap).
   *  `[FACT: business-rules.md:14 (BK-1 attachments); parts/books.md:19 (BOO-09, R2=ADR-003-owned)]` */
  attachment?: AttachmentPort
  // S4–S10 append: spaces / backlinks / notes / sessions / sessionRegistry (required) +
  //   ai? / preferences? / effects? (optional deny-safe ports).
}

// --- S3: asset file upload (BOO-09) — deny-safe port + service-layer types (the LookupResult precedent) ---

/** A client-side binary handed to the `attachment?` port for encrypted R2 upload (BK-1). Opaque at M1 — the real
 *  encrypt/store shape is the M2 ADR-003 pipeline's; Books only passes it through. NOT a validated input (it is raw
 *  bytes, not a value) — `AddAssetSchema` validates the `format`/`native_position` metadata only. */
export interface FileBlob {
  bytes: Uint8Array
  mimeType?: string
  filename?: string
}

/** The ADR-003 R2 upload seam. A present port uploads the blob + returns the encrypted file ref; a rejection is a
 *  real R2 error (fail-loud `AssetFileError`). Absent ⇒ the deny-safe `attachment-unavailable` path (no throw).
 *  M1: no implementation wired; M2 provides the real R2 pipeline (zero-signature swap). */
export interface AttachmentPort {
  // `fileRef` is the stable R2 handle the asset row stores (and M2 GC deletes by) — so upload runs BEFORE the row
  // is created and nothing persists on a failure. No `assetId` needed pre-creation.
  upload(input: { blob: FileBlob; bookId: string }): Promise<{ fileRef: string }>
}

/** addAsset's file outcome (BOO-09) — the frozen 2-state `AttachmentRef`: `stored` (port present + success) or
 *  `attachment-unavailable` (no port / no file). A real R2 FAILURE is NOT a state here — it throws `AssetFileError`
 *  (BR-BK-S3-2). `[FACT: seam-contract.md:45-46; business-rules.md:97-98,127]` */
export type AttachmentRef = { status: 'stored'; fileRef: string } | { status: 'attachment-unavailable' }

/** getMappedPosition outcome (BOO-12, BK-4) — the honest cross-format absent-state, never a guessed position. At M1
 *  the mapping algorithm (transcription + TOC-anchor matching) is unbuilt (design pass → build), so the result is
 *  ALWAYS `not-synced`, carrying the TARGET asset's own `native_position` (BK-5 `:28-30`; terminal `:113`). The
 *  `synced` variant is the M2 shape (zero-signature). At M2, `pending|failed|unavailable` collapse into
 *  `not-synced`; M1 produces only the unconditional `not-synced` (no collapse logic exists yet). */
export type MappedPosition =
  | { status: 'synced'; position: string; sourceAssetId: string }
  | { status: 'not-synced'; nativePosition: string | null }

// --- Zod-inferred input shapes (validators/books.ts) ------------------------
export type CreateBookInput = z.infer<typeof CreateBookSchema>
export type UpdateBookInput = z.infer<typeof UpdateBookSchema>
/** setChapters seed (BOO-05) — structural chapter fields only; tracking state is never seeded (preserved across
 *  a re-set). `z.infer` of `ChapterSeedSchema`. */
export type ChapterSeed = z.infer<typeof ChapterSeedSchema>
/** addAsset metadata (BOO-09) — `format` + optional `native_position`; `z.infer` of `AddAssetSchema`. */
export type AddAssetInput = z.infer<typeof AddAssetSchema>
/** addAsset's full argument — the metadata PLUS the optional raw `file` blob, bundled in one object per the frozen
 *  seam-contract (`seam-contract.md:84`). The service splits `file` off before Zod-validating the metadata (the
 *  blob is raw bytes, not a validated value). */
export type AddAssetArgs = AddAssetInput & { file?: FileBlob }

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
  /** S3 (N1 fold) — the per-format `BookAsset[]` (soft-delete filtered), now a proper `@vida/types` interface
   *  (was the raw `BookAssetRow`). `[]` when the book owns no copy (TOC-only is first-class, BK-17). */
  assets: BookAsset[]
  /** S3 (B1 fold) — the flat TOC ordered by `chapter_number` (closes the S2 chapter-READ carry-forward). `[]`
   *  when no TOC was set. */
  chapters: BookChapter[]
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

/** BOO-10/11/12 — an asset id did not resolve in the book's asset set (guard-exists at `updatePosition` /
 *  `removeAsset` / `getMappedPosition`; also raised when a mapping target belongs to a different book). */
export class BookAssetNotFoundError extends Error {
  constructor(public readonly id: string) {
    super(`Book asset not found: ${id}`)
    this.name = 'BookAssetNotFoundError'
  }
}

/** BOO-44 — a typed R2/decrypt file error; a broken file never renders as an empty book (fail-loud,
 *  `business-rules.md:127`). Thrown at S3 by `addAsset` on a present-port `upload()` failure (an R2 write error),
 *  and at S6 by `openReader` on a decrypt/download failure (terminal `:112`). Carries the diagnostic cause. */
export class AssetFileError extends Error {
  // ES2022 `Error` carries `cause` natively — set it via super, don't redeclare the field.
  constructor(message: string, cause?: unknown) {
    super(message, { cause })
    this.name = 'AssetFileError'
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

  // ── S3: Assets + positions + mapping (BOO-09/10/11/12/44) ────────────────────
  /** BOO-09 — add a per-format copy (BK-2). `format` ∈ BOOK_ASSET_FORMAT; a digital `file` is bundled in `input`
   *  (frozen seam-contract) and uploads via the `attachment?` port: absent port/no file ⇒
   *  `{status:'attachment-unavailable'}` + `file_ref` null (asset still created, BK-17); present port success ⇒
   *  `{status:'stored', fileRef}`; present port `upload()` rejection ⇒ **`AssetFileError`** (fail-loud, nothing
   *  persisted). Guards the book exists (`BookNotFoundError`). */
  addAsset(bookId: string, input: AddAssetArgs): Promise<{ asset: BookAsset; file: AttachmentRef }>
  /** BOO-10 — set the asset's single native position (SSOT). Guards exists (`BookAssetNotFoundError`). */
  updatePosition(assetId: string, nativePosition: string): Promise<BookAsset>
  /** BOO-11 — soft-delete a copy; work-anchored annotations survive (structural/no-FK). Guards exists. */
  removeAsset(id: string): Promise<void>
  /** BOO-12 — map a position from `assetId` into `targetAssetId`'s format (BK-4). NEVER guesses: at M1 the mapping
   *  algorithm is unbuilt ⇒ always `{status:'not-synced', nativePosition: <target native>}` (fail-loud). Guards
   *  both assets exist + belong to the same book (`BookAssetNotFoundError`). */
  getMappedPosition(assetId: string, targetAssetId: string): Promise<MappedPosition>
}
