// ============================================================================
// mod-gamification #48 ① · S1 — currency surface + level + below-floor clamp (LIF-124)
//
// Node / better-sqlite3 live-store harness (mirrors finance/checkins): REAL data store,
// UNLOCKED vault, migrate() applies 006_economy + 031_gamification so the tables exist.
// Covers the slice-map.md S1 Verification Gate: currency define/list/get (thin-build over
// registry.list, R1) · getBalance DERIVED via computeBalance (IR-1) · below-floor clamp
// (IR-12) · unknown-code fail-loud · deriveLevel curve (GM-14) · profile upsert + JSON view.
// ============================================================================

import { describe, it, expect, beforeEach } from 'vitest'
import Database from 'better-sqlite3'
import { createDrizzleProxy, type SqliteDriver, type DrizzleDb } from '../../../db/adapter'
import { migrate } from '../../../db/migrations/runner'
import { initVault } from '../../../encryption/vault'
import { createRepository } from '../../../db/repository'
import { consequenceLedger } from '../../../db/schema/foundation/economy'
import type { ConsequenceKind } from '@vida/types'
import {
  createGamificationService,
  deriveLevel,
  clampToFloor,
  CurrencyNotFound,
  CurrencyExists,
  type GamificationService,
} from '../index'

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

interface Harness {
  svc: GamificationService
  db: DrizzleDb
}

let seq = 0
/** Seed a consequence_ledger row directly (S2 will do this through the rail; here we test the READ+derive). */
async function seedLedger(db: DrizzleDb, currencyCode: string, kind: ConsequenceKind, amount: number) {
  const repo = createRepository(db, consequenceLedger, { deviceId: 'test-device', encryptedFields: [] })
  seq += 1
  await repo.create({
    currency_id: currencyCode,
    amount,
    kind,
    target_ref: `t-${seq}`,
    effect_event_id: `e-${seq}`,
    at: seq,
  })
}

async function setup(): Promise<Harness> {
  await initVault()
  const bsql = new Database(':memory:')
  const driver = createBetterSqlite3Driver(bsql)
  await migrate(driver)
  const db = createDrizzleProxy(driver)
  const svc = createGamificationService({ db, deviceId: 'test-device' })
  return { svc, db }
}

describe('mod-gamification S1 — currency surface + level + clamp', () => {
  let h: Harness
  beforeEach(async () => {
    h = await setup()
  })

  it('lists the shipped XP currency out of the box', async () => {
    const list = await h.svc.listCurrencies()
    expect(list.map((c) => c.code)).toContain('XP')
  })

  it('defines a currency and echoes it back (thin-build re-read, R1)', async () => {
    const created = await h.svc.defineCurrency({ code: 'GOLD', backing_kind: 'self-granted', unit: 'coins' })
    expect(created).toMatchObject({ code: 'GOLD', backing_kind: 'self-granted', unit: 'coins' })
    expect(await h.svc.getCurrency('GOLD')).toMatchObject({ code: 'GOLD' })
    const codes = (await h.svc.listCurrencies()).map((c) => c.code)
    expect(codes).toEqual(expect.arrayContaining(['XP', 'GOLD']))
  })

  it('rejects a define that shadows a shipped or existing code (R1)', async () => {
    await expect(h.svc.defineCurrency({ code: 'XP', backing_kind: 'self-granted' })).rejects.toBeInstanceOf(
      CurrencyExists,
    )
    await h.svc.defineCurrency({ code: 'GOLD', backing_kind: 'self-granted' })
    await expect(h.svc.defineCurrency({ code: 'GOLD', backing_kind: 'self-granted' })).rejects.toBeInstanceOf(
      CurrencyExists,
    )
    // no duplicate XP row leaked
    expect((await h.svc.listCurrencies()).filter((c) => c.code === 'XP')).toHaveLength(1)
  })

  it('derives a balance from the ledger — never a stored counter (IR-1)', async () => {
    await seedLedger(h.db, 'XP', 'earn', 100)
    await seedLedger(h.db, 'XP', 'earn', 50)
    await seedLedger(h.db, 'XP', 'lock', 30)
    await seedLedger(h.db, 'XP', 'spend', 10)
    const bal = await h.svc.getBalance('XP')
    expect(bal).toMatchObject({ earned: 150, locked: 30, spent: 10, current: 110 })
  })

  it('fails loud on an unknown currency code', async () => {
    await expect(h.svc.getBalance('NOPE')).rejects.toBeInstanceOf(CurrencyNotFound)
    await expect(h.svc.getCurrency('NOPE')).rejects.toBeInstanceOf(CurrencyNotFound)
  })

  it('clamps a below-floor spend and flags it (IR-12)', async () => {
    await seedLedger(h.db, 'XP', 'earn', 100)
    expect(await h.svc.previewSpend('XP', 150)).toEqual({ applied: 100, clamped: true })
    expect(await h.svc.previewSpend('XP', 40)).toEqual({ applied: 40, clamped: false })
  })

  it('derives level from lifetime earned over the fixed curve (GM-14)', async () => {
    expect(deriveLevel(0)).toEqual({ level: 1, title: 'Novice' })
    expect(deriveLevel(99)).toEqual({ level: 1, title: 'Novice' })
    expect(deriveLevel(100)).toEqual({ level: 2, title: 'Novice' })
    expect(deriveLevel(400)).toMatchObject({ level: 3 })
    expect(deriveLevel(1600)).toEqual({ level: 5, title: 'Apprentice' })
    expect(deriveLevel(100 * 49 * 49)).toEqual({ level: 50, title: 'Master' })
    expect(deriveLevel(-50)).toEqual({ level: 1, title: 'Novice' }) // negative clamps
  })

  it('getLevel reads the XP ledger and derives live (never de-levels on spend)', async () => {
    await seedLedger(h.db, 'XP', 'earn', 400)
    await seedLedger(h.db, 'XP', 'spend', 400) // current 0, but earned stays 400
    expect(await h.svc.getLevel()).toMatchObject({ level: 3 })
  })

  it('clampToFloor is pure and respects a custom floor', () => {
    expect(clampToFloor(100, 30)).toEqual({ applied: 30, clamped: false })
    expect(clampToFloor(20, 50)).toEqual({ applied: 20, clamped: true })
    expect(clampToFloor(10, 5, 8)).toEqual({ applied: 2, clamped: true }) // available = 10-8
  })

  it('profile is null until first write, then upserts + round-trips JSON arrays (IR-11)', async () => {
    expect(await h.svc.getProfile()).toBeNull()
    const created = await h.svc.updateProfile({ timezone: 'America/Sao_Paulo', focus_areas: ['health', 'career'] })
    expect(created).toMatchObject({ timezone: 'America/Sao_Paulo', focus_areas: ['health', 'career'] })
    expect(created.total_xp).toBe(0)
    expect(created.current_level).toBe(1)
    const updated = await h.svc.updateProfile({ focus_areas: ['finance'] })
    expect(updated.focus_areas).toEqual(['finance'])
    expect(updated.timezone).toBe('America/Sao_Paulo') // prior write preserved (single singleton row)
    expect((await h.svc.getProfile())?.id).toBe(created.id)
  })
})
