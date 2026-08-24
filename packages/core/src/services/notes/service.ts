// ============================================================================
// NotesService — MOD-notes ① · slice A1 (pages CRUD + factory)
//
// The ground-zero rebuild's first code. Factory = object literal (no `this`;
// intra-calls via closures — the destructure-safe shape). Every mutating method:
// validate (Zod, async → rejection) → repository → return Drizzle Row.
//
// M1.0 pass-through (N9/BR-DB6-3): empty [E] set, so the vault key path stays
// dormant (getVaultKey never called pre-unlock). N1 is still live: every write
// stamps _sync_hash via libsodium hashContent — initVault() must precede the
// first write (boot's job; the Verification Gate's live-DB smoke guards it).
// Reads honor N7/IR-6: findWhere runs predicates verbatim, so every read
// appends isNull(deleted_at). Later slices (A2-A8) extend this same file.
// ============================================================================

import { and, eq, isNull, type SQL } from 'drizzle-orm'
import type { DrizzleDb } from '../../db/adapter'
import { createRepository } from '../../db/repository'
import { pages, type PageRow } from '../../db/schema/notes'
import { createPageSchema, updatePageSchema } from '../../validators/note'
import type { PageType } from '@vida/types'
import { type NotesService, type NotesServiceDeps, JournalExistsError } from './types'

export function createNotesService(
  db: DrizzleDb,
  deviceId: string,
  // Frozen 3-dep factory signature (seam-contract.md:8). Consumed from slice A5
  // (link/tag facade); unused in A1 → `_` prefix keeps it lint-clean (^_ ignore).
  _deps: NotesServiceDeps,
): NotesService {
  // N9/N2: empty-[E] pass-through, soft-delete, deviceId (mirrors spaces/service.ts:69).
  const pageRepo = createRepository(db, pages, { deviceId, encryptedFields: [], softDelete: true })

  // N7/IR-6: findWhere is verbatim → always AND isNull(deleted_at). and() is SQL|undefined → `!`.
  const live = (pred: SQL): Promise<PageRow[]> => pageRepo.findWhere(and(pred, isNull(pages.deleted_at))!)

  return {
    async createPage(input) {
      const data = createPageSchema.parse(input) // async method → ZodError surfaces as a rejection
      if (data.type === 'journal' && data.journal_date != null) {
        // BR-A1-1 (NP-2): reject a duplicate LIVE journal for this date. The partial-UNIQUE
        // index idx_pages_journal_unique (WHERE type='journal' AND deleted_at IS NULL) backstops.
        const clash = await live(and(eq(pages.type, 'journal'), eq(pages.journal_date, data.journal_date))!)
        if (clash.length > 0) throw new JournalExistsError(data.journal_date)
      }
      // N1: create → hashContent. Direct-pass of nullish() output into the optional-nullable insert
      // type is sound under tsconfig `exactOptionalPropertyTypes:false` (gate-2 verified: tsc 0). A
      // future flip to true would surface this coupling here (vs an explicit `?? null` literal).
      return pageRepo.create(data)
    },

    getPage(id) {
      return pageRepo.findById(id) // already notDeleted-filtered (repository.ts)
    },

    async updatePage(id, patch) {
      // .strict() rejects `type`/`journal_date`/unknown keys (IR-9 immutable journal identity).
      const data = updatePageSchema.parse(patch)
      return pageRepo.update(id, data) // throws `Row not found: <id>` if absent
    },

    async softDeletePage(id) {
      await pageRepo.delete(id) // soft (sets deleted_at) + enqueues operation:'update'
    },

    async getPageByJournalDate(date) {
      const rows = await live(and(eq(pages.type, 'journal'), eq(pages.journal_date, date))!)
      return rows[0] ?? null
    },

    getPagesByType(type: PageType) {
      return live(eq(pages.type, type))
    },

    getPagesForEntity(entityType, entityId) {
      return live(and(eq(pages.entity_type, entityType), eq(pages.entity_id, entityId))!)
    },

    listPages(filter) {
      // BR-A1-7 (D-2): the tag branch needs the entity_tags read that lands at A5. Fail LOUD rather
      // than silently returning an unfiltered (wrong-but-plausible) set.
      if (filter.tag !== undefined) {
        throw new Error('listPages({tag}) is available from slice A5')
      }
      const conds: SQL[] = []
      if (filter.favorite !== undefined) conds.push(eq(pages.is_favorite, filter.favorite))
      if (filter.archived !== undefined) conds.push(eq(pages.is_archived, filter.archived))
      const pred = conds.length > 0 ? and(...conds)! : undefined
      return pred ? live(pred) : pageRepo.findWhere(isNull(pages.deleted_at))
    },
  }
}
