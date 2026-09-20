// ============================================================================
// services/notes — the service (mod-notes-and-pages ① · Slice 1: Pages core)
//
// The connective HUB's page-CRUD surface over the finished DB-4 `pages` table.
// Factory-object, hoisted closures, no `this.` (destructure-consumption shape,
// NOT-43). Persistence: DB-6 Repository, encryptedFields:[] M1.0 pass-through
// (BR-S1-11). Every custom-predicate read appends isNull(deleted_at) — findWhere
// runs the clause verbatim (BR-S1-7). NP-2 enforced in-service (BR-S1-1).
// ============================================================================

import { and, eq, isNull, type SQL } from 'drizzle-orm'
import type { PageType } from '@vida/types'
import { createRepository } from '../../db/repository'
import { pages, type PageRow } from '../../db/schema/notes'
import { createPageSchema, updatePageSchema } from '../../validators/note'
import {
  JournalExistsError,
  UnregisteredEntityTypeError,
  type CreatePageInput,
  type NotesService,
  type NotesServiceDeps,
  type UpdatePageInput,
} from './types'

/**
 * Combine active-row conditions into a single SQL clause. `and(...)` is typed
 * `SQL | undefined` (undefined only with zero args); every caller passes ≥1
 * condition (isNull(deleted_at)), so the guard both narrows the type and fails
 * loud — avoiding a bare non-null assertion (STANDARDS §XV).
 */
function allOf(...conditions: (SQL | undefined)[]): SQL {
  const combined = and(...conditions)
  if (!combined) throw new Error('allOf requires at least one condition')
  return combined
}

export function createNotesService(deps: NotesServiceDeps): NotesService {
  const { db, deviceId, registry } = deps
  // pages HAS deleted_at → softDelete:true; encryptedFields:[] M1.0 pass-through (BR-S1-11).
  const pageRepo = createRepository(db, pages, { deviceId, encryptedFields: [], softDelete: true })

  /** NP-6/SP2 — reject an entity_type absent from the injected registry (BR-S1-3; reused by S4). */
  function assertRegistered(entityType: string | null | undefined): void {
    if (entityType != null && !registry.isRegistered(entityType)) {
      throw new UnregisteredEntityTypeError(entityType)
    }
  }

  async function getPageByJournalDate(date: string): Promise<PageRow | null> {
    const rows = await pageRepo.findWhere(
      allOf(eq(pages.journal_date, date), eq(pages.type, 'journal'), isNull(pages.deleted_at)),
    )
    return rows[0] ?? null
  }

  const service: NotesService = {
    createPage: async (input: CreatePageInput): Promise<PageRow> => {
      const p = createPageSchema.parse(input)
      if (p.type === 'journal') {
        // NP-2 refine (BR-S1-2) guarantees journal_date is non-null when type==='journal'.
        const journalDate = p.journal_date as string
        const clash = await getPageByJournalDate(journalDate)
        if (clash) throw new JournalExistsError(journalDate)
      }
      assertRegistered(p.entity_type)
      // Backfill the notNull-default columns so the returned PageRow is faithful to its
      // required-field types — create() returns the input-derived row, NOT a re-read, so DB
      // defaults are not reflected (repository.ts:331-346). Convention: sessions/service.ts:305
      // (`status: … ?? 'running'`), preferences spreads its DEFAULTS. Mirrors schema/notes.ts defaults.
      return pageRepo.create({
        ...p,
        is_favorite: p.is_favorite ?? false,
        is_archived: p.is_archived ?? false,
        has_pomodoro: p.has_pomodoro ?? false,
        word_count: p.word_count ?? 0,
      })
    },

    getPage: async (id: string): Promise<PageRow | null> => pageRepo.findById(id),

    updatePage: async (id: string, patch: UpdatePageInput): Promise<PageRow> => {
      const parsed = updatePageSchema.parse(patch)
      return pageRepo.update(id, parsed)
    },

    softDeletePage: async (id: string): Promise<void> => {
      await pageRepo.delete(id)
    },

    getPageByJournalDate,

    getPagesByType: async (type: PageType): Promise<PageRow[]> =>
      pageRepo.findWhere(allOf(eq(pages.type, type), isNull(pages.deleted_at))),

    getPagesForEntity: async (entityType: string, entityId: string): Promise<PageRow[]> =>
      pageRepo.findWhere(
        allOf(eq(pages.entity_type, entityType), eq(pages.entity_id, entityId), isNull(pages.deleted_at)),
      ),

    listPages: async (filters = {}): Promise<PageRow[]> =>
      pageRepo.findWhere(
        allOf(
          ...(filters.favorite ? [eq(pages.is_favorite, true)] : []),
          ...(filters.archived ? [eq(pages.is_archived, true)] : []),
          isNull(pages.deleted_at),
        ),
      ),
  }

  return service
}
