// ============================================================================
// Domain tables: Notes & Pages (DB-4 · group #1) — ADR-002 §5.2
//
// The Notes & Pages hub (in-degree 14): the polymorphic `pages` table + its
// wiki-link and attachment satellites. Tagging (`tags`/`entity_tags`) and typed
// cross-entity refs (`entity_links`) are NOT here — they are the AR-6 Spaces
// substrate (schema/foundation/spaces.ts); N&P is a consumer. Pomodoro re-homed
// to the Sessions realm (`focus_sessions`, ADR-004).
//
// REBUILT in P2 (backend-replan) — torn down at teardown `eaf64f8`, re-authored
// against the intent corpus (`parts/notes-and-pages.md`) on a NEW appended
// migration (`033_notes.ts`, version 33 — NOT slot 012; the runner filters
// `version > currentVersion` so a v12 migration is silently skipped on a v32
// device). Shape unchanged from the pre-teardown holistic build (corpus §11
// confirmed every claim); only the migration version moved.
//
// DDL model (ADR-016 §3.2): the CHECK + partial-UNIQUE + non-query indexes live
// in the hand-written SQL migration (migrations/033_notes.ts). These Drizzle
// objects are only the type-safe QUERY mirror — `enumText` gives the TS union,
// not a SQL CHECK; the mirror declares the plain query indexes only (UNIQUE /
// partial-unique / CHECK are SQL-migration-only — the spaces.ts precedent).
//
// Shape (spec docs/specs/foundation/backend-intent/schema-audit.md §11):
// - NO hard cross-table FK, self-ref included (N-R1, live convention).
// - Full `baseColumns` (incl. updated_at) + `deleted_at` on all 3 (N-R2, ADR-016
//   §3.4 locked pattern). NOTE: @vida/types PageLink/NoteAttachment still extend
//   SyncMetadata (created_at-only) — the same divergence already shipped for
//   entity_links/EntityLink; interface reconcile is DB-11, not here.
// - `pages.type` FIXED CHECK from PAGE_TYPE (N-R6); `entity_type` OPEN, no CHECK
//   (BR-N2, registry-validated — NOT-20 retired the 33-value CHECK to the open
//   registry). `summary_config` is plain text() NOT json<T>() (app stringifies).
//
// M1.0 encryption (BR-DB6-3): the [E] fields are the M3 target — the Repository
// registers an EMPTY [E] set in M1.0 (pass-through). No field encryption wired here.
// ============================================================================

import { sqliteTable, text, integer, index, blob } from 'drizzle-orm/sqlite-core'
import { PAGE_TYPE } from '@vida/types'
import { baseColumns, enumText, boolInt, calendarDate } from './_shared'

// --- pages: the polymorphic page (6 types) — ADR-002 §5.2 --------------------
export const pages = sqliteTable(
  'pages',
  {
    ...baseColumns,
    type: enumText('type', PAGE_TYPE).notNull().default('note'), // FIXED → SQL CHECK
    /** @encrypted [E] — user content (M3 target; M1.0 pass-through) */
    title: text('title'),
    /** @encrypted [E] — TipTap JSON document, synced via Yjs CRDT (NP-4) */
    content: text('content'),
    parent_id: text('parent_id'), // self-ref (deliverable→milestone), no FK
    entity_type: text('entity_type'), // OPEN — _registry.ts (BR-N2), no CHECK
    entity_id: text('entity_id'),
    journal_date: calendarDate('journal_date'), // YYYY-MM-DD, type='journal' only
    is_favorite: boolInt('is_favorite').notNull().default(false),
    is_archived: boolInt('is_archived').notNull().default(false),
    icon: text('icon'),
    /** @encrypted [E] */
    cover_image: text('cover_image'),
    /** @encrypted [E] — JournalSummaryConfig JSON; plain text (app stringifies), NOT json<T>() */
    summary_config: text('summary_config'),
    has_pomodoro: boolInt('has_pomodoro').notNull().default(false), // plaintext filter flag (N-R4)
    word_count: integer('word_count').notNull().default(0),
    deleted_at: integer('deleted_at'),
  },
  (t) => [
    index('idx_pages_type').on(t.type),
    index('idx_pages_journal_date').on(t.journal_date),
    index('idx_pages_entity').on(t.entity_type, t.entity_id),
    index('idx_pages_deleted').on(t.deleted_at),
    // NOTE: idx_pages_journal_unique (partial UNIQUE, NP-2) is SQL-migration-only.
  ],
)

// --- page_links: wiki-style bidirectional page↔page — ADR-002 §5.2 -----------
export const pageLinks = sqliteTable(
  'page_links',
  {
    ...baseColumns,
    source_page_id: text('source_page_id').notNull(), // plain TEXT, no FK
    target_page_id: text('target_page_id').notNull(), // plain TEXT, no FK
    /** @encrypted [E] — surrounding-text snippet for backlink preview */
    context: text('context'),
    deleted_at: integer('deleted_at'),
  },
  (t) => [index('idx_page_links_target').on(t.target_page_id)],
  // NOTE: UNIQUE(source_page_id, target_page_id) (NP-5) is SQL-migration-only.
)

// --- note_attachments: encrypted file blobs + thumbnail — ADR-002 §5.2 -------
export const noteAttachments = sqliteTable(
  'note_attachments',
  {
    ...baseColumns,
    page_id: text('page_id').notNull(), // plain TEXT, no FK
    /** @encrypted [E] */
    filename: text('filename').notNull(),
    mime_type: text('mime_type').notNull(),
    /** @encrypted [E] — file content (first BLOB in the v2 surface) */
    encrypted_blob: blob('encrypted_blob', { mode: 'buffer' }).notNull(),
    /** @encrypted [E] — thumbnail for gallery */
    thumbnail_blob: blob('thumbnail_blob', { mode: 'buffer' }),
    size_bytes: integer('size_bytes').notNull(),
    deleted_at: integer('deleted_at'),
  },
  (t) => [index('idx_attachments_page').on(t.page_id)],
)

// --- inferred row types ------------------------------------------------------
export type PageRow = typeof pages.$inferSelect
export type PageInsert = typeof pages.$inferInsert
export type PageLinkRow = typeof pageLinks.$inferSelect
export type PageLinkInsert = typeof pageLinks.$inferInsert
export type NoteAttachmentRow = typeof noteAttachments.$inferSelect
export type NoteAttachmentInsert = typeof noteAttachments.$inferInsert
