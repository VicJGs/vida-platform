// ============================================================================
// mod-habits #49 ① · S1 — definition CRUD service (LIF-125)
//
// Node / better-sqlite3 live-store harness (mirrors finance/checkins): REAL data store, UNLOCKED
// vault (the sync-hash path runs even with empty [E]), migrate() applies 017_habits so the tables
// exist. Covers the slice-map.md S1 Verification Gate: CRUD happy + invalid-enum reject +
// custom-without-days reject + soft-delete hides (ledger untouched) + faithful create echo
// (defaults backfilled, nullables null, JSON round-trip) + listHabits filtering + co-transactional
// sync_queue enqueue.
// ============================================================================

import { describe, it, expect, beforeEach } from 'vitest'
import Database from 'better-sqlite3'
import { createDrizzleProxy, type SqliteDriver, type DrizzleDb } from '../../../db/adapter'
import { migrate } from '../../../db/migrations/runner'
import { initVault } from '../../../encryption/vault'
import { syncQueue } from '../../../db/schema'
import { createHabitsService, HabitScheduleError, type HabitsService } from '../index'

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
  svc: HabitsService
  db: DrizzleDb
  bsql: Database.Database
}

async function setup(): Promise<Harness> {
  await initVault()
  const bsql = new Database(':memory:')
  const driver = createBetterSqlite3Driver(bsql)
  await migrate(driver)
  const db = createDrizzleProxy(driver)
  const svc = createHabitsService({ db, deviceId: 'test-device' })
  return { svc, db, bsql }
}

describe('mod-habits S1 — definition CRUD', () => {
  let h: Harness
  beforeEach(async () => {
    h = await setup()
  })

  it('createHabit echoes a FAITHFUL row — notNull-defaults backfilled, nullables → null (HAB-01, BR-S1-3)', async () => {
    const hab = await h.svc.createHabit({ name: 'Drink water' })
    expect(hab.id).toBeTruthy()
    expect(hab.habit_type).toBe('build') // default backfilled
    expect(hab.frequency).toBe('daily') // default backfilled
    expect(hab.target_count).toBe(1) // default backfilled
    expect(hab.time_of_day).toBe('anytime') // nullable-with-default → coalesced (BR-S1-8)
    expect(hab.measurement_kind).toBe('rate') // ADR-011 M1 natural
    expect(hab.is_active).toBe(true)
    expect(hab.sort_order).toBe(0)
    expect(hab.current_streak).toBe(0) // derived cache at birth
    expect(hab.longest_streak).toBe(0)
    expect(hab.total_completions).toBe(0)
    expect(hab.description).toBeNull() // nullable coalesced (not undefined)
    expect(hab.binding_mode).toBeNull() // nullable enum — not dropped (g1 NIT-1)
    expect(hab.difficulty).toBeNull()
    expect(hab.success_criteria).toBeNull()
    expect(hab.days_of_week).toBeNull()
    expect(hab.deleted_at).toBeNull()
    expect(hab._sync_status).toBe('pending')
  })

  it('createHabit honours explicit build/break + measurability + restored fields (HAB-20/23)', async () => {
    const hab = await h.svc.createHabit({
      name: 'No sugar',
      habit_type: 'break',
      frequency: 'daily',
      difficulty: 'hard',
      success_criteria: 'zero added sugar all day',
      measurement_kind: 'rate',
      binding_mode: 'event-trigger',
      domain: 'health',
    })
    expect(hab.habit_type).toBe('break')
    expect(hab.difficulty).toBe('hard')
    expect(hab.success_criteria).toBe('zero added sugar all day')
    expect(hab.binding_mode).toBe('event-trigger')
    expect(hab.domain).toBe('health')
  })

  it('createHabit round-trips days_of_week / times_of_day through JSON (BR-S1-8)', async () => {
    const hab = await h.svc.createHabit({
      name: 'Gym',
      frequency: 'custom',
      days_of_week: [1, 3, 5],
      times_of_day: ['07:00', '18:00'],
    })
    expect(hab.days_of_week).toEqual([1, 3, 5])
    expect(hab.times_of_day).toEqual(['07:00', '18:00'])
    const read = await h.svc.getHabit(hab.id)
    expect(read?.days_of_week).toEqual([1, 3, 5]) // survives a real read-back
  })

  it('createHabit rejects a custom frequency with no days_of_week (HAB-01, BR-S1-2)', async () => {
    await expect(h.svc.createHabit({ name: 'X', frequency: 'custom' })).rejects.toBeInstanceOf(HabitScheduleError)
    // no row was written
    const all = await h.svc.listHabits()
    expect(all).toHaveLength(0)
  })

  it('createHabit rejects an invalid enum (HAB-24)', async () => {
    await expect(
      // @ts-expect-error — invalid enum value is the failure path under test
      h.svc.createHabit({ name: 'X', frequency: 'fortnightly' }),
    ).rejects.toThrow()
  })

  it('updateHabit re-validates + persists a patch (HAB-02)', async () => {
    const hab = await h.svc.createHabit({ name: 'Read' })
    const upd = await h.svc.updateHabit(hab.id, { target_count: 30, unit: 'pages', domain: 'personal_growth' })
    expect(upd.target_count).toBe(30)
    expect(upd.unit).toBe('pages')
    expect(upd.domain).toBe('personal_growth')
  })

  it('softDeleteHabit hides from getHabit + listHabits (HB-11, BR-S1-5)', async () => {
    const hab = await h.svc.createHabit({ name: 'Meditate' })
    await h.svc.softDeleteHabit(hab.id)
    expect(await h.svc.getHabit(hab.id)).toBeNull()
    expect(await h.svc.listHabits()).toHaveLength(0)
  })

  it('listHabits narrows by is_active / domain / habit_type (HAB-04)', async () => {
    await h.svc.createHabit({ name: 'A', domain: 'health', habit_type: 'build', is_active: true })
    await h.svc.createHabit({ name: 'B', domain: 'career', habit_type: 'build', is_active: true })
    await h.svc.createHabit({ name: 'C', domain: 'health', habit_type: 'break', is_active: false })
    expect(await h.svc.listHabits({ domain: 'health' })).toHaveLength(2)
    expect(await h.svc.listHabits({ habit_type: 'break' })).toHaveLength(1)
    expect(await h.svc.listHabits({ domain: 'health', habit_type: 'build' })).toHaveLength(1)
    // is_active filter axis (boolInt column vs JS boolean) — g2 NIT-3
    expect(await h.svc.listHabits({ is_active: true })).toHaveLength(2)
    expect(await h.svc.listHabits({ is_active: false })).toHaveLength(1)
  })

  it('updateHabit refuses a custom-frequency patch with no days_of_week (BR-S1-2, patch-guard; g2 NIT-1)', async () => {
    // The chosen S1 behavior: updateHabit guards the PATCH itself, not the merged row (PLAN-S1 §5).
    const hab = await h.svc.createHabit({ name: 'Walk', frequency: 'daily' })
    await expect(h.svc.updateHabit(hab.id, { frequency: 'custom' })).rejects.toBeInstanceOf(HabitScheduleError)
    // a custom patch that DOES carry days_of_week is accepted
    const ok = await h.svc.updateHabit(hab.id, { frequency: 'custom', days_of_week: [2, 4] })
    expect(ok.frequency).toBe('custom')
    expect(ok.days_of_week).toEqual([2, 4])
  })

  it('createHabit enqueues a co-transactional sync_queue row (HB-12)', async () => {
    const hab = await h.svc.createHabit({ name: 'Stretch' })
    const rows = await h.db.select().from(syncQueue).all()
    const forHabit = rows.filter((r) => r.row_id === hab.id)
    expect(forHabit.length).toBeGreaterThanOrEqual(1)
  })
})
