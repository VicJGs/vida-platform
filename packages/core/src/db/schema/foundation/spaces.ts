// ============================================================================
// Foundation tables: Spaces base (AR-6) — ADR-006 (tags/links/spaces) · ADR-007 (views)
//
// The Spaces tier STRUCTURE: universal tagging (`tags` + `entity_tags`), typed
// cross-entity references (`entity_links`), lightweight `spaces`, the offered-
// capability palette junction (`space_enabled_blocks`), and saved `views`.
// AR-6 ships the tables + thin services; the effect rail (AR-7), capability
// registry / block_instances (AR-7, ADR-008), and the resolution/DSL/layout
// design passes are NOT here (spec §1 "What it is NOT").
//
// DDL model (ADR-016 §3.2): CHECKs + UNIQUEs + indexes live in the hand-written
// SQL migration (`migrations/003_spaces.ts`). These Drizzle objects are only the
// type-safe QUERY mirror — `enumText` gives the TS union, not a SQL CHECK.
//
// entity_type / link refs are plain TEXT — OPEN taggable-type registry (SP2,
// validated app-layer against `_registry.ts`), NO SQL CHECK. Only `views.layout`
// is a FIXED enum → SQL CHECK. JSON columns are plain text() (app stringifies;
// `json<T>()` only casts, it would bind a raw object — see _shared.ts).
//
// NO hard cross-table FK (live convention): refs are plain TEXT + index;
// referential integrity is app/sync-layer. `entity_links.page_id` is plain TEXT
// (no REFERENCES pages(id)) so the table stands up before N&P exists (M1.1).
//
// M1.0 encryption (BR-13): the [E] fields below (name/description/context) are
// the M3 target — in M1.0 the Repository registers these tables with an EMPTY
// [E] set (pass-through; ADR-017:20). No field encryption is wired here.
// ============================================================================

import { sqliteTable, text, integer, index } from 'drizzle-orm/sqlite-core'
import { VIEW_LAYOUT } from '@vida/types'
import { baseColumns, enumText } from '../_shared'

// --- tags: the tag entity (nestable) — ADR-006 §3.2 (SP3) --------------------
export const tags = sqliteTable(
  'tags',
  {
    ...baseColumns,
    /** @encrypted [E] — user content (M3 target; M1.0 pass-through) */
    name: text('name').notNull(),
    color: text('color'),
    icon: text('icon'),
    /** @encrypted [E] */
    description: text('description'),
    parent_tag_id: text('parent_tag_id'), // nullable self-ref, no FK (nesting #a/b)
    deleted_at: integer('deleted_at'),
  },
  (t) => [index('idx_tags_parent').on(t.parent_tag_id)],
)

// --- entity_tags: universal tag association (SP1) — ADR-006 §3.2 -------------
export const entityTags = sqliteTable(
  'entity_tags',
  {
    ...baseColumns,
    tag_id: text('tag_id').notNull(),
    entity_type: text('entity_type').notNull(), // OPEN — _registry.ts (SP2), no CHECK
    entity_id: text('entity_id').notNull(),
    deleted_at: integer('deleted_at'),
  },
  (t) => [index('idx_entity_tags_entity').on(t.entity_type, t.entity_id)],
)

// --- entity_links: typed cross-entity reference (SP4) — ADR-006 §3.3 ---------
// Shape = (page_id, entity_type, entity_id, context) — ADR-002:1365 opened per
// ADR-006 §3.2; page-anchored source, polymorphic OPEN target. idx on the target
// is the backlink read path AR-8 consumes.
export const entityLinks = sqliteTable(
  'entity_links',
  {
    ...baseColumns,
    page_id: text('page_id').notNull(), // plain TEXT, no FK (N&P is M1.1)
    entity_type: text('entity_type').notNull(), // OPEN target — _registry.ts (SP2), no CHECK
    entity_id: text('entity_id').notNull(),
    /** @encrypted [E] — surrounding-text snippet for backlink preview */
    context: text('context'),
    deleted_at: integer('deleted_at'),
  },
  (t) => [index('idx_entity_links_entity').on(t.entity_type, t.entity_id)],
)

// --- spaces: lightweight first-class entity (SP5) — ADR-006 §3.4 -------------
export const spaces = sqliteTable(
  'spaces',
  {
    ...baseColumns,
    root_tag_id: text('root_tag_id').notNull(), // membership spine (→ tags), no FK
    /** @encrypted [E] */
    name: text('name').notNull(),
    icon: text('icon'),
    default_view_id: text('default_view_id'), // nullable (→ views); set via updateSpace
    parent_space_id: text('parent_space_id'), // nullable self-ref (nesting)
    deleted_at: integer('deleted_at'),
  },
  (t) => [index('idx_spaces_parent').on(t.parent_space_id)],
)

// --- space_enabled_blocks: offered-capability palette junction (SP6) ---------
// Row-based Space↔capability-DEFINITION ref (the *menu*), distinct from
// block_instances (placements, AR-7/ADR-008). capability_def_id is a plain TEXT
// ref into AR-7's not-yet-built registry (no FK) — the forward seam.
export const spaceEnabledBlocks = sqliteTable(
  'space_enabled_blocks',
  {
    ...baseColumns,
    space_id: text('space_id').notNull(),
    capability_def_id: text('capability_def_id').notNull(), // → AR-7 registry, no FK
    deleted_at: integer('deleted_at'),
  },
  (t) => [index('idx_space_enabled_blocks_space').on(t.space_id)],
)

// --- views: saved view (filter × layout × grouping) (V1–V3/V5) — ADR-007 -----
export const views = sqliteTable(
  'views',
  {
    ...baseColumns,
    space_id: text('space_id'), // nullable: NULL = global, set = Space-owned (V2)
    /** @encrypted [E] */
    name: text('name').notNull(),
    layout: enumText('layout', VIEW_LAYOUT).notNull(), // FIXED → SQL CHECK (V3)
    /** JSON TEXT — {tags, entity_types, predicates}; user-literals [E] at M3 (BR-12/BR-13) */
    filter: text('filter'),
    grouping: text('grouping'), // JSON TEXT
    sort: text('sort'), // JSON TEXT
    deleted_at: integer('deleted_at'),
  },
  (t) => [index('idx_views_space').on(t.space_id)],
)

// --- inferred row types ------------------------------------------------------
export type TagRow = typeof tags.$inferSelect
export type TagInsert = typeof tags.$inferInsert
export type EntityTagRow = typeof entityTags.$inferSelect
export type EntityTagInsert = typeof entityTags.$inferInsert
export type EntityLinkRow = typeof entityLinks.$inferSelect
export type EntityLinkInsert = typeof entityLinks.$inferInsert
export type SpaceRow = typeof spaces.$inferSelect
export type SpaceInsert = typeof spaces.$inferInsert
export type SpaceEnabledBlockRow = typeof spaceEnabledBlocks.$inferSelect
export type SpaceEnabledBlockInsert = typeof spaceEnabledBlocks.$inferInsert
export type ViewRow = typeof views.$inferSelect
export type ViewInsert = typeof views.$inferInsert
