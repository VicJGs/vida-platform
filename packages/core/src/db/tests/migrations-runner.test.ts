// ============================================================================
// DB-7 — Migrations runner + app_state infra bootstrap (Node / better-sqlite3)
//
// Proves db-7's charter over the SAME async proxy contract the web worker runs:
//   • migrate() bootstraps app_state (ensureInfra) BEFORE the versioned loop, so
//     schema_version persists on a FRESH DB with NO hand-created fixture (BR-4/BR-5)
//   • the persisted version survives a close/reopen (BR-3)
//   • re-running migrate() when up-to-date is a no-op (BR-6)
//   • a failing migration rolls back and leaves the version unchanged (BR-6)
//   • resetDev() destroys + rebuilds to LATEST_VERSION (BR-8; web OPFS round-trip
//     is a Playwright follow-up — jsdom can't host the VFS, cf. LIF-103)
//
// NB: NONE of these tests hand-create app_state — that is the whole point (BR-9).
// ============================================================================

import { describe, it, expect, afterEach } from 'vitest'
import Database from 'better-sqlite3'
import { existsSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import {
  createDrizzleProxy,
  runMigrations,
  getSchemaVersion,
  type SqliteDriver,
  type Migration,
  type DatabaseAdapter,
  type DatabaseConfig,
} from '../adapter'
import { migrate, ensureInfra, currentVersion, LATEST_VERSION, resetDev, listMigrations } from '../migrations/runner'

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
      if (!params || params.length === 0) db.exec(sqlText)
      else db.prepare(sqlText).run(...params)
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

async function tableExists(driver: SqliteDriver, name: string): Promise<boolean> {
  const rows = await driver.values(
    `SELECT name FROM sqlite_master WHERE type='table' AND name=?`,
    [name],
  )
  return rows.length > 0
}

describe('DB-7 migrations runner — app_state bootstrap', () => {
  it('migrate() creates app_state + persists schema_version on a FRESH DB (no fixture)', async () => {
    const driver = createBetterSqlite3Driver(new Database(':memory:'))

    // Pre-condition: nothing has created app_state.
    expect(await tableExists(driver, 'app_state')).toBe(false)

    const result = await migrate(driver)

    // ensureInfra created app_state, and every registered migration applied + persisted.
    expect(await tableExists(driver, 'app_state')).toBe(true)
    expect(result.applied).toBe(listMigrations().length)
    expect(result.currentVersion).toBe(LATEST_VERSION)
    expect(await currentVersion(driver)).toBe(LATEST_VERSION)
    await driver.close()
  })

  it('ensureInfra is idempotent (safe to run when app_state already exists)', async () => {
    const driver = createBetterSqlite3Driver(new Database(':memory:'))
    await ensureInfra(driver)
    await expect(ensureInfra(driver)).resolves.toBeUndefined()
    expect(await tableExists(driver, 'app_state')).toBe(true)
    await driver.close()
  })

  it('re-running migrate() when up-to-date is a no-op', async () => {
    const driver = createBetterSqlite3Driver(new Database(':memory:'))
    await migrate(driver)
    const again = await migrate(driver)
    expect(again.applied).toBe(0)
    expect(again.currentVersion).toBe(LATEST_VERSION)
    await driver.close()
  })

  it('a failing migration rolls back and leaves schema_version unchanged', async () => {
    const driver = createBetterSqlite3Driver(new Database(':memory:'))
    await ensureInfra(driver) // app_state exists, so setSchemaVersion COULD run if reached
    const failing: Migration = {
      version: 1,
      name: 'boom',
      up: async (d) => {
        await d.run(`CREATE TABLE probe (id TEXT)`)
        throw new Error('boom')
      },
    }
    await expect(runMigrations(driver, [failing])).rejects.toThrow(/boom/)
    expect(await getSchemaVersion(driver)).toBe(0) // version never advanced
    expect(await tableExists(driver, 'probe')).toBe(false) // DDL rolled back
    await driver.close()
  })
})

describe('DB-7 — persistence + resetDev (file-backed)', () => {
  const dbPath = join(tmpdir(), 'vida-db7-runner.test.db')
  const cleanup = () => {
    for (const p of [dbPath, `${dbPath}-wal`, `${dbPath}-shm`]) if (existsSync(p)) rmSync(p)
  }
  afterEach(cleanup)

  it('persists schema_version across a close/reopen', async () => {
    cleanup()
    const d1 = createBetterSqlite3Driver(new Database(dbPath))
    await migrate(d1)
    expect(await currentVersion(d1)).toBe(LATEST_VERSION)
    await d1.close()

    const d2 = createBetterSqlite3Driver(new Database(dbPath))
    expect(await currentVersion(d2)).toBe(LATEST_VERSION) // survived the reopen
    await d2.close()
  })

  it('resetDev() destroys + rebuilds to LATEST_VERSION', async () => {
    // A minimal file-backed adapter exercising only what resetDev chains (destroy → open → migrate).
    let handle: Database.Database | null = null
    const adapter: DatabaseAdapter = {
      async open(config: DatabaseConfig) {
        handle = new Database(config.dbName)
        return createBetterSqlite3Driver(handle)
      },
      async migrate(driver, migrations) {
        await runMigrations(driver, migrations)
      },
      createDrizzle(driver) {
        return createDrizzleProxy(driver)
      },
      async exists(dbName) {
        return existsSync(dbName)
      },
      async destroy(dbName) {
        if (handle) {
          handle.close()
          handle = null
        }
        if (existsSync(dbName)) rmSync(dbName)
      },
    }

    // Seed a pre-existing DB so destroy has something to delete.
    const seed = createBetterSqlite3Driver(new Database(dbPath))
    await migrate(seed)
    await seed.close()
    expect(existsSync(dbPath)).toBe(true)

    const result = await resetDev(adapter, { dbName: dbPath })
    expect(result.currentVersion).toBe(LATEST_VERSION)
    expect(result.applied).toBe(listMigrations().length) // rebuilt from zero
  })
})
