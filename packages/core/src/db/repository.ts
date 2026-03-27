// ============================================================================
// Generic Repository — Encrypt-before-write, decrypt-after-read
// ADR-002 §4 (three-layer encryption model, L2 field-level)
//
// Every entity write passes through:
//   app data → encryptRow() → SQLite (encrypted at rest via SQLCipher L1)
//
// Every entity read passes through:
//   SQLite → decryptRow() → app data (plaintext in memory)
//
// The repository is table-agnostic: provide the Drizzle table,
// the encrypted field names, and a device ID.
// ============================================================================

import { eq, and, isNull, type SQL } from 'drizzle-orm'
import { type SQLiteTableWithColumns } from 'drizzle-orm/sqlite-core'
import type { EncryptedField, TableEncryptionSchema } from '@vida/types'
import type { DrizzleDb } from './adapter'
import { encryptField, decryptField, hashContent } from '../encryption/vault'
import { getVaultKey } from '../encryption/key-management'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Any Drizzle SQLite table shape */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyTable = SQLiteTableWithColumns<any>

/** Inferred select row type from a Drizzle table */
type RowOf<T extends AnyTable> = T['$inferSelect']

/** Inferred insert row type from a Drizzle table */
type InsertOf<T extends AnyTable> = T['$inferInsert']

/** Fields the repository auto-manages — callers never provide these */
type ManagedFields =
  | 'id'
  | 'created_at'
  | 'updated_at'
  | '_sync_id'
  | '_sync_version'
  | '_sync_device_id'
  | '_sync_lww_ts'
  | '_sync_status'
  | '_sync_hash'

/** Caller provides everything except managed fields */
export type CreateInput<T extends AnyTable> = Omit<InsertOf<T>, ManagedFields>

/** Partial update — everything except managed fields + id */
export type UpdateInput<T extends AnyTable> = Partial<Omit<InsertOf<T>, ManagedFields>>

// ---------------------------------------------------------------------------
// UUIDv7 / UUIDv4 generators
// crypto.getRandomValues is available in all runtimes (web, Node 19+, RN)
// ---------------------------------------------------------------------------

declare const crypto: { getRandomValues(buf: Uint8Array): Uint8Array }

/** UUIDv7 — time-sortable, globally unique (ADR-002 §2.1) */
export function uuidv7(): string {
  const now = Date.now()
  const bytes = new Uint8Array(16)
  crypto.getRandomValues(bytes)

  bytes[0] = (now / 2 ** 40) & 0xff
  bytes[1] = (now / 2 ** 32) & 0xff
  bytes[2] = (now / 2 ** 24) & 0xff
  bytes[3] = (now / 2 ** 16) & 0xff
  bytes[4] = (now / 2 ** 8) & 0xff
  bytes[5] = now & 0xff
  bytes[6] = (bytes[6] & 0x0f) | 0x70 // version 7
  bytes[8] = (bytes[8] & 0x3f) | 0x80 // variant 10

  const h = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('')
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`
}

/** UUIDv4 — random, used for _sync_id */
export function uuidv4(): string {
  const bytes = new Uint8Array(16)
  crypto.getRandomValues(bytes)
  bytes[6] = (bytes[6] & 0x0f) | 0x40
  bytes[8] = (bytes[8] & 0x3f) | 0x80
  const h = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('')
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`
}

// ---------------------------------------------------------------------------
// Field encryption helpers
// ---------------------------------------------------------------------------

/**
 * Pack an EncryptedField into a single TEXT for SQLite storage.
 * Format: "nonce:ciphertext" (both base64).
 */
export function packEncrypted(ef: EncryptedField): string {
  return `${ef.nonce}:${ef.ciphertext}`
}

/** Unpack a stored TEXT back into an EncryptedField. */
export function unpackEncrypted(stored: string): EncryptedField {
  const idx = stored.indexOf(':')
  if (idx === -1) throw new Error('Invalid encrypted field format')
  return { nonce: stored.slice(0, idx), ciphertext: stored.slice(idx + 1) }
}

/**
 * Encrypt all E-classified fields in a row before writing to SQLite.
 * Non-string values (arrays, objects) are JSON-serialized first.
 */
export function encryptRow(
  row: Record<string, unknown>,
  encryptedFields: ReadonlySet<string>,
  vaultKey: Uint8Array,
): Record<string, unknown> {
  const result = { ...row }
  for (const field of encryptedFields) {
    const value = result[field]
    if (value == null) continue
    const plaintext = typeof value === 'string' ? value : JSON.stringify(value)
    result[field] = packEncrypted(encryptField(plaintext, vaultKey))
  }
  return result
}

/**
 * Decrypt all E-classified fields in a row after reading from SQLite.
 * Only decrypts values that match the "nonce:ciphertext" packed format.
 */
export function decryptRow(
  row: Record<string, unknown>,
  encryptedFields: ReadonlySet<string>,
  vaultKey: Uint8Array,
): Record<string, unknown> {
  const result = { ...row }
  for (const field of encryptedFields) {
    const value = result[field]
    if (value == null || typeof value !== 'string') continue
    if (!value.includes(':')) continue
    try {
      result[field] = decryptField(unpackEncrypted(value), vaultKey)
    } catch {
      // Leave as-is if decryption fails (e.g. plaintext default value)
    }
  }
  return result
}

/** Compute _sync_hash from all non-sync fields of a row. */
function computeSyncHash(row: Record<string, unknown>): string {
  const hashable: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(row)) {
    if (!key.startsWith('_sync_')) {
      hashable[key] = value
    }
  }
  return hashContent(JSON.stringify(hashable))
}

// ---------------------------------------------------------------------------
// Repository config & interface
// ---------------------------------------------------------------------------

export interface RepositoryConfig {
  /** Column names classified as encrypted (E) per ADR-002 §4 */
  encryptedFields: string[]
  /** Current device ID (from app_state) */
  deviceId: string
  /** Whether this table uses soft delete (has deleted_at column). Default: false */
  softDelete?: boolean
}

export interface Repository<T extends AnyTable> {
  /** Insert a new row. Returns the created row (decrypted). */
  create(data: CreateInput<T>): RowOf<T>

  /** Find by primary key. Returns null if not found or soft-deleted. */
  findById(id: string): RowOf<T> | null

  /** Find all rows. Excludes soft-deleted if enabled. */
  findAll(): RowOf<T>[]

  /** Update by primary key. Returns the updated row (decrypted). */
  update(id: string, data: UpdateInput<T>): RowOf<T>

  /** Soft delete (if enabled) or hard delete. */
  delete(id: string): void

  /** Permanently remove the row. */
  hardDelete(id: string): void

  /** Query with a Drizzle SQL where clause. Returns decrypted rows. */
  findWhere(where: SQL): RowOf<T>[]

  /** Count rows matching an optional where clause. */
  count(where?: SQL): number
}

// ---------------------------------------------------------------------------
// Repository factory
// ---------------------------------------------------------------------------

/**
 * Create a typed, encrypted repository for a Drizzle table.
 *
 * Usage:
 * ```ts
 * const taskRepo = createRepository(db, schema.tasks, {
 *   encryptedFields: ['title', 'description', 'tags'],
 *   deviceId: 'device_abc123',
 *   softDelete: true,
 * })
 * const task = taskRepo.create({ title: 'Buy groceries', status: 'not_started', ... })
 * ```
 */
export function createRepository<T extends AnyTable>(
  db: DrizzleDb,
  table: T,
  config: RepositoryConfig,
): Repository<T> {
  const { deviceId, softDelete = false } = config
  const encryptedFieldSet = new Set(config.encryptedFields)

  // Drizzle table columns typed as `any` for dynamic access
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const cols = (table as any)

  function key(): Uint8Array {
    return getVaultKey()
  }

  function ts(): number {
    return Date.now()
  }

  function syncMeta(): Record<string, unknown> {
    return {
      _sync_id: uuidv4(),
      _sync_version: 1,
      _sync_device_id: deviceId,
      _sync_lww_ts: ts(),
      _sync_status: 'pending',
    }
  }

  function decrypt(row: Record<string, unknown>): RowOf<T> {
    return decryptRow(row, encryptedFieldSet, key()) as RowOf<T>
  }

  function decryptAll(rows: Record<string, unknown>[]): RowOf<T>[] {
    const k = key()
    return rows.map((r) => decryptRow(r, encryptedFieldSet, k) as RowOf<T>)
  }

  /** Apply soft-delete filter if enabled */
  function notDeleted(): SQL | undefined {
    if (softDelete && cols.deleted_at) {
      return isNull(cols.deleted_at)
    }
    return undefined
  }

  // ---- CREATE ---------------------------------------------------------------

  function create(data: CreateInput<T>): RowOf<T> {
    const id = uuidv7()
    const timestamp = ts()
    const vaultKey = key()

    const row: Record<string, unknown> = {
      ...(data as Record<string, unknown>),
      id,
      created_at: timestamp,
      updated_at: timestamp,
      ...syncMeta(),
    }

    const encrypted = encryptRow(row, encryptedFieldSet, vaultKey)
    encrypted._sync_hash = computeSyncHash(encrypted)

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    db.insert(table).values(encrypted as any).run()

    return decryptRow(encrypted, encryptedFieldSet, vaultKey) as RowOf<T>
  }

  // ---- FIND BY ID -----------------------------------------------------------

  function findById(id: string): RowOf<T> | null {
    const filter = notDeleted()
    const where = filter
      ? and(eq(cols.id, id), filter)
      : eq(cols.id, id)

    const rows = db.select().from(table).where(where).all() as Record<string, unknown>[]
    if (rows.length === 0) return null
    return decrypt(rows[0])
  }

  // ---- FIND ALL -------------------------------------------------------------

  function findAll(): RowOf<T>[] {
    const filter = notDeleted()
    const rows = filter
      ? (db.select().from(table).where(filter).all() as Record<string, unknown>[])
      : (db.select().from(table).all() as Record<string, unknown>[])
    return decryptAll(rows)
  }

  // ---- FIND WHERE -----------------------------------------------------------

  function findWhere(where: SQL): RowOf<T>[] {
    const rows = db.select().from(table).where(where).all() as Record<string, unknown>[]
    return decryptAll(rows)
  }

  // ---- COUNT ----------------------------------------------------------------

  function count(where?: SQL): number {
    const baseWhere = where
    const filter = notDeleted()
    const combined = baseWhere && filter
      ? and(baseWhere, filter)
      : baseWhere ?? filter

    const rows = combined
      ? db.select().from(table).where(combined).all()
      : db.select().from(table).all()
    return rows.length
  }

  // ---- UPDATE ---------------------------------------------------------------

  function update(id: string, data: UpdateInput<T>): RowOf<T> {
    const vaultKey = key()

    // Read current row for _sync_version
    const existing = db
      .select()
      .from(table)
      .where(eq(cols.id, id))
      .all() as Record<string, unknown>[]

    if (existing.length === 0) {
      throw new Error(`Row not found: ${id}`)
    }

    const currentVersion =
      typeof existing[0]._sync_version === 'number'
        ? existing[0]._sync_version
        : 1

    const timestamp = ts()
    const partial: Record<string, unknown> = {
      ...(data as Record<string, unknown>),
      updated_at: timestamp,
      _sync_version: currentVersion + 1,
      _sync_device_id: deviceId,
      _sync_lww_ts: timestamp,
      _sync_status: 'pending',
    }

    const encrypted = encryptRow(partial, encryptedFieldSet, vaultKey)
    encrypted._sync_hash = computeSyncHash({ ...existing[0], ...encrypted })

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    db.update(table).set(encrypted as any).where(eq(cols.id, id)).run()

    // Re-read and return the full decrypted row
    const updated = db
      .select()
      .from(table)
      .where(eq(cols.id, id))
      .all() as Record<string, unknown>[]

    return decryptRow(updated[0], encryptedFieldSet, vaultKey) as RowOf<T>
  }

  // ---- DELETE ---------------------------------------------------------------

  function del(id: string): void {
    if (softDelete && cols.deleted_at) {
      update(id, { deleted_at: ts() } as unknown as UpdateInput<T>)
    } else {
      hardDelete(id)
    }
  }

  function hardDelete(id: string): void {
    db.delete(table).where(eq(cols.id, id)).run()
  }

  // ---- RETURN ---------------------------------------------------------------

  return {
    create,
    findById,
    findAll,
    update,
    delete: del,
    hardDelete,
    findWhere,
    count,
  }
}

// ---------------------------------------------------------------------------
// Encryption schema builder (for sync layer)
// ---------------------------------------------------------------------------

/**
 * Build a TableEncryptionSchema from a repository config.
 * Used by the sync layer to classify fields without a full repository.
 */
export function buildEncryptionSchema(
  tableName: string,
  allColumns: string[],
  encryptedFields: string[],
): TableEncryptionSchema {
  const encrypted = new Set(encryptedFields)
  const fields: Record<string, 'plaintext' | 'encrypted'> = {}
  for (const col of allColumns) {
    fields[col] = encrypted.has(col) ? 'encrypted' : 'plaintext'
  }
  return { table: tableName, fields }
}
