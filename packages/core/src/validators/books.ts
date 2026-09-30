// ============================================================================
// validators/books — mod-books ① input validators (S1: Works CRUD)
//
// The service Create/Update input schemas. Enum Zod schemas (BookStatusSchema, BookAssetFormatSchema, …) live in
// validators/learning.ts (DB-4 group #11 authored them alongside the tuples) — reused here, not redeclared.
// S2–S10 append (chapters · assets · annotations · sessions · plans · …) per the slice-map.
//
// BR-BK-2 — `progress` is NEVER an input: it is a nullable derived-override (NULL ⇒ derive-on-read). RETIRED
// columns (`format`/`current_page`/`genre`/`tags`) are absent from the schema. `[FACT: db-4-books/_index.md:45-48]`
// ============================================================================

import { z } from 'zod'
import { BookStatusSchema } from './learning'

// --- Works (BOO-01) ----------------------------------------------------------

/** createBook input. `title` required ([E]); `status` defaults to 'want_to_read' (schema floor); `rating` 1–5;
 *  `total_pages` nullable (TOC-only planning, BK-17). NO `progress` (derived, BR-BK-2). Calendar dates YYYY-MM-DD. */
export const CreateBookSchema = z.object({
  title: z.string().min(1),
  author: z.string().nullable().optional(),
  isbn: z.string().nullable().optional(),
  status: BookStatusSchema.optional(),
  total_pages: z.number().int().positive().nullable().optional(),
  start_date: z.string().nullable().optional(),
  end_date: z.string().nullable().optional(),
  rating: z.number().int().min(1).max(5).nullable().optional(),
  review: z.string().nullable().optional(),
  cover_url: z.string().nullable().optional(),
})

/** updateBook patch — every field optional; `progress` still NEVER settable; retired columns absent. */
export const UpdateBookSchema = z.object({
  title: z.string().min(1).optional(),
  author: z.string().nullable().optional(),
  isbn: z.string().nullable().optional(),
  status: BookStatusSchema.optional(),
  total_pages: z.number().int().positive().nullable().optional(),
  start_date: z.string().nullable().optional(),
  end_date: z.string().nullable().optional(),
  rating: z.number().int().min(1).max(5).nullable().optional(),
  review: z.string().nullable().optional(),
  cover_url: z.string().nullable().optional(),
})
