// ============================================================================
// services/notes — types (mod-notes-and-pages ① · Slice 1)
//
// The Notes & Pages hub (in-degree 14): deps + the NotesService interface +
// input types + typed errors. S1 declares the Pages-core surface; S2–S4 append.
// Factory-object shape, hoisted closures, no `this.` (NOT-43). Bespoke Error
// subclasses (NOT-44; ServiceError reconcile → DB-11).
// ============================================================================

import type { z } from 'zod'
import type { EditorDocument, PageType } from '@vida/types'
import type { PageRow, PageLinkRow, NoteAttachmentRow } from '../../db/schema/notes'
import type { EntityLinkRow, EntityTagRow } from '../../db/schema/foundation/spaces'
import type { DrizzleDb } from '../../db/adapter'
import type { SpacesService } from '../../foundation/spaces/service'
import type { TaggableTypeRegistry } from '../../foundation/spaces/types'
import type { BacklinkResolver } from '../search/backlink-resolver'
import type { createPageSchema, updatePageSchema } from '../../validators/note'

export interface NotesServiceDeps {
  db: DrizzleDb
  deviceId: string
  /** AR-6 — entity-link/tag WRITES (delegated; exercised in S4). */
  spaces: SpacesService
  /** AR-8 — entity-link READS (delegated; exercised in S4). */
  backlinks: BacklinkResolver
  /** AR-6/ADR-006 SP2 — open taggable-type registry; validates entity_type (S1 createPage; S4 links). */
  registry: TaggableTypeRegistry
}

/** createPage input — the Zod-validated create shape (validators/note.ts). */
export type CreatePageInput = z.infer<typeof createPageSchema>
/** updatePage input — the `.strict()` updatable-fields whitelist (NOT-03). */
export type UpdatePageInput = z.infer<typeof updatePageSchema>

/**
 * Parent-entity LOCAL fields used to seed an entity note's content (NOT-12). Read purely,
 * client-side; no cross-module table access. `seedContent` is deterministic over this (NP-8/ZK-1).
 */
export interface EntityNoteSeed {
  title?: string
  type?: string
  status?: string
  [k: string]: string | number | boolean | null | undefined
}

/** New attachment input (camelCase); mapped to `note_attachments` columns by addAttachment (NOT-29). */
export interface NewAttachment {
  filename: string
  mimeType: string
  encryptedBlob: Uint8Array
  thumbnailBlob?: Uint8Array
  sizeBytes: number
}

export interface NotesService {
  // ── S1: Pages core ──────────────────────────────────────────────
  createPage(input: CreatePageInput): Promise<PageRow>
  getPage(id: string): Promise<PageRow | null>
  updatePage(id: string, patch: UpdatePageInput): Promise<PageRow>
  /** IR-7: write the editor body via its own path (NOT updatePage's LWW metadata patch). M1 local write; M4 CRDT. */
  writePageContent(id: string, content: EditorDocument): Promise<PageRow>
  softDeletePage(id: string): Promise<void>
  getPageByJournalDate(date: string): Promise<PageRow | null>
  /** NP-8 idempotent get-or-create for a day's journal page (mirrors ensureEntityNote). Title = the YYYY-MM-DD
   *  date (non-empty, deterministic, locale-free). The home/journal go-live's materialization seam. */
  ensureJournal(date: string): Promise<PageRow>
  getPagesByType(type: PageType): Promise<PageRow[]>
  getPagesForEntity(entityType: string, entityId: string): Promise<PageRow[]>
  listPages(filters?: { favorite?: boolean; archived?: boolean }): Promise<PageRow[]>

  // ── S2: Entity notes + attachments ──────────────────────────────
  ensureEntityNote(
    pageType: PageType,
    entityType: string,
    entityId: string,
    seed: EntityNoteSeed,
  ): Promise<PageRow>
  addAttachment(pageId: string, file: NewAttachment): Promise<NoteAttachmentRow>
  getAttachments(pageId: string): Promise<NoteAttachmentRow[]>
  removeAttachment(id: string): Promise<void>

  // ── S3: Page-links + wiki resolution ────────────────────────────
  createPageLink(sourcePageId: string, targetPageId: string, context?: string): Promise<PageLinkRow>
  removePageLink(sourcePageId: string, targetPageId: string): Promise<void>
  getPageLinksFrom(pageId: string): Promise<PageLinkRow[]>
  getPageLinksTo(pageId: string): Promise<PageLinkRow[]>
  resolveWikiLink(text: string): Promise<PageRow[]>

  // ── S4: Delegation facade + registry ────────────────────────────
  createEntityLink(
    pageId: string,
    entityType: string,
    entityId: string,
    context?: string,
  ): Promise<EntityLinkRow>
  removeEntityLink(pageId: string, entityType: string, entityId: string): Promise<void>
  getEntityLinksFrom(pageId: string): Promise<EntityLinkRow[]>
  getBacklinks(
    entityType: string,
    entityId: string,
  ): Promise<{ pageLinks: PageLinkRow[]; entityLinks: EntityLinkRow[] }>
  getTagsForEntity(entityType: string, entityId: string): Promise<EntityTagRow[]>
  getEntitiesByTag(tagId: string): Promise<EntityTagRow[]>
}

/** NP-2 conflict — one journal per calendar date; never a silent overwrite (NOT-09/10). */
export class JournalExistsError extends Error {
  constructor(public readonly journalDate: string) {
    super(`A journal page already exists for ${journalDate}`)
    this.name = 'JournalExistsError'
  }
}

/** NP-6/SP2 — entity_type must be in the injected TaggableTypeRegistry (NOT-20/21). */
export class UnregisteredEntityTypeError extends Error {
  constructor(public readonly entityType: string) {
    super(`Unregistered entity_type: "${entityType}"`)
    this.name = 'UnregisteredEntityTypeError'
  }
}

/** BR-R0-5 — a write/create against a deleted or unknown page (deleted ⇒ unreachable by id, IR-R3). */
export class PageNotFoundError extends Error {
  constructor(public readonly pageId: string) {
    super(`Page not found: ${pageId}`)
    this.name = 'PageNotFoundError'
  }
}

/** BR-R0-6 — a body that is not a shape-valid EditorDocument; nothing is written. */
export class InvalidPageContentError extends Error {
  constructor(public readonly pageId: string) {
    super(`Invalid page content for ${pageId}: not an EditorDocument`)
    this.name = 'InvalidPageContentError'
  }
}
