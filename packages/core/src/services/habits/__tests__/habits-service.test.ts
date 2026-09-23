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
import { habitCompletions } from '../../../db/schema/habits'
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

async function setup(clock?: () => string): Promise<Harness> {
  await initVault()
  const bsql = new Database(':memory:')
  const driver = createBetterSqlite3Driver(bsql)
  await migrate(driver)
  const db = createDrizzleProxy(driver)
  const svc = createHabitsService({ db, deviceId: 'test-device', clock })
  return { svc, db, bsql }
}

// UTC weekday (0=Sun…6=Sat) — used to build days_of_week that deterministically match/exclude chosen dates,
// regardless of the real weekday of those dates (mirrors the service's `weekday`).
const dow = (d: string): number => new Date(`${d}T00:00:00Z`).getUTCDay()

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

describe('mod-habits S2 — completion ledger + streak engine', () => {
  // Deterministic clock: asOf = 2026-09-23 unless a test overrides.
  const ASOF = '2026-09-23'
  let h: Harness
  beforeEach(async () => {
    h = await setup(() => ASOF)
  })

  it('logCompletion creates a row; re-logging the same date UPSERTs (HB-3)', async () => {
    const hab = await h.svc.createHabit({ name: 'Water' })
    const c1 = await h.svc.logCompletion(hab.id, { date: '2026-09-23', count: 1 })
    expect(c1.completed_date).toBe('2026-09-23')
    const c2 = await h.svc.logCompletion(hab.id, { date: '2026-09-23', count: 2 })
    expect(c2.count).toBe(2)
    const rows = await h.svc.getHabit(hab.id)
    expect(rows).toBeTruthy()
    // exactly one ledger row for that date (upsert, not duplicate)
    const all = await h.db.select().from(habitCompletions).all()
    expect(all.filter((r) => r.habit_id === hab.id && r.completed_date === '2026-09-23')).toHaveLength(1)
  })

  it('done (count>=target) advances current_streak; a partial does not (HB-5)', async () => {
    const hab = await h.svc.createHabit({ name: 'Pushups', target_count: 10 })
    const partial = await h.svc.logCompletion(hab.id, { date: ASOF, count: 3 }) // partial
    expect(partial.count).toBe(3)
    expect((await h.svc.getHabit(hab.id))?.current_streak).toBe(0) // partial ≠ streak
    expect((await h.svc.getHabit(hab.id))?.total_completions).toBe(0)
    await h.svc.logCompletion(hab.id, { date: ASOF, count: 10 }) // now done (upsert)
    expect((await h.svc.getHabit(hab.id))?.current_streak).toBe(1)
    expect((await h.svc.getHabit(hab.id))?.total_completions).toBe(1)
  })

  it('daily: consecutive done days increment; a missed elapsed day resets to 0, longest holds (HB-2)', async () => {
    const h2 = await setup(() => '2026-09-24')
    const hab = await h2.svc.createHabit({ name: 'Read', frequency: 'daily' })
    await h2.svc.logCompletion(hab.id, { date: '2026-09-21' })
    await h2.svc.logCompletion(hab.id, { date: '2026-09-22' })
    // 2026-09-23 is a missed elapsed scheduled day; asOf=24 (not done → grace-skip)
    const after = await h2.svc.getHabit(hab.id)
    expect(after?.current_streak).toBe(0) // 23 missed → reset
    expect(after?.longest_streak).toBe(2) // 21–22 run held
  })

  it('daily: today scheduled-but-not-done does NOT zero the prior streak (grace)', async () => {
    const h2 = await setup(() => '2026-09-24')
    const hab = await h2.svc.createHabit({ name: 'Journal', frequency: 'daily' })
    await h2.svc.logCompletion(hab.id, { date: '2026-09-22' })
    await h2.svc.logCompletion(hab.id, { date: '2026-09-23' })
    const after = await h2.svc.getHabit(hab.id) // asOf=24 not done → skip; 22–23 done
    expect(after?.current_streak).toBe(2)
  })

  it('asOf scheduled AND done counts toward current_streak (NIT-1 branch order)', async () => {
    const hab = await h.svc.createHabit({ name: 'Meditate', frequency: 'daily' })
    await h.svc.logCompletion(hab.id, { date: '2026-09-22' })
    await h.svc.logCompletion(hab.id, { date: ASOF }) // asOf itself, done
    expect((await h.svc.getHabit(hab.id))?.current_streak).toBe(2) // asOf counted, not skipped
  })

  it('custom days_of_week: an off-day gap is transparent (does not break the streak)', async () => {
    // scheduled = weekdays of 21 and 23; 22 (a distinct weekday) is an off-day
    const hab = await h.svc.createHabit({
      name: 'Gym',
      frequency: 'custom',
      days_of_week: [dow('2026-09-21'), dow('2026-09-23')],
    })
    await h.svc.logCompletion(hab.id, { date: '2026-09-21' })
    await h.svc.logCompletion(hab.id, { date: '2026-09-23' }) // asOf, scheduled, done; 22 is off-schedule
    expect((await h.svc.getHabit(hab.id))?.current_streak).toBe(2)
  })

  it('total_completions counts ALL done rows incl. off-schedule (BR-S2-6)', async () => {
    const hab = await h.svc.createHabit({
      name: 'Run',
      frequency: 'custom',
      days_of_week: [dow('2026-09-21')], // only 21's weekday is scheduled
    })
    await h.svc.logCompletion(hab.id, { date: '2026-09-21' }) // scheduled + done
    await h.svc.logCompletion(hab.id, { date: '2026-09-22' }) // off-schedule + done
    const after = await h.svc.getHabit(hab.id)
    expect(after?.total_completions).toBe(2) // both done rows
    expect(after?.current_streak).toBe(1) // only the scheduled one advances the streak
  })

  it('break-habit streak advances on logged abstain-days (HB-4)', async () => {
    const hab = await h.svc.createHabit({ name: 'No sugar', habit_type: 'break', frequency: 'daily' })
    await h.svc.logCompletion(hab.id, { date: '2026-09-22' })
    await h.svc.logCompletion(hab.id, { date: '2026-09-23' })
    expect((await h.svc.getHabit(hab.id))?.current_streak).toBe(2)
  })

  it('logDetailedCompletion persists mood; a rating out of 1–5 rejects (HB-7, BR-S2-8)', async () => {
    const hab = await h.svc.createHabit({ name: 'Yoga' })
    const c = await h.svc.logDetailedCompletion(hab.id, { date: ASOF, mood_after: 5, ease_rating: 4 })
    expect(c.mood_after).toBe(5)
    expect(c.ease_rating).toBe(4)
    await expect(h.svc.logDetailedCompletion(hab.id, { date: ASOF, mood_before: 6 })).rejects.toThrow()
  })

  it('editCompletion and deleteCompletion re-derive the counters (HB-2)', async () => {
    const h2 = await setup(() => '2026-09-22')
    const hab = await h2.svc.createHabit({ name: 'Walk', frequency: 'daily', target_count: 1 })
    await h2.svc.logCompletion(hab.id, { date: '2026-09-21' })
    await h2.svc.logCompletion(hab.id, { date: '2026-09-22' })
    expect((await h2.svc.getHabit(hab.id))?.current_streak).toBe(2)
    // edit 22 down to a partial (count 0 < target) → no longer done → recompute
    await h2.svc.editCompletion(hab.id, '2026-09-22', { count: 0 })
    expect((await h2.svc.getHabit(hab.id))?.current_streak).toBe(1) // only 21 done; 22==asOf not-done → skip
    // delete 21 → nothing done
    await h2.svc.deleteCompletion(hab.id, '2026-09-21')
    const after = await h2.svc.getHabit(hab.id)
    expect(after?.current_streak).toBe(0)
    expect(after?.total_completions).toBe(0)
  })

  it('longest_streak holds across a reset THEN a shorter rebuild (guards a naive longest=current bug)', async () => {
    const h2 = await setup(() => '2026-09-23')
    const hab = await h2.svc.createHabit({ name: 'Floss', frequency: 'daily' })
    for (const d of ['2026-09-18', '2026-09-19', '2026-09-20']) await h2.svc.logCompletion(hab.id, { date: d }) // run 3
    // 2026-09-21 missed → reset
    await h2.svc.logCompletion(hab.id, { date: '2026-09-22' })
    await h2.svc.logCompletion(hab.id, { date: '2026-09-23' }) // asOf, done → new run 2
    const after = await h2.svc.getHabit(hab.id)
    expect(after?.current_streak).toBe(2) // the rebuilt run
    expect(after?.longest_streak).toBe(3) // the pre-reset peak survives (not clobbered to 2)
  })

  it('a future-dated completion counts in total but not the streak walk (g2 NIT-1)', async () => {
    const hab = await h.svc.createHabit({ name: 'Plan', frequency: 'daily' }) // clock = ASOF 2026-09-23
    await h.svc.logCompletion(hab.id, { date: '2026-09-25' }) // future relative to asOf
    const after = await h.svc.getHabit(hab.id)
    expect(after?.total_completions).toBe(1) // counted in total
    expect(after?.current_streak).toBe(0) // excluded from the walk (hasn't happened)
    expect(after?.longest_streak).toBe(0)
  })

  it('logCompletion on a missing habit fails loud (no orphan completion)', async () => {
    await expect(h.svc.logCompletion('nonexistent-id', { date: ASOF })).rejects.toThrow(/not found/i)
  })
})
