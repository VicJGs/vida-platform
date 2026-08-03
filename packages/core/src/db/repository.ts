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

import { eq, and, isNull, getTableName, type SQL } from 'drizzle-orm'
import { type SQLiteTableWithColumns } from 'drizzle-orm/sqlite-core'
import type { EncryptedField, TableEncryptionSchema, SyncOperation } from '@vida/types'
import type { DrizzleDb } from './adapter'
import { syncQueue } from './schema'
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

/** The transaction handle drizzle passes to `db.transaction(cb)` (async sqlite-proxy).
 *  Exported so effect handlers (ADR-004 §3.2.5) can co-write via `createInTx` inside the rail's tx. */
export type Tx = Parameters<Parameters<DrizzleDb['transaction']>[0]>[0]

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
  vaultKey: Uint8Array | null,
): Record<string, unknown> {
  // Pass-through when there is nothing to encrypt (M1.0: empty [E] set — ADR-017:20)
  // or no vault key is available. The seam stays present but dormant until M3.
  if (encryptedFields.size === 0 || vaultKey === null) return { ...row }
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
  vaultKey: Uint8Array | null,
): Record<string, unknown> {
  // Pass-through when there is nothing to decrypt (M1.0: empty [E] set) or no key.
  if (encryptedFields.size === 0 || vaultKey === null) return { ...row }
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
  create(data: CreateInput<T>): Promise<RowOf<T>>

  /**
   * Insert a new row WITHIN an existing transaction — the same row-build + sync-meta +
   * co-transactional `sync_queue` enqueue as `create()`, minus opening the transaction.
   * For effect handlers (ADR-004 §3.2.5 single write path) that must co-write in the effect
   * rail's tx (§3.2.5-B "same transaction as the write") — `create()` is `db.transaction(tx => createInTx(tx, data))`.
   */
  createInTx(tx: Tx, data: CreateInput<T>): Promise<RowOf<T>>

  /** Find by primary key. Returns null if not found or soft-deleted. */
  findById(id: string): Promise<RowOf<T> | null>

  /** Find all rows. Excludes soft-deleted if enabled. */
  findAll(): Promise<RowOf<T>[]>

  /** Update by primary key. Returns the updated row (decrypted). */
  update(id: string, data: UpdateInput<T>): Promise<RowOf<T>>

  /** Soft delete (if enabled) or hard delete. */
  delete(id: string): Promise<void>

  /** Permanently remove the row. */
  hardDelete(id: string): Promise<void>

  /** Query with a Drizzle SQL where clause. Returns decrypted rows. */
  findWhere(where: SQL): Promise<RowOf<T>[]>

  /** Count rows matching an optional where clause. */
  count(where?: SQL): Promise<number>
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
  const tableName = getTableName(table)

  // Drizzle table columns typed as `any` for dynamic access
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const cols = (table as any)

  // Lazy vault key: fetched ONLY when there are encrypted fields. In M1.0 the [E] set
  // is empty (ADR-017:20 pass-through seam) and getVaultKey() THROWS while the vault is
  // locked (key-management.ts) — so an eager fetch would break every M1.0 read/write.
  function key(): Uint8Array | null {
    return encryptedFieldSet.size > 0 ? getVaultKey() : null
  }

  function ts(): number {
    return Date.now()
  }

  /**
   * Enqueue a sync_queue row co-transactionally with an entity mutation (ADR-004 §3.4).
   * UPSERT on UNIQUE(table_name, row_id, operation): repeated pre-flush mutations of the
   * same row+op coalesce to the LATEST snapshot (correct for LWW sync, ADR-003).
   * `sync_queue.status` (pending|in_flight|failed) is the QUEUE enum — distinct from the
   * row's `_sync_status` (pending|synced|conflict).
   */
  async function enqueue(
    tx: Tx,
    operation: SyncOperation,
    rowId: string,
    snapshot: Record<string, unknown>,
  ): Promise<void> {
    const payload = JSON.stringify(snapshot)
    const now = ts()
    await tx
      .insert(syncQueue)
      .values({
        id: uuidv7(),
        table_name: tableName,
        row_id: rowId,
        operation,
        payload,
        status: 'pending',
        retry_count: 0,
        error_message: null,
        created_at: now,
      })
      .onConflictDoUpdate({
        target: [syncQueue.table_name, syncQueue.row_id, syncQueue.operation],
        set: { payload, created_at: now, status: 'pending', retry_count: 0, error_message: null },
      })
      .run()
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

  // Entity write + sync_queue enqueue, using a CALLER-supplied tx (ADR-004 §3.4 co-transactional;
  // §3.2.5 effect handlers co-write in the rail's tx). No transaction opened here.
  async function createInTx(tx: Tx, data: CreateInput<T>): Promise<RowOf<T>> {
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
    await tx.insert(table).values(encrypted as any).run()
    await enqueue(tx, 'create', id, encrypted)

    return decryptRow(encrypted, encryptedFieldSet, vaultKey) as RowOf<T>
  }

  async function create(data: CreateInput<T>): Promise<RowOf<T>> {
    // Row + sync_queue enqueue in ONE transaction (ADR-004 §3.4) — delegates to createInTx.
    return db.transaction((tx) => createInTx(tx, data))
  }

  // ---- FIND BY ID -----------------------------------------------------------

  async function findById(id: string): Promise<RowOf<T> | null> {
    const filter = notDeleted()
    const where = filter
      ? and(eq(cols.id, id), filter)
      : eq(cols.id, id)

    const rows = await db.select().from(table).where(where).all() as Record<string, unknown>[]
    if (rows.length === 0) return null
    return decrypt(rows[0])
  }

  // ---- FIND ALL -------------------------------------------------------------

  async function findAll(): Promise<RowOf<T>[]> {
    const filter = notDeleted()
    const rows = filter
      ? (await db.select().from(table).where(filter).all() as Record<string, unknown>[])
      : (await db.select().from(table).all() as Record<string, unknown>[])
    return decryptAll(rows)
  }

  // ---- FIND WHERE -----------------------------------------------------------

  async function findWhere(where: SQL): Promise<RowOf<T>[]> {
    const rows = await db.select().from(table).where(where).all() as Record<string, unknown>[]
    return decryptAll(rows)
  }

  // ---- COUNT ----------------------------------------------------------------

  async function count(where?: SQL): Promise<number> {
    const baseWhere = where
    const filter = notDeleted()
    const combined = baseWhere && filter
      ? and(baseWhere, filter)
      : baseWhere ?? filter

    const rows = combined
      ? await db.select().from(table).where(combined).all()
      : await db.select().from(table).all()
    return rows.length
  }

  // ---- UPDATE ---------------------------------------------------------------

  async function update(id: string, data: UpdateInput<T>): Promise<RowOf<T>> {
    const vaultKey = key()

    // Read → update → re-read → enqueue, all in ONE transaction (ADR-004 §3.4).
    return db.transaction(async (tx) => {
      const existing = await tx
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
      await tx.update(table).set(encrypted as any).where(eq(cols.id, id)).run()

      // Re-read the full persisted row — this is both the return value and the
      // sync_queue payload snapshot (PLAN §2: the final persisted/re-read row).
      const updated = await tx
        .select()
        .from(table)
        .where(eq(cols.id, id))
        .all() as Record<string, unknown>[]

      if (updated.length === 0) {
        throw new Error(`Row vanished after update: ${id}`)
      }

      await enqueue(tx, 'update', id, updated[0])

      return decryptRow(updated[0], encryptedFieldSet, vaultKey) as RowOf<T>
    })
  }

  // ---- DELETE ---------------------------------------------------------------

  async function del(id: string): Promise<void> {
    if (softDelete && cols.deleted_at) {
      // A soft delete is a row UPDATE (deleted_at set; row still syncs) — update()
      // already enqueues operation='update' co-transactionally.
      await update(id, { deleted_at: ts() } as unknown as UpdateInput<T>)
    } else {
      await hardDelete(id)
    }
  }

  async function hardDelete(id: string): Promise<void> {
    // Snapshot before removal → delete + enqueue('delete') in ONE transaction.
    await db.transaction(async (tx) => {
      const existing = await tx
        .select()
        .from(table)
        .where(eq(cols.id, id))
        .all() as Record<string, unknown>[]

      await tx.delete(table).where(eq(cols.id, id)).run()

      if (existing.length > 0) {
        await enqueue(tx, 'delete', id, existing[0])
      }
    })
  }

  // ---- RETURN ---------------------------------------------------------------

  return {
    create,
    createInTx,
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
