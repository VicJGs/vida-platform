// ============================================================================
// Foundation table: app_state — the device-local key/value store (DB-7)
// ADR-002 §5.0
//
// Device-local, NOT synced: it carries NO baseColumns/syncColumns. It is the
// schema-version store (`getSchemaVersion`/`setSchemaVersion`, ADR-002 §9.1) and
// will later hold last_sync_at, device_id, vault_key_check, etc.
//
// DDL model (ADR-016 §3.2): the table is bootstrapped by the migrations runner
// (`migrations/runner.ts` → ensureInfra) BEFORE the versioned migration loop —
// it is the version store itself, so it cannot be a versioned migration. This
// Drizzle object is only the type-safe QUERY mirror; its columns MUST mirror the
// bootstrap DDL exactly. Carries the v1 shape (db/_legacy/001_initial.v1.ts:49-52).
// ============================================================================

import { sqliteTable, text } from 'drizzle-orm/sqlite-core'

export const appState = sqliteTable('app_state', {
  key: text('key').primaryKey(),
  value: text('value').notNull(),
})

export type AppStateRow = typeof appState.$inferSelect
export type AppStateInsert = typeof appState.$inferInsert
