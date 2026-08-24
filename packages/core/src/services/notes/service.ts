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
import { pages, pageLinks, type PageRow, type PageLinkRow } from '../../db/schema/notes'
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
  const pageLinkRepo = createRepository(db, pageLinks, { deviceId, encryptedFields: [], softDelete: true })

  // N7/IR-6: findWhere is verbatim → always AND isNull(deleted_at). and() is SQL|undefined → `!`.
  const live = (pred: SQL): Promise<PageRow[]> => pageRepo.findWhere(and(pred, isNull(pages.deleted_at))!)
  const livePageLinks = (pred: SQL): Promise<PageLinkRow[]> =>
    pageLinkRepo.findWhere(and(pred, isNull(pageLinks.deleted_at))!)

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

    // --- page_links (A2) -----------------------------------------------------
    async createPageLink(source, target, context) {
      // BR-A2-1/IR-11 revive-or-noop. findWhere the business key INCLUDING soft-deleted rows — the ONE read that
      // does NOT filter deleted, because UNIQUE(source,target) is FULL (012_notes.ts:78): a soft-deleted row still
      // holds the key, so a plain re-insert would collide. Mirrors spaces/service.ts createLink (:158-180).
      const existing = await pageLinkRepo.findWhere(
        and(eq(pageLinks.source_page_id, source), eq(pageLinks.target_page_id, target))!,
      )
      if (existing.length > 0) {
        const row = existing[0]
        if (row.deleted_at != null) {
          // BR-A2-2: revive — stable id, context re-supplied by this call (mirror createLink:170).
          return pageLinkRepo.update(row.id, { deleted_at: null, context: context ?? null })
        }
        return row // idempotent no-op — context left untouched (BR-A2-2)
      }
      return pageLinkRepo.create({ source_page_id: source, target_page_id: target, context: context ?? null })
    },

    async removePageLink(source, target) {
      // BR-A2-4 resolve-then-soft-delete by business key. `liveRow` (NOT `live` — that name is the pages closure
      // above; a local `live` would shadow it). Mirrors spaces/service.ts removeLink (:182-192).
      const existing = await pageLinkRepo.findWhere(
        and(eq(pageLinks.source_page_id, source), eq(pageLinks.target_page_id, target))!,
      )
      const liveRow = existing.find((r) => r.deleted_at == null)
      if (liveRow) await pageLinkRepo.delete(liveRow.id) // soft-delete → enqueues operation:'update'
    },

    getPageLinksFrom(pageId) {
      return livePageLinks(eq(pageLinks.source_page_id, pageId))
    },

    getPageLinksTo(pageId) {
      // Reverse read (ex-AR-8, deferred to M1.1) — backed by idx_page_links_target (schema/notes.ts:80).
      return livePageLinks(eq(pageLinks.target_page_id, pageId))
    },
  }
}
