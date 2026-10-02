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
import type {
  Book,
  BookAsset,
  BookAssetFormat,
  BookChapter,
  BookBookmark,
  BookHighlight,
  BookQuote,
  BookStatus,
  ReadingSession,
  ReadingPlan,
} from '@vida/types'
import type { DrizzleDb } from '../../db/adapter'
import type { IngestionGuard } from '../../foundation/ingestion'
import type { SpacesService } from '../../foundation/spaces'
import type { NotesService } from '../notes'
import type { SessionsService, Session } from '../sessions'
import type { SessionRegistry } from '../../foundation/sessions'
import type { AiService } from '../../foundation/ai'
import type { EntityLinkRow, EntityTagRow } from '../../db/schema/foundation/spaces'
import type { BookSubjectRow } from '../../db/schema/books'
import type { PageRow } from '../../db/schema/notes'
import type {
  CreateBookSchema,
  UpdateBookSchema,
  ChapterSeedSchema,
  AddAssetSchema,
  AddBookmarkSchema,
  AddHighlightSchema,
  AddQuoteSchema,
  StartSessionTargetSchema,
  EndSessionCaptureSchema,
  CreatePlanSchema,
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
  /** S4 — ADR-006 entity_links WRITE (BOO-18 inter-link) + the entity-type registry that enforces BK-6 (highlights
   *  are unregistered → fail-loud). Required: annotation linking is core to S4, not optional (the knowledge/notes
   *  required-dep precedent). `[FACT: foundation/spaces; _registry.ts:85-96]` */
  spaces: SpacesService
  /** S4 — pages-backed notes on bookmarks/quotes (BOO-16/17) via `ensureEntityNote` (idempotent). Required. */
  notes: NotesService
  /** S5 — quote-embed toggle reads (BK-7/BOO-22). Optional NARROW deny-safe port (NIT-3, `interpretation.md:60`):
   *  Books homes two toggle reads rather than a hard dep on the full `services/preferences`. Absent ⇒ PERMISSIVE
   *  (every quote embeddable) — the habits `backfillWindowDays` fail-OPEN precedent (a convenience policy, not a
   *  security gate). S8 appends the conflict preset-rule read (zero signature change). Real Preferences keys land at
   *  M2/P6 (zero-signature swap). `[FACT: interpretation.md:59-60; business-rules.md:35-37 (BK-7)]` */
  preferences?: PreferencesPort
  /** S6 — ADR-004 base `sessions` `reading` sub-type spine (timer/scheduling/lifecycle) + the Books 1:1 extension.
   *  REQUIRED: reading sessions are core to S6 (the flashcards required-dep precedent). `[ADR-004 §3.1; BK-10]` */
  sessions: SessionsService
  /** S6 — AR-5 `SessionRegistry`: `registerBooks()` registers the `reading` sub-type; `createSession('reading')`
   *  throws `SessionTypeNotFound` before any write until it runs (service.ts:276). REQUIRED. `[ADR-004 §3.2;
   *  flashcards/types.ts:47]` */
  sessionRegistry: SessionRegistry
  /** S6 — ADR-015 OCR for page-photo position extraction (BOO-25). Optional deny-safe port (the knowledge `ai?`
   *  precedent): absent OR a thrown deny ⇒ `ai-unavailable`; the photo stores regardless (BK-10). OCR runs
   *  `on_device` (the photo is vault content — ZK-safe, conventions.md:57). M1 dormant (askModel denies — both ports
   *  absent); the real OCR pipeline = M2. `[ADR-015 AI5/AI6; parts/books.md:35 (BOO-25)]` */
  ai?: AiService
  // S7–S10 append: effects? (measurement fan-out, S10) + backlinks (S9/BOO-46).
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
  /** S6 — decrypt/download a stored file for the Reader (BOO-39). An ADDITIVE extension of the S3 port (zero break
   *  to `upload`). The whole port is absent at M1 ⇒ `openReader` returns `attachment-unavailable`; a PRESENT port
   *  whose `download` rejects is a real R2/decrypt error ⇒ fail-loud `AssetFileError` (the S6 decrypt throw site,
   *  BOO-44). M2 provides the real pipeline (zero-signature swap). `[FACT: parts/books.md:49 (BOO-39); slice-map.md:77]` */
  download(input: { fileRef: string }): Promise<{ blob: FileBlob }>
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

// --- S4: annotations (BOO-15/16/17/18/19/20) — service-layer types -----------

/** The three annotation natures (BK-6). `'book_'+kind` is the registered `entity_type` for links/notes — except
 *  `highlight` ⇒ `book_highlight` is deliberately UNregistered (`_registry.ts:85-96`), so a highlight ref to
 *  `linkAnnotations`/`openAnnotationNote` fails loud via `spaces`/`notes` `UnknownEntityType` (the BK-6 enforcement). */
export type BookAnnotationKind = 'bookmark' | 'highlight' | 'quote'
/** A reference to one annotation (BOO-18/19). */
export interface AnnotationRef {
  kind: BookAnnotationKind
  id: string
}
/** listAnnotations row (BOO-19) — a work-anchored annotation + its native position. Cross-format normalization to a
 *  VIEWING asset is the P6 Reader composing the S3 `getMappedPosition` (BOO-19 SPLIT; mapping unbuilt at M1). */
export interface AnnotationView {
  kind: BookAnnotationKind
  annotation: BookBookmark | BookHighlight | BookQuote
  position: string | null
}
/** listQuotes scope (BOO-20) — S4 owns `bookId` ONLY; the `tags?` filter lands at S9 with `scopeTag` (BOO-04) —
 *  the S1 `BookFilter` precedent (never advertise an unimplemented filter). */
export interface QuoteScope {
  bookId?: string
}

// Zod-inferred annotation inputs (validators/books.ts).
export type AddBookmarkInput = z.infer<typeof AddBookmarkSchema>
export type AddHighlightInput = z.infer<typeof AddHighlightSchema>
export type AddQuoteInput = z.infer<typeof AddQuoteSchema>

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

// --- S5: quote-embed toggle port (BOO-21/22) — narrow deny-safe reads (the AttachmentPort precedent) -----------

/** The narrow quote-embed toggle seam (BK-7). Books owns this 2-read interface (NIT-3) — NOT the full
 *  `services/preferences` API. Precedence is applied by the service: a per-book override wins over global. A present
 *  port owns its stored defaults; an ABSENT port is the permissive (fail-OPEN) default. M2 provides the real
 *  Preferences-backed adapter (zero-signature swap). `[FACT: interpretation.md:59-60; conventions.md:22-23]` */
export interface PreferencesPort {
  /** Global quote-embed availability toggle. */
  getQuoteEmbedGlobal(): Promise<boolean>
  /** Per-book override; `undefined` ⇒ no override (fall through to global). */
  getQuoteEmbedOverride(bookId: string): Promise<boolean | undefined>
  /** S8 (BOO-35) — the conflict preset-rule READ (`types.ts` M2-swap note). The stored rule carries its `assetId`
   *  for `source_of_truth`. `undefined` ⇒ no rule set ⇒ the BK-8 default `ask` (surface the conflict). */
  getConflictRule(bookId: string): Promise<ConflictChoice | undefined>
  /** S8 (BOO-34) — the `resolveConflict` WRITE seam; the real Preferences-backed write lands at M2/P6 (zero-signature
   *  swap). An absent `preferences?` port ⇒ `resolveConflict` no-ops (the `revokeLookupGrant` precedent, BR-BK-S2-6). */
  setConflictRule(bookId: string, choice: ConflictChoice): Promise<void>
}

// --- S8: unified progress + conflict resolution (BOO-13/34/35) — service-layer types ---

/** The BK-8 conflict-rule vocabulary (`conventions.md:36`). `ask` = the default (no rule set ⇒ surface the clash). */
export type ConflictRule = 'ask' | 'source_of_truth' | 'last_valid' | 'photo_valid'
/** A preset resolution choice (BOO-34/35). `source_of_truth` names the authoritative asset; `last_valid`/`photo_valid`
 *  carry no payload. `ask` is NOT a choice — it is the unset default — so it is absent from the submittable union. */
export type ConflictChoice =
  | { rule: 'source_of_truth'; assetId: string }
  | { rule: 'last_valid' }
  | { rule: 'photo_valid' }
/** One competing progress measurement in a clash (BK-8) — a page-unit asset's derived 0–100 progress + its native
 *  position. The public projection surfaced in `ConflictItem.sources` (the conflict-prompt UI reads it at P6). */
export interface PositionSource {
  assetId: string
  format: BookAssetFormat
  nativePosition: string
  progress: number
}
/** The derived conflict queue row (BK-8, `seam-contract.md:47`) — NO table; `id` is the deterministic
 *  `conflict:<bookId>` (one book-level clash). `blocking: true` — an unresolved conflict blocks unified progress. */
export interface ConflictItem {
  id: string
  bookId: string
  sources: PositionSource[]
  blocking: true
}

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
  /** S8 — derived unified progress (BR-BK-S8-9): `number` (0–100), `'conflicted'` (BK-8 unresolved clash), or `null`
   *  (unmeasured — no page-unit candidate). Widened from `number | null` when `getBook` began composing S8. */
  unifiedProgress: number | 'conflicted' | null
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
 *  `removeAsset` / `getMappedPosition`; also raised when a mapping target belongs to a different book). Also raised
 *  by `resolveConflict` when a `source_of_truth` preset names an asset not on the book (BR-BK-S8-8). */
export class BookAssetNotFoundError extends Error {
  constructor(public readonly id: string) {
    super(`Book asset not found: ${id}`)
    this.name = 'BookAssetNotFoundError'
  }
}

/** BOO-13/34 (BK-8) — a DEFINITE unified progress was required but the book is `'conflicted'`. A **forward seam** at
 *  S8: exported for the first consumer that needs a number (S9 `getReadingMeasureSource`); NOT thrown anywhere in S8
 *  (the read surfaces flag `'conflicted'`; `resolveConflict` persists a valid preset and never throws this). */
export class PositionConflictPending extends Error {
  constructor(public readonly bookId: string) {
    super(`Unified progress is conflicted for book ${bookId}; resolve the position clash first`)
    this.name = 'PositionConflictPending'
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

/** BOO-16/17/18/19 — an annotation id did not resolve in its table (guard-exists at link/note/list). */
export class AnnotationNotFoundError extends Error {
  constructor(
    public readonly kind: BookAnnotationKind,
    public readonly id: string,
  ) {
    super(`${kind} not found: ${id}`)
    this.name = 'AnnotationNotFoundError'
  }
}

/** BK-6 — highlights are deliberately light: NO notes, NO inter-links, at EITHER endpoint. The entity-type registry
 *  backstops a highlight as a link TARGET / note entity (`book_highlight` unregistered), but `spaces.createLink`
 *  does NOT validate the SOURCE anchor — so Books enforces the full rule here, fail-loud.
 *  `[FACT: conventions.md:50 "Never put notes/inter-links on highlights"; business-rules.md:31-34 (BK-6)]` */
export class AnnotationNotLinkableError extends Error {
  constructor(public readonly id: string) {
    super(`Highlights cannot be linked or noted (BK-6): ${id}`)
    this.name = 'AnnotationNotLinkableError'
  }
}

/** BK-7/BOO-22 — a SCOPED `getEmbeddableQuotes({ bookId })` whose book resolves toggle-OFF (per-book override >
 *  global). The GLOBAL feed excludes toggle-off books instead of throwing (a feed yields a filtered list, never an
 *  error). `[FACT: contract.md:68; seam-contract.md:60,100]` */
export class QuoteEmbedDisabledError extends Error {
  constructor(public readonly bookId: string) {
    super(`Quote embedding disabled for book ${bookId}`)
    this.name = 'QuoteEmbedDisabledError'
  }
}

// --- S6: Reading sessions + Reader (BOO-23/24/25/26/39) — service-layer types + the sub-type identity ---

/** The `reading` Session sub-type Books registers (IR-1). A sentinel transcribing ADR-004 §3.2 — the full
 *  `SessionTypeDef` is built in `service.ts` (the flashcards `REVIEW_SESSION_TYPE_DEF` precedent). `[ADR-004 §3.2]` */
export const READING_SESSION_SUB_TYPE = 'reading'

/** Books' OWN OCR integration identity (X11 → ADR-015; BOO-25/42). Names Books' own integration — the
 *  `BOOKS_ISBN_INTEGRATION_ID` precedent — NOT a synthesized downstream id (No-Guessing). OCR runs `on_device`
 *  (the photo is vault content, ZK-safe, conventions.md:57). Inert at M1 (askModel denies). */
export const BOOKS_OCR_INTEGRATION_ID = 'books.ocr'

/** startSession target (BOO-23) — an existing asset or a manual (physical/braille) session. `z.infer` of the validator. */
export type StartSessionTarget = z.infer<typeof StartSessionTargetSchema>
/** endSession mode-adaptive capture (BOO-24, BK-10). `z.infer` of the validator. */
export type ReadingCapture = z.infer<typeof EndSessionCaptureSchema>

/** The composed reading-session read shape (BOO-23) — the base `sessions` row (its focus/study extension is always
 *  null for `reading`) PLUS the Books `reading_sessions` extension. `[FACT: BK-10; ADR-004 §3.1]` */
export interface ReadingSessionView {
  session: Session
  reading: ReadingSession
}

/** attachPhoto OCR outcome (BOO-25) — the deny-safe port result (the `LookupResult` precedent). `ready` carries the
 *  extracted position + `source:'ai'` provenance (AI6); `ai-unavailable` = no `ai` dep OR a denied/failed call. The
 *  photo stores regardless (BK-10). `[FACT: conventions.md:53-54; ADR-015 AI6]` */
export type OcrResult =
  | { status: 'ready'; position: string; source: 'ai' }
  | { status: 'ai-unavailable'; reason?: string }

/** getStatistics derivation (BOO-26) — aggregated over the reading-sessions ledger; NEVER stored (derived-on-read,
 *  structure-data State-management). `minutesSpent` sums completed sessions only (an in-progress session has no
 *  `ended_at` ⇒ 0 minutes, but still counts in `sessionsLogged`). `[FACT: BK-10; rerun C-E2:73]` */
export interface ReadingStatistics {
  sessionsLogged: number
  pagesRead: number
  minutesSpent: number
}

/** openReader service face (BOO-39) — decrypt + auto-session + position orchestration; the read/listen/annotate
 *  chrome is P6. `file` = the decrypt outcome (`attachment?` deny-safe); `sessionId` = the auto-started base
 *  session; `position` = the asset's own native position as a `MappedPosition` (synced-to-self | not-synced, never a
 *  cross-format guess — BK-4). `[FACT: parts/books.md:49 (BOO-39); BK-15 business-rules.md:78-79]` */
export interface ReaderContext {
  file: AttachmentRef
  sessionId: string
  position: MappedPosition
}

/** BOO-24/25 — a reading session id (the base `session_id`) did not resolve to a `reading_sessions` row (guard-exists
 *  at `endSession`/`attachPhoto`; the `BookNotFoundError` pattern, no-FK app-layer integrity). */
export class ReadingSessionNotFoundError extends Error {
  constructor(public readonly sessionId: string) {
    super(`Reading session not found: ${sessionId}`)
    this.name = 'ReadingSessionNotFoundError'
  }
}

// --- S7: Reading plans / Quota Planner (BOO-27..33) — service-layer types ---

/** createPlan input (BOO-27). `z.infer` of the validator. */
export type CreatePlanInput = z.infer<typeof CreatePlanSchema>

/** The stored `quota_distribution` json shape (BR-BK-S7-2). `calendarReconciled:false` keeps the forward-dep stub
 *  VISIBLE (BOO-28, "renders visibly stubbed"); `perBook` is the per-book daily target by page share. */
export interface QuotaDistribution {
  dailyQuota: number
  perBook: Record<string, number>
  totalPages: number
  calendarReconciled: false
}

/** The stored `recalculation_state` json shape — the plan's running progress. `progressBySession` keys by the
 *  reading session id (idempotent credit, BR-BK-S7-4); `pagesDone` is the running sum. */
export interface RecalculationState {
  progressBySession: Record<string, number>
  pagesDone: number
}

/** getTodayQuotas row (BOO-30) — today's derived quota + pace status for one active plan. */
export interface TodayQuota {
  planId: string
  target: number
  done: number
  status: 'on-pace' | 'behind' | 'ahead'
}
export type TodayQuotas = TodayQuota[]

/** getProjection (BOO-33) — the derived completion trajectory. Derived on read, never stored. */
export interface PlanProjection {
  planId: string
  projectedCompletionDate: string | null
  onTrack: boolean
  remainingPages: number
  remainingDays: number
}

/** BOO-27 — a plan id did not resolve (guard-exists at recordQuotaProgress/recalculate/getProjection). */
export class ReadingPlanNotFoundError extends Error {
  constructor(public readonly id: string) {
    super(`Reading plan not found: ${id}`)
    this.name = 'ReadingPlanNotFoundError'
  }
}

/** BOO-32/BK-11 — recalculation cannot meet the target at the planned pace. THROWN (never a silent target rewrite),
 *  carrying the two options the user chooses between: `extend_date` (keep the pace → `suggestedDate`) or
 *  `raise_quota` (keep the date → `suggestedQuota` = the faster required pace). `remainingDays<=0` ⇒ only
 *  `extend_date` is viable. `[FACT: parts/books.md:42; conventions.md:28-29; contract.md:67]` */
export class TargetUnreachableProposal extends Error {
  constructor(
    public readonly planId: string,
    public readonly options: ReadonlyArray<'extend_date' | 'raise_quota'>,
    public readonly suggestedDate?: string,
    public readonly suggestedQuota?: number,
  ) {
    super(`Reading plan ${planId} target unreachable at the planned pace`)
    this.name = 'TargetUnreachableProposal'
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

  // ── S4: Annotations + notes/links (BOO-15/16/17/18/19/20) ────────────────────
  /** BOO-16 — a work-anchored bookmark (BK-5); `label` [E]. Guards the book exists (`BookNotFoundError`). */
  addBookmark(bookId: string, position: string, label?: string): Promise<BookBookmark>
  /** BOO-15 — a light digital-content highlight span (no notes/links, BK-6). `book_id` is derived from the asset;
   *  guards the asset exists (`BookAssetNotFoundError`). `captured_text` [E]. */
  addHighlight(assetId: string, span: { captured_text: string; position: string }): Promise<BookHighlight>
  /** BOO-17 — a first-class quote stored per book (BK-7); `text` [E]. Guards the book exists. */
  addQuote(bookId: string, text: string, position?: string): Promise<BookQuote>
  /** BOO-18 — inter-link two annotations via `entity_links` (BK-6). Guards both exist (`AnnotationNotFoundError`);
   *  a highlight endpoint fails loud via the registry (`book_highlight` unregistered → `UnknownEntityType`). */
  linkAnnotations(a: AnnotationRef, b: AnnotationRef): Promise<EntityLinkRow>
  /** BOO-16/17 — open (idempotent) the pages-backed note for a bookmark/quote. Guards exists; a highlight ref
   *  fails loud via the registry (no notes on highlights, BK-6). */
  openAnnotationNote(ref: AnnotationRef): Promise<PageRow>
  /** BOO-19 — all three annotation natures for the work (soft-delete filtered), ordered by `created_at`; each with
   *  its native position. Cross-format normalization to a viewing asset = P6 (composes S3 `getMappedPosition`). */
  listAnnotations(bookId: string): Promise<AnnotationView[]>
  /** BOO-20 — the All Quotes library: quotes for a book (`{bookId}`) or all (`{}`/absent). `tags?` → S9. */
  listQuotes(scope?: QuoteScope): Promise<BookQuote[]>

  // ── S5: Quote-embed feed + toggles (BOO-21/22) ───────────────────────────────
  /** BOO-21/22 — the quote-embed feed (BK-7). Returns LIVE `BookQuote` rows (never copies text) with per-book >
   *  global toggle precedence via the deny-safe `preferences?` port (absent ⇒ permissive). A SCOPED `{ bookId }`
   *  call for a toggle-OFF book throws `QuoteEmbedDisabledError`; the GLOBAL `{}` feed EXCLUDES toggle-off books
   *  (no throw). Soft-delete filtered. Consumed by the `@vida/editor` quote-embed block (P6). */
  getEmbeddableQuotes(scope: { bookId?: string }): Promise<BookQuote[]>

  // ── S6: Reading sessions + Reader (BOO-23/24/25/26/39) ───────────────────────
  /** IR-1 — register the `reading` Session sub-type (call-once, `DuplicateSubType`-guarded, idempotent). Every field
   *  transcribes ADR-004 §3.2 (`effects:[]` §3.2.2 + C-E2; lifecycle §3.2.3; `allowed_effects:[]` §3.2.4).
   *  `createSession('reading')` throws `SessionTypeNotFound` until this runs. Registers ONLY the sub-type — no
   *  `study_method` (Books isn't a review method, unlike flashcards). */
  registerBooks(): Promise<void>
  /** BOO-23 — start a reading session: a base `sessions` `reading` row (`in_progress`, `started_at` stamped) + the
   *  Books `reading_sessions` extension keyed `session_id`, with the BOOK attached as the ADR-004 §3.2.1 target
   *  (`entity_type='book'`). Guards the book (+ the asset for `{assetId}`, same-book). `[BK-10; ADR-004 §3.1/§3.2.1]` */
  startSession(bookId: string, target: StartSessionTarget): Promise<ReadingSessionView>
  /** BOO-24 — end a reading session (`id` = the base `session_id`): `completeSession` (stamps `ended_at`) + update the
   *  extension's mode-adaptive capture (`pages`/`position`/`stopPoint`). Guards exists (`ReadingSessionNotFoundError`). */
  endSession(id: string, capture: ReadingCapture): Promise<ReadingSessionView>
  /** BOO-25 — capture a page photo for a session: the photo ALWAYS stores (`attachment?` deny-safe; present-port
   *  reject ⇒ `AssetFileError`) AND is OCR'd for a position (`ai?` deny-safe) — the two are independent, an OCR
   *  failure never discards the photo (BK-10). Guards the session exists. `[conventions.md:53-54]` */
  attachPhoto(sessionId: string, photo: FileBlob): Promise<{ stored: AttachmentRef; ocr: OcrResult }>
  /** BOO-26 — reading statistics derived over the sessions ledger (per-book or all); never stored; no economy grant
   *  (C-E2 — the grant rides the base-`sessions` sub-type). `[BK-10; rerun C-E2:73]` */
  getStatistics(scope: { bookId?: string }): Promise<ReadingStatistics>
  /** BOO-39 — the Reader service face: decrypt (`attachment?`) + auto-start a reading session + resolve the asset's
   *  own position; the read/listen/annotate chrome is P6. A present-port decrypt failure ⇒ `AssetFileError`. Guards
   *  the asset exists. `[parts/books.md:49; BK-15]` */
  openReader(assetId: string): Promise<ReaderContext>

  // ── S7: Reading plans / Quota Planner (BOO-27..33) ───────────────────────────
  /** BOO-27 — create a Books-owned plan (BK-12) over one-or-many books; `arrangement`/`goal`/`target`; computes +
   *  stores the initial `quota_distribution`. NO measurement axes (C-M1). Plan row + junctions written atomically.
   *  Guards each book exists (`BookNotFoundError`). */
  createPlan(input: CreatePlanInput): Promise<ReadingPlan>
  /** BOO-30 — today's derived quotas (on-pace|behind|ahead) per active plan — the Reading Hub + Journal `/summary`
   *  provider. Derived on read, never stored. `asOf?` (YYYY-MM-DD) is the determinism seam (default: today). */
  getTodayQuotas(asOf?: string): Promise<TodayQuotas>
  /** BOO-31 — credit a reading session's pages to the plan's running progress (idempotent per `sessionRef`). Guards
   *  the plan exists (`ReadingPlanNotFoundError`). */
  recordQuotaProgress(planId: string, sessionRef: string): Promise<void>
  /** BOO-32 — reshape the distribution over remaining pages/days; on/ahead of pace reshapes silently and returns the
   *  plan; BEHIND pace throws `TargetUnreachableProposal` (extend_date|raise_quota — never a silent rewrite, BK-11).
   *  Guards exists. `asOf?` = the determinism seam. */
  recalculate(planId: string, asOf?: string): Promise<ReadingPlan>
  /** BOO-33 — the derived completion trajectory for the per-plan page + Hub alerts. Guards exists. `asOf?` seam. */
  getProjection(planId: string, asOf?: string): Promise<PlanProjection>

  // ── S8: Unified progress + conflict (BOO-13/34/35) ──────────────────────────
  /** BOO-13 (BK-3) — derive-on-read unified progress: `number` (0–100), `'conflicted'` (unresolved clash), or `null`
   *  (unmeasured). A non-null `books.progress` is the manual-override terminal; else derived from page-unit asset
   *  positions via `measurement.normalize` under the conflict rule. Guards the book exists (`BookNotFoundError`). */
  getUnifiedProgress(bookId: string): Promise<number | 'conflicted' | null>
  /** BOO-34 (BK-8) — the derived conflict queue (NO table): an unresolved clash ⇒ one `ConflictItem`
   *  (`id='conflict:<bookId>'`, competing `sources`), else `[]`. Guards the book exists (`BookNotFoundError`). */
  getConflicts(bookId: string): Promise<ConflictItem[]>
  /** BOO-34/35 (BK-8) — persist the preset resolution rule via `preferences?.setConflictRule` (absent ⇒ no-op, the
   *  `revokeLookupGrant` precedent). Validates the book (`BookNotFoundError`) + a `source_of_truth` asset
   *  (`BookAssetNotFoundError`). A not-yet-applicable preset (`photo_valid` at M1) persists and does not throw. */
  resolveConflict(id: string, choice: ConflictChoice): Promise<void>

  // ── S9: Education partition + measurement source + tags + linkable-target (BOO-04/14/36/37/38/46) ──
  /** BOO-04 (BK-16) — classify a book via a Books-scoped `entity_tag` (publisher/genre/category). Composes
   *  `spaces.tagEntity('book')`; guards the book (`BookNotFoundError`) + that `scopedTag` resolves (`TagNotFound`). */
  scopeTag(bookId: string, scopedTag: string): Promise<EntityTagRow>
  /** BOO-36 (BK-13) — link a book to an Education subject (the `book_subjects` partition junction). Idempotent: an
   *  active `(book, subject)` link is returned as-is (no schema UNIQUE → app-layer). Guards the book; subject trusted. */
  linkSubject(bookId: string, subjectId: string): Promise<BookSubjectRow>
  /** BOO-36 — soft-delete the active `(book, subject)` link; a no-op when none exists (never throws). Books-only write. */
  unlinkSubject(bookId: string, subjectId: string): Promise<void>
  /** BOO-37 (BK-13) — the Books→Education read surface: the live books linked to a subject (soft-delete filtered both sides). */
  listBooksForSubject(subjectId: string): Promise<Book[]>
  /** BOO-38 (BK-13) — pace vs the subject's schedule. Deny-safe `null` at M1 (Education `#52` unbuilt — never a
   *  fabricated pace). Guards the book; `subjectId` trusted (the KNO-25 cross-module boundary). */
  getPaceStatus(bookId: string, subjectId: string): Promise<'on-pace' | 'behind' | 'ahead' | null>
  /** BOO-14 (C-M1) — the reading measure SOURCE (a method, not source-registry `advertise`; the KNO-25 pattern).
   *  Composes `getUnifiedProgress`; `'conflicted'` ⇒ `null` (a conflict is unmeasured, never a throw). */
  getReadingMeasureSource(bookId: string): Promise<ReadingMeasureSource>
}

/** BOO-14 — the reading measure source shape (service-layer, the `MasterySource` named-type precedent). `progress`
 *  is the derived unified progress collapsed to `number | null` (a `'conflicted'` book is "not measurable yet"). */
export interface ReadingMeasureSource {
  progress: number | null
}
