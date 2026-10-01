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
import { BookStatusSchema, BookAssetFormatSchema } from './learning'

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

// --- Chapters / TOC (BOO-05) -------------------------------------------------

/** A single chapter in a `setChapters(bookId, chapters[])` call — the manual-entry / lookup-TOC seed. STRUCTURAL
 *  fields only: tracking state (`is_completed` / `completed_at` / `actual_reading_minutes`) is NEVER seeded — it is
 *  set via `markChapterComplete` / reading sessions and PRESERVED across a re-set (anti-lost, BK-17). Chapters are a
 *  flat list (BK-9 — nested sections not requested). `[FACT: contract.md:16-18; business-rules.md:42-44,85-87]` */
export const ChapterSeedSchema = z.object({
  title: z.string().min(1),
  chapter_number: z.number().int().nonnegative(),
  start_page: z.number().int().positive().nullable().optional(),
  end_page: z.number().int().positive().nullable().optional(),
  estimated_reading_minutes: z.number().int().positive().nullable().optional(),
  sort_order: z.number().int().nonnegative().optional(),
})

/** `setChapters` input — the whole flat TOC (a declarative set). An in-array duplicate `chapter_number` is rejected
 *  in the service (`ChapterUniqueViolation`), above the DB `UNIQUE(book_id, chapter_number)` backstop. */
export const SetChaptersSchema = z.array(ChapterSeedSchema)

// --- Assets / positions (BOO-09/10) ------------------------------------------

/** addAsset input — a per-format copy (BK-2). `format` ∈ BOOK_ASSET_FORMAT (zod + DB CHECK); `native_position`
 *  optional (physical/braille set it manually later via updatePosition; digital derives it). The `file` blob is
 *  NOT in the schema — it is a runtime binary handed to the `attachment?` port, not a validated value. */
export const AddAssetSchema = z.object({
  format: BookAssetFormatSchema,
  native_position: z.string().min(1).nullable().optional(),
})

/** updatePosition input — the single native position per asset (SSOT, BK-2). Non-empty string (page / epub
 *  location / audio timestamp / manual), format-interpreted — Books stores it opaque. */
export const UpdatePositionSchema = z.string().min(1)

// --- Annotations (BOO-15/16/17) ----------------------------------------------
// Field casing = snake_case mirroring the columns + the @vida/types interfaces (ChapterSeed/AddAsset precedent);
// the frozen seam-contract's `capturedText` camelCase is a one-off sketch slip. `[FACT: schema/books.ts:103-145]`

/** addBookmark input (BOO-16) — a work-anchored position marker. `position` non-empty (a bookmark marks a point);
 *  `label` optional [E]. */
export const AddBookmarkSchema = z.object({
  position: z.string().min(1),
  label: z.string().nullable().optional(),
})

/** addHighlight span (BOO-15) — a light digital-content span marker (no notes/links, BK-6). Both fields non-empty. */
export const AddHighlightSchema = z.object({
  captured_text: z.string().min(1),
  position: z.string().min(1),
})

/** addQuote input (BOO-17) — a first-class quote stored per book; `text` non-empty [E]; `position` optional. */
export const AddQuoteSchema = z.object({
  text: z.string().min(1),
  position: z.string().nullable().optional(),
})
