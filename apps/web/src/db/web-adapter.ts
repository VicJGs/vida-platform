// ============================================================================
// Web Database Adapter — wa-sqlite + OPFS
// ADR-001 §5 (wa-sqlite + OPFS for web), ADR-002 §4 (SQLCipher)
//
// wa-sqlite is inherently async (OPFS requires async I/O).
// This adapter wraps it into the SqliteDriver interface from @vida/core
// and creates a Drizzle instance via the sqlite-proxy async driver.
//
// The OPFS VFS stores the SQLite database file in the browser's
// Origin Private File System — persistent across sessions, not
// visible to the user, and works with WAL mode.
//
// Fallback: IDBBatchAtomicVFS if OPFS is not available.
// ============================================================================

import SQLiteESMFactory from 'wa-sqlite/dist/wa-sqlite-async.mjs'
import { Factory } from 'wa-sqlite'
// @ts-expect-error — no type declarations for IDB VFS example
import { IDBBatchAtomicVFS } from 'wa-sqlite/src/examples/IDBBatchAtomicVFS.js'

import { drizzle as drizzleProxy } from 'drizzle-orm/sqlite-proxy'
import type { SqliteRemoteDatabase } from 'drizzle-orm/sqlite-proxy'
import type {
  SqliteDriver,
  RawQueryResult,
  DatabaseConfig,
  Migration,
} from '@vida/core'
import { schema } from '@vida/core'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** The Drizzle DB type for web (async proxy mode) */
export type WebDrizzleDb = SqliteRemoteDatabase<typeof schema>

// wa-sqlite SQLiteAPI type (from the Factory call)
type SQLiteAPI = ReturnType<typeof Factory>

// ---------------------------------------------------------------------------
// Async driver (used directly by the web adapter)
// ---------------------------------------------------------------------------

async function execAsyncDirect(
  sqlite3: SQLiteAPI,
  db: number,
  sql: string,
  params?: unknown[],
): Promise<RawQueryResult> {
  const rows: Record<string, unknown>[] = []

  if (params && params.length > 0) {
    const result = await sqlite3.execWithParams(
      db,
      sql,
      params as (number | string | Uint8Array | null)[],
    )
    if (result.rows && result.columns) {
      for (const row of result.rows) {
        const obj: Record<string, unknown> = {}
        for (let i = 0; i < result.columns.length; i++) {
          obj[result.columns[i]] = row[i]
        }
        rows.push(obj)
      }
    }
  } else {
    await sqlite3.exec(db, sql, (row, columns) => {
      const obj: Record<string, unknown> = {}
      for (let i = 0; i < columns.length; i++) {
        obj[columns[i]] = row[i]
      }
      rows.push(obj)
    })
  }

  return {
    rows,
    changes: sqlite3.changes(db),
    lastInsertRowId: 0,
  }
}

/**
 * Async SqliteDriver — uses await for all operations.
 * Used for PRAGMA configuration and migrations on OPFS.
 */
function createAsyncDriver(sqlite3: SQLiteAPI, db: number): AsyncSqliteDriver {
  return {
    async exec(sql, params) {
      return execAsyncDirect(sqlite3, db, sql, params)
    },
    async run(sql, params) {
      await execAsyncDirect(sqlite3, db, sql, params)
    },
    async query<T = Record<string, unknown>>(sql: string, params?: unknown[]) {
      const result = await execAsyncDirect(sqlite3, db, sql, params)
      return result.rows as T[]
    },
    async batch(statements) {
      for (const stmt of statements) {
        await execAsyncDirect(sqlite3, db, stmt.sql, stmt.params)
      }
    },
    close() {
      sqlite3.close(db)
    },
  }
}

interface AsyncSqliteDriver {
  exec(sql: string, params?: unknown[]): Promise<RawQueryResult>
  run(sql: string, params?: unknown[]): Promise<void>
  query<T = Record<string, unknown>>(sql: string, params?: unknown[]): Promise<T[]>
  batch(statements: Array<{ sql: string; params?: unknown[] }>): Promise<void>
  close(): void
}

// ---------------------------------------------------------------------------
// SQLCipher PRAGMAs (async version for wa-sqlite)
// ---------------------------------------------------------------------------

async function configureSqlCipherAsync(
  driver: AsyncSqliteDriver,
  config: DatabaseConfig,
): Promise<void> {
  await driver.run(`PRAGMA key = '${config.sqlCipher.passphrase}'`)
  await driver.run(`PRAGMA cipher_page_size = ${config.sqlCipher.page_size}`)
  await driver.run(`PRAGMA kdf_iter = ${config.sqlCipher.kdf_iter}`)
  await driver.run(`PRAGMA cipher_hmac_algorithm = ${config.sqlCipher.hmac_algorithm}`)
  await driver.run(`PRAGMA cipher_plaintext_header_size = ${config.sqlCipher.plaintext_header_size}`)
}

async function configureConnectionAsync(
  driver: AsyncSqliteDriver,
  config: DatabaseConfig,
): Promise<void> {
  if (config.walMode !== false) {
    await driver.run('PRAGMA journal_mode = WAL')
  }
  if (config.foreignKeys !== false) {
    await driver.run('PRAGMA foreign_keys = ON')
  }
  await driver.run('PRAGMA synchronous = NORMAL')
  await driver.run('PRAGMA temp_store = MEMORY')
  await driver.run('PRAGMA cache_size = -8000')
}

async function verifyCipherKeyAsync(driver: AsyncSqliteDriver): Promise<void> {
  try {
    await driver.query('SELECT count(*) FROM sqlite_master')
  } catch {
    throw new Error('Failed to open encrypted database — wrong passphrase or corrupt file')
  }
}

// ---------------------------------------------------------------------------
// Migration runner (async version for wa-sqlite)
// ---------------------------------------------------------------------------

async function runMigrationsAsync(
  driver: AsyncSqliteDriver,
  migrations: Migration[],
): Promise<{ applied: number; currentVersion: number }> {
  // Read current version
  let currentVersion = 0
  try {
    const rows = await driver.query<{ value: string }>(
      'SELECT value FROM app_state WHERE key = ?',
      ['schema_version'],
    )
    if (rows.length > 0) {
      currentVersion = parseInt(rows[0].value, 10)
    }
  } catch {
    // app_state doesn't exist yet — first run
  }

  const pending = migrations
    .filter((m) => m.version > currentVersion)
    .sort((a, b) => a.version - b.version)

  let applied = 0

  for (const migration of pending) {
    await driver.run('BEGIN TRANSACTION')
    try {
      // The migration's `up` expects a SqliteDriver (sync).
      // We provide a shim that delegates to the async driver.
      const syncShim: SqliteDriver = {
        exec(_sql: string, _params?: unknown[]) {
          return { rows: [], changes: 0, lastInsertRowId: 0 }
        },
        run() { /* no-op — batch handles it */ },
        query() { return [] },
        batch(statements: Array<{ sql: string; params?: unknown[] }>) {
          // This is what migrations actually call.
          // We need to run these synchronously within the transaction.
          // Since wa-sqlite-async serializes operations, we push them
          // through the async driver. The `up` function is sync,
          // so we collect the SQL and run it after.
          (syncShim as unknown as { _pending: typeof statements })._pending = statements
        },
        close() { /* no-op */ },
      }

      // Run the migration's up() — it will call batch() with SQL statements
      migration.up(syncShim)

      // Execute the collected batch statements asynchronously
      const pending_stmts = (syncShim as unknown as { _pending?: Array<{ sql: string; params?: unknown[] }> })._pending
      if (pending_stmts) {
        await driver.batch(pending_stmts)
      }

      // Update schema version
      await driver.run(
        "INSERT OR REPLACE INTO app_state (key, value) VALUES (?, ?)",
        ['schema_version', String(migration.version)],
      )
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

  // Re-read final version
  let finalVersion = currentVersion
  try {
    const rows = await driver.query<{ value: string }>(
      'SELECT value FROM app_state WHERE key = ?',
      ['schema_version'],
    )
    if (rows.length > 0) {
      finalVersion = parseInt(rows[0].value, 10)
    }
  } catch { /* ignore */ }

  return { applied, currentVersion: finalVersion }
}

// ---------------------------------------------------------------------------
// VFS initialization
// ---------------------------------------------------------------------------

async function initVfs(sqlite3: SQLiteAPI): Promise<string> {
  // Try IDBBatchAtomicVFS (most compatible, works in all browsers)
  const vfsName = 'idb-batch-atomic'
  const vfs = new IDBBatchAtomicVFS(vfsName)
  sqlite3.vfs_register(vfs, true)
  return vfsName
}

// ---------------------------------------------------------------------------
// Web DatabaseAdapter implementation
// ---------------------------------------------------------------------------

export interface WebAdapterState {
  sqlite3: SQLiteAPI
  db: number
  asyncDriver: AsyncSqliteDriver
  drizzle: WebDrizzleDb
}

/**
 * Create the web database adapter using wa-sqlite + IDBBatchAtomicVFS.
 *
 * Usage:
 * ```ts
 * const adapter = createWebAdapter()
 * const state = await adapter.openAsync({
 *   dbName: 'vida.db',
 *   sqlCipher: { ...DEFAULT_SQLCIPHER_CONFIG, passphrase: vaultKeyHex },
 * })
 * // state.drizzle is ready for queries
 * ```
 */
export function createWebAdapter() {
  let state: WebAdapterState | null = null

  return {
    /**
     * Open the database with full async flow for wa-sqlite.
     * Handles: WASM init → VFS registration → open → SQLCipher → PRAGMAs.
     */
    async openAsync(config: DatabaseConfig): Promise<WebAdapterState> {
      // 1. Initialize wa-sqlite WASM module
      const wasmModule = await SQLiteESMFactory()
      const sqlite3 = Factory(wasmModule)

      // 2. Register the VFS (IDBBatchAtomicVFS)
      await initVfs(sqlite3)

      // 3. Open the database file
      const db = await sqlite3.open_v2(config.dbName)

      // 4. Create async driver for PRAGMAs and migrations
      const asyncDriver = createAsyncDriver(sqlite3, db)

      // 5. Configure SQLCipher
      await configureSqlCipherAsync(asyncDriver, config)

      // 6. Verify the cipher key
      await verifyCipherKeyAsync(asyncDriver)

      // 7. Apply connection PRAGMAs (WAL, FK, etc.)
      await configureConnectionAsync(asyncDriver, config)

      // 8. Create Drizzle instance via sqlite-proxy
      const drizzle = drizzleProxy(
        async (sql, params, method) => {
          const result = await execAsyncDirect(
            sqlite3,
            db,
            sql,
            params,
          )

          if (method === 'run') {
            return { rows: [] }
          }

          // Convert Record<string, unknown>[] to any[][] for Drizzle
          if (result.rows.length === 0) {
            return { rows: [] }
          }

          const keys = Object.keys(result.rows[0])
          const mapped = result.rows.map((row) =>
            keys.map((k) => row[k]),
          )

          return { rows: mapped as unknown[][] }
        },
        { schema },
      ) as unknown as WebDrizzleDb

      state = { sqlite3, db, asyncDriver, drizzle }
      return state
    },

    /**
     * Run all pending migrations using the async driver.
     */
    async migrateAsync(
      asyncDriver: AsyncSqliteDriver,
      migrations: Migration[],
    ): Promise<{ applied: number; currentVersion: number }> {
      return runMigrationsAsync(asyncDriver, migrations)
    },

    /**
     * Get the Drizzle instance. Throws if not opened.
     */
    getDrizzle(): WebDrizzleDb {
      if (!state) throw new Error('Database not opened — call openAsync() first')
      return state.drizzle
    },

    /**
     * Get the async driver for raw SQL operations.
     */
    getAsyncDriver(): AsyncSqliteDriver {
      if (!state) throw new Error('Database not opened — call openAsync() first')
      return state.asyncDriver
    },

    /**
     * Check if the database exists in IndexedDB.
     */
    async exists(dbName: string): Promise<boolean> {
      try {
        const databases = await indexedDB.databases()
        return databases.some((db) => db.name === dbName)
      } catch {
        // indexedDB.databases() not available in all browsers
        return new Promise((resolve) => {
          const req = indexedDB.open(dbName)
          let existed = true
          req.onupgradeneeded = () => {
            existed = false
          }
          req.onsuccess = () => {
            req.result.close()
            if (!existed) {
              indexedDB.deleteDatabase(dbName)
            }
            resolve(existed)
          }
          req.onerror = () => resolve(false)
        })
      }
    },

    /**
     * Delete the database from IndexedDB.
     */
    async destroy(dbName: string): Promise<void> {
      if (state) {
        state.asyncDriver.close()
        state = null
      }
      return new Promise((resolve, reject) => {
        const req = indexedDB.deleteDatabase(dbName)
        req.onsuccess = () => resolve()
        req.onerror = () => reject(new Error(`Failed to delete database: ${dbName}`))
      })
    },

    /**
     * Close the database connection.
     */
    close(): void {
      if (state) {
        state.asyncDriver.close()
        state = null
      }
    },

  }
}

// ---------------------------------------------------------------------------
// Convenience: full init sequence
// ---------------------------------------------------------------------------

/**
 * One-call initialization for the web platform.
 *
 * ```ts
 * import { initWebDatabase } from './db/web-adapter'
 * import initialMigration from '@vida/core/db/migrations/001_initial'
 *
 * const { drizzle, asyncDriver } = await initWebDatabase({
 *   dbName: 'vida.db',
 *   passphrase: vaultKeyHex,
 * })
 * ```
 */
export async function initWebDatabase(opts: {
  dbName: string
  passphrase: string
  migrations?: Migration[]
}): Promise<WebAdapterState> {
  const adapter = createWebAdapter()

  const state = await adapter.openAsync({
    dbName: opts.dbName,
    sqlCipher: {
      passphrase: opts.passphrase,
      kdf_iter: 256_000,
      hmac_algorithm: 'HMAC_SHA512',
      page_size: 4096,
      plaintext_header_size: 0,
    },
  })

  if (opts.migrations && opts.migrations.length > 0) {
    await adapter.migrateAsync(state.asyncDriver, opts.migrations)
  }

  return state
}

export type { AsyncSqliteDriver }
