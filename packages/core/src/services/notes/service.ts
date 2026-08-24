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

import { and, eq, isNull, like, type SQL } from 'drizzle-orm'
import type { DrizzleDb } from '../../db/adapter'
import { createRepository } from '../../db/repository'
import {
  pages,
  pageLinks,
  noteAttachments,
  type PageRow,
  type PageLinkRow,
  type NoteAttachmentRow,
} from '../../db/schema/notes'
import { entityTags, type EntityTagRow } from '../../db/schema/foundation/spaces'
import { createPageSchema, updatePageSchema } from '../../validators/note'
import { type PageType, MAX_ATTACHMENT_BYTES } from '@vida/types'
import {
  type NotesService,
  type NotesServiceDeps,
  type EntityNoteSeed,
  JournalExistsError,
  UnregisteredEntityTypeError,
  AttachmentTooLargeError,
} from './types'

// NP-8 seed: fixed field order (title·type·status·dates), skip nullish → a short summary, wrapped in a minimal
// TipTap doc (conventions.md:7 — pages.content is TipTap/ProseMirror JSON; ADR-003:457 — the column stores a local
// snapshot). Deterministic: no Date.now/random; JSON.stringify of a literal preserves insertion order. An all-nullish
// seed → an empty paragraph, still a valid structurally-non-blank doc (NP-8 "never blank").
function buildSeedContent(seed: EntityNoteSeed): string {
  const summary = [seed.title, seed.type, seed.status, seed.dates].filter((v) => v != null).join(' · ')
  return JSON.stringify({
    type: 'doc',
    content: [{ type: 'paragraph', content: summary ? [{ type: 'text', text: summary }] : [] }],
  })
}

export function createNotesService(
  db: DrizzleDb,
  deviceId: string,
  // Frozen 3-dep factory signature (seam-contract.md:8). CONSUMED from slice A5 (link/tag facade + registry).
  deps: NotesServiceDeps,
): NotesService {
  // N9/N2: empty-[E] pass-through, soft-delete, deviceId (mirrors spaces/service.ts:69).
  const pageRepo = createRepository(db, pages, { deviceId, encryptedFields: [], softDelete: true })
  const pageLinkRepo = createRepository(db, pageLinks, { deviceId, encryptedFields: [], softDelete: true })
  // A5/B1: net-new read-repo over entity_tags (AR-6 owns writes; it exposes no tag-read). Mirrors AR-8's read-repo.
  const entityTagRepo = createRepository(db, entityTags, { deviceId, encryptedFields: [], softDelete: true })
  // A6: note_attachments CRUD repo (blob + thumbnail; empty-[E] pass-through in M1.0, repo encrypts at M3).
  const noteAttachmentRepo = createRepository(db, noteAttachments, {
    deviceId,
    encryptedFields: [],
    softDelete: true,
  })
  const liveAttachments = (pred: SQL): Promise<NoteAttachmentRow[]> =>
    noteAttachmentRepo.findWhere(and(pred, isNull(noteAttachments.deleted_at))!)

  // N7/IR-6: findWhere is verbatim → always AND isNull(deleted_at). and() is SQL|undefined → `!`.
  const live = (pred: SQL): Promise<PageRow[]> => pageRepo.findWhere(and(pred, isNull(pages.deleted_at))!)
  const livePageLinks = (pred: SQL): Promise<PageLinkRow[]> =>
    pageLinkRepo.findWhere(and(pred, isNull(pageLinks.deleted_at))!)
  const liveEntityTags = (pred: SQL): Promise<EntityTagRow[]> =>
    entityTagRepo.findWhere(and(pred, isNull(entityTags.deleted_at))!)

  // IR-2/baseline C5: validate entity_type against the RUNTIME registry (NOT the closed EntityLinkTargetSchema,
  // which would silently re-close the OPEN SP2 registry). Notes' own error surface (seam-contract:34).
  const assertRegistered = (entityType: string): void => {
    if (!deps.registry.isRegistered(entityType)) throw new UnregisteredEntityTypeError(entityType)
  }

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

    // --- tag reads (A5, net-new B1 · seam-contract:25) ------------------------
    getEntitiesByTag(tagId) {
      return liveEntityTags(eq(entityTags.tag_id, tagId))
    },
    getTagsForEntity(entityType, entityId) {
      return liveEntityTags(and(eq(entityTags.entity_type, entityType), eq(entityTags.entity_id, entityId))!)
    },

    // --- write facade → AR-6 (A5 · seam-contract:26) --------------------------
    async createEntityLink(pageId, entityType, entityId, context) {
      assertRegistered(entityType) // IR-2/C5; async method → the throw surfaces as a rejection
      return deps.spaces.createLink(pageId, entityType, entityId, context)
    },
    removeEntityLink(pageId, entityType, entityId) {
      return deps.spaces.removeLink(pageId, entityType, entityId) // no guard (AR-6 removeLink doesn't either)
    },
    async tagEntity(tagId, entityType, entityId) {
      assertRegistered(entityType) // IR-2/C5
      return deps.spaces.tagEntity(tagId, entityType, entityId)
    },
    untagEntity(tagId, entityType, entityId) {
      return deps.spaces.untagEntity(tagId, entityType, entityId) // no guard
    },

    // --- read facade → AR-8 (A5 · seam-contract:27) + the ①-composed merge ----
    getEntityLinksFrom(pageId) {
      return deps.backlinks.getLinksFrom(pageId) // pure AR-8 delegate (entity_links)
    },
    async getBacklinks(entityType, entityId) {
      // BR-A5-5 (seam-contract:28 · baseline C4): entity_links (AR-8) ⊕ page_links (A2 livePageLinks), kept
      // typed-distinct. Local is `pageLinkRows` (NOT `pageLinks`) — a `pageLinks` const would hit the imported
      // table's name in the eq predicate under a destructure-TDZ ReferenceError.
      const [entityLinks, pageLinkRows] = await Promise.all([
        deps.backlinks.getBacklinksTo(entityType, entityId),
        livePageLinks(eq(pageLinks.target_page_id, entityId)),
      ])
      return { entityLinks, pageLinks: pageLinkRows }
    },

    // --- attachments (A6 · seam-contract:29) ---------------------------------
    async addAttachment(pageId, file) {
      // BR-A6-7 (ADR-003:185): fail-loud at the creation entry point on the 25 MB per-attachment limit.
      if (file.size_bytes > MAX_ATTACHMENT_BYTES) throw new AttachmentTooLargeError(file.size_bytes)
      // BR-A6-2: [E] fields carry RAW bytes (repo encrypts at M3). NewAttachment carries a cross-platform
      // Uint8Array (matching @vida/types NoteAttachment), but the DB-4 schema types the blob columns as `Buffer`
      // (drizzle mode:'buffer', Node-centric) — a schema-vs-types divergence (DB-11 class). Reconcile with a
      // TYPE-ONLY cast at the storage boundary: erased at runtime, so no `Buffer` reference reaches the browser/
      // mobile targets; every SQLite engine accepts a Uint8Array blob at runtime (verified by the round-trip test).
      return noteAttachmentRepo.create({
        page_id: pageId,
        filename: file.filename,
        mime_type: file.mime_type,
        encrypted_blob: file.encrypted_blob as Buffer,
        thumbnail_blob: file.thumbnail_blob != null ? (file.thumbnail_blob as Buffer) : null,
        size_bytes: file.size_bytes,
      })
    },
    getAttachments(pageId) {
      return liveAttachments(eq(noteAttachments.page_id, pageId))
    },
    async removeAttachment(id) {
      await noteAttachmentRepo.delete(id) // soft-delete (NP-9) → enqueues operation:'update'
    },

    // --- entity-note seed (A4) -----------------------------------------------
    async ensureEntityNote(pageType, entityType, entityId, seed) {
      // BR-A4-1/IR-5: idempotent — return the existing *_note of THIS type for this entity, else create.
      // Key includes `type` so an A3 [[-stub `note` on the same entity doesn't satisfy a `task_note` request.
      const existing = await pageRepo.findWhere(
        and(
          eq(pages.type, pageType),
          eq(pages.entity_type, entityType),
          eq(pages.entity_id, entityId),
          isNull(pages.deleted_at),
        )!,
      )
      if (existing.length > 0) return existing[0]
      // BR-A4-3: seed → content (a minimal TipTap doc, the Yjs-doc genesis); title unset. BR-A4-4: no registry guard.
      return pageRepo.create({
        type: pageType,
        entity_type: entityType,
        entity_id: entityId,
        content: buildSeedContent(seed),
      })
    },

    // --- wiki (A3) -----------------------------------------------------------
    async resolveWikiLink(text) {
      // Match mirrors the E4 slash-menu filter (filterSlashItems, slash-commands.ts:210-215): trim, then
      // empty → all, else case-insensitive substring. B3 (the [[ picker) mirrors E4 (slice-map.md:32).
      const q = text.trim()
      // BR-A3-5: mirror E4 `if (!q) return items` — a bare [[ browses ALL live pages (B3 caps the dropdown).
      if (q.length === 0) return pageRepo.findWhere(isNull(pages.deleted_at))
      // BR-A3-4: SQLite LIKE is ASCII-case-insensitive → the query-layer equal of E4's toLowerCase().includes().
      // No .toLowerCase() on q (the query folds case); live-only via the A1 `live` closure. IR-4: never creates.
      return live(like(pages.title, `%${q}%`))
    },
  }
}
