import { z } from 'zod'
import {
  PAGE_TYPE,
  ENTITY_LINK_TARGET,
  POMODORO_TYPE,
  POMODORO_STATUS,
  POMODORO_ENTITY_TYPE,
} from '@vida/types'

export const PageTypeSchema = z.enum(PAGE_TYPE)
export const EntityLinkTargetSchema = z.enum(ENTITY_LINK_TARGET)
export const PomodoroTypeSchema = z.enum(POMODORO_TYPE)
export const PomodoroStatusSchema = z.enum(POMODORO_STATUS)
export const PomodoroEntityTypeSchema = z.enum(POMODORO_ENTITY_TYPE)

// ---------------------------------------------------------------------------
// MOD-notes ① — page create/update validators (defense-in-depth, UI already validated)
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

/**
 * NP-8 entity-note seed input (defense-in-depth). The parent entity's local fields the
 * deterministic summary is built from; all optional — different parents populate different
 * subsets. `type` here is the PARENT entity's kind (e.g. 'task'), NOT PageType.
 */
export const entityNoteSeedSchema = z.object({
  title: z.string().nullish(),
  type: z.string().nullish(),
  status: z.string().nullish(),
  dates: z.string().nullish(),
})
