// Canonical Drizzle primitives for the v2 storage layer (from-zero rebuild · DB-1 / P0).
// Every schema/ table composes these — the six conventions are enforced here, never hand-repeated.
// Conventions: ADR-002 §2 · CLAUDE.md. Sync metadata: ADR-002 §3 · ADR-003.
//
// ARCHITECTURE NOTE (read before adding "DDL" primitives here): these objects are the type-safe QUERY
// layer only. DDL is authored as HAND-WRITTEN SQL migrations (ADR-002 §5 · migrations/*), applied by the
// custom cross-platform runner — the Drizzle objects are NOT compiled into CREATE TABLE (no drizzle-kit).
// Therefore enum CHECK constraints live in the SQL migration (DB-3/DB-4) + Zod validators (DB-9); here we
// provide only `enumText` (the TS union for query types). Do not add a Drizzle `check()` helper — it emits
// nothing in this pipeline.
import { text, integer } from 'drizzle-orm/sqlite-core'

// --- column helpers (the six conventions, compiler-enforced) ---
export const uuidPk = (name = 'id') => text(name).primaryKey() // UUIDv7 TEXT, client-generated
export const timestampMs = (name: string) => integer(name) // Unix ms INTEGER
export const money = (name: string) => integer(name) // INTEGER cents
export const calendarDate = (name: string) => text(name) // 'YYYY-MM-DD' TEXT
export const boolInt = (name: string) => integer(name, { mode: 'boolean' }) // 0/1 <-> boolean
export const json = <T>(name: string) => text(name).$type<T>() // JSON-as-TEXT (app stringifies; ADR-002 §2.5)
export const enumText = <T extends readonly [string, ...string[]]>(name: string, values: T) =>
  text(name, { enum: values }) // TS union over TEXT (SQL CHECK authored in the migration; Zod validates — DB-9)

// --- sync metadata (present on every syncable table) — EXACTLY 6 cols (_sync_field_ts is DB-2's) ---
export const syncColumns = {
  _sync_id: text('_sync_id').notNull().unique(),
  _sync_version: integer('_sync_version').notNull().default(1),
  _sync_device_id: text('_sync_device_id').notNull(),
  _sync_lww_ts: integer('_sync_lww_ts').notNull(),
  _sync_status: text('_sync_status').notNull().default('pending'),
  _sync_hash: text('_sync_hash'),
}

// --- base entity columns (id + timestamps + sync) ---
export const baseColumns = {
  id: uuidPk(),
  created_at: timestampMs('created_at').notNull(),
  updated_at: timestampMs('updated_at').notNull(),
  ...syncColumns,
}
