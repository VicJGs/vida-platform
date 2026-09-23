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
import { createEffectRail, createEffectRegistry } from '../../../foundation/effects'
import { createEconomyHandlers, registerEconomyEffects } from '../../../foundation/economy'
import { createMeasurementSourceRegistry, type MeasurementSourceRegistry } from '../../../foundation/measurement'
import type { CapabilityEnforcer } from '../../../foundation/capability'
import {
  createGamificationService,
  deriveLevel,
  clampToFloor,
  CurrencyNotFound,
  CurrencyExists,
  RuleNotFound,
  RuleBindingCyclic,
  RuleGrantDenied,
  RailNotConfigured,
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

// --- S2 rule engine ---------------------------------------------------------

/** A stub enforcer with a fixed decision (the user-authored-rule envelope check). */
function stubEnforcer(allowed: boolean): CapabilityEnforcer {
  return {
    async checkAction() {
      return allowed ? { allowed: true } : { allowed: false, reason: 'not_in_envelope' }
    },
    async assertPermitted() {
      if (!allowed) throw new Error('denied')
    },
    async getGrant() {
      return null
    },
    async isEnvelopeCurrent() {
      return allowed
    },
    async grant() {
      throw new Error('not supported in stub')
    },
    async revoke() {},
  }
}

interface RailHarness {
  svc: GamificationService
  db: DrizzleDb
  measurement: MeasurementSourceRegistry
}

async function setupWithRail(enforcer?: CapabilityEnforcer): Promise<RailHarness> {
  await initVault()
  const bsql = new Database(':memory:')
  const driver = createBetterSqlite3Driver(bsql)
  await migrate(driver)
  const db = createDrizzleProxy(driver)
  const registry = createEffectRegistry()
  const rail = createEffectRail(db, registry)
  // The economy handlers must be registered for grant/lock effects to fire (the S4 wiring, done here).
  registerEconomyEffects(registry, createEconomyHandlers(db, 'test-device'))
  const measurement = createMeasurementSourceRegistry()
  const svc = createGamificationService({ db, deviceId: 'test-device', rail, measurement, enforcer })
  return { svc, db, measurement }
}

describe('mod-gamification S2 — rule engine', () => {
  it('executeRule requires an injected rail', async () => {
    await initVault()
    const bsql = new Database(':memory:')
    const driver = createBetterSqlite3Driver(bsql)
    await migrate(driver)
    const svc = createGamificationService({ db: createDrizzleProxy(driver), deviceId: 'test-device' })
    await expect(svc.executeRule('x', { subjectId: 'u1' })).rejects.toBeInstanceOf(RailNotConfigured)
  })

  it('CRUD: create → list → get → update → disable → soft-delete', async () => {
    const { svc } = await setupWithRail()
    const rule = await svc.createRule({
      name: 'daily reward',
      condition: { kind: 'event_trigger', eventType: 'habit_done' },
      consequences: [{ effectType: 'grant_currency', payload: { currencyId: 'XP', amount: 50 } }],
    })
    expect(rule.isEnabled).toBe(true)
    expect((await svc.listRules()).map((r) => r.id)).toContain(rule.id)
    expect((await svc.getRule(rule.id)).name).toBe('daily reward')
    const renamed = await svc.updateRule(rule.id, { name: 'weekly reward' })
    expect(renamed.name).toBe('weekly reward')
    expect((await svc.disableRule(rule.id)).isEnabled).toBe(false)
    await svc.deleteRule(rule.id)
    await expect(svc.getRule(rule.id)).rejects.toBeInstanceOf(RuleNotFound)
  })

  it('fires an event_trigger rule and grants currency through the rail (GM-2)', async () => {
    const { svc } = await setupWithRail()
    const rule = await svc.createRule({
      name: 'grant on habit',
      condition: { kind: 'event_trigger', eventType: 'habit_done' },
      consequences: [{ effectType: 'grant_currency', payload: { currencyId: 'XP', amount: 100 } }],
    })
    const res = await svc.executeRule(rule.id, { subjectId: 'u1', event: { type: 'habit_done', targetRef: 'h1' } })
    expect(res).toMatchObject({ fired: true, effectsFired: 1 })
    expect((await svc.getBalance('XP')).earned).toBe(100)
  })

  it('does not fire when the event does not match, or the rule is disabled', async () => {
    const { svc } = await setupWithRail()
    const rule = await svc.createRule({
      name: 'grant on habit',
      condition: { kind: 'event_trigger', eventType: 'habit_done' },
      consequences: [{ effectType: 'grant_currency', payload: { currencyId: 'XP', amount: 100 } }],
    })
    const miss = await svc.executeRule(rule.id, { subjectId: 'u1', event: { type: 'other', targetRef: 'x' } })
    expect(miss).toMatchObject({ fired: false, reason: 'condition_not_met' })
    await svc.disableRule(rule.id)
    const off = await svc.executeRule(rule.id, { subjectId: 'u1', event: { type: 'habit_done', targetRef: 'h1' } })
    expect(off).toMatchObject({ fired: false, reason: 'disabled' })
    expect((await svc.getBalance('XP')).earned).toBe(0)
  })

  it('derived_pull reads the measurement seam (unmeasured → no fire; threshold met → fire)', async () => {
    const { svc, measurement } = await setupWithRail()
    const rule = await svc.createRule({
      name: 'streak bonus',
      condition: { kind: 'derived_pull', measureKey: 'habit_streak', operator: 'gte', threshold: 7 },
      consequences: [{ effectType: 'grant_currency', payload: { currencyId: 'XP', amount: 200 } }],
    })
    const unmeasured = await svc.executeRule(rule.id, { subjectId: 'u1' })
    expect(unmeasured).toMatchObject({ fired: false, reason: 'unmeasured' })
    let streak = 3
    measurement.advertise('habit_streak', () => streak)
    expect(await svc.executeRule(rule.id, { subjectId: 'u1', occasion: 'd1' })).toMatchObject({
      fired: false,
      reason: 'condition_not_met',
    })
    streak = 9
    expect(await svc.executeRule(rule.id, { subjectId: 'u1', occasion: 'd2' })).toMatchObject({ fired: true })
    expect((await svc.getBalance('XP')).earned).toBe(200)
  })

  it('is idempotent — replaying the same fire does not double-grant (rail dedup)', async () => {
    const { svc } = await setupWithRail()
    const rule = await svc.createRule({
      name: 'grant',
      condition: { kind: 'event_trigger', eventType: 'e' },
      consequences: [{ effectType: 'grant_currency', payload: { currencyId: 'XP', amount: 100 } }],
    })
    const ctx = { subjectId: 'u1', event: { type: 'e', targetRef: 'once' } }
    const first = await svc.executeRule(rule.id, ctx)
    const replay = await svc.executeRule(rule.id, ctx) // replay same occasion
    expect(first).toMatchObject({ fired: true, effectsFired: 1 })
    // R1 — the replay still "fired" (condition met) but applied NOTHING new; effectsFired must be 0
    expect(replay).toMatchObject({ fired: true, effectsFired: 0 })
    expect((await svc.getBalance('XP')).earned).toBe(100) // not 200
  })

  it('clamps a lock consequence to the available balance (IR-12)', async () => {
    const { svc } = await setupWithRail()
    const grant = await svc.createRule({
      name: 'seed',
      condition: { kind: 'event_trigger', eventType: 'seed' },
      consequences: [{ effectType: 'grant_currency', payload: { currencyId: 'XP', amount: 100 } }],
    })
    await svc.executeRule(grant.id, { subjectId: 'u1', event: { type: 'seed', targetRef: 's' } })
    const penalty = await svc.createRule({
      name: 'penalty',
      condition: { kind: 'event_trigger', eventType: 'slip' },
      consequences: [{ effectType: 'lock_currency', payload: { currencyId: 'XP', amount: 150 } }],
    })
    const res = await svc.executeRule(penalty.id, { subjectId: 'u1', event: { type: 'slip', targetRef: 'p1' } })
    expect(res).toMatchObject({ fired: true, clamped: true })
    const bal = await svc.getBalance('XP')
    expect(bal.locked).toBe(100) // clamped from 150 to the available 100
    expect(bal.current).toBe(0)
  })

  it('rejects a rule whose consequence feeds its own condition (acyclicity)', async () => {
    const { svc } = await setupWithRail()
    await expect(
      svc.createRule({
        name: 'loop',
        condition: { kind: 'derived_pull', measureKey: 'XP', operator: 'gte', threshold: 1 },
        consequences: [{ effectType: 'grant_currency', payload: { currencyId: 'XP', amount: 10 } }],
      }),
    ).rejects.toBeInstanceOf(RuleBindingCyclic)
  })

  it('a user-authored rule fails closed when the envelope denies (or no enforcer)', async () => {
    // No enforcer injected → a grant_id rule cannot be verified → denied.
    const noEnf = await setupWithRail()
    const r1 = await noEnf.svc.createRule({
      name: 'user rule',
      grantId: 'cap-1',
      condition: { kind: 'event_trigger', eventType: 'e' },
      consequences: [{ effectType: 'grant_currency', payload: { currencyId: 'XP', amount: 10 } }],
    })
    await expect(
      noEnf.svc.executeRule(r1.id, { subjectId: 'u1', event: { type: 'e', targetRef: 't' } }),
    ).rejects.toBeInstanceOf(RuleGrantDenied)

    // A denying enforcer → denied; an allowing enforcer → fires.
    const denied = await setupWithRail(stubEnforcer(false))
    const r2 = await denied.svc.createRule({
      name: 'user rule',
      grantId: 'cap-1',
      condition: { kind: 'event_trigger', eventType: 'e' },
      consequences: [{ effectType: 'grant_currency', payload: { currencyId: 'XP', amount: 10 } }],
    })
    await expect(
      denied.svc.executeRule(r2.id, { subjectId: 'u1', event: { type: 'e', targetRef: 't' } }),
    ).rejects.toBeInstanceOf(RuleGrantDenied)

    const ok = await setupWithRail(stubEnforcer(true))
    const r3 = await ok.svc.createRule({
      name: 'user rule',
      grantId: 'cap-1',
      condition: { kind: 'event_trigger', eventType: 'e' },
      consequences: [{ effectType: 'grant_currency', payload: { currencyId: 'XP', amount: 10 } }],
    })
    expect(
      await ok.svc.executeRule(r3.id, { subjectId: 'u1', event: { type: 'e', targetRef: 't' } }),
    ).toMatchObject({ fired: true })
  })

  it('evaluateRules sweeps enabled rules against the context', async () => {
    const { svc, measurement } = await setupWithRail()
    measurement.advertise('streak', () => 10)
    await svc.createRule({
      name: 'pull',
      condition: { kind: 'derived_pull', measureKey: 'streak', operator: 'gte', threshold: 5 },
      consequences: [{ effectType: 'grant_currency', payload: { currencyId: 'XP', amount: 20 } }],
    })
    await svc.createRule({
      name: 'event only',
      condition: { kind: 'event_trigger', eventType: 'never' },
      consequences: [{ effectType: 'grant_currency', payload: { currencyId: 'XP', amount: 999 } }],
    })
    const results = await svc.evaluateRules({ subjectId: 'u1', occasion: 'sweep-1' })
    expect(results.filter((r) => r.fired)).toHaveLength(1) // only the derived_pull one
    expect((await svc.getBalance('XP')).earned).toBe(20)
  })
})
