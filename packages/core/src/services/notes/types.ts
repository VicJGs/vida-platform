// ============================================================================
// MOD-notes ① — NotesService types (slice A1)
//
// The service returns Drizzle Rows (PageRow), NOT @vida/types interfaces — the
// DB-11 interface reconcile is not this entity's job (baseline C2, seam-contract).
// Input types are z.infer of the kept DB-9 validators (never hand-redeclared).
// NotesServiceDeps is the FROZEN 3-dep factory shape (seam-contract.md:8); the
// deps are consumed from slice A5 (link/tag facade), unused in A1.
// ============================================================================

import { z } from 'zod'
import { createPageSchema, updatePageSchema, entityNoteSeedSchema, newAttachmentSchema } from '../../validators/note'
import type { SpacesService } from '../../foundation/spaces/service'
import type { BacklinkResolver } from '../search/backlink-resolver'
import type { TaggableTypeRegistry } from '../../foundation/spaces/types'
import type { PageRow, PageLinkRow, NoteAttachmentRow } from '../../db/schema/notes'
import type { EntityTagRow, EntityLinkRow } from '../../db/schema/foundation/spaces'
import { type PageType, MAX_ATTACHMENT_BYTES } from '@vida/types'

export type CreatePageInput = z.infer<typeof createPageSchema>
export type UpdatePageInput = z.infer<typeof updatePageSchema>
/** NP-8 entity-note seed — a service input DTO (single-homed here like CreatePageInput, not a @vida/types entity). */
export type EntityNoteSeed = z.infer<typeof entityNoteSeedSchema>
/** A6 attachment input — insertable subset of the documented NoteAttachment type; single-homed like EntityNoteSeed. */
export type NewAttachment = z.infer<typeof newAttachmentSchema>

export interface NotesServiceDeps {
  spaces: SpacesService
  backlinks: BacklinkResolver
  registry: TaggableTypeRegistry
}

export interface NotesService {
  // --- pages (A1) ------------------------------------------------------------
  createPage(input: CreatePageInput): Promise<PageRow>
  getPage(id: string): Promise<PageRow | null>
  updatePage(id: string, patch: UpdatePageInput): Promise<PageRow>
  softDeletePage(id: string): Promise<void>
  getPageByJournalDate(date: string): Promise<PageRow | null>
  getPagesByType(type: PageType): Promise<PageRow[]>
  getPagesForEntity(entityType: string, entityId: string): Promise<PageRow[]>
  listPages(filter: { favorite?: boolean; archived?: boolean; tag?: string }): Promise<PageRow[]>

  // --- page_links (A2) -------------------------------------------------------
  // Wiki-style page↔page links. Idempotent revive-or-noop (IR-11 / NP-5); the FULL
  // UNIQUE(source,target) means a soft-deleted row keeps the key, so a re-link revives
  // it rather than colliding. No typed error (the UNIQUE clash is absorbed, not surfaced).
  createPageLink(source: string, target: string, context?: string | null): Promise<PageLinkRow>
  removePageLink(source: string, target: string): Promise<void>
  getPageLinksFrom(pageId: string): Promise<PageLinkRow[]>
  getPageLinksTo(pageId: string): Promise<PageLinkRow[]>

  // --- wiki (A3) -------------------------------------------------------------
  // Title candidates for the [[ picker (B3). Match mirrors the E4 slash-menu filter
  // (filterSlashItems: case-insensitive substring, empty→all live pages). Never creates (IR-4).
  resolveWikiLink(text: string): Promise<PageRow[]>

  // --- entity-note seed (A4) -------------------------------------------------
  // NP-8: idempotently ensure the parent entity's *_note of this type exists; on create, seed
  // `content` with a deterministic minimal TipTap doc from `seed`. Never creates a duplicate.
  ensureEntityNote(
    pageType: PageType,
    entityType: string,
    entityId: string,
    seed: EntityNoteSeed,
  ): Promise<PageRow>

  // --- tag reads (A5, net-new B1) --------------------------------------------
  // AR-6 SpacesService owns tag WRITES but exposes no tag-read; Notes adds the read (seam-contract:25).
  getEntitiesByTag(tagId: string): Promise<EntityTagRow[]>
  getTagsForEntity(entityType: string, entityId: string): Promise<EntityTagRow[]>

  // --- write facade → AR-6 (A5) ----------------------------------------------
  // createEntityLink/tagEntity pre-validate entityType vs the runtime registry (IR-2/C5) →
  // UnregisteredEntityTypeError, then delegate. remove/untag delegate without a guard (mirror AR-6).
  createEntityLink(
    pageId: string,
    entityType: string,
    entityId: string,
    context?: string | null,
  ): Promise<EntityLinkRow>
  removeEntityLink(pageId: string, entityType: string, entityId: string): Promise<void>
  tagEntity(tagId: string, entityType: string, entityId: string): Promise<EntityTagRow>
  untagEntity(tagId: string, entityType: string, entityId: string): Promise<void>

  // --- read facade → AR-8 (A5) + the ①-composed merge ------------------------
  getEntityLinksFrom(pageId: string): Promise<EntityLinkRow[]>
  // getBacklinks = the C4/G6 merge: entity_links (AR-8) ⊕ page_links (A2), kept typed-distinct (seam-contract:28).
  getBacklinks(
    entityType: string,
    entityId: string,
  ): Promise<{ entityLinks: EntityLinkRow[]; pageLinks: PageLinkRow[] }>

  // --- attachments (A6) ------------------------------------------------------
  // addAttachment enforces the 25 MB per-attachment limit (ADR-003:185) → AttachmentTooLargeError.
  addAttachment(pageId: string, file: NewAttachment): Promise<NoteAttachmentRow>
  getAttachments(pageId: string): Promise<NoteAttachmentRow[]>
  removeAttachment(id: string): Promise<void>
}

/** NP-2: a live journal already exists for this calendar date. */
export class JournalExistsError extends Error {
  constructor(public readonly journalDate: string) {
    super(`A journal already exists for ${journalDate}`)
    this.name = 'JournalExistsError'
  }
}

/**
 * NP-6/SP2 (IR-2/baseline C5): an `entity_type` not in the runtime registry. Thrown by the A5 facade
 * BEFORE delegating a link/tag write. Distinct from AR-6's `UnknownEntityType` — Notes owns its error surface
 * (seam-contract:34); the data-flow.md §5 `ServiceError` divergence is a flagged DB-11 reconcile, not this slice.
 */
export class UnregisteredEntityTypeError extends Error {
  constructor(public readonly entityType: string) {
    super(`Entity type is not registered: ${entityType}`)
    this.name = 'UnregisteredEntityTypeError'
  }
}

/** ADR-003:185 — an attachment exceeds the 25 MB per-attachment limit (`MAX_ATTACHMENT_BYTES`). */
export class AttachmentTooLargeError extends Error {
  constructor(public readonly sizeBytes: number) {
    super(`Attachment exceeds the ${MAX_ATTACHMENT_BYTES}-byte limit: ${sizeBytes}`)
    this.name = 'AttachmentTooLargeError'
  }
}
