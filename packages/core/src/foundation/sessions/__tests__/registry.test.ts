// ============================================================================
// AR-5 — SessionRegistry tests (Node / better-sqlite3 stand-in, db-6 harness)
//
// Proves the AR-5 charter for the thin registry:
//   • BR-3 — a def missing any of the 4 contract dimensions is rejected
//   • BR-4 — a user type's effects must be ⊆ the shipped capability envelope
//   • BR-1 — sub_type is unique across shipped + persisted user types (typed error)
//   • G1  — register() persists a user type AND enqueues a sync_queue row (db-6 seam)
//   • G3  — get()/list() merge in-memory shipped ∪ persisted user types
// ============================================================================

import { describe, it, expect, afterEach } from 'vitest'
import Database from 'better-sqlite3'
import { createDrizzleProxy, type SqliteDriver, type DrizzleDb } from '../../../db/adapter'
import { migrate } from '../../../db/migrations/runner'
import { syncQueue } from '../../../db/schema/foundation/sync-queue'
import { initVault } from '../../../encryption/vault'
import {
  createSessionRegistry,
  SHIPPED_SESSION_TYPES,
  type SessionRegistry,
} from '../registry'
import {
  type SessionTypeDef,
  InvalidSessionTypeDef,
  CapabilityEnvelopeExceeded,
  DuplicateSubType,
  SessionTypeNotFound,
} from '../types'

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

async function setup(): Promise<{ registry: SessionRegistry; db: DrizzleDb; driver: SqliteDriver }> {
  await initVault() // libsodium ready — _sync_hash on write
  const bsql = new Database(':memory:')
  const driver = createBetterSqlite3Driver(bsql)
  await migrate(driver) // bootstraps app_state (DB-7 ensureInfra) + applies 001 (sync_queue) + 002 (sessions tables)
  const db = createDrizzleProxy(driver)
  return { registry: createSessionRegistry(db, 'test-device'), db, driver }
}

// A valid user type whose effects are a SUBSET of the shipped 'focus' envelope
// ({ attach_pomodoro, log_time }) — passes BR-4.
const validUserType = (): SessionTypeDef => ({
  sub_type: 'my_deep_work',
  owner_module: 'user',
  attachment_defaults: {},
  effects: ['log_time'],
  lifecycle: { transitions: [{ from: 'scheduled', to: 'in_progress', event: 'start' }] },
  permissions: { allowed_effects: ['log_time'] },
  default_purpose: 'maintenance',
})

afterEach(() => {
  // in-memory DBs are discarded per-setup; nothing to tear down globally
})

describe('AR-5 — migration wiring', () => {
  it('migrate() creates the session tables (sessions + registry + attachments)', async () => {
    const { driver } = await setup()
    const names = (
      await driver.values(
        `SELECT name FROM sqlite_master WHERE type='table' AND name IN ('sessions','session_type_registry','session_attachments')`,
      )
    ).flat()
    expect(names).toEqual(
      expect.arrayContaining(['sessions', 'session_type_registry', 'session_attachments']),
    )
    await driver.close()
  })
})

describe('AR-5 — SessionRegistry.register (BR-3/BR-4/BR-1 + G1)', () => {
  it('register-ok — persists a valid user type AND enqueues one sync_queue row (G1)', async () => {
    const { registry, db, driver } = await setup()
    await registry.register(validUserType())

    const q = await db.select().from(syncQueue).all()
    expect(q).toHaveLength(1)
    expect(q[0].table_name).toBe('session_type_registry')
    expect(q[0].operation).toBe('create')

    // Full JSON round-trip — every dim must survive stringify→parse (guards a rowToDef drop).
    const got = await registry.get('my_deep_work')
    expect(got.sub_type).toBe('my_deep_work')
    expect(got.effects).toEqual(['log_time'])
    expect(got.permissions.allowed_effects).toEqual(['log_time'])
    expect(got.lifecycle.transitions).toEqual([
      { from: 'scheduled', to: 'in_progress', event: 'start' },
    ])
    expect(got.attachment_defaults).toEqual({})
    await driver.close()
  })

  it('BR-3 — rejects a def missing a contract dimension', async () => {
    const { registry, driver } = await setup()
    const bad = { ...validUserType() } as Partial<SessionTypeDef>
    delete bad.permissions
    await expect(registry.register(bad as SessionTypeDef)).rejects.toBeInstanceOf(
      InvalidSessionTypeDef,
    )
    await driver.close()
  })

  it('BR-4 — rejects a user type whose effect exceeds the shipped envelope', async () => {
    const { registry, driver } = await setup()
    const over = validUserType()
    over.sub_type = 'greedy'
    over.effects = ['award_xp'] // not in the shipped { attach_pomodoro, log_time } envelope
    over.permissions = { allowed_effects: ['award_xp'] }
    await expect(registry.register(over)).rejects.toBeInstanceOf(CapabilityEnvelopeExceeded)
    await driver.close()
  })

  it('BR-4 — rejects a type whose declared effects[] exceed its OWN permission envelope', async () => {
    const { registry, driver } = await setup()
    const mismatch = validUserType()
    mismatch.sub_type = 'declares_beyond_envelope'
    mismatch.effects = ['attach_pomodoro'] // in the shipped envelope…
    mismatch.permissions = { allowed_effects: ['log_time'] } // …but NOT in its own envelope
    await expect(registry.register(mismatch)).rejects.toBeInstanceOf(CapabilityEnvelopeExceeded)
    await driver.close()
  })

  it('BR-1 — rejects a sub_type that collides with a SHIPPED type', async () => {
    const { registry, driver } = await setup()
    const clash = validUserType()
    clash.sub_type = SHIPPED_SESSION_TYPES[0].sub_type // 'focus'
    await expect(registry.register(clash)).rejects.toBeInstanceOf(DuplicateSubType)
    await driver.close()
  })

  it('BR-1 — rejects a sub_type already persisted as a user type (typed, not raw UNIQUE)', async () => {
    const { registry, driver } = await setup()
    await registry.register(validUserType())
    await expect(registry.register(validUserType())).rejects.toBeInstanceOf(DuplicateSubType)
    await driver.close()
  })
})

describe('AR-5 — SessionRegistry.get / list (G3 merge)', () => {
  it('get resolves shipped types from memory', async () => {
    const { registry, driver } = await setup()
    const focus = await registry.get('focus')
    expect(focus.owner_module).toBe('sessions')
    await driver.close()
  })

  it('get throws SessionTypeNotFound for an unknown sub_type', async () => {
    const { registry, driver } = await setup()
    await expect(registry.get('does_not_exist')).rejects.toBeInstanceOf(SessionTypeNotFound)
    await driver.close()
  })

  it('list merges shipped ∪ persisted user types', async () => {
    const { registry, driver } = await setup()
    await registry.register(validUserType())
    const all = await registry.list()
    const subTypes = all.map((d) => d.sub_type)
    expect(subTypes).toEqual(expect.arrayContaining(['focus', 'my_deep_work']))
    await driver.close()
  })
})
