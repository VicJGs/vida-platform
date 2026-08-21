// ============================================================================
// Notes & Pages service — types + typed errors  (MOD-notes ① · LIF-131 · M1.1)
//
// The module-facing surface over the DB-4 pages/page_links/note_attachments
// tables, composing the AR-6 Spaces substrate (entity-link + tag writes) and the
// AR-8 backlink resolver (entity-link reads). Returns Drizzle ROWS ($inferSelect),
// mirroring SpacesService — NOT the @vida/types interfaces (they diverge on
// summary_config type + SyncMetadata; DB-11 reconciles). Errors are bespoke
// `extends Error` classes, matching the AR-6/AR-8 convention (spec §3, data-flow
// §5 shows ServiceError — flagged for DB-11 reconcile).
// ============================================================================

import type { PageType } from '@vida/types'
import type { CreateInput } from '../../db/repository'
import type { PageRow, PageLinkRow, NoteAttachmentRow, pages } from '../../db/schema/notes'
import type { EntityLinkRow, EntityTagRow } from '../../db/schema/foundation/spaces'

/** createPage input — derived from the `pages` columns minus repository-managed fields. */
export type CreatePageInput = CreateInput<typeof pages>
/** updatePage patch — the updatable subset ONLY. Matches `updatePageSchema.strict()`:
 *  `type`/`journal_date`/`entity_*` are excluded (NP-2 owns journal identity; soft-delete
 *  goes through `softDeletePage`) so the compile type and the runtime validator agree. */
export type UpdatePageInput = Partial<
  Pick<
    CreateInput<typeof pages>,
    | 'title'
    | 'content'
    | 'parent_id'
    | 'is_favorite'
    | 'is_archived'
    | 'icon'
    | 'cover_image'
    | 'summary_config'
    | 'has_pomodoro'
    | 'word_count'
  >
>

/** NP-8 — the parent-entity local fields the entity-note seed is generated from,
 *  client-side + deterministically (no server call, no Date.now/random). */
export interface EntityNoteSeed {
  title?: string | null
  type?: string | null
  status?: string | null
  date?: string | null
}

/** addAttachment input — the caller-supplied file fields (id/timestamps managed). */
export interface NewAttachment {
  filename: string
  mime_type: string
  encrypted_blob: Buffer | Uint8Array
  thumbnail_blob?: Buffer | Uint8Array | null
  size_bytes: number
}

export interface NotesService {
  // --- pages (net-new — `pages` table) -------------------------------------
  createPage(input: CreatePageInput): Promise<PageRow>
  getPage(id: string): Promise<PageRow | null>
  updatePage(id: string, patch: UpdatePageInput): Promise<PageRow>
  softDeletePage(id: string): Promise<void>
  getPageByJournalDate(date: string): Promise<PageRow | null>
  getPagesByType(type: PageType): Promise<PageRow[]>
  getPagesForEntity(entityType: string, entityId: string): Promise<PageRow[]>
  listPages(filter?: { favorite?: boolean; archived?: boolean }): Promise<PageRow[]>

  // --- page_links (net-new — `page_links` table) ---------------------------
  createPageLink(sourcePageId: string, targetPageId: string, context?: string | null): Promise<PageLinkRow>
  removePageLink(sourcePageId: string, targetPageId: string): Promise<void>
  getPageLinksFrom(pageId: string): Promise<PageLinkRow[]>
  getPageLinksTo(pageId: string): Promise<PageLinkRow[]>

  // --- wiki-resolve + entity-note seed (net-new) ---------------------------
  resolveWikiLink(text: string): Promise<PageRow[]>
  ensureEntityNote(
    pageType: PageType,
    entityType: string,
    entityId: string,
    seed: EntityNoteSeed,
  ): Promise<PageRow>

  // --- attachments (net-new — `note_attachments` table) --------------------
  addAttachment(pageId: string, file: NewAttachment): Promise<NoteAttachmentRow>
  getAttachments(pageId: string): Promise<NoteAttachmentRow[]>
  removeAttachment(id: string): Promise<void>

  // --- facade: entity-link WRITES → AR-6 SpacesService ---------------------
  createEntityLink(
    pageId: string,
    entityType: string,
    entityId: string,
    context?: string | null,
  ): Promise<EntityLinkRow>
  removeEntityLink(pageId: string, entityType: string, entityId: string): Promise<void>

  // --- facade: entity-link READS → AR-8 BacklinkResolver -------------------
  getBacklinks(entityType: string, entityId: string): Promise<EntityLinkRow[]>
  getEntityLinksFrom(pageId: string): Promise<EntityLinkRow[]>

  // --- entity_tags READS (AR-6 owns writes; §9:190 ① scope) ----------------
  getTagsForEntity(entityType: string, entityId: string): Promise<EntityTagRow[]>
  getEntitiesByTag(tagId: string): Promise<EntityTagRow[]>
}

// --- Typed errors (spec §2 fail-loud) — never a silent partial --------------

export class JournalExistsError extends Error {
  constructor(public readonly journalDate: string) {
    super(`A journal already exists for date '${journalDate}' (NP-2)`)
    this.name = 'JournalExistsError'
  }
}

export class UnregisteredEntityTypeError extends Error {
  constructor(public readonly entityType: string) {
    super(`entity_type '${entityType}' is not registered as linkable/taggable (NP-6/SP2)`)
    this.name = 'UnregisteredEntityTypeError'
  }
}
