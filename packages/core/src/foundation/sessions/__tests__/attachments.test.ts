// ============================================================================
// XS-effect-rail #32 · S1 — attachment resolver tests (XCU-10)
// Live-store Verification Gate: better-sqlite3 + real migrations + Repository seed.
//   A1 — type + instance attachments both returned, levels correct
//   A2 — a session with no attachments → []
//   A3 — attachments for a different session are not returned (WHERE scoping)
// (A4 = tsc/lint/suite green, checked outside this file.)
// ============================================================================

import { describe, it, expect } from 'vitest'
import Database from 'better-sqlite3'
import { createDrizzleProxy, type SqliteDriver, type DrizzleDb } from '../../../db/adapter'
import { migrate } from '../../../db/migrations/runner'
import { createRepository } from '../../../db/repository'
import { sessionAttachments } from '../../../db/schema/foundation/sessions'
import { initVault } from '../../../encryption/vault'
import { resolveTargets } from '../attachments'

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

async function setup(): Promise<{ db: DrizzleDb; driver: SqliteDriver }> {
  await initVault() // libsodium ready — _sync_hash on write
  const bsql = new Database(':memory:')
  const driver = createBetterSqlite3Driver(bsql)
  await migrate(driver) // app_state (DB-7) + 001 sync_queue + 002 sessions (incl. session_attachments)
  const db = createDrizzleProxy(driver)
  return { db, driver }
}

// session_attachments has no [E] fields; Repository fills id + timestamps + _sync_*.
function attachmentsRepo(db: DrizzleDb) {
  return createRepository(db, sessionAttachments, { deviceId: 'test-device', encryptedFields: [] })
}

describe('XS-effect-rail #32 · S1 — resolveTargets (XCU-10)', () => {
  it('A1 — returns type + instance attachments with correct levels', async () => {
    const { db, driver } = await setup()
    const repo = attachmentsRepo(db)
    await repo.create({ session_id: 'sess-1', entity_type: 'habit', entity_id: 'hab-1', level: 'type' })
    await repo.create({ session_id: 'sess-1', entity_type: 'topic', entity_id: 'top-9', level: 'instance' })

    const targets = await resolveTargets(db, 'sess-1')

    expect(targets).toHaveLength(2)
    expect(targets).toEqual(
      expect.arrayContaining([
        { entityType: 'habit', entityId: 'hab-1', level: 'type' },
        { entityType: 'topic', entityId: 'top-9', level: 'instance' },
      ]),
    )
    await driver.close()
  })

  it('A2 — a session with no attachments returns []', async () => {
    const { db, driver } = await setup()
    expect(await resolveTargets(db, 'sess-empty')).toEqual([])
    await driver.close()
  })

  it('A3 — attachments for a different session are not returned', async () => {
    const { db, driver } = await setup()
    const repo = attachmentsRepo(db)
    await repo.create({ session_id: 'sess-1', entity_type: 'habit', entity_id: 'hab-1', level: 'type' })
    await repo.create({ session_id: 'sess-2', entity_type: 'project', entity_id: 'prj-2', level: 'instance' })

    const targets = await resolveTargets(db, 'sess-1')

    expect(targets).toEqual([{ entityType: 'habit', entityId: 'hab-1', level: 'type' }])
    await driver.close()
  })
})
