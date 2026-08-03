// ============================================================================
// AR-7 Increment 2 — capability registry tests (Node / better-sqlite3, db-6 harness)
//
// Proves the registry charter (PLAN §4):
//   • migration 005 creates the 3 tables; version → 5
//   • register a USER def → persists + ONE sync_queue row (db-6 seam)
//   • get: shipped ∪ persisted ∪ CapabilityNotFound
//   • BR-2 InvalidRenderTarget · BR-3 UnknownDeclaredEffect · BR-4 MissingTerminalStates
//   • BR-5 CapabilityPrivilegeExceeded (real — shipped seed has a non-empty envelope)
//   • BR-6 DuplicateCapabilityId (shipped id + dup user id)
// ============================================================================

import { describe, it, expect } from 'vitest'
import Database from 'better-sqlite3'
import { eq } from 'drizzle-orm'
import { createDrizzleProxy, type SqliteDriver } from '../../../db/adapter'
import { migrate, currentVersion } from '../../../db/migrations/runner'
import { syncQueue } from '../../../db/schema/foundation/sync-queue'
import { initVault } from '../../../encryption/vault'
import { createCapabilityRegistry } from '../registry'
import {
  type CapabilityDefinition,
  InvalidRenderTarget,
  UnknownDeclaredEffect,
  MissingTerminalStates,
  CapabilityPrivilegeExceeded,
  DuplicateCapabilityId,
  CapabilityNotFound,
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

async function harness() {
  await initVault()
  const sqlite = new Database(':memory:')
  const driver = createBetterSqlite3Driver(sqlite)
  await migrate(driver)
  const db = createDrizzleProxy(driver)
  return { db, driver }
}

// A valid USER def: effects ∪ bindings ⊆ shipped union {complete_habit_occurrence, award_xp, habit}.
const validUserDef = (over: Partial<CapabilityDefinition> = {}): CapabilityDefinition => ({
  id: 'my_streak_widget',
  kind: 'widget',
  render_targets: ['inline'],
  bindings: ['habit'],
  effects: ['award_xp'],
  terminal_states: { inline: ['loading', 'empty', 'error', 'success'] },
  is_user_type: true,
  ...over,
})

describe('migration 005 wiring', () => {
  it('creates the 3 capability tables and advances version to 5', async () => {
    const { driver } = await harness()
    const names = (
      await driver.values(
        `SELECT name FROM sqlite_master WHERE type='table' AND name IN ('capability_definitions','block_instances','capability_grants')`,
      )
    ).flat()
    expect(names).toEqual(
      expect.arrayContaining(['capability_definitions', 'block_instances', 'capability_grants']),
    )
    // >= 5 (not ==): the 3 tables above prove migration 005 ran; the exact latest
    // belongs to whichever migration is last (future increments add 006+).
    expect(await currentVersion(driver)).toBeGreaterThanOrEqual(5)
    await driver.close()
  })
})

describe('CapabilityRegistry', () => {
  it('registers a user def → persists + one sync_queue row; get resolves it', async () => {
    const { db } = await harness()
    const reg = createCapabilityRegistry(db, 'device-1')
    await reg.register(validUserDef())

    const resolved = await reg.get('my_streak_widget')
    expect(resolved.id).toBe('my_streak_widget')
    expect(resolved.effects).toEqual(['award_xp'])

    const queued = await db
      .select()
      .from(syncQueue)
      .where(eq(syncQueue.table_name, 'capability_definitions'))
      .all()
    expect(queued).toHaveLength(1) // db-6 co-transactional enqueue
  })

  it('get resolves a shipped def, and throws CapabilityNotFound for an unknown id', async () => {
    const { db } = await harness()
    const reg = createCapabilityRegistry(db, 'device-1')
    const shipped = await reg.get('habit_logger')
    expect(shipped.render_targets).toEqual(['inline', 'standalone'])
    await expect(reg.get('nope')).rejects.toBeInstanceOf(CapabilityNotFound)
  })

  it('BR-2: an invalid render target → InvalidRenderTarget', async () => {
    const { db } = await harness()
    const reg = createCapabilityRegistry(db, 'device-1')
    await expect(
      reg.register(validUserDef({ render_targets: ['floating' as never] })),
    ).rejects.toBeInstanceOf(InvalidRenderTarget)
  })

  it('BR-3: an unknown declared effect → UnknownDeclaredEffect', async () => {
    const { db } = await harness()
    const reg = createCapabilityRegistry(db, 'device-1')
    await expect(
      reg.register(validUserDef({ effects: ['not_a_real_effect' as never] })),
    ).rejects.toBeInstanceOf(UnknownDeclaredEffect)
  })

  it('BR-4: a missing terminal state for a supported render target → MissingTerminalStates', async () => {
    const { db } = await harness()
    const reg = createCapabilityRegistry(db, 'device-1')
    await expect(
      reg.register(validUserDef({ terminal_states: { inline: ['loading', 'empty', 'error'] } })),
    ).rejects.toBeInstanceOf(MissingTerminalStates)
  })

  it('BR-5: a user def exceeding the shipped envelope → CapabilityPrivilegeExceeded', async () => {
    const { db } = await harness()
    const reg = createCapabilityRegistry(db, 'device-1')
    // 'log_time' is a real EFFECT_TYPE but NOT in the shipped envelope {complete_habit_occurrence, award_xp, habit}.
    await expect(
      reg.register(validUserDef({ effects: ['log_time'] })),
    ).rejects.toBeInstanceOf(CapabilityPrivilegeExceeded)
  })

  it('BR-6: a shipped id and a duplicate user id both → DuplicateCapabilityId', async () => {
    const { db } = await harness()
    const reg = createCapabilityRegistry(db, 'device-1')
    await expect(
      reg.register(validUserDef({ id: 'habit_logger' })),
    ).rejects.toBeInstanceOf(DuplicateCapabilityId)

    await reg.register(validUserDef())
    await expect(reg.register(validUserDef())).rejects.toBeInstanceOf(DuplicateCapabilityId)
  })
})
