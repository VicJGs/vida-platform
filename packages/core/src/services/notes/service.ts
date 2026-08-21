// ============================================================================
// NotesService — pages · page_links · note_attachments (+ facade over AR-6/AR-8)
// (MOD-notes ① · LIF-131 · M1.1)
//
// The connective-hub surface. Native tables (pages/page_links/note_attachments)
// get CRUD + wiki-resolve + NP-8 entity-note seed here; entity-link writes/reads
// and tag writes are DELEGATED to the AR-6 Spaces substrate + AR-8 backlink
// resolver (ADR-018 §3.3 substrate↔surface; "rides foundation substrates, does
// not re-implement them"). entity_tags READS are a thin read-repo (AR-8 precedent).
//
// Every mutation routes through the DB-6 generic Repository → co-transactional
// sync_queue enqueue. M1.0 pass-through (BR-DB6-3): each repo is empty-[E] (no
// field encryption; [E] marks are the M3 target). Syncable soft-delete on every
// table. findWhere runs predicates VERBATIM → every read appends isNull(deleted_at).
// ============================================================================

import { and, eq, isNull, like } from 'drizzle-orm'
import type { DrizzleDb } from '../../db/adapter'
import { createRepository } from '../../db/repository'
import { pages, pageLinks, noteAttachments, type PageRow } from '../../db/schema/notes'
import { entityTags } from '../../db/schema/foundation/spaces'
import { createPageSchema, updatePageSchema } from '../../validators/note'
import type { SpacesService, TaggableTypeRegistry } from '../../foundation/spaces'
import type { BacklinkResolver } from '../search/backlink-resolver'
import {
  type NotesService,
  type CreatePageInput,
  type EntityNoteSeed,
  JournalExistsError,
  UnregisteredEntityTypeError,
} from './types'

export interface NotesServiceDeps {
  spaces: SpacesService
  backlinks: BacklinkResolver
  registry: TaggableTypeRegistry
}

/** NP-8 — a deterministic seed string built purely from the parent-entity local
 *  fields (stable key order; no Date.now/random). Same seed → identical content. */
function seedContent(seed: EntityNoteSeed): string {
  return JSON.stringify({
    title: seed.title ?? null,
    type: seed.type ?? null,
    status: seed.status ?? null,
    date: seed.date ?? null,
  })
}

export function createNotesService(
  db: DrizzleDb,
  deviceId: string,
  deps: NotesServiceDeps,
): NotesService {
  // M1.0 pass-through: empty [E] set; syncable soft-delete on every table.
  const cfg = { deviceId, encryptedFields: [] as string[], softDelete: true }
  const pageRepo = createRepository(db, pages, cfg)
  const pageLinkRepo = createRepository(db, pageLinks, cfg)
  const attachmentRepo = createRepository(db, noteAttachments, cfg)
  const entityTagRepo = createRepository(db, entityTags, cfg) // read-only here (AR-6 owns writes)

  function assertRegistered(entityType: string): void {
    if (!deps.registry.isRegistered(entityType)) throw new UnregisteredEntityTypeError(entityType)
  }

  // Intra-service helpers live in closure scope (NOT via `this.`) so destructured
  // consumption (`const { createPage } = svc`, the ② React-Query shape) still works.
  // Mirrors AR-6's assertRegistered/assertNoTagCycle precedent.
  async function getPageByJournalDate(date: string): Promise<PageRow | null> {
    const rows = await pageRepo.findWhere(
      and(eq(pages.type, 'journal'), eq(pages.journal_date, date), isNull(pages.deleted_at))!,
    )
    return rows[0] ?? null
  }

  async function createPage(input: CreatePageInput): Promise<PageRow> {
    const v = createPageSchema.parse(input)
    // NP-6 — a registered entity_type only (the polymorphic *_note parent).
    if (v.entity_type != null) assertRegistered(v.entity_type)
    // NP-2 — one journal per date (in-service; the SQL partial-UNIQUE is migration-only).
    if (v.type === 'journal' && v.journal_date != null) {
      const clash = await getPageByJournalDate(v.journal_date)
      if (clash) throw new JournalExistsError(v.journal_date)
    }
    return pageRepo.create({
      type: v.type,
      title: v.title ?? null,
      content: v.content ?? null,
      parent_id: v.parent_id ?? null,
      entity_type: v.entity_type ?? null,
      entity_id: v.entity_id ?? null,
      journal_date: v.journal_date ?? null,
      is_favorite: v.is_favorite ?? false,
      is_archived: v.is_archived ?? false,
      icon: v.icon ?? null,
      cover_image: v.cover_image ?? null,
      summary_config: v.summary_config ?? null,
      has_pomodoro: v.has_pomodoro ?? false,
      word_count: v.word_count ?? 0,
    })
  }

  return {
    // --- pages ---------------------------------------------------------------
    createPage,
    getPageByJournalDate,

    getPage(id) {
      return pageRepo.findById(id)
    },

    async updatePage(id, patch) {
      // async so a validation failure is a REJECTION, not a sync throw (consistent with createPage)
      const v = updatePageSchema.parse(patch)
      return pageRepo.update(id, v)
    },

    softDeletePage(id) {
      return pageRepo.delete(id)
    },

    getPagesByType(type) {
      return pageRepo.findWhere(and(eq(pages.type, type), isNull(pages.deleted_at))!)
    },

    getPagesForEntity(entityType, entityId) {
      return pageRepo.findWhere(
        and(
          eq(pages.entity_type, entityType),
          eq(pages.entity_id, entityId),
          isNull(pages.deleted_at),
        )!,
      )
    },

    listPages(filter) {
      const conds = [isNull(pages.deleted_at)]
      if (filter?.favorite != null) conds.push(eq(pages.is_favorite, filter.favorite))
      if (filter?.archived != null) conds.push(eq(pages.is_archived, filter.archived))
      return pageRepo.findWhere(and(...conds)!)
    },

    // --- page_links (idempotent; NP-5) --------------------------------------
    async createPageLink(sourcePageId, targetPageId, context) {
      // findWhere WITHOUT isNull → catch a soft-deleted row to revive (avoids raw UNIQUE collision).
      const existing = await pageLinkRepo.findWhere(
        and(
          eq(pageLinks.source_page_id, sourcePageId),
          eq(pageLinks.target_page_id, targetPageId),
        )!,
      )
      if (existing.length > 0) {
        const row = existing[0]
        if (row.deleted_at != null) {
          return pageLinkRepo.update(row.id, { deleted_at: null, context: context ?? null })
        }
        return row // idempotent no-op
      }
      return pageLinkRepo.create({
        source_page_id: sourcePageId,
        target_page_id: targetPageId,
        context: context ?? null,
      })
    },

    async removePageLink(sourcePageId, targetPageId) {
      const existing = await pageLinkRepo.findWhere(
        and(
          eq(pageLinks.source_page_id, sourcePageId),
          eq(pageLinks.target_page_id, targetPageId),
        )!,
      )
      const live = existing.find((r) => r.deleted_at == null)
      if (live) await pageLinkRepo.delete(live.id)
    },

    getPageLinksFrom(pageId) {
      return pageLinkRepo.findWhere(
        and(eq(pageLinks.source_page_id, pageId), isNull(pageLinks.deleted_at))!,
      )
    },

    getPageLinksTo(pageId) {
      return pageLinkRepo.findWhere(
        and(eq(pageLinks.target_page_id, pageId), isNull(pageLinks.deleted_at))!,
      )
    },

    // --- wiki-resolve + entity-note seed ------------------------------------
    resolveWikiLink(text) {
      // M1.0: titles are plaintext (empty-[E] pass-through) → LIKE match. At M3 [E]
      // activates → title search moves client-side (spec §6 forward-dep).
      return pageRepo.findWhere(and(like(pages.title, `%${text}%`), isNull(pages.deleted_at))!)
    },

    async ensureEntityNote(pageType, entityType, entityId, seed) {
      assertRegistered(entityType) // NP-6
      const existing = await pageRepo.findWhere(
        and(
          eq(pages.type, pageType),
          eq(pages.entity_type, entityType),
          eq(pages.entity_id, entityId),
          isNull(pages.deleted_at),
        )!,
      )
      if (existing.length > 0) return existing[0] // NP-8 idempotent — never a second note
      return createPage({
        type: pageType,
        entity_type: entityType,
        entity_id: entityId,
        title: seed.title ?? null,
        content: seedContent(seed),
      } as CreatePageInput)
    },

    // --- attachments ---------------------------------------------------------
    addAttachment(pageId, file) {
      return attachmentRepo.create({
        page_id: pageId,
        filename: file.filename,
        mime_type: file.mime_type,
        encrypted_blob: Buffer.isBuffer(file.encrypted_blob)
          ? file.encrypted_blob
          : Buffer.from(file.encrypted_blob),
        thumbnail_blob:
          file.thumbnail_blob == null
            ? null
            : Buffer.isBuffer(file.thumbnail_blob)
              ? file.thumbnail_blob
              : Buffer.from(file.thumbnail_blob),
        size_bytes: file.size_bytes,
      })
    },

    getAttachments(pageId) {
      return attachmentRepo.findWhere(
        and(eq(noteAttachments.page_id, pageId), isNull(noteAttachments.deleted_at))!,
      )
    },

    removeAttachment(id) {
      return attachmentRepo.delete(id)
    },

    // --- facade: entity-link WRITES → AR-6 ----------------------------------
    async createEntityLink(pageId, entityType, entityId, context) {
      assertRegistered(entityType) // consistent Notes-surface error before delegating (rejection, not sync throw)
      return deps.spaces.createLink(pageId, entityType, entityId, context)
    },

    removeEntityLink(pageId, entityType, entityId) {
      return deps.spaces.removeLink(pageId, entityType, entityId)
    },

    // --- facade: entity-link READS → AR-8 -----------------------------------
    getBacklinks(entityType, entityId) {
      return deps.backlinks.getBacklinksTo(entityType, entityId)
    },

    getEntityLinksFrom(pageId) {
      return deps.backlinks.getLinksFrom(pageId)
    },

    // --- entity_tags READS (AR-6 owns writes) -------------------------------
    getTagsForEntity(entityType, entityId) {
      return entityTagRepo.findWhere(
        and(
          eq(entityTags.entity_type, entityType),
          eq(entityTags.entity_id, entityId),
          isNull(entityTags.deleted_at),
        )!,
      )
    },

    getEntitiesByTag(tagId) {
      return entityTagRepo.findWhere(
        and(eq(entityTags.tag_id, tagId), isNull(entityTags.deleted_at))!,
      )
    },
  }
}
