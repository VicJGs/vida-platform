// ============================================================================
// AR-7 Increment 1 — effect rail tests (Node / better-sqlite3, db-6 harness)
//
// Proves the rail charter (PLAN §4):
//   • BR-1 dedup — same event twice → 1 ledger row + 2nd {applied:false}
//   • BR-6 projection — no ledger row, handler never invoked
//   • BR-3 no-handler → NoEffectHandler (and no ledger row written)
//   • UnknownEffectType on a bogus type
//   • BR-4 duplicate register → DuplicateEffectHandler
//   • tx co-write — a handler writing via the passed tx commits atomically;
//     a handler that throws rolls BACK the ledger row (0 rows)
// ============================================================================

import { describe, it, expect } from 'vitest'
import Database from 'better-sqlite3'
import { createDrizzleProxy, type SqliteDriver } from '../../../db/adapter'
import { migrate, currentVersion } from '../../../db/migrations/runner'
import { appliedEffects } from '../../../db/schema/foundation/effects'
import { createEffectRegistry } from '../registry'
import { createEffectRail } from '../service'
import {
  type EffectEvent,
  type EffectHandler,
  NoEffectHandler,
  UnknownEffectType,
  DuplicateEffectHandler,
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

async function harness() {
  const sqlite = new Database(':memory:')
  const driver = createBetterSqlite3Driver(sqlite)
  await migrate(driver)
  const db = createDrizzleProxy(driver)
  return { db, driver }
}

const evt = (over: Partial<EffectEvent> = {}): EffectEvent => ({
  subjectNaturalKey: 'session-1',
  transition: 'completed',
  effectType: 'log_time',
  targetRef: 'sessions:session-1',
  ...over,
})

describe('migration 004 wiring', () => {
  it('creates applied_effects (local-only) and advances version to 4', async () => {
    const { driver } = await harness()
    const names = (
      await driver.values(`SELECT name FROM sqlite_master WHERE type='table' AND name='applied_effects'`)
    ).flat()
    expect(names).toContain('applied_effects')
    // local-only: no _sync_* columns (like sync_queue) — inspect the DDL.
    const ddl = (
      await driver.values(`SELECT sql FROM sqlite_master WHERE type='table' AND name='applied_effects'`)
    ).flat()[0] as string
    expect(ddl).not.toMatch(/_sync_/)
    // >= 4 (not ==): the applied_effects table above is the real proof migration 004 ran;
    // the exact latest belongs to whichever migration is last (AR-7 inc-2 added 005).
    expect(await currentVersion(driver)).toBeGreaterThanOrEqual(4)
    await driver.close()
  })
})

describe('effect rail — applyEffect', () => {
  it('BR-1: same event twice → one ledger row, 2nd is {applied:false}', async () => {
    const { db } = await harness()
    const registry = createEffectRegistry()
    let calls = 0
    registry.register('log_time', async () => {
      calls++
    })
    const rail = createEffectRail(db, registry)

    const first = await rail.applyEffect(evt())
    const second = await rail.applyEffect(evt())

    expect(first).toEqual({ applied: true })
    expect(second).toEqual({ applied: false })
    expect(calls).toBe(1) // handler fired only on the first (BR-1)
    const rows = await db.select().from(appliedEffects).all()
    expect(rows).toHaveLength(1)
  })

  it('BR-6: projection effect writes no ledger row and invokes no handler', async () => {
    const { db } = await harness()
    const registry = createEffectRegistry()
    let calls = 0
    // A projection handler would never be reached — register one to prove it is NOT called.
    registry.register('surface_journal', async () => {
      calls++
    })
    const rail = createEffectRail(db, registry)

    const res = await rail.applyEffect(evt({ effectType: 'surface_journal' }))

    expect(res).toEqual({ applied: true })
    expect(calls).toBe(0)
    const rows = await db.select().from(appliedEffects).all()
    expect(rows).toHaveLength(0)
  })

  it('BR-3: no registered handler → NoEffectHandler, and nothing is written', async () => {
    const { db } = await harness()
    const rail = createEffectRail(db, createEffectRegistry())

    await expect(rail.applyEffect(evt())).rejects.toBeInstanceOf(NoEffectHandler)
    const rows = await db.select().from(appliedEffects).all()
    expect(rows).toHaveLength(0)
  })

  it('unknown effect type → UnknownEffectType', async () => {
    const { db } = await harness()
    const rail = createEffectRail(db, createEffectRegistry())

    await expect(
      rail.applyEffect(evt({ effectType: 'not_a_real_effect' as EffectEvent['effectType'] })),
    ).rejects.toBeInstanceOf(UnknownEffectType)
  })

  it('BR-4: registering a second handler for one type → DuplicateEffectHandler', async () => {
    const registry = createEffectRegistry()
    const noop: EffectHandler = async () => {}
    registry.register('award_xp', noop)
    expect(() => registry.register('award_xp', noop)).toThrow(DuplicateEffectHandler)
  })

  it('tx co-write: a handler that writes via the passed tx commits atomically with the ledger', async () => {
    const { db } = await harness()
    const registry = createEffectRegistry()
    // The handler writes a SECOND applied_effects row (different key) through the SAME tx.
    registry.register('award_xp', async (_event, tx) => {
      await tx
        .insert(appliedEffects)
        .values({
          effect_event_id: 'handler-side-write',
          effect_type: 'award_xp',
          target_ref: 'gamification:xp',
          applied_at: Date.now(),
        })
        .run()
    })
    const rail = createEffectRail(db, registry)

    const res = await rail.applyEffect(evt({ effectType: 'award_xp' }))

    expect(res).toEqual({ applied: true })
    const rows = await db.select().from(appliedEffects).all()
    expect(rows).toHaveLength(2) // the rail's ledger row + the handler's co-write, one tx
  })

  it('tx rollback: a handler that throws rolls back the ledger row (0 rows)', async () => {
    const { db } = await harness()
    const registry = createEffectRegistry()
    registry.register('award_xp', async () => {
      throw new Error('handler boom')
    })
    const rail = createEffectRail(db, registry)

    await expect(rail.applyEffect(evt({ effectType: 'award_xp' }))).rejects.toThrow('handler boom')
    const rows = await db.select().from(appliedEffects).all()
    expect(rows).toHaveLength(0) // ledger insert rolled back with the handler failure
  })
})
