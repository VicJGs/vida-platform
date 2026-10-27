// ============================================================================
// DatabaseAdapter — Platform-agnostic SQLite abstraction
// ADR-001 §5 · ADR-002 §1, §4
//
// Each platform provides a concrete implementation:
//   Web:     wa-sqlite + OPFS  (apps/web)
//   Mobile:  expo-sqlite       (apps/mobile)
//   Desktop: Tauri SQL plugin  (apps/desktop)
//
// This adapter owns the full DB lifecycle:
//   open (plain in M1.0; SQLCipher seam for M3) → migrate → ready → query → close
//
// Execution model (AR-2, ADR-001): the underlying SQLite engine (wa-sqlite on web)
// exposes an ASYNC API, so the driver + the Drizzle instance are asynchronous.
// Drizzle is built with `drizzle-orm/sqlite-proxy` — the "async Drizzle proxy".
// ============================================================================

import { drizzle, type SqliteRemoteDatabase } from 'drizzle-orm/sqlite-proxy'
import type { SqlCipherConfig } from '@vida/types'
import * as schema from './schema'

// ---------------------------------------------------------------------------
// Core types
// ---------------------------------------------------------------------------

/**
 * Drizzle database instance typed to our schema.
 * Backed by the sqlite-proxy async driver → `BaseSQLiteDatabase<'async', …>`.
 */
export type DrizzleDb = SqliteRemoteDatabase<typeof schema>

/** Raw result from a SQL statement execution */
export interface RawQueryResult {
  rows: Record<string, unknown>[]
  changes: number
  lastInsertRowId: number | bigint
}

/** Migration definition (sequential, up only in SQLite) */
export interface Migration {
  version: number
  name: string
  up: (db: SqliteDriver) => void | Promise<void>
}

// ---------------------------------------------------------------------------
// SqliteDriver — raw SQL interface each platform must implement
// ---------------------------------------------------------------------------

/**
 * The minimal surface a platform must implement to provide SQLite access.
 * Drizzle wraps this (via the sqlite-proxy callback in `createDrizzleProxy`),
 * but we also use it directly for migrations, PRAGMAs, and SQLCipher
 * configuration that Drizzle doesn't handle.
 *
 * All methods are ASYNC: the web engine (wa-sqlite) exposes an async Factory
 * API, so a synchronous driver is not achievable. Native adapters (expo-sqlite,
 * Tauri) also satisfy this contract (their sync calls wrap trivially).
 */
export interface SqliteDriver {
  /** Execute a SQL statement (DDL, DML). Returns rows + metadata. */
  exec(sql: string, params?: unknown[]): Promise<RawQueryResult>

  /** Execute a SQL statement that returns no rows (INSERT, UPDATE, DELETE). */
  run(sql: string, params?: unknown[]): Promise<void>

  /**
   * Execute a read-only query. Returns rows as objects (column-name keyed).
   * Used internally (migrations, schema version, PRAGMAs).
   */
  query<T = Record<string, unknown>>(sql: string, params?: unknown[]): Promise<T[]>

  /**
   * Execute a read-only query. Returns rows as positional arrays.
   * This is the shape the Drizzle sqlite-proxy callback needs (Drizzle maps
   * positional cells to columns by index via its internal `mapResultRow`).
   */
  values(sql: string, params?: unknown[]): Promise<unknown[][]>

  /** Execute multiple statements in a single batch (for migrations). */
  batch(statements: Array<{ sql: string; params?: unknown[] }>): Promise<void>

  /** Close the database connection and release resources. */
  close(): Promise<void>
}

// ---------------------------------------------------------------------------
// DatabaseAdapter interface
// ---------------------------------------------------------------------------

/**
 * Platform-agnostic database adapter.
 * Each platform (web/mobile/desktop) provides a concrete implementation
 * that wires up the platform-specific SQLite driver.
 */
export interface DatabaseAdapter {
  /**
   * Open the database and return a ready driver.
   *
   * Flow:
   *  1. Open the raw SQLite file with the platform driver
   *  2. If `config.sqlCipher` is present (M3): configure SQLCipher + verify key
   *     — absent in M1.0, so the DB opens plain
   *  3. Apply standard connection PRAGMAs (WAL, foreign keys, tuning)
   *  4. Return the raw driver for Drizzle wrapping
   */
  open(config: DatabaseConfig): Promise<SqliteDriver>

  /**
   * Run all pending migrations.
   * Reads `schema_version` from `app_state`, applies migrations
   * sequentially from that version forward.
   */
  migrate(driver: SqliteDriver, migrations: Migration[]): Promise<void>

  /**
   * Create a Drizzle ORM instance wrapping the raw driver.
   * The Drizzle instance is typed to our full schema and is asynchronous.
   */
  createDrizzle(driver: SqliteDriver): DrizzleDb

  /**
   * Check if the database file exists on disk.
   * Used to distinguish first-run (create) from unlock (open existing).
   */
  exists(dbName: string): Promise<boolean>

  /**
   * Delete the database file. Used for account deletion / factory reset.
   */
  destroy(dbName: string): Promise<void>
}

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

export interface DatabaseConfig {
  /** Database filename (e.g. 'vida.db') */
  dbName: string

  /**
   * SQLCipher encryption configuration.
   * Absent in M1.0 → the DB opens plain (encryption deferred to M3 per ADR-017).
   * Present → `initializeConnection` configures + verifies the cipher (the M3 seam).
   */
  sqlCipher?: SqlCipherConfig

  /** Enable WAL mode (default true — better write performance) */
  walMode?: boolean

  /** Enable foreign key enforcement (default true) */
  foreignKeys?: boolean
}

/** Default SQLCipher config per ADR-002 §4 */
export const DEFAULT_SQLCIPHER_CONFIG: SqlCipherConfig = {
  passphrase: '', // Set from Vault Key at runtime
  kdf_iter: 256_000,
  hmac_algorithm: 'HMAC_SHA512',
  page_size: 4096,
  plaintext_header_size: 0,
}

// ---------------------------------------------------------------------------
// Drizzle proxy factory (shared — used by all platform adapters)
// ---------------------------------------------------------------------------

/**
 * Build the async Drizzle instance over a raw SqliteDriver using
 * `drizzle-orm/sqlite-proxy`. Every platform adapter's `createDrizzle`
 * delegates here so the SQL→driver mapping lives in exactly one place.
 *
 * The proxy callback receives `(sql, params, method)` and must return `{ rows }`
 * in the shape Drizzle expects PER METHOD:
 *  - 'run'            → no rows read back → `{ rows: [] }`
 *  - 'all' / 'values' → an array of positional-array rows → `{ rows: values }`
 *  - 'get'            → a SINGLE flat positional-array row (or `undefined` when
 *                       empty) → `{ rows: values[0] }`. Drizzle's `mapGetResult`
 *                       treats the whole `rows` value as one row, not a list.
 */
export function createDrizzleProxy(driver: SqliteDriver): DrizzleDb {
  return drizzle(
    async (sql, params, method) => {
      if (method === 'run') {
        await driver.run(sql, params)
        return { rows: [] }
      }
      const values = await driver.values(sql, params)
      // `get` returns the first row itself (flat), or `undefined` when there is
      // no row — Drizzle's mapGetResult handles the undefined case. The cast is
      // required because the callback's `rows` is typed `any[]` while `values[0]`
      // is `unknown[] | undefined`; passing `undefined` through is intentional.
      return { rows: (method === 'get' ? values[0] : values) as unknown[] }
    },
    { schema },
  )
}

// ---------------------------------------------------------------------------
// Migration runner (shared logic — used by all platform adapters)
// ---------------------------------------------------------------------------

const SCHEMA_VERSION_KEY = 'schema_version'

/**
 * Read the current schema version from app_state.
 * Returns 0 if the table doesn't exist or has no version entry.
 */
export async function getSchemaVersion(driver: SqliteDriver): Promise<number> {
  try {
    const rows = await driver.query<{ value: string }>(`SELECT value FROM app_state WHERE key = ?`, [
      SCHEMA_VERSION_KEY,
    ])
    return rows.length > 0 ? parseInt(rows[0].value, 10) : 0
  } catch {
    // Table doesn't exist yet — first run
    return 0
  }
}

/**
 * Set the schema version in app_state.
 */
export async function setSchemaVersion(driver: SqliteDriver, version: number): Promise<void> {
  await driver.run(`INSERT OR REPLACE INTO app_state (key, value) VALUES (?, ?)`, [SCHEMA_VERSION_KEY, String(version)])
}

/**
 * Run pending migrations sequentially.
 * Migrations must be sorted by version ascending.
 *
 * Each migration runs inside a transaction. If a migration fails,
 * the transaction rolls back and the version stays at the last
 * successful migration.
 */
export async function runMigrations(
  driver: SqliteDriver,
  migrations: Migration[],
): Promise<{ applied: number; currentVersion: number }> {
  const currentVersion = await getSchemaVersion(driver)
  const pending = migrations.filter((m) => m.version > currentVersion).sort((a, b) => a.version - b.version)

  let applied = 0

  for (const migration of pending) {
    await driver.run('BEGIN TRANSACTION')
    try {
      await migration.up(driver)
      await setSchemaVersion(driver, migration.version)
      await driver.run('COMMIT')
      applied++
    } catch (err) {
      await driver.run('ROLLBACK')
      throw new Error(
        `Migration ${migration.version} (${migration.name}) failed: ${
          err instanceof Error ? err.message : String(err)
        }`,
      )
    }
  }

  return { applied, currentVersion: await getSchemaVersion(driver) }
}

// ---------------------------------------------------------------------------
// SQLCipher PRAGMA helper (shared — used by all platform adapters)
// ---------------------------------------------------------------------------

/**
 * Configure SQLCipher PRAGMAs after opening the database.
 * Must be called before any other SQL operations.
 */
export async function configureSqlCipher(driver: SqliteDriver, config: SqlCipherConfig): Promise<void> {
  // Set the encryption key — must be the FIRST statement after open
  await driver.run(`PRAGMA key = '${config.passphrase}'`)

  // SQLCipher-specific PRAGMAs
  await driver.run(`PRAGMA cipher_page_size = ${config.page_size}`)
  await driver.run(`PRAGMA kdf_iter = ${config.kdf_iter}`)
  await driver.run(`PRAGMA cipher_hmac_algorithm = ${config.hmac_algorithm}`)
  await driver.run(`PRAGMA cipher_plaintext_header_size = ${config.plaintext_header_size}`)
}

/**
 * Apply standard SQLite PRAGMAs for performance and safety.
 * Called after SQLCipher configuration (when present).
 */
export async function configureConnection(
  driver: SqliteDriver,
  config: Pick<DatabaseConfig, 'walMode' | 'foreignKeys'>,
): Promise<void> {
  if (config.walMode !== false) {
    await driver.run('PRAGMA journal_mode = WAL')
  }
  if (config.foreignKeys !== false) {
    await driver.run('PRAGMA foreign_keys = ON')
  }
  // Recommended SQLite tuning
  await driver.run('PRAGMA synchronous = NORMAL')
  await driver.run('PRAGMA temp_store = MEMORY')
  await driver.run('PRAGMA cache_size = -8000') // 8 MB cache
}

/**
 * Verify that the SQLCipher key is correct by reading sqlite_master.
 * Throws if the passphrase is wrong (database is unreadable).
 */
export async function verifyCipherKey(driver: SqliteDriver): Promise<void> {
  try {
    await driver.query('SELECT count(*) FROM sqlite_master')
  } catch {
    throw new Error('Failed to open encrypted database — wrong passphrase or corrupt file')
  }
}

// ---------------------------------------------------------------------------
// Full open sequence (shared helper for platform adapters)
// ---------------------------------------------------------------------------

/**
 * Standard open sequence that platform adapters call after creating the
 * raw SqliteDriver.
 *
 * BR1: when `config.sqlCipher` is absent (M1.0 default), the DB opens plain —
 * no cipher PRAGMAs, no key verification.
 * BR2: when it is present (M3 activation), the cipher is configured + verified
 * first — this is the seam, not a code change at M3.
 * Standard connection PRAGMAs (WAL, foreign keys, tuning) always run.
 */
export async function initializeConnection(driver: SqliteDriver, config: DatabaseConfig): Promise<void> {
  if (config.sqlCipher) {
    await configureSqlCipher(driver, config.sqlCipher)
    await verifyCipherKey(driver)
  }
  await configureConnection(driver, config)
}
