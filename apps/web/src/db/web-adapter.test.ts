// ============================================================================
// AR-2 contract tests (Node / better-sqlite3 stand-in)
//
// Proves the platform-agnostic contract that the web worker also runs:
//   • the shared `createDrizzleProxy` (A5) row-shape mapping — the `get`/`all`
//     positional contract the critic flagged (REVISE 1/3);
//   • the async migration runner (no-op v0 + failing-migration rollback);
//   • the encryption seam (SQLCipher PRAGMAs only when a config is present).
//
// better-sqlite3 is a faithful SYNCHRONOUS stand-in: `.raw().all()` returns the
// same positional arrays wa-sqlite's `row()` produces, so a green test here
// validates the same contract the worker exercises over wa-sqlite.
//
// Repository CRUD (createRepository) is NOT tested here: it calls getVaultKey()
// unconditionally, so it requires an unlocked vault — that belongs to DB-6 (the
// repository seam) + M3 (encryption), not AR-2. Browser OPFS/worker wiring is
// covered by a separate Playwright smoke (verification-deferred — jsdom cannot
// provide FileSystemSyncAccessHandle).
// ============================================================================

import { describe, it, expect } from 'vitest'
import Database from 'better-sqlite3'
import { eq, sql } from 'drizzle-orm'
import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core'
import {
  createDrizzleProxy,
  runMigrations,
  getSchemaVersion,
  initializeConnection,
  DEFAULT_SQLCIPHER_CONFIG,
  type SqliteDriver,
  type Migration,
} from '@vida/core'

/** Build an async SqliteDriver backed by a synchronous better-sqlite3 handle. */
function createBetterSqlite3Driver(db: Database.Database): SqliteDriver {
  return {
    async exec(sqlText, params) {
      const stmt = db.prepare(sqlText)
      if (stmt.reader) {
        const rows = stmt.all(...(params ?? [])) as Record<string, unknown>[]
        return { rows, changes: 0, lastInsertRowId: 0 }
      }
      const info = stmt.run(...(params ?? []))
      return { rows: [], changes: info.changes, lastInsertRowId: info.lastInsertRowid }
    },
    async run(sqlText, params) {
      // Transaction-control + DDL statements must go through exec() in
      // better-sqlite3 (prepared BEGIN/COMMIT is rejected); parameterised
      // DML goes through a prepared statement.
      if (!params || params.length === 0) {
        db.exec(sqlText)
      } else {
        db.prepare(sqlText).run(...params)
      }
    },
    async query(sqlText, params) {
      return db.prepare(sqlText).all(...(params ?? [])) as never
    },
    async values(sqlText, params) {
      return db.prepare(sqlText).raw().all(...(params ?? [])) as unknown[][]
    },
    async batch(statements) {
      for (const s of statements) {
        if (s.params && s.params.length > 0) db.prepare(s.sql).run(...s.params)
        else db.exec(s.sql)
      }
    },
    async close() {
      db.close()
    },
  }
}

const fixture = sqliteTable('fixture', {
  id: text('id').primaryKey(),
  title: text('title'),
  n: integer('n'),
})

const CREATE_FIXTURE = `CREATE TABLE fixture (id TEXT PRIMARY KEY, title TEXT, n INTEGER)`

describe('createDrizzleProxy — row-shape contract', () => {
  it('maps all() to an array of rows and get() to a single row (multi-column)', async () => {
    const driver = createBetterSqlite3Driver(new Database(':memory:'))
    await driver.run(CREATE_FIXTURE)
    const db = createDrizzleProxy(driver)

    await db.insert(fixture).values({ id: 'a', title: 'hello', n: 42 }).run()
    await db.insert(fixture).values({ id: 'b', title: 'world', n: 7 }).run()

    // all() → array of fully-mapped rows
    const all = await db.select().from(fixture).all()
    expect(all).toHaveLength(2)
    expect(all).toContainEqual({ id: 'a', title: 'hello', n: 42 })

    // get() → ONE flat row correctly mapped across all columns. This is the
    // exact shape the critic caught: a wrong `get` mapping would leave title/n
    // undefined (or nest the array in id).
    const one = await db.select().from(fixture).where(eq(fixture.id, 'a')).get()
    expect(one).toEqual({ id: 'a', title: 'hello', n: 42 })

    // get() with no match → undefined (mapGetResult's empty branch)
    const none = await db.select().from(fixture).where(eq(fixture.id, 'zzz')).get()
    expect(none).toBeUndefined()

    await driver.close()
  })

  it('round-trips through a raw proxy run() then reads back', async () => {
    const driver = createBetterSqlite3Driver(new Database(':memory:'))
    await driver.run(CREATE_FIXTURE)
    const db = createDrizzleProxy(driver)

    await db.run(sql`INSERT INTO fixture (id, title, n) VALUES ('x', 'raw', 1)`)
    const row = await db.select().from(fixture).where(eq(fixture.id, 'x')).get()
    expect(row).toEqual({ id: 'x', title: 'raw', n: 1 })

    await driver.close()
  })
})

describe('migration runner (async)', () => {
  it('is a no-op at version 0 with an empty registry', async () => {
    const driver = createBetterSqlite3Driver(new Database(':memory:'))
    const result = await runMigrations(driver, [])
    expect(result).toEqual({ applied: 0, currentVersion: 0 })
    expect(await getSchemaVersion(driver)).toBe(0)
    await driver.close()
  })

  it('rolls back a failing migration and leaves the version unchanged', async () => {
    const bsql = new Database(':memory:')
    const driver = createBetterSqlite3Driver(bsql)
    // No app_state fixture: this migration's up() throws before any setSchemaVersion,
    // and getSchemaVersion is missing-table-safe (→0). DB-7 retired the hand-created fixture (BR-9).

    const failing: Migration = {
      version: 1,
      name: 'boom',
      up: async (d) => {
        await d.run(`CREATE TABLE probe (id TEXT)`)
        throw new Error('boom')
      },
    }

    await expect(runMigrations(driver, [failing])).rejects.toThrow(/boom/)
    // version stays 0
    expect(await getSchemaVersion(driver)).toBe(0)
    // the probe table was rolled back (SQLite has transactional DDL)
    const tables = await driver.values(
      `SELECT name FROM sqlite_master WHERE type='table' AND name='probe'`,
    )
    expect(tables).toHaveLength(0)

    await driver.close()
  })
})

describe('encryption seam (initializeConnection)', () => {
  function recordingDriver(): { driver: SqliteDriver; runs: string[] } {
    const runs: string[] = []
    const driver: SqliteDriver = {
      async exec() {
        return { rows: [], changes: 0, lastInsertRowId: 0 }
      },
      async run(sqlText) {
        runs.push(sqlText)
      },
      async query() {
        return []
      },
      async values() {
        return []
      },
      async batch() {},
      async close() {},
    }
    return { driver, runs }
  }

  it('skips cipher PRAGMAs when sqlCipher is absent (M1.0 plain)', async () => {
    const { driver, runs } = recordingDriver()
    await initializeConnection(driver, { dbName: 'vida.db' })
    expect(runs.some((s) => s.includes('PRAGMA key'))).toBe(false)
    expect(runs.some((s) => s.includes('journal_mode = WAL'))).toBe(true)
  })

  it('configures the cipher when sqlCipher is present (M3 seam)', async () => {
    const { driver, runs } = recordingDriver()
    await initializeConnection(driver, {
      dbName: 'vida.db',
      sqlCipher: DEFAULT_SQLCIPHER_CONFIG,
    })
    expect(runs.some((s) => s.startsWith('PRAGMA key'))).toBe(true)
    expect(runs.some((s) => s.includes('kdf_iter'))).toBe(true)
  })
})
