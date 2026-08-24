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
import { createPageSchema, updatePageSchema, entityNoteSeedSchema } from '../../validators/note'
import type { SpacesService } from '../../foundation/spaces/service'
import type { BacklinkResolver } from '../search/backlink-resolver'
import type { TaggableTypeRegistry } from '../../foundation/spaces/types'
import type { PageRow, PageLinkRow } from '../../db/schema/notes'
import type { PageType } from '@vida/types'

export type CreatePageInput = z.infer<typeof createPageSchema>
export type UpdatePageInput = z.infer<typeof updatePageSchema>
/** NP-8 entity-note seed — a service input DTO (single-homed here like CreatePageInput, not a @vida/types entity). */
export type EntityNoteSeed = z.infer<typeof entityNoteSeedSchema>

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
}

/** NP-2: a live journal already exists for this calendar date. */
export class JournalExistsError extends Error {
  constructor(public readonly journalDate: string) {
    super(`A journal already exists for ${journalDate}`)
    this.name = 'JournalExistsError'
  }
}
