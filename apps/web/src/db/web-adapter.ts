// ============================================================================
// Web DatabaseAdapter — wa-sqlite + OPFS (AccessHandlePoolVFS) in a Web Worker
// AR-2 · ADR-001 §5 · ADR-002 §4
//
// The concrete `DatabaseAdapter` for the browser. MUST run inside a Web Worker:
// AccessHandlePoolVFS relies on FileSystemSyncAccessHandle, which only exists in
// a worker context. Encryption is OFF in M1.0 (SQLCipher → M3): `open()` opens a
// plain DB when `config.sqlCipher` is absent (the seam lives in @vida/core).
// ============================================================================

import SQLiteESMFactory from 'wa-sqlite/dist/wa-sqlite.mjs'
import * as SQLite from 'wa-sqlite'
import { AccessHandlePoolVFS } from 'wa-sqlite/src/examples/AccessHandlePoolVFS.js'
import {
  initializeConnection,
  runMigrations,
  createDrizzleProxy,
  type DatabaseAdapter,
  type DatabaseConfig,
  type SqliteDriver,
  type Migration,
  type DrizzleDb,
} from '@vida/core'
import { createWebDriver } from './web-driver'

/** OPFS directory holding the SQLite file pool (single vault in M1.0). */
const VFS_DIRECTORY = '/vida'

/**
 * Create the web `DatabaseAdapter`. The wa-sqlite module + VFS are bootstrapped
 * once (lazily) and reused across `open()` calls within the worker.
 */
export function createWebDatabaseAdapter(): DatabaseAdapter {
  let api: ReturnType<typeof SQLite.Factory> | null = null
  let vfs: AccessHandlePoolVFS | null = null

  async function ensureModule(): Promise<ReturnType<typeof SQLite.Factory>> {
    if (!api) {
      const module = await SQLiteESMFactory()
      const sqlite3 = SQLite.Factory(module)
      const poolVfs = new AccessHandlePoolVFS(VFS_DIRECTORY)
      await poolVfs.isReady
      // AccessHandlePoolVFS extends wa-sqlite's VFS.Base and IS a valid
      // SQLiteVFS at runtime; the local shim (wa-sqlite-vendor.d.ts) doesn't
      // restate the full 14-method interface, so narrow the type here.
      sqlite3.vfs_register(
        poolVfs as unknown as Parameters<typeof sqlite3.vfs_register>[0],
        true, // makeDefault → open_v2 needs no VFS name
      )
      api = sqlite3
      vfs = poolVfs
    }
    return api
  }

  return {
    async open(config: DatabaseConfig): Promise<SqliteDriver> {
      const sqlite3 = await ensureModule()
      const db = await sqlite3.open_v2(config.dbName)
      const driver = createWebDriver(sqlite3, db)
      // Plain when config.sqlCipher is absent (M1.0); the cipher seam is a no-op here.
      await initializeConnection(driver, config)
      return driver
    },

    async migrate(driver: SqliteDriver, migrations: Migration[]): Promise<void> {
      await runMigrations(driver, migrations)
    },

    createDrizzle(driver: SqliteDriver): DrizzleDb {
      return createDrizzleProxy(driver)
    },

    // NOTE (AR-2 / M1.0 scope): AccessHandlePoolVFS stores files under opaque
    // random OPFS names (the SQLite path lives in a file header), so existence
    // cannot be probed by filename. For the single-vault M1.0 model we report
    // whether the pool holds any persisted SQLite file. Per-name first-run
    // semantics arrive with AR-4/auth.
    async exists(_dbName: string): Promise<boolean> {
      await ensureModule()
      return (vfs?.getSize() ?? 0) > 0
    },

    // Clears the whole VFS directory (single-vault M1.0). Caller closes the DB first.
    async destroy(_dbName: string): Promise<void> {
      const root = await navigator.storage.getDirectory()
      const segments = VFS_DIRECTORY.split('/').filter(Boolean)
      try {
        let parent = root
        for (let i = 0; i < segments.length - 1; i++) {
          parent = await parent.getDirectoryHandle(segments[i])
        }
        await parent.removeEntry(segments[segments.length - 1], { recursive: true })
      } catch {
        // Directory absent — nothing to destroy.
      }
      // Force a fresh bootstrap on the next open().
      api = null
      vfs = null
    },
  }
}
