// ============================================================================
// AR-7 Increment 4 — economy substrate tests (Node / better-sqlite3, db-6 harness)
//
// Proves the ADR-012 charter:
//   • migration 006 creates currencies + consequence_ledger; version ≥ 6
//   • computeBalance over all 4 kinds (earn/lock/spend/distribute) + to-distribute
//   • grant_currency handler VIA THE RAIL → one earn ledger row + idempotent (dedup)
//   • lock_currency → lock row
//   • a malformed payload → MalformedConsequencePayload (rolls back, no row)
//   • create currency → persists + one sync_queue row (db-6 seam)
// ============================================================================

import { describe, it, expect } from 'vitest'
import Database from 'better-sqlite3'
import { eq } from 'drizzle-orm'
import { createDrizzleProxy, type SqliteDriver } from '../../../db/adapter'
import { migrate, currentVersion } from '../../../db/migrations/runner'
import { syncQueue } from '../../../db/schema/foundation/sync-queue'
import { consequenceLedger } from '../../../db/schema/foundation/economy'
import { initVault } from '../../../encryption/vault'
import { createEffectRegistry } from '../../effects'
import { createEffectRail } from '../../effects'
import type { EffectEvent } from '../../effects'
import { computeBalance } from '../balance'
import { createEconomyHandlers, registerEconomyEffects } from '../handlers'
import { createCurrencyRegistry } from '../registry'
import { MalformedConsequencePayload } from '../types'

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
  await initVault()
  const sqlite = new Database(':memory:')
  const driver = createBetterSqlite3Driver(sqlite)
  await migrate(driver)
  const db = createDrizzleProxy(driver)
  return { db, driver }
}

// A rail with the economy handlers registered.
function economyRail(db: ReturnType<typeof createDrizzleProxy>) {
  const registry = createEffectRegistry()
  registerEconomyEffects(registry, createEconomyHandlers(db, 'device-1'))
  return createEffectRail(db, registry)
}

const grant = (over: Partial<EffectEvent> = {}): EffectEvent => ({
  subjectNaturalKey: 'habit-1',
  transition: 'completed',
  effectType: 'grant_currency',
  targetRef: 'currency:XP',
  payload: { currencyId: 'XP', amount: 100 },
  ...over,
})

describe('migration 006 wiring', () => {
  it('creates currencies + consequence_ledger and advances version ≥ 6', async () => {
    const { driver } = await harness()
    const names = (
      await driver.values(
        `SELECT name FROM sqlite_master WHERE type='table' AND name IN ('currencies','consequence_ledger')`,
      )
    ).flat()
    expect(names).toEqual(expect.arrayContaining(['currencies', 'consequence_ledger']))
    // consequence_ledger is append-only — no deleted_at column.
    const ddl = (
      await driver.values(`SELECT sql FROM sqlite_master WHERE type='table' AND name='consequence_ledger'`)
    ).flat()[0] as string
    expect(ddl).not.toMatch(/deleted_at/)
    expect(await currentVersion(driver)).toBeGreaterThanOrEqual(6)
    await driver.close()
  })
})

describe('computeBalance (§3.3)', () => {
  it('derives all four quantities; to-distribute = ceiling − distributed', () => {
    const rows = [
      { kind: 'earn' as const, amount: 100 },
      { kind: 'earn' as const, amount: 50 },
      { kind: 'lock' as const, amount: 30 },
      { kind: 'spend' as const, amount: 20 },
      { kind: 'distribute' as const, amount: 40 },
    ]
    expect(computeBalance(rows, 60)).toEqual({
      earned: 150,
      locked: 30,
      spent: 20,
      distributed: 40,
      current: 100, // 150 − 30 − 20
      toDistribute: 20, // 60 − 40
    })
  })
  it('to-distribute is null when no ceiling is configured', () => {
    expect(computeBalance([{ kind: 'earn', amount: 10 }]).toDistribute).toBeNull()
  })
})

describe('economy effect handlers (via the rail)', () => {
  it('grant_currency writes one earn ledger row, and is idempotent on replay', async () => {
    const { db } = await harness()
    const rail = economyRail(db)

    const first = await rail.applyEffect(grant())
    const second = await rail.applyEffect(grant()) // same event → rail dedups

    expect(first).toEqual({ applied: true })
    expect(second).toEqual({ applied: false })
    const rows = await db.select().from(consequenceLedger).all()
    expect(rows).toHaveLength(1)
    expect(rows[0].kind).toBe('earn')
    expect(rows[0].amount).toBe(100)
    expect(rows[0].currency_id).toBe('XP')
    expect(rows[0].effect_event_id).toBeTruthy()
  })

  it('lock_currency writes a lock row', async () => {
    const { db } = await harness()
    const rail = economyRail(db)
    await rail.applyEffect(grant({ effectType: 'lock_currency', payload: { currencyId: 'XP', amount: 50 } }))
    const rows = await db.select().from(consequenceLedger).all()
    expect(rows).toHaveLength(1)
    expect(rows[0].kind).toBe('lock')
  })

  it('a malformed payload → MalformedConsequencePayload and no ledger row (rolled back)', async () => {
    const { db } = await harness()
    const rail = economyRail(db)
    await expect(
      rail.applyEffect(grant({ payload: { amount: 100 } })), // missing currencyId
    ).rejects.toBeInstanceOf(MalformedConsequencePayload)
    const rows = await db.select().from(consequenceLedger).all()
    expect(rows).toHaveLength(0)
  })
})

describe('CurrencyRegistry', () => {
  it('create persists a user currency + enqueues one sync_queue row', async () => {
    const { db } = await harness()
    const reg = createCurrencyRegistry(db, 'device-1')
    await reg.create({ code: 'gold', name: 'Gold', backing_kind: 'self-granted', unit: 'coin' })

    const queued = await db.select().from(syncQueue).where(eq(syncQueue.table_name, 'currencies')).all()
    expect(queued).toHaveLength(1)
    const codes = (await reg.list()).map((c) => c.code)
    expect(codes).toEqual(expect.arrayContaining(['XP', 'gold'])) // shipped ∪ persisted
  })
})
