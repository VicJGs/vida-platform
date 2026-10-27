import { z } from 'zod'
import { PAGE_TYPE } from '@vida/types'
import { isEditorDocumentJson } from './editor'

// ============================================================================
// Notes & Pages validators (DB-9) — REBUILT in P2 (backend-replan).
// REDUCED vs pre-teardown: EntityLinkTargetSchema is dropped (NOT-20 retired the
// closed 33-value CHECK to the runtime registry — entity_type is validated
// against the injected TaggableTypeRegistry, not a z.enum); the pomodoro schemas
// are re-homed with their enums to the Sessions realm (ADR-004).
// `packages/core/src/services/notes/` stays P3 (do NOT resurrect it here).
// ============================================================================

export const PageTypeSchema = z.enum(PAGE_TYPE)

// ---------------------------------------------------------------------------
// MOD-notes page create/update validators (defense-in-depth, UI already validated)
// summary_config is a stringified JSON blob at the storage boundary (schema is text(),
// app stringifies — ADR-002 §2.5); this validates the SERVICE input, not the row shape.
// ---------------------------------------------------------------------------

const CALENDAR_DATE = /^\d{4}-\d{2}-\d{2}$/

/** createPage input — reuses PageTypeSchema (never re-declares z.enum(PAGE_TYPE)). */
/**
 * Page icon = a Lucide icon NAME in kebab-case (notes-rescope R3, A-4 · EC-29/EC-22: a Lucide grid, never emoji). Core
 * validates the shape; the UI owns which names it offers (and renders the type icon for an unknown one).
 */
export const pageIconSchema = z
  .string()
  .max(64)
  .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, 'icon must be a Lucide icon name (kebab-case)')

/**
 * Page cover = an http(s) image URL (≤ 2048 chars, no whitespace) or `attachment:<id>` (one of the page's attachments) —
 * notes-rescope R3, A-4 · EC-29 "paste an image link · use an attachment". `cover_image` stays [E].
 */
export const pageCoverSchema = z.union([
  z.string().max(2048).regex(/^https?:\/\/\S+$/i, 'cover must be an http(s) URL'),
  z.string().regex(/^attachment:[0-9A-Za-z-]+$/, 'cover must be attachment:<id>'),
])

export const createPageSchema = z
  .object({
    type: PageTypeSchema,
    title: z.string().nullish(),
    // BR-R0-6 (notes-rescope R0): a body, when given, must be a serialized EditorDocument — the create path gets the
    // same shape guard as writePageContent, so no writer can store a body the editor would blank and overwrite.
    content: z
      .string()
      .nullish()
      .refine((c) => c == null || isEditorDocumentJson(c), {
        message: 'content must be a serialized EditorDocument',
      }),
    parent_id: z.string().nullish(),
    entity_type: z.string().nullish(),
    entity_id: z.string().nullish(),
    journal_date: z.string().regex(CALENDAR_DATE, 'journal_date must be YYYY-MM-DD').nullish(),
    is_favorite: z.boolean().optional(),
    is_archived: z.boolean().optional(),
    icon: pageIconSchema.nullish(),
    cover_image: pageCoverSchema.nullish(),
    summary_config: z.string().nullish(),
    has_pomodoro: z.boolean().optional(),
    word_count: z.number().int().nonnegative().optional(),
  })
  // NP-2/validation: journal_date required iff type='journal', else absent.
  .refine((p) => (p.type === 'journal' ? p.journal_date != null : p.journal_date == null), {
    message: 'journal_date is required iff type is journal (NP-2)',
    path: ['journal_date'],
  })

/** updatePage input — partial; journal-type/date are not remapped via update (NP-2 owned by create).
 *  `content` is EXCLUDED (IR-7): the editor body is written via `writePageContent`, never an LWW metadata
 *  patch — so the eventual M4 CRDT merge is never clobbered. */
export const updatePageSchema = z
  .object({
    title: z.string().nullish(),
    parent_id: z.string().nullish(),
    is_favorite: z.boolean().optional(),
    is_archived: z.boolean().optional(),
    icon: pageIconSchema.nullish(),
    cover_image: pageCoverSchema.nullish(),
    summary_config: z.string().nullish(),
    has_pomodoro: z.boolean().optional(),
    word_count: z.number().int().nonnegative().optional(),
  })
  .strict()

// ---------------------------------------------------------------------------
// addAttachment input (S2) — defense-in-depth for note_attachments (NOT-29).
// CamelCase to match the public NewAttachment type; the service maps to snake_case
// columns. Buffer is a Uint8Array subclass, so z.instanceof(Uint8Array) accepts it.
// ---------------------------------------------------------------------------
export const newAttachmentSchema = z.object({
  filename: z.string().min(1),
  mimeType: z.string().min(1),
  encryptedBlob: z.instanceof(Uint8Array),
  thumbnailBlob: z.instanceof(Uint8Array).optional(),
  sizeBytes: z.number().int().nonnegative(),
})
