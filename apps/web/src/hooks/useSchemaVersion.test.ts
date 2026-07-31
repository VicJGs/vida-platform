// AR-4 reference read — proves the queryFn's data path (getSchemaVersion over a
// real SQLite driver) under the better-sqlite3 Node stand-in (AR-2 precedent).
// The live OPFS path is a Playwright follow-up (LIF-103); the hook wiring itself
// is trivial (useQuery over this call).
import { describe, it, expect } from 'vitest'
import Database from 'better-sqlite3'
import { getSchemaVersion, type SqliteDriver } from '@vida/core'

function driverOver(db: Database.Database): SqliteDriver {
  return {
    async exec() {
      return { rows: [], changes: 0, lastInsertRowId: 0 }
    },
    async run(sqlText, params) {
      if (!params || params.length === 0) db.exec(sqlText)
      else db.prepare(sqlText).run(...params)
    },
    async query(sqlText, params) {
      return db.prepare(sqlText).all(...(params ?? [])) as never
    },
    async values() {
      return []
    },
    async batch() {},
    async close() {
      db.close()
    },
  }
}

describe('getSchemaVersion — the AR-4 reference read', () => {
  it('reads the persisted schema_version from app_state', async () => {
    const driver = driverOver(new Database(':memory:'))
    await driver.run(`CREATE TABLE app_state (key TEXT PRIMARY KEY, value TEXT NOT NULL)`)
    await driver.run(`INSERT INTO app_state (key, value) VALUES ('schema_version', '5')`)
    expect(await getSchemaVersion(driver)).toBe(5)
    await driver.close()
  })

  it('returns 0 before app_state exists (missing-table safe)', async () => {
    const driver = driverOver(new Database(':memory:'))
    expect(await getSchemaVersion(driver)).toBe(0)
    await driver.close()
  })
})
