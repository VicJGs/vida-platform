// ============================================================================
// Migration 023 — Books  (DB-4 · group #11 · ADR-002 §Books reshaped roster)
// Hand-written SQL DDL (ADR-016 §3.5 — no drizzle-kit). The twelfth DB-4 Stream (ii)
// domain migration. Mirrors schema/books.ts. The 2nd-largest reframe (after Education).
//
// ⚠ up() runs INSIDE runMigrations' BEGIN/COMMIT/ROLLBACK wrapper (adapter.ts) —
// it must NOT open its own transaction.
//
// Spec: docs/specs/foundation/db-4-books/_index.md §P3.
// 10 tables: books · book_chapters · book_assets · book_bookmarks · book_highlights
//            · book_quotes · reading_sessions (Sessions `reading` sub-type) · reading_plans
//            · reading_plan_books · book_subjects
//
// Conventions: full baseColumns (id·created_at·updated_at·6 _sync_*). NO FK — book_id/asset_id/
// plan_id/subject_id/session_id are plain TEXT (§Books REFERENCES/CASCADE superseded, ADR-016 §3.4).
// FIXED enums → SQL CHECK from the @vida/types tuple (4 CHECK cols / 4 tuples). books.rating =
// numeric CHECK BETWEEN 1 AND 5 (not a tuple). The ONE doc-fixed UNIQUE = book_chapters(book_id,
// chapter_number) (§Books L2501). Unified progress DERIVED (books.progress nullable, no NOT NULL
// DEFAULT 0 — the §Books anti-signal, resolved out, BR-BK-2). Inline books.genre/tags RETIRED →
// entity_tags; books.format→book_assets; current_page→per-asset native_position.
//
// deleted_at EXCEPTIONS (F1): book_chapters (FACT floor omits + "no soft delete" + child) and
// reading_sessions (session extension — base `sessions` owns lifecycle) carry NO deleted_at.
// reading_sessions = 1:1 session extension (own id PK + session_id UNIQUE). NO measurement axes
// on reading_plans (Purpose-owned, C-M1).
// ============================================================================

import type { Migration } from '../adapter'

export const migration023Books: Migration = {
  version: 23,
  name: 'books',
  up: async (driver) => {
    // --- books: the work (reshaped) ---
    await driver.run(`
      CREATE TABLE books (
        id          TEXT PRIMARY KEY,
        title       TEXT NOT NULL,   -- [E]
        author      TEXT,            -- [E]
        isbn        TEXT,            -- [E]
        status      TEXT NOT NULL DEFAULT 'want_to_read'
                    CHECK (status IN ('want_to_read', 'reading', 'completed', 'dropped')),
        total_pages INTEGER,         -- work-level, for TOC-only planning (BK-17)
        progress    INTEGER,         -- DERIVED override, nullable (BR-BK-2)
        start_date  TEXT,            -- YYYY-MM-DD
        end_date    TEXT,
        rating      INTEGER CHECK (rating BETWEEN 1 AND 5),
        review      TEXT,            -- [E]
        cover_url   TEXT,            -- [E]
        created_at  INTEGER NOT NULL,
        updated_at  INTEGER NOT NULL,
        deleted_at  INTEGER,
        _sync_id        TEXT NOT NULL UNIQUE,
        _sync_version   INTEGER NOT NULL DEFAULT 1,
        _sync_device_id TEXT NOT NULL,
        _sync_lww_ts    INTEGER NOT NULL,
        _sync_status    TEXT NOT NULL DEFAULT 'pending',
        _sync_hash      TEXT
      )
    `)

    // --- book_chapters: flat TOC (FACT, kept) — NO deleted_at (F1) ---
    await driver.run(`
      CREATE TABLE book_chapters (
        id                        TEXT PRIMARY KEY,
        book_id                   TEXT NOT NULL,   -- no FK
        title                     TEXT NOT NULL,   -- [E]
        chapter_number            INTEGER NOT NULL,
        start_page                INTEGER,
        end_page                  INTEGER,
        estimated_reading_minutes INTEGER,
        actual_reading_minutes    INTEGER,
        is_completed              INTEGER NOT NULL DEFAULT 0,
        completed_at              INTEGER,
        sort_order                INTEGER NOT NULL DEFAULT 0,
        created_at                INTEGER NOT NULL,
        updated_at                INTEGER NOT NULL,
        -- NO deleted_at — FACT floor omits + "no soft delete" (structure-data:10) + child (F1)
        _sync_id        TEXT NOT NULL UNIQUE,
        _sync_version   INTEGER NOT NULL DEFAULT 1,
        _sync_device_id TEXT NOT NULL,
        _sync_lww_ts    INTEGER NOT NULL,
        _sync_status    TEXT NOT NULL DEFAULT 'pending',
        _sync_hash      TEXT,
        UNIQUE(book_id, chapter_number)
      )
    `)
    await driver.run(`CREATE INDEX idx_book_chapters_book ON book_chapters(book_id)`)

    // --- book_assets: per-format copy (BK-2) ---
    await driver.run(`
      CREATE TABLE book_assets (
        id              TEXT PRIMARY KEY,
        book_id         TEXT NOT NULL,   -- no FK
        format          TEXT NOT NULL
                        CHECK (format IN ('physical', 'pdf', 'epub', 'audiobook', 'braille', 'other')),
        file_ref        TEXT,            -- [E] encrypted R2 ref (physical has none)
        native_position TEXT,            -- page/location/timestamp, format-interpreted (plaintext)
        created_at      INTEGER NOT NULL,
        updated_at      INTEGER NOT NULL,
        deleted_at      INTEGER,
        _sync_id        TEXT NOT NULL UNIQUE,
        _sync_version   INTEGER NOT NULL DEFAULT 1,
        _sync_device_id TEXT NOT NULL,
        _sync_lww_ts    INTEGER NOT NULL,
        _sync_status    TEXT NOT NULL DEFAULT 'pending',
        _sync_hash      TEXT
      )
    `)
    await driver.run(`CREATE INDEX idx_book_assets_book ON book_assets(book_id)`)

    // --- book_bookmarks: position marker, work-anchored (BK-5/6) ---
    await driver.run(`
      CREATE TABLE book_bookmarks (
        id         TEXT PRIMARY KEY,
        book_id    TEXT NOT NULL,   -- no FK (work-anchored)
        position   TEXT,
        label      TEXT,            -- [E]
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL,
        deleted_at INTEGER,
        _sync_id        TEXT NOT NULL UNIQUE,
        _sync_version   INTEGER NOT NULL DEFAULT 1,
        _sync_device_id TEXT NOT NULL,
        _sync_lww_ts    INTEGER NOT NULL,
        _sync_status    TEXT NOT NULL DEFAULT 'pending',
        _sync_hash      TEXT
      )
    `)
    await driver.run(`CREATE INDEX idx_book_bookmarks_book ON book_bookmarks(book_id)`)

    // --- book_highlights: light span marker (BK-6, no notes/links) ---
    await driver.run(`
      CREATE TABLE book_highlights (
        id            TEXT PRIMARY KEY,
        book_id       TEXT NOT NULL,   -- no FK
        asset_id      TEXT,            -- [INTERP] digital-content source
        captured_text TEXT,            -- [E]
        position      TEXT,
        created_at    INTEGER NOT NULL,
        updated_at    INTEGER NOT NULL,
        deleted_at    INTEGER,
        _sync_id        TEXT NOT NULL UNIQUE,
        _sync_version   INTEGER NOT NULL DEFAULT 1,
        _sync_device_id TEXT NOT NULL,
        _sync_lww_ts    INTEGER NOT NULL,
        _sync_status    TEXT NOT NULL DEFAULT 'pending',
        _sync_hash      TEXT
      )
    `)
    await driver.run(`CREATE INDEX idx_book_highlights_book ON book_highlights(book_id)`)

    // --- book_quotes: first-class quote (BK-7) ---
    await driver.run(`
      CREATE TABLE book_quotes (
        id         TEXT PRIMARY KEY,
        book_id    TEXT NOT NULL,   -- no FK
        text       TEXT NOT NULL,   -- [E]
        position   TEXT,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL,
        deleted_at INTEGER,
        _sync_id        TEXT NOT NULL UNIQUE,
        _sync_version   INTEGER NOT NULL DEFAULT 1,
        _sync_device_id TEXT NOT NULL,
        _sync_lww_ts    INTEGER NOT NULL,
        _sync_status    TEXT NOT NULL DEFAULT 'pending',
        _sync_hash      TEXT
      )
    `)
    await driver.run(`CREATE INDEX idx_book_quotes_book ON book_quotes(book_id)`)

    // --- reading_sessions: `reading` Session sub-type (1:1 extension) — NO deleted_at (F1) ---
    await driver.run(`
      CREATE TABLE reading_sessions (
        id             TEXT PRIMARY KEY,
        session_id     TEXT NOT NULL UNIQUE,   -- 1:1 key → sessions.id (no FK)
        book_id        TEXT NOT NULL,          -- no FK
        asset_id       TEXT,                   -- no FK
        pages_read     INTEGER,
        position_delta TEXT,
        stop_point     TEXT,
        statistics     TEXT,                   -- JSON
        created_at     INTEGER NOT NULL,
        updated_at     INTEGER NOT NULL,
        -- NO deleted_at — session extension; base sessions owns lifecycle (F1)
        _sync_id        TEXT NOT NULL UNIQUE,
        _sync_version   INTEGER NOT NULL DEFAULT 1,
        _sync_device_id TEXT NOT NULL,
        _sync_lww_ts    INTEGER NOT NULL,
        _sync_status    TEXT NOT NULL DEFAULT 'pending',
        _sync_hash      TEXT
      )
    `)
    await driver.run(`CREATE INDEX idx_reading_sessions_book ON reading_sessions(book_id)`)

    // --- reading_plans: Quota Planner (BK-11) — NO measurement axes (C-M1) ---
    await driver.run(`
      CREATE TABLE reading_plans (
        id                     TEXT PRIMARY KEY,
        arrangement            TEXT NOT NULL
                               CHECK (arrangement IN ('sequenced', 'parallel')),
        goal_type              TEXT NOT NULL
                               CHECK (goal_type IN ('manual', 'auto')),
        target_date            TEXT,
        target_completion_date TEXT,
        quota_distribution     TEXT,   -- JSON
        recalculation_state    TEXT,   -- JSON
        created_at             INTEGER NOT NULL,
        updated_at             INTEGER NOT NULL,
        deleted_at             INTEGER,
        _sync_id        TEXT NOT NULL UNIQUE,
        _sync_version   INTEGER NOT NULL DEFAULT 1,
        _sync_device_id TEXT NOT NULL,
        _sync_lww_ts    INTEGER NOT NULL,
        _sync_status    TEXT NOT NULL DEFAULT 'pending',
        _sync_hash      TEXT
      )
    `)

    // --- reading_plan_books: plan↔books arrangement junction ---
    await driver.run(`
      CREATE TABLE reading_plan_books (
        id         TEXT PRIMARY KEY,
        plan_id    TEXT NOT NULL,   -- no FK
        book_id    TEXT NOT NULL,   -- no FK
        sequence   INTEGER,
        quota      INTEGER,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL,
        deleted_at INTEGER,
        _sync_id        TEXT NOT NULL UNIQUE,
        _sync_version   INTEGER NOT NULL DEFAULT 1,
        _sync_device_id TEXT NOT NULL,
        _sync_lww_ts    INTEGER NOT NULL,
        _sync_status    TEXT NOT NULL DEFAULT 'pending',
        _sync_hash      TEXT
      )
    `)
    await driver.run(`CREATE INDEX idx_reading_plan_books_plan ON reading_plan_books(plan_id)`)

    // --- book_subjects: Education partition junction (BK-13) ---
    await driver.run(`
      CREATE TABLE book_subjects (
        id         TEXT PRIMARY KEY,
        book_id    TEXT NOT NULL,   -- no FK
        subject_id TEXT NOT NULL,   -- no FK (Education)
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL,
        deleted_at INTEGER,
        _sync_id        TEXT NOT NULL UNIQUE,
        _sync_version   INTEGER NOT NULL DEFAULT 1,
        _sync_device_id TEXT NOT NULL,
        _sync_lww_ts    INTEGER NOT NULL,
        _sync_status    TEXT NOT NULL DEFAULT 'pending',
        _sync_hash      TEXT
      )
    `)
    await driver.run(`CREATE INDEX idx_book_subjects_book ON book_subjects(book_id)`)
  },
}
