// MOD-notes ②a — device id. Drives the real read/write over a better-sqlite3
// `SqliteDriver` stand-in (the AR-4/useSchemaVersion Node precedent), so the
// SELECT / INSERT-OR-IGNORE + app_state persistence are exercised for real.
import { describe, it, expect, beforeEach } from 'vitest'
import Database from 'better-sqlite3'
import type { SqliteDriver } from '@vida/core'
import { getOrCreateDeviceId, getDeviceId, resetDeviceIdForTest } from './device-id'

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
    async values(sqlText, params) {
      return db
        .prepare(sqlText)
        .raw()
        .all(...(params ?? [])) as unknown[][]
    },
    async batch() {},
    async close() {
      db.close()
    },
  }
}

function freshDriver(): SqliteDriver {
  const db = new Database(':memory:')
  db.exec('CREATE TABLE app_state (key TEXT PRIMARY KEY, value TEXT NOT NULL)')
  return driverOver(db)
}

describe('device-id — MOD-notes ②a', () => {
  beforeEach(() => resetDeviceIdForTest())

  it('creates + persists a UUIDv7 on first run', async () => {
    const driver = freshDriver()
    const id = await getOrCreateDeviceId(driver)
    expect(id).toMatch(/^[0-9a-f-]{36}$/) // UUID shape
    const rows = await driver.query<{ value: string }>(
      'SELECT value FROM app_state WHERE key = ?',
      ['device_id'],
    )
    expect(rows[0]?.value).toBe(id)
  })

  it('is idempotent — a second call returns the SAME id, never re-generates', async () => {
    const driver = freshDriver()
    const first = await getOrCreateDeviceId(driver)
    resetDeviceIdForTest() // simulate a fresh module load against the same persisted DB
    const second = await getOrCreateDeviceId(driver)
    expect(second).toBe(first)
  })

  it('getDeviceId() throws before boot resolves it (fail-loud, never a silent empty id)', () => {
    expect(() => getDeviceId()).toThrow(/not resolved/i)
  })

  it('getDeviceId() returns the cached id after getOrCreateDeviceId', async () => {
    const driver = freshDriver()
    const id = await getOrCreateDeviceId(driver)
    expect(getDeviceId()).toBe(id)
  })
})
