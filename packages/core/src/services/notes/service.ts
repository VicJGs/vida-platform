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
import type { EditorDocument, EditorNode, PageType } from '@vida/types'
import { createRepository } from '../../db/repository'
import { pages, noteAttachments, type PageRow, type NoteAttachmentRow } from '../../db/schema/notes'
import { createPageSchema, updatePageSchema, newAttachmentSchema } from '../../validators/note'
import {
  JournalExistsError,
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
 */
function seedContent(seed: EntityNoteSeed): string {
  const content: EditorNode[] = []
  if (seed.title != null) {
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
  const { db, deviceId, registry } = deps
  // pages HAS deleted_at → softDelete:true; encryptedFields:[] M1.0 pass-through (BR-S1-11).
  const pageRepo = createRepository(db, pages, { deviceId, encryptedFields: [], softDelete: true })
  // note_attachments HAS deleted_at → softDelete:true; [E] blobs pass-through in M1.0 (BR-S2-5).
  const attachRepo = createRepository(db, noteAttachments, {
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

    addAttachment: async (pageId: string, file: NewAttachment): Promise<NoteAttachmentRow> => {
      const f = newAttachmentSchema.parse(file)
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
  }

  return service
}
