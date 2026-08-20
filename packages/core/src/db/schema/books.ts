// ============================================================================
// Domain tables: Books — DB-4 · group #11 · ADR-002 §Books (reshaped roster)
//
// The reading Universe — the 2nd-largest DB-4 reframe (after Education). 10 owned
// tables: books/book_chapters reshaped from the 2-table FACT floor + 8 net-new
// (assets, 3 annotations, reading_sessions [S1 extension], reading_plans, 2 junctions).
// ADR-002 §Books DDL is STALE (books.format single, current_page, progress NOT NULL
// DEFAULT 0, inline genre/tags).
//
// DDL model (ADR-016 §3.5): CHECK + indexes live in the hand-written SQL migration
// (migrations/023_books.ts). These Drizzle objects are the type-safe QUERY mirror.
//
// Reframe (spec docs/specs/foundation/db-4-books/):
// - book = the WORK; book_assets (0..n) each carry format + one native_position (BK-2).
// - unified progress DERIVED: books.progress nullable override (NULL⇒derive, M3); the
//   §Books NOT NULL DEFAULT 0 anti-signal resolved out; current_page → per-asset position (BR-BK-2).
// - inline books.genre/tags RETIRED → entity_tags (BK-16); notes on bookmarks/quotes via pages (BR-BK-3).
// - reading_sessions = base `sessions` sub_type='reading' + 1:1 extension (own id PK +
//   session_id UNIQUE, no FK; the study_sessions/focus_sessions pattern). reading ≠ study (BR-BK-4).
// - 3 annotation natures (BK-6): bookmarks + quotes take notes/inter-links; highlights are
//   deliberately light (no notes/links). NO FK anywhere; §Books REFERENCES/CASCADE superseded.
// - NO measurement_kind/binding_mode on reading_plans — the plan goal is a Purpose target
//   (Purpose-owned, C-M1; Books absent from the M1 pursuable set). (BR-BK-7)
//
// deleted_at EXCEPTIONS (F1): book_chapters (FACT floor omits + "no soft delete" + child,
// conventions "soft delete on parents") and reading_sessions (session extension — base
// `sessions` owns lifecycle, sessions.ts:41) carry NO deleted_at. The other 8 keep it.
//
// OUT (owned elsewhere / undesigned): base `sessions` spine (ADR-004); cross-format
// mapping/anchors (BK-4 design pass); conflict state (BK-8 → Preferences + derived); the
// Purpose target measurability (C-M1); ISBN/OCR/TTS/transcription X*/AI* service; quote-embed
// editor block; Education pacing + Calendar; photos (note_attachments); E2/grant (C-E2); AI4 (C-AI4).
// @vida/types row-interface reconcile (stale Book/BookChapter + BOOK_FORMAT) → DB-11.
//
// M1.0 encryption (BR-DB6-3): the [E] fields are the M3 target — EMPTY [E] set in M1.0.
// ============================================================================

import { sqliteTable, text, integer, index } from 'drizzle-orm/sqlite-core'
import { BOOK_STATUS, BOOK_ASSET_FORMAT, READING_PLAN_ARRANGEMENT, READING_PLAN_GOAL_TYPE } from '@vida/types'
import { baseColumns, enumText, boolInt, calendarDate, json } from './_shared'

// --- books: the work (reshaped) --------------------------------------------
export const books = sqliteTable('books', {
  ...baseColumns,
  /** @encrypted [E] */
  title: text('title').notNull(),
  /** @encrypted [E] */
  author: text('author'),
  /** @encrypted [E] */
  isbn: text('isbn'),
  status: enumText('status', BOOK_STATUS).notNull().default('want_to_read'), // FIXED → CHECK
  total_pages: integer('total_pages'), // work-level, for TOC-only planning (BK-17)
  progress: integer('progress'), // DERIVED override, nullable (BR-BK-2)
  start_date: calendarDate('start_date'),
  end_date: calendarDate('end_date'),
  rating: integer('rating'), // CHECK BETWEEN 1 AND 5 (numeric, not a tuple)
  /** @encrypted [E] */
  review: text('review'),
  /** @encrypted [E] */
  cover_url: text('cover_url'),
  deleted_at: integer('deleted_at'),
  // RETIRED: format→book_assets · current_page→asset native_position · genre/tags→entity_tags
})

// --- book_chapters: flat TOC (FACT, kept) — NO deleted_at (F1) --------------
export const bookChapters = sqliteTable(
  'book_chapters',
  {
    ...baseColumns,
    book_id: text('book_id').notNull(), // no FK
    /** @encrypted [E] */
    title: text('title').notNull(),
    chapter_number: integer('chapter_number').notNull(),
    start_page: integer('start_page'),
    end_page: integer('end_page'),
    estimated_reading_minutes: integer('estimated_reading_minutes'),
    actual_reading_minutes: integer('actual_reading_minutes'),
    is_completed: boolInt('is_completed').notNull().default(false),
    completed_at: integer('completed_at'),
    sort_order: integer('sort_order').notNull().default(0),
    // NO deleted_at — FACT floor omits + structure-data:10 "no soft delete" + child (F1)
  },
  (t) => [index('idx_book_chapters_book').on(t.book_id)],
  // UNIQUE(book_id, chapter_number) authored in the migration (doc-fixed, §Books L2501)
)

// --- book_assets: per-format copy (BK-2) -----------------------------------
export const bookAssets = sqliteTable(
  'book_assets',
  {
    ...baseColumns,
    book_id: text('book_id').notNull(), // no FK
    format: enumText('format', BOOK_ASSET_FORMAT).notNull(), // FIXED → CHECK
    /** @encrypted [E] — encrypted R2 file ref (physical has none) */
    file_ref: text('file_ref'),
    native_position: text('native_position'), // page/location/timestamp, format-interpreted (plaintext, BK-1)
    deleted_at: integer('deleted_at'),
  },
  (t) => [index('idx_book_assets_book').on(t.book_id)],
)

// --- book_bookmarks: position marker, work-anchored (BK-5/6) ----------------
export const bookBookmarks = sqliteTable(
  'book_bookmarks',
  {
    ...baseColumns,
    book_id: text('book_id').notNull(), // no FK (work-anchored)
    position: text('position'),
    /** @encrypted [E] */
    label: text('label'),
    deleted_at: integer('deleted_at'),
    // notes via pages; inter-links via entity_links
  },
  (t) => [index('idx_book_bookmarks_book').on(t.book_id)],
)

// --- book_highlights: light span marker (BK-6, no notes/links) --------------
export const bookHighlights = sqliteTable(
  'book_highlights',
  {
    ...baseColumns,
    book_id: text('book_id').notNull(), // no FK
    asset_id: text('asset_id'), // [INTERP] digital-content source (addHighlight(assetId), BK-6)
    /** @encrypted [E] */
    captured_text: text('captured_text'),
    position: text('position'),
    deleted_at: integer('deleted_at'),
  },
  (t) => [index('idx_book_highlights_book').on(t.book_id)],
)

// --- book_quotes: first-class quote (BK-7) ----------------------------------
export const bookQuotes = sqliteTable(
  'book_quotes',
  {
    ...baseColumns,
    book_id: text('book_id').notNull(), // no FK
    /** @encrypted [E] */
    text: text('text').notNull(),
    position: text('position'),
    deleted_at: integer('deleted_at'),
    // notes via pages; inter-links + embeddable
  },
  (t) => [index('idx_book_quotes_book').on(t.book_id)],
)

// --- reading_sessions: `reading` Session sub-type (BR-BK-4) — NO deleted_at --
export const readingSessions = sqliteTable(
  'reading_sessions',
  {
    ...baseColumns,
    session_id: text('session_id').notNull().unique(), // 1:1 key → sessions.id (no FK)
    book_id: text('book_id').notNull(), // no FK
    asset_id: text('asset_id'), // no FK, nullable
    pages_read: integer('pages_read'),
    position_delta: text('position_delta'),
    stop_point: text('stop_point'),
    statistics: json<Record<string, unknown>>('statistics'),
    // NO deleted_at — session extension; base `sessions` owns lifecycle (F1)
  },
  (t) => [index('idx_reading_sessions_book').on(t.book_id)],
)

// --- reading_plans: the Quota Planner (BK-11) — NO measurement axes (C-M1) ---
export const readingPlans = sqliteTable('reading_plans', {
  ...baseColumns,
  arrangement: enumText('arrangement', READING_PLAN_ARRANGEMENT).notNull(), // FIXED → CHECK
  goal_type: enumText('goal_type', READING_PLAN_GOAL_TYPE).notNull(), // FIXED → CHECK
  target_date: calendarDate('target_date'),
  target_completion_date: calendarDate('target_completion_date'),
  quota_distribution: json<Record<string, unknown>>('quota_distribution'),
  recalculation_state: json<Record<string, unknown>>('recalculation_state'),
  deleted_at: integer('deleted_at'),
})

// --- reading_plan_books: plan↔books arrangement junction --------------------
export const readingPlanBooks = sqliteTable(
  'reading_plan_books',
  {
    ...baseColumns,
    plan_id: text('plan_id').notNull(), // no FK
    book_id: text('book_id').notNull(), // no FK
    sequence: integer('sequence'),
    quota: integer('quota'),
    deleted_at: integer('deleted_at'),
  },
  (t) => [index('idx_reading_plan_books_plan').on(t.plan_id)],
)

// --- book_subjects: Education partition junction (BK-13) --------------------
export const bookSubjects = sqliteTable(
  'book_subjects',
  {
    ...baseColumns,
    book_id: text('book_id').notNull(), // no FK
    subject_id: text('subject_id').notNull(), // no FK (Education)
    deleted_at: integer('deleted_at'),
  },
  (t) => [index('idx_book_subjects_book').on(t.book_id)],
)

// --- inferred row types ------------------------------------------------------
export type BookRow = typeof books.$inferSelect
export type BookInsert = typeof books.$inferInsert
export type BookChapterRow = typeof bookChapters.$inferSelect
export type BookChapterInsert = typeof bookChapters.$inferInsert
export type BookAssetRow = typeof bookAssets.$inferSelect
export type BookAssetInsert = typeof bookAssets.$inferInsert
export type BookBookmarkRow = typeof bookBookmarks.$inferSelect
export type BookBookmarkInsert = typeof bookBookmarks.$inferInsert
export type BookHighlightRow = typeof bookHighlights.$inferSelect
export type BookHighlightInsert = typeof bookHighlights.$inferInsert
export type BookQuoteRow = typeof bookQuotes.$inferSelect
export type BookQuoteInsert = typeof bookQuotes.$inferInsert
export type ReadingSessionRow = typeof readingSessions.$inferSelect
export type ReadingSessionInsert = typeof readingSessions.$inferInsert
export type ReadingPlanRow = typeof readingPlans.$inferSelect
export type ReadingPlanInsert = typeof readingPlans.$inferInsert
export type ReadingPlanBookRow = typeof readingPlanBooks.$inferSelect
export type ReadingPlanBookInsert = typeof readingPlanBooks.$inferInsert
export type BookSubjectRow = typeof bookSubjects.$inferSelect
export type BookSubjectInsert = typeof bookSubjects.$inferInsert
