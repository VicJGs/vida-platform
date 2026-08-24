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
import { createPageSchema, updatePageSchema } from '../../validators/note'
import type { SpacesService } from '../../foundation/spaces/service'
import type { BacklinkResolver } from '../search/backlink-resolver'
import type { TaggableTypeRegistry } from '../../foundation/spaces/types'
import type { PageRow } from '../../db/schema/notes'
import type { PageType } from '@vida/types'

export type CreatePageInput = z.infer<typeof createPageSchema>
export type UpdatePageInput = z.infer<typeof updatePageSchema>

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
}

/** NP-2: a live journal already exists for this calendar date. */
export class JournalExistsError extends Error {
  constructor(public readonly journalDate: string) {
    super(`A journal already exists for ${journalDate}`)
    this.name = 'JournalExistsError'
  }
}
