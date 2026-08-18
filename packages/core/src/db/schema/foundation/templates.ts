// ============================================================================
// Foundation substrate: light templates store (DB-3 · ADR-009)
// templates — user-saved portable seed bundles, instantiated by FORK (deep copy, no
// back-link). owed-ledger ADR-002 §5.20:3771.
//
// SYNCABLE (…baseColumns). `bundle` is an OPAQUE serialized deep-copy seed
// ({root tag · seed entities · views · enabled capabilities+config · child structure} —
// ADR-009 §, illustrative; one TEXT column at the DDL level). Fork-on-instantiate keeps
// NO template_id link → no cross-entity FK (ADR-009 L9). DDL lives in migrations/011_templates.ts.
// ============================================================================

import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core'
import { baseColumns } from '../_shared'

export const templates = sqliteTable('templates', {
  ...baseColumns,
  /** @encrypted [E] — template name */
  name: text('name').notNull(),
  /** @encrypted [E] — the opaque serialized seed bundle (deep copy on fork) */
  bundle: text('bundle').notNull(),
  deleted_at: integer('deleted_at'),
})

export type TemplateRow = typeof templates.$inferSelect
export type TemplateInsert = typeof templates.$inferInsert
