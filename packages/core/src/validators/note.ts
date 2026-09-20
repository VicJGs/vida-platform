import { z } from 'zod'
import { PAGE_TYPE } from '@vida/types'

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
export const createPageSchema = z
  .object({
    type: PageTypeSchema,
    title: z.string().nullish(),
    content: z.string().nullish(),
    parent_id: z.string().nullish(),
    entity_type: z.string().nullish(),
    entity_id: z.string().nullish(),
    journal_date: z.string().regex(CALENDAR_DATE, 'journal_date must be YYYY-MM-DD').nullish(),
    is_favorite: z.boolean().optional(),
    is_archived: z.boolean().optional(),
    icon: z.string().nullish(),
    cover_image: z.string().nullish(),
    summary_config: z.string().nullish(),
    has_pomodoro: z.boolean().optional(),
    word_count: z.number().int().nonnegative().optional(),
  })
  // NP-2/validation: journal_date required iff type='journal', else absent.
  .refine((p) => (p.type === 'journal' ? p.journal_date != null : p.journal_date == null), {
    message: 'journal_date is required iff type is journal (NP-2)',
    path: ['journal_date'],
  })

/** updatePage input — partial; journal-type/date are not remapped via update (NP-2 owned by create). */
export const updatePageSchema = z
  .object({
    title: z.string().nullish(),
    content: z.string().nullish(),
    parent_id: z.string().nullish(),
    is_favorite: z.boolean().optional(),
    is_archived: z.boolean().optional(),
    icon: z.string().nullish(),
    cover_image: z.string().nullish(),
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
