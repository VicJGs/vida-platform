// ============================================================================
// Migration 022 — Knowledge (+flashcards)  (DB-4 · group #10 · ADR-002 §5.10 reshaped roster)
// Hand-written SQL DDL (ADR-016 §3.5 — no drizzle-kit). The eleventh DB-4 Stream (ii)
// domain migration. Mirrors schema/knowledge.ts. The largest, most-reframed group.
//
// ⚠ up() runs INSIDE runMigrations' BEGIN/COMMIT/ROLLBACK wrapper (adapter.ts) —
// it must NOT open its own transaction.
//
// Spec: docs/specs/foundation/db-4-knowledge/_index.md §P3.
// 7 tables: knowledge_objects · object_kinds · knowledge_containers · references
//           · compound_sets · knowledge_lab_entries · flashcards
//
// Conventions: full baseColumns (id·created_at·updated_at·6 _sync_*) + deleted_at on all 7.
// NO FK — kind_id/parent_object_id/default_method_id/object_id/promoted_object_id are plain
// TEXT (no-FK, ADR-016 §3.4; §5.10 REFERENCES superseded; cascade = app/sync-layer BR-KN-5).
// FIXED enums → SQL CHECK from the @vida/types tuple (4 CHECK cols / 4 tuples). OPEN vocabs
// (object_kinds.name/learning_realm, references.type, compound_sets.consumer_module) = plain
// TEXT, no CHECK. Mastery DERIVED (no NOT NULL DEFAULT 0 — the §5.10 anti-signal, resolved out,
// BR-KN-2). No SM-2 columns on any table (BR-KN-3 — scheduling state is the DB-3 review engine).
// `references` is a SQL keyword → the identifier is quoted. Retired (NOT authored): study_topics,
// topic_reviews, knowledge_notes (→pages), flashcard_decks, flashcard_reviews (→review engine).
// ============================================================================

import type { Migration } from '../adapter'

export const migration022Knowledge: Migration = {
  version: 22,
  name: 'knowledge',
  up: async (driver) => {
    // --- knowledge_objects: the object (generalizes study_topics) ---
    await driver.run(`
      CREATE TABLE knowledge_objects (
        id               TEXT PRIMARY KEY,
        kind_id          TEXT NOT NULL,   -- → object_kinds, no FK
        parent_object_id TEXT,            -- self-ref, no FK — THE hierarchy (BR-KN-1)
        title            TEXT NOT NULL,   -- [E]
        description      TEXT,            -- [E]
        key_concepts     TEXT,            -- [E] JSON array
        mastery_level    INTEGER,         -- DERIVED, nullable (BR-KN-2)
        status           TEXT             -- nullable
                         CHECK (status IN ('not_started', 'in_progress', 'reviewing', 'mastered')),
        difficulty       TEXT             -- nullable
                         CHECK (difficulty IN ('easy', 'medium', 'hard', 'very_hard')),
        is_exam_topic    INTEGER NOT NULL DEFAULT 0,
        sort_order       INTEGER NOT NULL DEFAULT 0,
        created_at       INTEGER NOT NULL,
        updated_at       INTEGER NOT NULL,
        deleted_at       INTEGER,
        _sync_id        TEXT NOT NULL UNIQUE,
        _sync_version   INTEGER NOT NULL DEFAULT 1,
        _sync_device_id TEXT NOT NULL,
        _sync_lww_ts    INTEGER NOT NULL,
        _sync_status    TEXT NOT NULL DEFAULT 'pending',
        _sync_hash      TEXT
      )
    `)
    await driver.run(`CREATE INDEX idx_knowledge_objects_parent ON knowledge_objects(parent_object_id)`)
    await driver.run(`CREATE INDEX idx_knowledge_objects_kind ON knowledge_objects(kind_id)`)

    // --- object_kinds: user-extensible kind registry ---
    await driver.run(`
      CREATE TABLE object_kinds (
        id                TEXT PRIMARY KEY,
        name              TEXT NOT NULL,   -- OPEN (user-extensible; seeds topic/concept/definition)
        learning_realm    TEXT,            -- OPEN (understand/memorize/user, KN-4)
        default_method_id TEXT,            -- → ADR-008 registry, no FK
        is_default        INTEGER NOT NULL DEFAULT 0,
        created_at        INTEGER NOT NULL,
        updated_at        INTEGER NOT NULL,
        deleted_at        INTEGER,
        _sync_id        TEXT NOT NULL UNIQUE,
        _sync_version   INTEGER NOT NULL DEFAULT 1,
        _sync_device_id TEXT NOT NULL,
        _sync_lww_ts    INTEGER NOT NULL,
        _sync_status    TEXT NOT NULL DEFAULT 'pending',
        _sync_hash      TEXT
      )
    `)

    // --- knowledge_containers: Module ⊃ Area ⊃ Subject org ---
    await driver.run(`
      CREATE TABLE knowledge_containers (
        id             TEXT PRIMARY KEY,
        container_type TEXT NOT NULL
                       CHECK (container_type IN ('module', 'area', 'subject')),
        name           TEXT NOT NULL,   -- [E]
        created_at     INTEGER NOT NULL,
        updated_at     INTEGER NOT NULL,
        deleted_at     INTEGER,
        _sync_id        TEXT NOT NULL UNIQUE,
        _sync_version   INTEGER NOT NULL DEFAULT 1,
        _sync_device_id TEXT NOT NULL,
        _sync_lww_ts    INTEGER NOT NULL,
        _sync_status    TEXT NOT NULL DEFAULT 'pending',
        _sync_hash      TEXT
      )
    `)

    // --- references: first-class Reference (K6). `references` is a SQL keyword → quoted. ---
    await driver.run(`
      CREATE TABLE "references" (
        id         TEXT PRIMARY KEY,
        object_id  TEXT,            -- → knowledge_objects, no FK
        title      TEXT NOT NULL,   -- [E]
        source     TEXT,            -- [E]
        url        TEXT,            -- [E] (a saved URL is knowledge content, KN-1)
        type       TEXT,            -- OPEN, no CHECK (plaintext label)
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
    await driver.run(`CREATE INDEX idx_references_object ON "references"(object_id)`)

    // --- compound_sets: per-consumer personalization bundle (KN-11) ---
    await driver.run(`
      CREATE TABLE compound_sets (
        id              TEXT PRIMARY KEY,
        consumer_module TEXT NOT NULL,   -- OPEN
        name            TEXT,            -- [E]
        spec            TEXT,            -- [E] JSON (rules/methods/params, opaque blob)
        is_default      INTEGER NOT NULL DEFAULT 0,
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
    await driver.run(`CREATE INDEX idx_compound_sets_consumer ON compound_sets(consumer_module)`)

    // --- knowledge_lab_entries: generate NEW knowledge (07-06) ---
    await driver.run(`
      CREATE TABLE knowledge_lab_entries (
        id                 TEXT PRIMARY KEY,
        hypothesis         TEXT NOT NULL,   -- [E]
        data_refs          TEXT,            -- JSON own-module refs (plain — ref IDs, like media/object_id)
        conclusion         TEXT,            -- [E]
        promoted_object_id TEXT,            -- → knowledge_objects on promote, no FK
        created_at         INTEGER NOT NULL,
        updated_at         INTEGER NOT NULL,
        deleted_at         INTEGER,
        _sync_id        TEXT NOT NULL UNIQUE,
        _sync_version   INTEGER NOT NULL DEFAULT 1,
        _sync_device_id TEXT NOT NULL,
        _sync_lww_ts    INTEGER NOT NULL,
        _sync_status    TEXT NOT NULL DEFAULT 'pending',
        _sync_hash      TEXT
      )
    `)

    // --- flashcards: content-only reviewable (ADR-005, BR-KN-7) ---
    await driver.run(`
      CREATE TABLE flashcards (
        id           TEXT PRIMARY KEY,
        front        TEXT NOT NULL,   -- [E]
        back         TEXT NOT NULL,   -- [E]
        hint         TEXT,            -- [E]
        explanation  TEXT,            -- [E]
        card_type    TEXT NOT NULL
                     CHECK (card_type IN ('basic', 'reversed', 'cloze', 'image_occlusion')),
        media        TEXT,            -- JSON image/audio refs
        is_suspended INTEGER NOT NULL DEFAULT 0,
        sort_order   INTEGER NOT NULL DEFAULT 0,
        created_at   INTEGER NOT NULL,
        updated_at   INTEGER NOT NULL,
        deleted_at   INTEGER,
        _sync_id        TEXT NOT NULL UNIQUE,
        _sync_version   INTEGER NOT NULL DEFAULT 1,
        _sync_device_id TEXT NOT NULL,
        _sync_lww_ts    INTEGER NOT NULL,
        _sync_status    TEXT NOT NULL DEFAULT 'pending',
        _sync_hash      TEXT
      )
    `)
  },
}
