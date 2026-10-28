// ============================================================================
// DB-6 — Repository layer tests (Node / better-sqlite3 stand-in)
//
// Proves the DB-6 charter over the SAME async proxy contract the web worker runs:
//   • sync_queue foundation table is created by the registered migration (B2-B4)
//   • every mutation enqueues co-transactionally (ADR-004 §3.4)
//   • atomicity is enforced at the SQL level (a queue-write fault rolls back the row)
//   • repeated pre-flush mutations COALESCE via UPSERT (UNIQUE table,row,operation)
//   • M1.0 pass-through: empty [E] set + LOCKED vault → plaintext, no getVaultKey()
//   • the encryption seam still round-trips when [E] fields + an unlocked vault exist
//   • soft-delete / managed-field / _sync_hash behaviour is unchanged (regression)
// ============================================================================

import { describe, it, expect, afterEach } from 'vitest'
import Database from 'better-sqlite3'
import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core'
import { createDrizzleProxy, type SqliteDriver, type DrizzleDb } from '../adapter'
import { migrate, currentVersion } from '../migrations/runner'
import { createRepository } from '../repository'
import { baseColumns } from '../schema/_shared'
import { syncQueue } from '../schema/foundation/sync-queue'
import { unlock, lock } from '../../encryption/key-management'
import { initVault, generateAccountKey, generateSalt } from '../../encryption/vault'

// --- a test entity table (baseColumns + a plaintext + a would-be-encrypted field) ---
const widgets = sqliteTable('widgets', {
  ...baseColumns,
  title: text('title'),
  secret: text('secret'),
  deleted_at: integer('deleted_at'),
})

const CREATE_WIDGETS = `
  CREATE TABLE widgets (
    id              TEXT PRIMARY KEY,
    created_at      INTEGER NOT NULL,
    updated_at      INTEGER NOT NULL,
    _sync_id        TEXT NOT NULL UNIQUE,
    _sync_version   INTEGER NOT NULL DEFAULT 1,
    _sync_device_id TEXT NOT NULL,
    _sync_lww_ts    INTEGER NOT NULL,
    _sync_status    TEXT NOT NULL DEFAULT 'pending',
    _sync_hash      TEXT,
    title           TEXT,
    secret          TEXT,
    deleted_at      INTEGER
  )`

/** Build an async SqliteDriver over a synchronous better-sqlite3 handle (AR-2 pattern). */
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
      return db
        .prepare(sqlText)
        .raw()
        .all(...(params ?? [])) as unknown[][]
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

/** Fresh in-memory DB with app_state + widgets + the registered sync_queue migration applied. */
async function setup(): Promise<{ driver: SqliteDriver; db: DrizzleDb; bsql: Database.Database }> {
  await initVault() // libsodium ready — required by hashContent (_sync_hash), independent of vault UNLOCK
  const bsql = new Database(':memory:')
  const driver = createBetterSqlite3Driver(bsql)
  await driver.run(CREATE_WIDGETS)
  await migrate(driver) // bootstraps app_state (DB-7 ensureInfra) + applies migration 001 → sync_queue (proves B2-B4 end-to-end)
  const db = createDrizzleProxy(driver)
  return { driver, db, bsql }
}

const cfg = (encryptedFields: string[] = [], softDelete = false) => ({
  encryptedFields,
  deviceId: 'test-device',
  softDelete,
})

afterEach(() => {
  lock() // ensure vault is locked between tests (cases unlock it explicitly)
})

describe('DB-6 — migration wiring', () => {
  it('registers + applies migration 001 (sync_queue exists after migrations applied)', async () => {
    const { driver } = await setup()
    // >= 1: migration 001 is applied. Exact version is not asserted here — AR-5 registered
    // migration 002 (sessions), so the global count is no longer 1; this test's charter is
    // that DB-6's own migration ran and created sync_queue, not the global migration count.
    expect(await currentVersion(driver)).toBeGreaterThanOrEqual(1)
    const tables = await driver.values(`SELECT name FROM sqlite_master WHERE type='table' AND name='sync_queue'`)
    expect(tables).toHaveLength(1)
    await driver.close()
  })
})

describe('DB-6 — co-transactional enqueue (producer side, ADR-004 §3.4)', () => {
  it('create → persists the row + exactly one sync_queue create row (payload = persisted row)', async () => {
    const { db, driver } = await setup()
    const repo = createRepository(db, widgets, cfg())

    const w = await repo.create({ title: 'hello', secret: 'plain', deleted_at: null })

    // managed fields (regression guard)
    expect(w.id).toMatch(/^[0-9a-f-]{36}$/)
    expect(typeof w.created_at).toBe('number')
    expect(w._sync_status).toBe('pending')
    expect(w._sync_hash).toBeTypeOf('string')

    const q = await db.select().from(syncQueue).all()
    expect(q).toHaveLength(1)
    expect(q[0].operation).toBe('create')
    expect(q[0].table_name).toBe('widgets')
    expect(q[0].row_id).toBe(w.id)
    expect(q[0].status).toBe('pending')
    expect(JSON.parse(q[0].payload as string)).toMatchObject({ id: w.id, title: 'hello' })
    await driver.close()
  })

  it('update → enqueues operation=update with the RE-READ row as payload + bumped version', async () => {
    const { db, driver } = await setup()
    const repo = createRepository(db, widgets, cfg())
    const w = await repo.create({ title: 'v1', secret: null, deleted_at: null })

    const updated = await repo.update(w.id, { title: 'v2' })
    expect(updated.title).toBe('v2')
    expect(updated._sync_version).toBe(2)

    const upd = (await db.select().from(syncQueue).all()).filter((r) => r.operation === 'update')
    expect(upd).toHaveLength(1)
    expect(JSON.parse(upd[0].payload as string)).toMatchObject({ id: w.id, title: 'v2', _sync_version: 2 })
    await driver.close()
  })

  it('hard delete → removes the row + enqueues operation=delete with the pre-delete snapshot', async () => {
    const { db, driver } = await setup()
    const repo = createRepository(db, widgets, cfg())
    const w = await repo.create({ title: 'doomed', secret: null, deleted_at: null })

    await repo.delete(w.id) // softDelete=false → hard delete
    expect(await repo.findById(w.id)).toBeNull()

    const del = (await db.select().from(syncQueue).all()).filter((r) => r.operation === 'delete')
    expect(del).toHaveLength(1)
    expect(JSON.parse(del[0].payload as string)).toMatchObject({ id: w.id, title: 'doomed' })
    await driver.close()
  })

  it('soft delete → enqueues operation=update (deleted_at set; row still syncs)', async () => {
    const { db, driver } = await setup()
    const repo = createRepository(db, widgets, cfg([], /* softDelete */ true))
    const w = await repo.create({ title: 'x', secret: null, deleted_at: null })

    await repo.delete(w.id)
    expect(await repo.findById(w.id)).toBeNull() // filtered by isNull(deleted_at)

    const ops = (await db.select().from(syncQueue).all()).map((r) => r.operation)
    expect(ops).toContain('update')
    expect(ops).not.toContain('delete')
    await driver.close()
  })
})

describe('DB-6 — SQL-level atomicity', () => {
  it('a fault on the queue write after the entity write rolls back BOTH', async () => {
    await initVault()
    const bsql = new Database(':memory:')
    const base = createBetterSqlite3Driver(bsql)
    let faultQueueInsert = false
    const driver: SqliteDriver = {
      ...base,
      async run(sqlText, params) {
        if (faultQueueInsert && /insert into ["`]?sync_queue/i.test(sqlText)) {
          throw new Error('injected: queue write failed')
        }
        return base.run(sqlText, params)
      },
    }
    await driver.run(CREATE_WIDGETS)
    await migrate(driver)
    const db = createDrizzleProxy(driver)
    const repo = createRepository(db, widgets, cfg())

    faultQueueInsert = true
    // drizzle wraps the injected driver error as "Failed query: insert into sync_queue…"
    // — the wrapper still proves the failure was on the QUEUE write specifically.
    await expect(repo.create({ title: 'atomic', secret: null, deleted_at: null })).rejects.toThrow(/sync_queue/)

    // ROLLBACK must have undone the entity write on the real connection.
    faultQueueInsert = false
    const rows = await db.select().from(widgets).all()
    expect(rows).toHaveLength(0)
    const q = await db.select().from(syncQueue).all()
    expect(q).toHaveLength(0)
    await driver.close()
  })
})

describe('DB-6 — coalescing (UPSERT on UNIQUE(table,row,operation))', () => {
  it('two updates before flush → ONE update queue row carrying the latest snapshot', async () => {
    const { db, driver } = await setup()
    const repo = createRepository(db, widgets, cfg())
    const w = await repo.create({ title: 'v1', secret: null, deleted_at: null })

    await repo.update(w.id, { title: 'v2' })
    await repo.update(w.id, { title: 'v3' }) // would violate UNIQUE if plain INSERT

    const upd = (await db.select().from(syncQueue).all()).filter((r) => r.operation === 'update')
    expect(upd).toHaveLength(1)
    expect(JSON.parse(upd[0].payload as string).title).toBe('v3')
    expect(upd[0].status).toBe('pending')
    await driver.close()
  })
})

describe('DB-6 — M1.0 pass-through seam (empty [E] set, vault LOCKED)', () => {
  it('CRUD round-trips plaintext with the vault locked (no getVaultKey throw)', async () => {
    const { db, driver } = await setup()
    const repo = createRepository(db, widgets, cfg([])) // no encrypted fields

    // vault is locked (afterEach + never unlocked) — this must NOT throw
    const w = await repo.create({ title: 't', secret: 'stored-plain', deleted_at: null })
    const readBack = await repo.findById(w.id)
    expect(readBack?.secret).toBe('stored-plain')

    // stored plaintext at rest (raw column is not "nonce:ciphertext")
    const raw = await driver.values(`SELECT secret FROM widgets WHERE id = ?`, [w.id])
    expect(raw[0][0]).toBe('stored-plain')
    await driver.close()
  })
})

describe('DB-6 — encryption seam intact (non-empty [E] set + unlocked vault)', () => {
  it('encrypts at rest and decrypts on read for E-classified fields', async () => {
    const { db, driver } = await setup()
    // Unlock a throwaway vault (Argon2id derive — real crypto path).
    await unlock('test-password', generateAccountKey(), generateSalt())

    const repo = createRepository(db, widgets, cfg(['secret']))
    const w = await repo.create({ title: 'clear', secret: 'top-secret', deleted_at: null })

    // at rest: packed "nonce:ciphertext", NOT the plaintext
    const raw = await driver.values(`SELECT secret FROM widgets WHERE id = ?`, [w.id])
    expect(raw[0][0]).not.toBe('top-secret')
    expect(String(raw[0][0])).toContain(':')

    // on read: decrypted back to plaintext
    const readBack = await repo.findById(w.id)
    expect(readBack?.secret).toBe('top-secret')
    expect(readBack?.title).toBe('clear') // non-E field untouched
    await driver.close()
  })
})

describe('DB-6 — soft-delete filter (regression)', () => {
  it('findAll excludes soft-deleted rows; findById returns null', async () => {
    const { db, driver } = await setup()
    const repo = createRepository(db, widgets, cfg([], true))
    const a = await repo.create({ title: 'live', secret: null, deleted_at: null })
    const b = await repo.create({ title: 'gone', secret: null, deleted_at: null })

    await repo.delete(b.id)
    const all = await repo.findAll()
    expect(all.map((r) => r.id)).toEqual([a.id])
    expect(await repo.findById(b.id)).toBeNull()
    await driver.close()
  })
})
