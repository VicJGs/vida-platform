// ============================================================================
// DB-4 group #20 — Journals  (schema/journals.ts · mirrors migration 030)
// The platform INTEGRATION LAYER — but almost all of it is runtime code / owned
// elsewhere. This authors the ONE net-new table: journal_snapshots (the frozen
// point-in-time record the temporal Review engine reads, JR-6/JR-7).
//
// Owned elsewhere (referenced, NOT here): the journal PAGE (pages type='journal',
// journal_date, summary_config[E]) = Notes & Pages (schema/notes.ts:36-65); the
// dueIn() agenda = Sessions; the section registry = runtime code; reviews +
// per-period rollups = design-pass (no table decided — structure-data.md:24-25).
//
// Shape (structure-data.md "Owned by THIS context"): id · snapshot_date ·
// sections_data[E] · captured_at · sync. Hand-composed reduced column set —
// captured_at IS the timestamp, so NO created_at/updated_at; a frozen ledger
// record → NO deleted_at (the check_in_template_questions reduced-column precedent).
//
// Spec: docs/specs/foundation/db-4-journals/_index.md §3a.
// ============================================================================

import { sqliteTable, text, index } from 'drizzle-orm/sqlite-core'
import { uuidPk, calendarDate, timestampMs, syncColumns } from './_shared'

// --- journal_snapshots: the frozen point-in-time record of a day's summary -----
// One home for point-in-time journal data (JR-7). No baseColumns (captured_at is
// the timestamp; no created_at/updated_at/deleted_at). No FK/CHECK/UNIQUE.
export const journalSnapshots = sqliteTable(
  'journal_snapshots',
  {
    id: uuidPk(),
    snapshot_date: calendarDate('snapshot_date').notNull(), // YYYY-MM-DD (JR-7 date key), plaintext
    /** @encrypted [E] — frozen per-section JSON; plain text (app stringifies), NOT json<T>() */
    sections_data: text('sections_data').notNull(), // the record IS this (JR-7) → NOT NULL
    captured_at: timestampMs('captured_at').notNull(), // Unix ms — when the snapshot was frozen, plaintext
    ...syncColumns,
  },
  (t) => [
    // Supports getJournal(date) lookups (mirrors idx_pages_journal_date, notes.ts:62).
    // NO UNIQUE: one-per-date is NP-2 for pages, not snapshots; backfill re-capture is design-pass.
    index('idx_journal_snapshots_date').on(t.snapshot_date),
  ],
)
