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
//   open (with SQLCipher passphrase) → migrate → ready → query → close
// ============================================================================

import { type BaseSQLiteDatabase } from 'drizzle-orm/sqlite-core'
import type { SqlCipherConfig } from '@vida/types'
import * as schema from './schema'

// ---------------------------------------------------------------------------
// Core types
// ---------------------------------------------------------------------------

/** Drizzle database instance typed to our schema */
export type DrizzleDb = BaseSQLiteDatabase<'sync', void, typeof schema>

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
 * Drizzle wraps this, but we also use it directly for migrations, PRAGMAs,
 * and SQLCipher configuration that Drizzle doesn't handle.
 */
export interface SqliteDriver {
  /** Execute a SQL statement (DDL, DML). Returns rows + metadata. */
  exec(sql: string, params?: unknown[]): RawQueryResult

  /** Execute a SQL statement that returns no rows (INSERT, UPDATE, DELETE). */
  run(sql: string, params?: unknown[]): void

  /** Execute a read-only query. Returns rows. */
  query<T = Record<string, unknown>>(sql: string, params?: unknown[]): T[]

  /** Execute multiple statements in a single batch (for migrations). */
  batch(statements: Array<{ sql: string; params?: unknown[] }>): void

  /** Close the database connection and release resources. */
  close(): void
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
   * Open the SQLCipher-encrypted database.
   *
   * Flow:
   *  1. Open the raw SQLite file with the platform driver
   *  2. Configure SQLCipher (PRAGMA key, kdf_iter, etc.)
   *  3. Verify the key works (SELECT on sqlite_master)
   *  4. Enable WAL mode for write performance
   *  5. Enable foreign keys
   *  6. Return the raw driver for Drizzle wrapping
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
   * The Drizzle instance is typed to our full schema.
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

  /** SQLCipher encryption configuration */
  sqlCipher: SqlCipherConfig

  /** Enable WAL mode (default true — better write performance) */
  walMode?: boolean

  /** Enable foreign key enforcement (default true) */
  foreignKeys?: boolean
}

/** Default SQLCipher config per ADR-002 §4 */
export const DEFAULT_SQLCIPHER_CONFIG: SqlCipherConfig = {
  passphrase: '',  // Set from Vault Key at runtime
  kdf_iter: 256_000,
  hmac_algorithm: 'HMAC_SHA512',
  page_size: 4096,
  plaintext_header_size: 0,
}

// ---------------------------------------------------------------------------
// Migration runner (shared logic — used by all platform adapters)
// ---------------------------------------------------------------------------

const SCHEMA_VERSION_KEY = 'schema_version'

/**
 * Read the current schema version from app_state.
 * Returns 0 if the table doesn't exist or has no version entry.
 */
export function getSchemaVersion(driver: SqliteDriver): number {
  try {
    const rows = driver.query<{ value: string }>(
      `SELECT value FROM app_state WHERE key = ?`,
      [SCHEMA_VERSION_KEY],
    )
    return rows.length > 0 ? parseInt(rows[0].value, 10) : 0
  } catch {
    // Table doesn't exist yet — first run
    return 0
  }
}

/**
 * Set the schema version in app_state.
 */
export function setSchemaVersion(driver: SqliteDriver, version: number): void {
  driver.run(
    `INSERT OR REPLACE INTO app_state (key, value) VALUES (?, ?)`,
    [SCHEMA_VERSION_KEY, String(version)],
  )
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
  const currentVersion = getSchemaVersion(driver)
  const pending = migrations
    .filter((m) => m.version > currentVersion)
    .sort((a, b) => a.version - b.version)

  let applied = 0

  for (const migration of pending) {
    driver.run('BEGIN TRANSACTION')
    try {
      await migration.up(driver)
      setSchemaVersion(driver, migration.version)
      driver.run('COMMIT')
      applied++
    } catch (err) {
      driver.run('ROLLBACK')
      throw new Error(
        `Migration ${migration.version} (${migration.name}) failed: ${
          err instanceof Error ? err.message : String(err)
        }`,
      )
    }
  }

  return { applied, currentVersion: getSchemaVersion(driver) }
}

// ---------------------------------------------------------------------------
// SQLCipher PRAGMA helper (shared — used by all platform adapters)
// ---------------------------------------------------------------------------

/**
 * Configure SQLCipher PRAGMAs after opening the database.
 * Must be called before any other SQL operations.
 */
export function configureSqlCipher(
  driver: SqliteDriver,
  config: SqlCipherConfig,
): void {
  // Set the encryption key — must be the FIRST statement after open
  driver.run(`PRAGMA key = '${config.passphrase}'`)

  // SQLCipher-specific PRAGMAs
  driver.run(`PRAGMA cipher_page_size = ${config.page_size}`)
  driver.run(`PRAGMA kdf_iter = ${config.kdf_iter}`)
  driver.run(`PRAGMA cipher_hmac_algorithm = ${config.hmac_algorithm}`)
  driver.run(`PRAGMA cipher_plaintext_header_size = ${config.plaintext_header_size}`)
}

/**
 * Apply standard SQLite PRAGMAs for performance and safety.
 * Called after SQLCipher configuration.
 */
export function configureConnection(
  driver: SqliteDriver,
  config: Pick<DatabaseConfig, 'walMode' | 'foreignKeys'>,
): void {
  if (config.walMode !== false) {
    driver.run('PRAGMA journal_mode = WAL')
  }
  if (config.foreignKeys !== false) {
    driver.run('PRAGMA foreign_keys = ON')
  }
  // Recommended SQLite tuning
  driver.run('PRAGMA synchronous = NORMAL')
  driver.run('PRAGMA temp_store = MEMORY')
  driver.run('PRAGMA cache_size = -8000') // 8 MB cache
}

/**
 * Verify that the SQLCipher key is correct by reading sqlite_master.
 * Throws if the passphrase is wrong (database is unreadable).
 */
export function verifyCipherKey(driver: SqliteDriver): void {
  try {
    driver.query('SELECT count(*) FROM sqlite_master')
  } catch {
    throw new Error(
      'Failed to open encrypted database — wrong passphrase or corrupt file',
    )
  }
}

// ---------------------------------------------------------------------------
// Full open sequence (shared helper for platform adapters)
// ---------------------------------------------------------------------------

/**
 * Standard open sequence that platform adapters call after creating the
 * raw SqliteDriver. Handles SQLCipher config → verify → PRAGMAs.
 */
export function initializeConnection(
  driver: SqliteDriver,
  config: DatabaseConfig,
): void {
  configureSqlCipher(driver, config.sqlCipher)
  verifyCipherKey(driver)
  configureConnection(driver, config)
}
