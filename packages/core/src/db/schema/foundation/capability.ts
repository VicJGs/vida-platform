// ============================================================================
// Foundation tables: capability registry (AR-7 Increment 2)
// ADR-008 (registry + block_instances) · ADR-010 (capability_grants) · owed-ledger ADR-002 §5.20
//
// All three are SYNCABLE (…baseColumns = id+timestamps+_sync_*). JSON dims are
// PLAIN text() — the registry JSON.stringify's on write / JSON.parse on read
// (session_type_registry precedent). NEVER json<T>() (it only casts the TS type,
// binds a raw array to SQLite — sessions.ts:59 warning).
//
// DDL model (ADR-016 §3.2): the UNIQUE + defaults live in the hand-written SQL
// migration (005_capability.ts); these Drizzle objects are the query mirror only.
// NO hard cross-table FK (base+extension are separate sync blobs — live convention).
// ============================================================================

import { sqliteTable, text, integer, index } from 'drizzle-orm/sqlite-core'
import { baseColumns, boolInt } from '../_shared'

// --- capability_definitions: the CB1 registry (only is_user_type=1 rows persist; shipped = in-memory) ---
export const capabilityDefinitions = sqliteTable('capability_definitions', {
  ...baseColumns, // id = UUIDv7 PK (repo-generated)
  def_id: text('def_id').notNull().unique(), // the capability's SEMANTIC identity (BR-1) — UNIQUE business key
  kind: text('kind').notNull(), // OPEN vocab (BR-6) — no CHECK
  render_targets: text('render_targets').notNull(), // JSON TEXT (RenderTarget[])
  bindings: text('bindings').notNull(), // JSON TEXT (string[])
  effects: text('effects').notNull(), // JSON TEXT (EffectType[])
  config_schema: text('config_schema'), // JSON TEXT, nullable
  terminal_states: text('terminal_states').notNull(), // JSON TEXT (Record<rt, TerminalState[]>)
  is_user_type: boolInt('is_user_type').notNull().default(false),
  deleted_at: integer('deleted_at'),
})

// --- block_instances: standalone placements referenced by a Space (structure only this increment) ---
export const blockInstances = sqliteTable(
  'block_instances',
  {
    ...baseColumns,
    capability_def_id: text('capability_def_id').notNull(), // → registry def_id, no FK
    space_id: text('space_id').notNull(), // → spaces, no FK
    /** @encrypted [E] — user-literal instance config; field-level libsodium (EN-2) */
    config: text('config'),
    deleted_at: integer('deleted_at'),
  },
  (t) => [index('idx_block_instances_space').on(t.space_id)],
)

// --- capability_grants: the ADR-010 declare→grant envelope (structure only this increment) ---
export const capabilityGrants = sqliteTable(
  'capability_grants',
  {
    ...baseColumns,
    capability_def_id: text('capability_def_id').notNull(),
    granted_bindings: text('granted_bindings').notNull(), // JSON TEXT
    granted_effects: text('granted_effects').notNull(), // JSON TEXT
    media_ok: boolInt('media_ok').notNull().default(false),
    external_in_ok: boolInt('external_in_ok').notNull().default(false),
    external_out_ok: boolInt('external_out_ok').notNull().default(false),
    consented_sensitive_modules: text('consented_sensitive_modules').notNull(), // JSON TEXT
    granted_envelope_hash: text('granted_envelope_hash').notNull(),
    deleted_at: integer('deleted_at'),
  },
  (t) => [index('idx_capability_grants_def').on(t.capability_def_id)],
)

export type CapabilityDefinitionRow = typeof capabilityDefinitions.$inferSelect
export type CapabilityDefinitionInsert = typeof capabilityDefinitions.$inferInsert
export type BlockInstanceRow = typeof blockInstances.$inferSelect
export type BlockInstanceInsert = typeof blockInstances.$inferInsert
export type CapabilityGrantRow = typeof capabilityGrants.$inferSelect
export type CapabilityGrantInsert = typeof capabilityGrants.$inferInsert
