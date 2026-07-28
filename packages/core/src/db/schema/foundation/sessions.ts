// ============================================================================
// Foundation tables: Sessions base (AR-5) — ADR-004 §3.1 (spine) · §3.2 (contract)
//
// The Session framework's STRUCTURE: the `sessions` base spine (table-per-type),
// plus the Integration-Contract structure — `session_type_registry` (dims 2-4
// declarations) and `session_attachments` (dim1). AR-5 ships structure + a thin
// registry ONLY; the effect-firing rail, the transition engine, and the
// scheduler are AR-7 / later (spec §1 "What it is NOT").
//
// DDL model (ADR-016 §3.2): the CHECK constraints + indexes live in the
// hand-written SQL migration (`migrations/002_sessions.ts`). These Drizzle
// objects are only the type-safe QUERY mirror — `enumText` gives the TS union,
// not a SQL CHECK. Defaults here MUST mirror the migration DDL exactly.
//
// NO hard cross-table FK (live convention): base + extension are separate sync
// blobs applied out of order (ADR-004 §3.4); referential integrity is enforced
// at the app/sync layer, not by a DB FK. `session_id` is plain TEXT + an index.
// ============================================================================

import { sqliteTable, text, integer, index } from 'drizzle-orm/sqlite-core'
import { SCHEDULING_MODE, SESSION_STATUS } from '@vida/types'
import { baseColumns, enumText, boolInt } from '../_shared'

// --- The base spine (syncable; the single stable session_id) — ADR-004 §3.1 ---
export const sessions = sqliteTable(
  'sessions',
  {
    ...baseColumns,
    sub_type: text('sub_type').notNull(), // OPEN vocab (BR-6) — registry-validated, no CHECK
    purpose: text('purpose'), // OPEN vocab (BR-6)
    scheduling_mode: enumText('scheduling_mode', SCHEDULING_MODE).notNull(), // FIXED → SQL CHECK (BR-5a)
    planned_block_id: text('planned_block_id'), // nullable; target table deferred (scheduler = later)
    started_at: integer('started_at'), // Unix ms
    ended_at: integer('ended_at'),
    status: enumText('status', SESSION_STATUS).notNull(), // FIXED → SQL CHECK (BR-5a); caller-supplied, no default
    focus_rating: integer('focus_rating'), // CHECK 1..5 in migration
    energy_level: integer('energy_level'), // CHECK 1..5 in migration
    distraction_count: integer('distraction_count'),
    /** @encrypted [E] — free-form learnings; field-level libsodium (ADR-002 L2) */
    key_learnings: text('key_learnings'),
    deleted_at: integer('deleted_at'), // soft delete
  },
  (t) => [
    index('idx_sessions_status').on(t.status),
    index('idx_sessions_sub_type').on(t.sub_type),
  ],
)

// --- The sub-type registry (SessionTypeDef, dims 2-4 declarations) — ADR-004 §3.2 ---
// id is the PK (baseColumns) so the generic Repository can drive persistence;
// sub_type is a UNIQUE business key (looked up via findWhere). Only is_user_type=1
// rows are persisted here + synced; shipped defs live in-memory (SS-4).
export const sessionTypeRegistry = sqliteTable('session_type_registry', {
  ...baseColumns,
  sub_type: text('sub_type').notNull().unique(),
  owner_module: text('owner_module').notNull(),
  is_user_type: boolInt('is_user_type').notNull().default(false),
  default_purpose: text('default_purpose'),
  // JSON-as-TEXT (ADR-002 §2.5): the registry JSON.stringify's on write / parse on read
  // (the sync-queue `payload` precedent — plain text, app stringifies; not `json<T>`, which
  // only casts the TS type and would bind a raw object to SQLite).
  attachment_defaults: text('attachment_defaults'),
  effects: text('effects'),
  lifecycle: text('lifecycle'),
  permissions: text('permissions'),
})

// --- Polymorphic attachments (Integration-Contract dim1) — ADR-004 §3.2.1 ---
export const sessionAttachments = sqliteTable(
  'session_attachments',
  {
    ...baseColumns,
    session_id: text('session_id').notNull(), // plain TEXT — no FK (G2)
    entity_type: text('entity_type').notNull(), // OPEN — validated against _registry.ts (BR-6)
    entity_id: text('entity_id').notNull(),
    level: enumText('level', ['type', 'instance'] as const).notNull(), // FIXED → SQL CHECK
  },
  (t) => [index('idx_session_attachments_session').on(t.session_id)],
)

export type SessionRow = typeof sessions.$inferSelect
export type SessionInsert = typeof sessions.$inferInsert
export type SessionTypeRegistryRow = typeof sessionTypeRegistry.$inferSelect
export type SessionTypeRegistryInsert = typeof sessionTypeRegistry.$inferInsert
export type SessionAttachmentRow = typeof sessionAttachments.$inferSelect
export type SessionAttachmentInsert = typeof sessionAttachments.$inferInsert
