// ============================================================================
// Migration 012 — Notes & Pages  (DB-4 · group #1 · ADR-002 §5.2)
// Hand-written SQL DDL (ADR-016 §3.2 — no drizzle-kit). The first DB-4 Stream (ii)
// domain migration. Mirrors schema/notes.ts (query mirror).
//
// ⚠ up() runs INSIDE runMigrations' BEGIN/COMMIT/ROLLBACK wrapper (adapter.ts) —
// it must NOT open its own transaction.
//
// Shape (spec docs/specs/foundation/db-4-notes-and-pages/):
// - Full `baseColumns` SQL mirror (id · created_at · updated_at · 6 _sync_*) +
//   deleted_at on all 3 tables (N-R2). NO cross-table FK, self-ref included (N-R1).
// - Only `pages.type` carries a SQL CHECK (FIXED, from PAGE_TYPE — N-R6);
//   `entity_type` is OPEN (registry-validated, no CHECK — BR-N2).
// - idx_pages_journal_unique is a PARTIAL UNIQUE (NP-2) — keep the full WHERE.
// - encrypted_blob / thumbnail_blob are BLOB (bytes), not TEXT.
// ============================================================================

import type { Migration } from '../adapter'

export const migration012Notes: Migration = {
  version: 12,
  name: 'notes',
  up: async (driver) => {
    // --- pages: the polymorphic page (6 types) -------------------------------
    await driver.run(`
      CREATE TABLE pages (
        id              TEXT PRIMARY KEY,
        type            TEXT NOT NULL DEFAULT 'note'
                        CHECK (type IN ('journal', 'note', 'task_note', 'task_group_note', 'milestone_note', 'deliverable_note')),
        title           TEXT,                    -- [E]
        content         TEXT,                    -- [E] TipTap JSON document
        parent_id       TEXT,
        entity_type     TEXT,                    -- OPEN (registry-validated, no CHECK)
        entity_id       TEXT,
        journal_date    TEXT,                    -- YYYY-MM-DD (type='journal')
        is_favorite     INTEGER NOT NULL DEFAULT 0,
        is_archived     INTEGER NOT NULL DEFAULT 0,
        icon            TEXT,
        cover_image     TEXT,                    -- [E]
        summary_config  TEXT,                    -- [E] JournalSummaryConfig JSON
        has_pomodoro    INTEGER NOT NULL DEFAULT 0,
        word_count      INTEGER NOT NULL DEFAULT 0,
        deleted_at      INTEGER,
        created_at      INTEGER NOT NULL,
        updated_at      INTEGER NOT NULL,
        _sync_id        TEXT NOT NULL UNIQUE,
        _sync_version   INTEGER NOT NULL DEFAULT 1,
        _sync_device_id TEXT NOT NULL,
        _sync_lww_ts    INTEGER NOT NULL,
        _sync_status    TEXT NOT NULL DEFAULT 'pending',
        _sync_hash      TEXT
      )
    `)
    await driver.run(`CREATE INDEX idx_pages_type ON pages(type)`)
    await driver.run(`CREATE INDEX idx_pages_journal_date ON pages(journal_date)`)
    await driver.run(`CREATE INDEX idx_pages_entity ON pages(entity_type, entity_id)`)
    await driver.run(`CREATE INDEX idx_pages_deleted ON pages(deleted_at)`)
    await driver.run(
      `CREATE UNIQUE INDEX idx_pages_journal_unique ON pages(journal_date) WHERE type = 'journal' AND deleted_at IS NULL`,
    )

    // --- page_links: wiki-style bidirectional page↔page ----------------------
    await driver.run(`
      CREATE TABLE page_links (
        id              TEXT PRIMARY KEY,
        source_page_id  TEXT NOT NULL,
        target_page_id  TEXT NOT NULL,
        context         TEXT,                    -- [E]
        deleted_at      INTEGER,
        created_at      INTEGER NOT NULL,
        updated_at      INTEGER NOT NULL,
        _sync_id        TEXT NOT NULL UNIQUE,
        _sync_version   INTEGER NOT NULL DEFAULT 1,
        _sync_device_id TEXT NOT NULL,
        _sync_lww_ts    INTEGER NOT NULL,
        _sync_status    TEXT NOT NULL DEFAULT 'pending',
        _sync_hash      TEXT,
        UNIQUE(source_page_id, target_page_id)
      )
    `)
    await driver.run(`CREATE INDEX idx_page_links_target ON page_links(target_page_id)`)

    // --- note_attachments: encrypted file blobs + thumbnail ------------------
    await driver.run(`
      CREATE TABLE note_attachments (
        id              TEXT PRIMARY KEY,
        page_id         TEXT NOT NULL,
        filename        TEXT NOT NULL,           -- [E]
        mime_type       TEXT NOT NULL,
        encrypted_blob  BLOB NOT NULL,           -- [E] file content
        thumbnail_blob  BLOB,                    -- [E] thumbnail for gallery
        size_bytes      INTEGER NOT NULL,
        deleted_at      INTEGER,
        created_at      INTEGER NOT NULL,
        updated_at      INTEGER NOT NULL,
        _sync_id        TEXT NOT NULL UNIQUE,
        _sync_version   INTEGER NOT NULL DEFAULT 1,
        _sync_device_id TEXT NOT NULL,
        _sync_lww_ts    INTEGER NOT NULL,
        _sync_status    TEXT NOT NULL DEFAULT 'pending',
        _sync_hash      TEXT
      )
    `)
    await driver.run(`CREATE INDEX idx_attachments_page ON note_attachments(page_id)`)
  },
}
