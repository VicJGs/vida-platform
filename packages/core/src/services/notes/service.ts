// ============================================================================
// services/notes — the service (mod-notes-and-pages ① · Slice 1: Pages core)
//
// The connective HUB's page-CRUD surface over the finished DB-4 `pages` table.
// Factory-object, hoisted closures, no `this.` (destructure-consumption shape,
// NOT-43). Persistence: DB-6 Repository, encryptedFields:[] M1.0 pass-through
// (BR-S1-11). Every custom-predicate read appends isNull(deleted_at) — findWhere
// runs the clause verbatim (BR-S1-7). NP-2 enforced in-service (BR-S1-1).
// ============================================================================

import { and, eq, isNull, like, type SQL } from 'drizzle-orm'
import type { EditorDocument, EditorNode, PageType } from '@vida/types'
import { createRepository } from '../../db/repository'
import {
  pages,
  pageLinks,
  noteAttachments,
  type PageRow,
  type PageLinkRow,
  type NoteAttachmentRow,
} from '../../db/schema/notes'
import { entityTags, type EntityLinkRow, type EntityTagRow } from '../../db/schema/foundation/spaces'
import { createPageSchema, updatePageSchema, newAttachmentSchema } from '../../validators/note'
import { isEditorDocument } from '../../validators/editor'
import {
  InvalidPageContentError,
  JournalExistsError,
  PageNotFoundError,
  UnregisteredEntityTypeError,
  type CreatePageInput,
  type EntityNoteSeed,
  type NewAttachment,
  type NotesService,
  type NotesServiceDeps,
  type UpdatePageInput,
} from './types'

/**
 * Deterministic client-side seed for an entity note's `content` (NP-8/ZK-1). PURE function of `seed`:
 * a minimal TipTap `EditorDocument` (heading = title; a paragraph of the remaining fields), leading
 * fields in a FIXED order then the rest via `Object.keys().sort()` — NOT insertion order, which isn't
 * guaranteed across callers. No `Date.now()`/random → same seed ⇒ byte-identical string (BR-S2-2).
 * Editor-valid by construction (BR-R0-4b): an empty title emits no heading (ProseMirror rejects empty text nodes) and
 * an otherwise-empty seed emits one empty paragraph (the `doc` node is `block+`) — else the editor would refuse to open it.
 */
function seedContent(seed: EntityNoteSeed): string {
  const content: EditorNode[] = []
  if (seed.title != null && seed.title !== '') {
    content.push({ type: 'heading', attrs: { level: 1 }, content: [{ type: 'text', text: seed.title }] })
  }
  const LEADING = ['type', 'status']
  const rest = Object.keys(seed)
    .filter((k) => k !== 'title' && !LEADING.includes(k))
    .sort()
  const lines = [...LEADING, ...rest]
    .filter((k) => seed[k] != null)
    .map((k) => `${k}: ${String(seed[k])}`)
  if (lines.length > 0) {
    content.push({ type: 'paragraph', content: [{ type: 'text', text: lines.join(' · ') }] })
  }
  if (content.length === 0) content.push({ type: 'paragraph' })
  const doc: EditorDocument = { type: 'doc', content }
  return JSON.stringify(doc)
}

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
  const { db, deviceId, registry, spaces, backlinks } = deps
  // pages HAS deleted_at → softDelete:true; encryptedFields:[] M1.0 pass-through (BR-S1-11).
  const pageRepo = createRepository(db, pages, { deviceId, encryptedFields: [], softDelete: true })
  // note_attachments HAS deleted_at → softDelete:true; [E] blobs pass-through in M1.0 (BR-S2-5).
  const attachRepo = createRepository(db, noteAttachments, {
    deviceId,
    encryptedFields: [],
    softDelete: true,
  })
  // page_links HAS deleted_at → softDelete:true; empty [E] (BR-S3-1).
  const linkRepo = createRepository(db, pageLinks, { deviceId, encryptedFields: [], softDelete: true })
  // Read-only entity_tags repo — AR-6 owns the writes; notes only reads (D-S4-1, mirror AR-8 resolver).
  const entityTagRepo = createRepository(db, entityTags, {
    deviceId,
    encryptedFields: [],
    softDelete: true,
  })

  /** NP-6/SP2 — reject an entity_type absent from the injected registry (BR-S1-3; reused by S4). */
  function assertRegistered(entityType: string | null | undefined): void {
    if (entityType != null && !registry.isRegistered(entityType)) {
      throw new UnregisteredEntityTypeError(entityType)
    }
  }

  /**
   * BR-R0-5 — every write/create against a page requires it LIVE: `findById` already filters `deleted_at`, so a deleted
   * page is "not found" (IR-R3). Notes-scoped on purpose: DB-6 serves every module, and R5's restore must still update
   * a deleted row. Check-then-write is not one transaction — accepted for single-user-local (the ensureJournal convention).
   */
  async function requireLivePage(id: string): Promise<PageRow> {
    const page = await pageRepo.findById(id)
    if (!page) throw new PageNotFoundError(id)
    return page
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
      await requireLivePage(id)
      return pageRepo.update(id, parsed)
    },

    // IR-7: the editor body is written through its OWN path, never the updatePage LWW metadata patch, so the
    // eventual M4 CRDT merge is not clobbered. M1 = a local write (serialized TipTap doc → the text column);
    // M4 swaps the internals to the CRDT entry point — this signature is stable. (interpretation.md:159)
    // BR-R0-6: the shape is checked first so a bad body never costs a read; BR-R0-5: then the page must be live.
    writePageContent: async (id: string, content: EditorDocument): Promise<PageRow> => {
      if (!isEditorDocument(content)) throw new InvalidPageContentError(id)
      await requireLivePage(id)
      return pageRepo.update(id, { content: JSON.stringify(content) })
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

    // ── S2: entity notes + attachments ──────────────────────────────
    ensureEntityNote: async (
      pageType: PageType,
      entityType: string,
      entityId: string,
      seed: EntityNoteSeed,
    ): Promise<PageRow> => {
      // NP-8 idempotent: return the existing non-deleted *_note for this (pageType, entity) if present.
      const existing = (await service.getPagesForEntity(entityType, entityId)).find(
        (p) => p.type === pageType,
      )
      if (existing) return existing
      // Absent → create via S1 createPage (inherits registry validation, BR-S1-3) with a deterministic seed.
      return service.createPage({
        type: pageType,
        entity_type: entityType,
        entity_id: entityId,
        content: seedContent(seed),
      })
    },

    // NP-8 idempotent get-or-create for a day's journal page (mirrors ensureEntityNote). The home/journal
    // surface's materialization seam: return the day's existing journal, else create it. Title = the YYYY-MM-DD
    // date — non-empty (accname-safe for a borderless editor's aria-label) + deterministic + locale-free (keeps
    // @vida/core Intl-free; the UI formats a prettier label for display). createPage's in-service NP-2 pre-check
    // is the single-writer backstop (no explicit race-catch — single-user-local, same as ensureEntityNote).
    ensureJournal: async (date: string): Promise<PageRow> => {
      const existing = await getPageByJournalDate(date)
      if (existing) return existing
      return service.createPage({ type: 'journal', journal_date: date, title: date })
    },

    addAttachment: async (pageId: string, file: NewAttachment): Promise<NoteAttachmentRow> => {
      const f = newAttachmentSchema.parse(file)
      await requireLivePage(pageId) // BR-R0-5 — no attachment orphaned on a deleted page (no FKs)
      return attachRepo.create({
        page_id: pageId,
        filename: f.filename,
        mime_type: f.mimeType,
        // Drizzle types blob({mode:'buffer'}) as Node's Buffer, but @vida/core is cross-platform and
        // libsodium (M3) yields Uint8Array; both SQLite drivers (better-sqlite3/wa-sqlite) accept a
        // Uint8Array bind param at runtime. First blob consumer — bridge the schema type to the
        // platform-neutral value. Blob-type reconcile → DB-11/M3.
        encrypted_blob: f.encryptedBlob as unknown as Buffer,
        thumbnail_blob: (f.thumbnailBlob ?? null) as unknown as Buffer | null,
        size_bytes: f.sizeBytes,
      })
    },

    getAttachments: async (pageId: string): Promise<NoteAttachmentRow[]> =>
      attachRepo.findWhere(allOf(eq(noteAttachments.page_id, pageId), isNull(noteAttachments.deleted_at))),

    removeAttachment: async (id: string): Promise<void> => {
      await attachRepo.delete(id)
    },

    // ── S3: page-links + wiki resolution ────────────────────────────
    createPageLink: async (
      sourcePageId: string,
      targetPageId: string,
      context?: string,
    ): Promise<PageLinkRow> => {
      await requireLivePage(sourcePageId) // BR-R0-5 — both ends live (a revive included)
      await requireLivePage(targetPageId)
      // Business-key query INCLUDING soft-deleted (the revive path needs it) — UNIQUE(source,target)
      // is FULL, so ≤1 row per key exists (BR-S3-1, mirror spaces/service.ts:158-180).
      const existing = await linkRepo.findWhere(
        allOf(eq(pageLinks.source_page_id, sourcePageId), eq(pageLinks.target_page_id, targetPageId)),
      )
      const row = existing[0]
      if (row) {
        if (row.deleted_at != null) {
          return linkRepo.update(row.id, { deleted_at: null, context: context ?? null }) // revive
        }
        return row // idempotent no-op
      }
      return linkRepo.create({
        source_page_id: sourcePageId,
        target_page_id: targetPageId,
        context: context ?? null,
      })
    },

    removePageLink: async (sourcePageId: string, targetPageId: string): Promise<void> => {
      const existing = await linkRepo.findWhere(
        allOf(eq(pageLinks.source_page_id, sourcePageId), eq(pageLinks.target_page_id, targetPageId)),
      )
      const live = existing.find((r) => r.deleted_at == null)
      if (live) await linkRepo.delete(live.id) // resolve-then-soft-delete (BR-S3-2)
    },

    getPageLinksFrom: async (pageId: string): Promise<PageLinkRow[]> =>
      linkRepo.findWhere(allOf(eq(pageLinks.source_page_id, pageId), isNull(pageLinks.deleted_at))),

    getPageLinksTo: async (pageId: string): Promise<PageLinkRow[]> =>
      linkRepo.findWhere(allOf(eq(pageLinks.target_page_id, pageId), isNull(pageLinks.deleted_at))),

    // NP-7 — resolve by title CANDIDATES; the caller binds a concrete target_page_id (BR-S3-4/D-S3-1).
    resolveWikiLink: async (text: string): Promise<PageRow[]> =>
      pageRepo.findWhere(allOf(like(pages.title, `%${text}%`), isNull(pages.deleted_at))),

    // ── S4: delegation facade + registry ────────────────────────────
    // WRITE delegated to AR-6, but validate with the NOTES error first (BR-S4-1): a pure passthrough
    // would surface spaces' UnknownEntityType, breaking the notes error contract (NOT-20/21).
    createEntityLink: async (
      pageId: string,
      entityType: string,
      entityId: string,
      context?: string,
    ): Promise<EntityLinkRow> => {
      assertRegistered(entityType) // BR-S4-1: the notes registry error first …
      await requireLivePage(pageId) // … then BR-R0-5
      return spaces.createLink(pageId, entityType, entityId, context ?? null)
    },

    removeEntityLink: async (pageId: string, entityType: string, entityId: string): Promise<void> => {
      await spaces.removeLink(pageId, entityType, entityId)
    },

    getEntityLinksFrom: async (pageId: string): Promise<EntityLinkRow[]> =>
      backlinks.getLinksFrom(pageId),

    // Both lists UNMERGED; the grouped presentation is G6-tentative → ② (BR-S4-4). pageLinks via
    // getPageLinksTo(entityId) unconditionally — a non-page id yields [] anyway (D-S4-2).
    getBacklinks: async (
      entityType: string,
      entityId: string,
    ): Promise<{ pageLinks: PageLinkRow[]; entityLinks: EntityLinkRow[] }> => ({
      entityLinks: await backlinks.getBacklinksTo(entityType, entityId),
      pageLinks: await service.getPageLinksTo(entityId),
    }),

    // entity_tags READS only — AR-6 owns writes (NOT-26/27/28, BR-S4-5).
    getTagsForEntity: async (entityType: string, entityId: string): Promise<EntityTagRow[]> =>
      entityTagRepo.findWhere(
        allOf(
          eq(entityTags.entity_type, entityType),
          eq(entityTags.entity_id, entityId),
          isNull(entityTags.deleted_at),
        ),
      ),

    getEntitiesByTag: async (tagId: string): Promise<EntityTagRow[]> =>
      entityTagRepo.findWhere(allOf(eq(entityTags.tag_id, tagId), isNull(entityTags.deleted_at))),
  }

  return service
}
