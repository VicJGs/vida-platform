// ============================================================================
// AR-7 Increment 1 — effect rail tests (Node / better-sqlite3, db-6 harness)
//
// Proves the rail's rows in INTENT-sessions (EF-n; docs/core/effects BR-n in brackets):
//   • EF-1 dedup (BR-1) — same event twice → 1 ledger row + 2nd {applied:false}
//   • EF-2 deterministic id (BR-2) — same identity → same id, never random
//   • EF-3 no-handler (BR-3) → NoEffectHandler (and no ledger row written)
//   • EF-4 duplicate register (BR-4) → DuplicateEffectHandler
//   • EF-6 projection (BR-6) — no ledger row, handler never invoked
//   • EF-7 device-local ledger (BR-7) — no _sync_* columns, nothing enqueued
//   • EF-8 tx co-write — a handler writing via the passed tx commits atomically;
//     a handler that throws rolls BACK the ledger row (0 rows)
//   • EF-18 fan-out — each effect owns its tx; a part-way failure keeps the
//     applied ones and a replay applies only the rest
//   • UnknownEffectType on a bogus type
// ============================================================================

import { describe, it, expect } from 'vitest'
import Database from 'better-sqlite3'
import { createDrizzleProxy, type SqliteDriver } from '../../../db/adapter'
import { migrate, currentVersion } from '../../../db/migrations/runner'
import { appliedEffects } from '../../../db/schema/foundation/effects'
import { syncQueue } from '../../../db/schema/foundation/sync-queue'
import { deriveEffectEventId } from '../event-id'
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
  it('EF-7: creates applied_effects with no sync columns and advances version to 4', async () => {
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
  it('EF-1: same event twice → one ledger row, 2nd is {applied:false}', async () => {
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
    expect(calls).toBe(1) // handler fired only on the first (EF-1)
    const rows = await db.select().from(appliedEffects).all()
    expect(rows).toHaveLength(1)
  })

  it('EF-6: projection effect writes no ledger row and invokes no handler', async () => {
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

  it('EF-3: no registered handler → NoEffectHandler, and nothing is written', async () => {
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

  it('EF-4: registering a second handler for one type → DuplicateEffectHandler', async () => {
    const registry = createEffectRegistry()
    const noop: EffectHandler = async () => {}
    registry.register('award_xp', noop)
    expect(() => registry.register('award_xp', noop)).toThrow(DuplicateEffectHandler)
  })

  it('EF-8 tx co-write: a handler that writes via the passed tx commits atomically with the ledger', async () => {
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

  it('EF-8 tx rollback: a handler that throws rolls back the ledger row (0 rows)', async () => {
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

describe('effect rail — identity, locality and fan-out', () => {
  it('EF-2: the effect_event_id derives from the event identity, so the same outcome gets the same id every time', () => {
    const a = deriveEffectEventId('session-1', 'completed', 'log_time')
    expect(deriveEffectEventId('session-1', 'completed', 'log_time')).toBe(a) // a retry or another device
    expect(deriveEffectEventId('session-1', 'completed', 'award_xp')).not.toBe(a)
    expect(deriveEffectEventId('session-1', 'skipped', 'log_time')).not.toBe(a)
    expect(deriveEffectEventId('session-2', 'completed', 'log_time')).not.toBe(a)
  })

  it('EF-7: an applied effect writes its ledger row and enqueues nothing for sync', async () => {
    const { db } = await harness()
    const registry = createEffectRegistry()
    registry.register('log_time', async () => {})
    const rail = createEffectRail(db, registry)

    await rail.applyEffect(evt())

    expect(await db.select().from(appliedEffects).all()).toHaveLength(1)
    expect(await db.select().from(syncQueue).all()).toHaveLength(0)
  })

  it('EF-18: a fan-out failing part-way keeps the effects already applied, and a replay applies only the rest', async () => {
    const { db } = await harness()
    const registry = createEffectRegistry()
    let xpCalls = 0
    let failTime = true
    registry.register('award_xp', async () => {
      xpCalls++
    })
    registry.register('log_time', async () => {
      if (failTime) throw new Error('handler boom')
    })
    const rail = createEffectRail(db, registry)
    const fanOut = [evt({ effectType: 'award_xp' }), evt({ effectType: 'log_time' })]
    const fire = async () => {
      const out: { applied: boolean }[] = []
      for (const e of fanOut) out.push(await rail.applyEffect(e))
      return out
    }

    await expect(fire()).rejects.toThrow('handler boom')
    const afterFailure = await db.select().from(appliedEffects).all()
    expect(afterFailure.map((r) => r.effect_type)).toEqual(['award_xp']) // not rolled back

    failTime = false
    expect(await fire()).toEqual([{ applied: false }, { applied: true }])
    expect(xpCalls).toBe(1)
    const afterReplay = await db.select().from(appliedEffects).all()
    expect(afterReplay.map((r) => r.effect_type).sort()).toEqual(['award_xp', 'log_time'])
  })
})
