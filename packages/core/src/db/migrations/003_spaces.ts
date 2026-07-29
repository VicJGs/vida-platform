// ============================================================================
// Migration 003 — Spaces base  (AR-6)
// Hand-written SQL DDL (ADR-016 §3.2 — no drizzle-kit); shape per ADR-006 (tags/
// entity_tags/entity_links/spaces/space_enabled_blocks) + ADR-007 (views), sourced
// to ADR-002 §5.20 owed-ledger. Mirrors schema/foundation/spaces.ts (query mirror).
//
// ⚠ up() runs INSIDE runMigrations' BEGIN/COMMIT/ROLLBACK wrapper (adapter.ts) —
// it must NOT open its own transaction.
//
// The `...baseColumns` SQL below MUST mirror schema/_shared.ts exactly (id +
// created_at + updated_at + the 6 _sync_* columns + defaults). NO cross-table FK
// (refs are app/sync-layer). Only `views.layout` carries a SQL CHECK (FIXED enum,
// VIEW_LAYOUT); every entity_type/link ref is plain TEXT (OPEN registry, SP2).
// ============================================================================

import type { Migration } from '../adapter'

export const migration003Spaces: Migration = {
  version: 3,
  name: 'spaces',
  up: async (driver) => {
    // --- tags: the tag entity (nestable) — ADR-006 §3.2 (SP3) ----------------
    await driver.run(`
      CREATE TABLE tags (
        id              TEXT PRIMARY KEY,
        name            TEXT NOT NULL,
        color           TEXT,
        icon            TEXT,
        description     TEXT,
        parent_tag_id   TEXT,
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
    await driver.run(`CREATE INDEX idx_tags_parent ON tags(parent_tag_id)`)

    // --- entity_tags: universal tag association (SP1) — ADR-006 §3.2 ---------
    await driver.run(`
      CREATE TABLE entity_tags (
        id              TEXT PRIMARY KEY,
        tag_id          TEXT NOT NULL,
        entity_type     TEXT NOT NULL,
        entity_id       TEXT NOT NULL,
        deleted_at      INTEGER,
        created_at      INTEGER NOT NULL,
        updated_at      INTEGER NOT NULL,
        _sync_id        TEXT NOT NULL UNIQUE,
        _sync_version   INTEGER NOT NULL DEFAULT 1,
        _sync_device_id TEXT NOT NULL,
        _sync_lww_ts    INTEGER NOT NULL,
        _sync_status    TEXT NOT NULL DEFAULT 'pending',
        _sync_hash      TEXT,
        UNIQUE(tag_id, entity_type, entity_id)
      )
    `)
    await driver.run(`CREATE INDEX idx_entity_tags_entity ON entity_tags(entity_type, entity_id)`)

    // --- entity_links: typed cross-entity reference (SP4) — ADR-006 §3.3 -----
    await driver.run(`
      CREATE TABLE entity_links (
        id              TEXT PRIMARY KEY,
        page_id         TEXT NOT NULL,
        entity_type     TEXT NOT NULL,
        entity_id       TEXT NOT NULL,
        context         TEXT,
        deleted_at      INTEGER,
        created_at      INTEGER NOT NULL,
        updated_at      INTEGER NOT NULL,
        _sync_id        TEXT NOT NULL UNIQUE,
        _sync_version   INTEGER NOT NULL DEFAULT 1,
        _sync_device_id TEXT NOT NULL,
        _sync_lww_ts    INTEGER NOT NULL,
        _sync_status    TEXT NOT NULL DEFAULT 'pending',
        _sync_hash      TEXT,
        UNIQUE(page_id, entity_type, entity_id)
      )
    `)
    await driver.run(`CREATE INDEX idx_entity_links_entity ON entity_links(entity_type, entity_id)`)

    // --- spaces: lightweight first-class entity (SP5) — ADR-006 §3.4 ---------
    await driver.run(`
      CREATE TABLE spaces (
        id              TEXT PRIMARY KEY,
        root_tag_id     TEXT NOT NULL,
        name            TEXT NOT NULL,
        icon            TEXT,
        default_view_id TEXT,
        parent_space_id TEXT,
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
    await driver.run(`CREATE INDEX idx_spaces_parent ON spaces(parent_space_id)`)

    // --- space_enabled_blocks: offered-capability palette junction (SP6) -----
    await driver.run(`
      CREATE TABLE space_enabled_blocks (
        id                TEXT PRIMARY KEY,
        space_id          TEXT NOT NULL,
        capability_def_id TEXT NOT NULL,
        deleted_at        INTEGER,
        created_at        INTEGER NOT NULL,
        updated_at        INTEGER NOT NULL,
        _sync_id          TEXT NOT NULL UNIQUE,
        _sync_version     INTEGER NOT NULL DEFAULT 1,
        _sync_device_id   TEXT NOT NULL,
        _sync_lww_ts      INTEGER NOT NULL,
        _sync_status      TEXT NOT NULL DEFAULT 'pending',
        _sync_hash        TEXT,
        UNIQUE(space_id, capability_def_id)
      )
    `)
    await driver.run(`CREATE INDEX idx_space_enabled_blocks_space ON space_enabled_blocks(space_id)`)

    // --- views: saved view (filter × layout × grouping) (V1–V3/V5) — ADR-007 -
    await driver.run(`
      CREATE TABLE views (
        id              TEXT PRIMARY KEY,
        space_id        TEXT,
        name            TEXT NOT NULL,
        layout          TEXT NOT NULL CHECK (layout IN ('list', 'table', 'board', 'gallery', 'calendar', 'graph', 'timeline')),
        filter          TEXT,
        grouping        TEXT,
        sort            TEXT,
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
    await driver.run(`CREATE INDEX idx_views_space ON views(space_id)`)
  },
}
