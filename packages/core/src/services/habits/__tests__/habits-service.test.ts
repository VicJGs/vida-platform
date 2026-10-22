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

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import Database from 'better-sqlite3'
import { createDrizzleProxy, type SqliteDriver, type DrizzleDb } from '../../../db/adapter'
import { migrate } from '../../../db/migrations/runner'
import { initVault } from '../../../encryption/vault'
import { syncQueue } from '../../../db/schema'
import { habitCompletions } from '../../../db/schema/habits'
import type { HabitCompletion } from '@vida/types'
import { createEffectRegistry, createEffectRail } from '../../../foundation/effects'
import type { JournalContribution } from '../../journals'
import {
  createHabitsService,
  registerHabitsJournal,
  HabitScheduleError,
  BackfillWindowError,
  MetricContributionError,
  type HabitsService,
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
  svc: HabitsService
  db: DrizzleDb
  bsql: Database.Database
}

async function setup(
  clock?: () => string,
  prefs?: { backfillWindowDays: () => Promise<number | null> },
): Promise<Harness> {
  await initVault()
  const bsql = new Database(':memory:')
  const driver = createBetterSqlite3Driver(bsql)
  await migrate(driver)
  const db = createDrizzleProxy(driver)
  const svc = createHabitsService({ db, deviceId: 'test-device', clock, prefs })
  return { svc, db, bsql }
}

// UTC weekday (0=Sun…6=Sat) — used to build days_of_week that deterministically match/exclude chosen dates,
// regardless of the real weekday of those dates (mirrors the service's `weekday`).
const dow = (d: string): number => new Date(`${d}T00:00:00Z`).getUTCDay()

// A minimal HabitCompletion literal for exercising S5 emit methods that only read `completed_date`.
const mkCompletion = (habitId: string, date: string): HabitCompletion => ({
  id: `c-${date}`,
  habit_id: habitId,
  completed_date: date,
  count: 1,
  value: null,
  mood_before: null,
  mood_after: null,
  ease_rating: null,
  satisfaction: null,
  location: null,
  completion_time: null,
  created_at: 0,
  updated_at: 0,
  _sync_id: `s-${date}`,
  _sync_version: 1,
  _sync_device_id: 'd',
  _sync_lww_ts: 0,
  _sync_status: 'pending',
  _sync_hash: null,
})

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

  it('a future-dated completion is REJECTED at the write path (closed by S3; was g2 NIT-1)', async () => {
    const hab = await h.svc.createHabit({ name: 'Plan', frequency: 'daily' }) // clock = ASOF 2026-09-23
    await expect(h.svc.logCompletion(hab.id, { date: '2026-09-25' })).rejects.toBeInstanceOf(BackfillWindowError)
    const after = await h.svc.getHabit(hab.id)
    expect(after?.total_completions).toBe(0) // no row written (BR-S3-5)
  })

  it('logCompletion on a missing habit fails loud (no orphan completion)', async () => {
    await expect(h.svc.logCompletion('nonexistent-id', { date: ASOF })).rejects.toThrow(/not found/i)
  })
})

describe('mod-habits S3 — backfill + window', () => {
  const ASOF = '2026-09-23'

  it('backfillCompletion for a past date persists + recomputes (no prefs → unlimited)', async () => {
    const h = await setup(() => ASOF)
    const hab = await h.svc.createHabit({ name: 'Read', frequency: 'daily' })
    const c = await h.svc.backfillCompletion(hab.id, '2026-09-20', { count: 1 })
    expect(c.completed_date).toBe('2026-09-20')
    expect((await h.svc.getHabit(hab.id))?.total_completions).toBe(1)
  })

  it('with no prefs port, a far-past date is allowed (permissive/fail-OPEN default)', async () => {
    const h = await setup(() => ASOF)
    const hab = await h.svc.createHabit({ name: 'Old', frequency: 'daily' })
    const c = await h.svc.backfillCompletion(hab.id, '2020-01-01')
    expect(c.completed_date).toBe('2020-01-01')
  })

  it('with a prefs window, a date older than asOf−w is rejected, no row (HB-10, BR-S3-4/5)', async () => {
    const h = await setup(() => ASOF, { backfillWindowDays: async () => 7 })
    const hab = await h.svc.createHabit({ name: 'Walk', frequency: 'daily' })
    // asOf−7 = 2026-09-16; 09-15 is beyond the window
    await expect(h.svc.backfillCompletion(hab.id, '2026-09-15')).rejects.toBeInstanceOf(BackfillWindowError)
    expect((await h.svc.getHabit(hab.id))?.total_completions).toBe(0) // no row (BR-S3-5)
    const c = await h.svc.backfillCompletion(hab.id, '2026-09-18') // within window
    expect(c.completed_date).toBe('2026-09-18')
  })

  it('a future date is rejected via BOTH logCompletion and backfillCompletion (BR-S3-3)', async () => {
    const h = await setup(() => ASOF)
    const hab = await h.svc.createHabit({ name: 'Plan', frequency: 'daily' })
    await expect(h.svc.logCompletion(hab.id, { date: '2026-09-24' })).rejects.toBeInstanceOf(BackfillWindowError)
    await expect(h.svc.backfillCompletion(hab.id, '2026-09-24')).rejects.toBeInstanceOf(BackfillWindowError)
  })

  it('today (date === asOf) via logCompletion still persists — the guard never rejects today (N1)', async () => {
    const h = await setup(() => ASOF)
    const hab = await h.svc.createHabit({ name: 'Water', frequency: 'daily' })
    const c = await h.svc.logCompletion(hab.id) // date defaults to asOf
    expect(c.completed_date).toBe(ASOF)
    expect((await h.svc.getHabit(hab.id))?.current_streak).toBe(1)
  })

  it('editCompletion / deleteCompletion are not window-guarded (operate on existing rows)', async () => {
    const h = await setup(() => ASOF, { backfillWindowDays: async () => 7 })
    const hab = await h.svc.createHabit({ name: 'Gym', frequency: 'daily' })
    await h.svc.backfillCompletion(hab.id, '2026-09-18', { count: 1 }) // within window
    const e = await h.svc.editCompletion(hab.id, '2026-09-18', { count: 2 })
    expect(e.count).toBe(2)
    await h.svc.deleteCompletion(hab.id, '2026-09-18')
    expect((await h.svc.getHabit(hab.id))?.total_completions).toBe(0)
  })
})

describe('mod-habits S4 — derived reads + M5 seam', () => {
  const ASOF = '2026-09-23'
  const TODAY_DOW = dow(ASOF)
  const OTHER_DOW = (TODAY_DOW + 1) % 7

  it('getTodayHabits returns only active, scheduled-today, non-deleted habits (HB-6)', async () => {
    const h = await setup(() => ASOF)
    const a = await h.svc.createHabit({ name: 'Daily', frequency: 'daily' }) // scheduled today
    const b = await h.svc.createHabit({ name: 'TodayCustom', frequency: 'custom', days_of_week: [TODAY_DOW] })
    await h.svc.createHabit({ name: 'OtherDay', frequency: 'custom', days_of_week: [OTHER_DOW] }) // not today
    await h.svc.createHabit({ name: 'Inactive', frequency: 'daily', is_active: false }) // inactive
    await h.svc.createHabit({ name: 'NoSchedule', frequency: 'weekly' }) // weekly + null days_of_week → no schedule
    const del = await h.svc.createHabit({ name: 'Deleted', frequency: 'daily' })
    await h.svc.softDeleteHabit(del.id)
    const today = await h.svc.getTodayHabits()
    const names = today.map((x) => x.name).sort()
    expect(names).toEqual(['Daily', 'TodayCustom'])
    expect(today.map((x) => x.id).sort()).toEqual([a.id, b.id].sort())
  })

  it('getStreak reflects the cache after S2 mutations (HB-2)', async () => {
    const h = await setup(() => ASOF)
    const hab = await h.svc.createHabit({ name: 'Read', frequency: 'daily' })
    await h.svc.logCompletion(hab.id, { date: '2026-09-22' })
    await h.svc.logCompletion(hab.id, { date: '2026-09-23' })
    expect(await h.svc.getStreak(hab.id)).toEqual({ current: 2, longest: 2, total: 2 })
  })

  it('getCompletionRate = done ÷ scheduled over a range (BR-S4-3)', async () => {
    const h = await setup(() => ASOF)
    const hab = await h.svc.createHabit({ name: 'Walk', frequency: 'daily', target_count: 1 })
    await h.svc.logCompletion(hab.id, { date: '2026-09-21' })
    await h.svc.logCompletion(hab.id, { date: '2026-09-23' }) // 22 missed
    const r = await h.svc.getCompletionRate(hab.id, { from: '2026-09-21', to: '2026-09-23' })
    expect(r).toEqual({ scheduled: 3, done: 2, rate: 2 / 3 }) // 3 daily-scheduled, 2 done
  })

  it('getCompletionRate excludes an off-schedule done completion (does not inflate the rate; g2 NIT-1)', async () => {
    const h = await setup(() => ASOF)
    // scheduled only on today's weekday; 2026-09-22 is a different weekday (off-schedule)
    const hab = await h.svc.createHabit({ name: 'Sched', frequency: 'custom', days_of_week: [TODAY_DOW] })
    await h.svc.logCompletion(hab.id, { date: '2026-09-23' }) // scheduled + done
    await h.svc.logCompletion(hab.id, { date: '2026-09-22' }) // OFF-schedule + done
    const r = await h.svc.getCompletionRate(hab.id, { from: '2026-09-22', to: '2026-09-23' })
    expect(r).toEqual({ scheduled: 1, done: 1, rate: 1 }) // the off-day done (22) is in neither count
  })

  it('getCompletionRate returns rate:null when nothing is scheduled in the range (empty ≠ 0)', async () => {
    const h = await setup(() => ASOF)
    const hab = await h.svc.createHabit({ name: 'Rare', frequency: 'custom', days_of_week: [OTHER_DOW] })
    const r = await h.svc.getCompletionRate(hab.id, { from: ASOF, to: ASOF }) // asOf weekday != OTHER_DOW
    expect(r).toEqual({ scheduled: 0, done: 0, rate: null })
  })

  it('getMoodTrend returns range mood points ascending, nulls preserved (HB-7)', async () => {
    const h = await setup(() => ASOF)
    const hab = await h.svc.createHabit({ name: 'Yoga', frequency: 'daily' })
    await h.svc.logDetailedCompletion(hab.id, { date: '2026-09-23', mood_after: 5 })
    await h.svc.logDetailedCompletion(hab.id, { date: '2026-09-22', mood_after: 3, ease_rating: 4 })
    const trend = await h.svc.getMoodTrend(hab.id, { from: '2026-09-20', to: '2026-09-23' })
    expect(trend.map((p) => p.date)).toEqual(['2026-09-22', '2026-09-23']) // ascending
    expect(trend[0]?.mood_after).toBe(3)
    expect(trend[0]?.ease_rating).toBe(4)
    expect(trend[1]?.mood_before).toBeNull() // null preserved
  })

  it('getCalendar returns a month’s completions with done = count>=target', async () => {
    const h = await setup(() => ASOF)
    const hab = await h.svc.createHabit({ name: 'Pushups', frequency: 'daily', target_count: 10 })
    await h.svc.logCompletion(hab.id, { date: '2026-09-10', count: 10 }) // done
    await h.svc.logCompletion(hab.id, { date: '2026-09-11', count: 3 }) // partial
    await h.svc.logCompletion(hab.id, { date: '2026-08-31', count: 10 }) // prior month — excluded
    const cal = await h.svc.getCalendar(hab.id, '2026-09')
    expect(cal.map((d) => d.date)).toEqual(['2026-09-10', '2026-09-11'])
    expect(cal[0]?.done).toBe(true)
    expect(cal[1]?.done).toBe(false) // partial
  })

  it('per-habit reads fail loud on a missing habit', async () => {
    const h = await setup(() => ASOF)
    await expect(h.svc.getStreak('nope')).rejects.toThrow(/not found/i)
    await expect(h.svc.getCompletionRate('nope', { from: ASOF, to: ASOF })).rejects.toThrow(/not found/i)
    await expect(h.svc.getCalendar('nope', '2026-09')).rejects.toThrow(/not found/i)
  })
})

describe('mod-habits S5 — effect fan-out + cross-module seams', () => {
  const ASOF = '2026-09-23'
  const EFFECT_TYPES = ['complete_habit_occurrence', 'contribute_purpose_metric', 'award_xp'] as const

  async function freshDb(): Promise<{ db: DrizzleDb; bsql: Database.Database }> {
    await initVault()
    const bsql = new Database(':memory:')
    const driver = createBetterSqlite3Driver(bsql)
    await migrate(driver)
    return { db: createDrizzleProxy(driver), bsql }
  }
  // A service wired to a REAL rail whose handlers record fires (idempotency is the rail's, tested for real).
  async function withRail(register: readonly (typeof EFFECT_TYPES)[number][], onFire: (t: string, transition: string) => void) {
    const { db } = await freshDb()
    const registry = createEffectRegistry()
    for (const t of register) registry.register(t, async (event) => onFire(t, event.transition))
    const rail = createEffectRail(db, registry)
    return createHabitsService({ db, deviceId: 'test-device', clock: () => ASOF, effects: { rail, registry } })
  }

  it('a done completion fans out the 3 effects once; a re-log of the same date does not double-fire (idempotent)', async () => {
    const fired: string[] = []
    const svc = await withRail(EFFECT_TYPES, (t, tr) => fired.push(`${t}@${tr}`))
    const hab = await svc.createHabit({ name: 'Water', frequency: 'daily' })
    await svc.logCompletion(hab.id, { date: ASOF }) // done (target 1)
    expect(fired.sort()).toEqual([
      `award_xp@completed:${ASOF}`,
      `complete_habit_occurrence@completed:${ASOF}`,
      `contribute_purpose_metric@completed:${ASOF}`,
    ])
    await svc.logCompletion(hab.id, { date: ASOF, count: 1 }) // re-log same date → rail dedups
    expect(fired).toHaveLength(3) // no double-fire (R1)
  })

  it('a partial completion fires no effects', async () => {
    const fired: string[] = []
    const svc = await withRail(['award_xp'], () => fired.push('x'))
    const hab = await svc.createHabit({ name: 'Pushups', target_count: 10 })
    await svc.logCompletion(hab.id, { date: ASOF, count: 3 }) // partial
    expect(fired).toHaveLength(0)
  })

  it('an editCompletion that flips partial→done fires the effects (B1)', async () => {
    const fired: string[] = []
    const svc = await withRail(['award_xp'], () => fired.push('x'))
    const hab = await svc.createHabit({ name: 'Read', target_count: 5 })
    await svc.logCompletion(hab.id, { date: ASOF, count: 2 }) // partial → no fire
    expect(fired).toHaveLength(0)
    await svc.editCompletion(hab.id, ASOF, { count: 5 }) // flip to done → fire
    expect(fired).toHaveLength(1)
  })

  it('with no effects port a done completion persists and fires nothing (dormant)', async () => {
    const { db } = await freshDb()
    const svc = createHabitsService({ db, deviceId: 'test-device', clock: () => ASOF })
    const hab = await svc.createHabit({ name: 'Walk', frequency: 'daily' })
    const c = await svc.logCompletion(hab.id, { date: ASOF })
    expect(c.completed_date).toBe(ASOF) // succeeds, no throw
  })

  it('a throwing contribute_purpose_metric handler does NOT fail logCompletion (failure isolated, BR-S5-2)', async () => {
    const { db } = await freshDb()
    const registry = createEffectRegistry()
    registry.register('contribute_purpose_metric', async () => {
      throw new Error('handler boom')
    })
    const rail = createEffectRail(db, registry)
    const svc = createHabitsService({ db, deviceId: 'test-device', clock: () => ASOF, effects: { rail, registry } })
    const hab = await svc.createHabit({ name: 'Yoga', frequency: 'daily' })
    const c = await svc.logCompletion(hab.id, { date: ASOF }) // must NOT throw
    expect(c.completed_date).toBe(ASOF)
    expect((await svc.getHabit(hab.id))?.current_streak).toBe(1) // persisted + cache recomputed
  })

  it('contributeToPurposeMetrics throws MetricContributionError when the handler throws', async () => {
    const { db } = await freshDb()
    const registry = createEffectRegistry()
    registry.register('contribute_purpose_metric', async () => {
      throw new Error('boom')
    })
    const rail = createEffectRail(db, registry)
    const svc = createHabitsService({ db, deviceId: 'test-device', clock: () => ASOF, effects: { rail, registry } })
    const hab = await svc.createHabit({ name: 'Meditate', frequency: 'daily' })
    // a completion for a date never auto-fired (novel key → guaranteed re-fire → throw)
    const completion = mkCompletion(hab.id, '2026-09-15')
    await expect(svc.contributeToPurposeMetrics(hab.id, completion)).rejects.toBeInstanceOf(MetricContributionError)
  })

  it('getEntityTags → [] without a resolver; → resolver tags with one (HAB-21)', async () => {
    const { db } = await freshDb()
    const svc1 = createHabitsService({ db, deviceId: 'test-device', clock: () => ASOF })
    const hab1 = await svc1.createHabit({ name: 'A' })
    expect(await svc1.getEntityTags('habit', hab1.id)).toEqual([])

    const { db: db2 } = await freshDb()
    const associations = {
      resolveAssociations: async () => ({ mode: 'separate' as const, tags: [{ kind: 'tag' as const, tagId: 't1' }], links: [] }),
    }
    const svc2 = createHabitsService({ db: db2, deviceId: 'test-device', clock: () => ASOF, associations: associations as never })
    const hab2 = await svc2.createHabit({ name: 'B' })
    expect(await svc2.getEntityTags('habit', hab2.id)).toEqual([{ kind: 'tag', tagId: 't1' }])
  })

  it('linkProject / listProjectsForHabit / unlinkProject round-trip; re-link resurrects (no UNIQUE throw, HAB-27)', async () => {
    const { db } = await freshDb()
    const svc = createHabitsService({ db, deviceId: 'test-device', clock: () => ASOF })
    const hab = await svc.createHabit({ name: 'Gym' })
    await svc.linkProject(hab.id, 'proj-1')
    await svc.linkProject(hab.id, 'proj-1') // idempotent on a live pair
    expect(await svc.listProjectsForHabit(hab.id)).toEqual(['proj-1'])
    await svc.unlinkProject(hab.id, 'proj-1')
    expect(await svc.listProjectsForHabit(hab.id)).toEqual([])
    const relinked = await svc.linkProject(hab.id, 'proj-1') // resurrect (soft-deleted pair + UNIQUE → no throw)
    expect(relinked.project_id).toBe('proj-1')
    expect(await svc.listProjectsForHabit(hab.id)).toEqual(['proj-1'])
  })

  it('registerHabitsJournal registers a summary contribution (due/done; empty day → empty, BR-S5-7)', async () => {
    const { db } = await freshDb()
    const svc = createHabitsService({ db, deviceId: 'test-device', clock: () => ASOF })
    const captured: JournalContribution[] = []
    const registry = { register: (def: JournalContribution) => captured.push(def) }
    registerHabitsJournal(registry as never, svc)
    expect(captured).toHaveLength(1)
    const contrib = captured[0]!
    expect(contrib.module).toBe('habits')
    const empty = await contrib.summary(ASOF) // no habits → empty
    expect(empty.state).toBe('empty')
    const hab = await svc.createHabit({ name: 'D', frequency: 'daily' })
    await svc.logCompletion(hab.id, { date: ASOF }) // due + done
    const s = await contrib.summary(ASOF)
    expect(s.state).toBe('success')
    expect(s.items?.[0]).toEqual({ due: 1, done: 1 })
  })
})

// ── fe-calendar #19 · S6 — getCompletionGrid (BR-CAL-S6-1..6, PLAN-S6-first-consumer-reads.md) ───────────────
// The cross-habit grid the Living lens's habit threads read (EC-7): every day of an inclusive range per active habit,
// with `scheduled` (the ONE BR-S2-4 predicate), `count` and `done`. Run under a negative AND a positive UTC offset —
// each catches a different date-bug class (the tasks Asia/Tokyo precedent; the gate is TZ-blind otherwise).
describe.each(['America/Sao_Paulo', 'Asia/Tokyo'])('fe-calendar S6 — getCompletionGrid (TZ=%s)', (tz) => {
  const ASOF = '2026-10-14' // Wed — completions are seeded on/before it (writes are clock-guarded; reads are not)
  const WEEK = { from: '2026-10-12', to: '2026-10-18' } // Mon … Sun
  const days7 = ['2026-10-12', '2026-10-13', '2026-10-14', '2026-10-15', '2026-10-16', '2026-10-17', '2026-10-18']
  let h: Harness
  let origTz: string | undefined
  beforeEach(async () => {
    origTz = process.env.TZ
    process.env.TZ = tz
    h = await setup(() => ASOF)
  })
  afterEach(() => {
    if (origTz === undefined) delete process.env.TZ
    else process.env.TZ = origTz
  })

  it('a daily habit: every day of the inclusive range, ascending, all scheduled', async () => {
    const hab = await h.svc.createHabit({ name: 'Meditate', frequency: 'daily' })
    const grid = await h.svc.getCompletionGrid(WEEK)
    expect(grid).toHaveLength(1)
    expect(grid[0].habit.id).toBe(hab.id)
    expect(grid[0].habit.name).toBe('Meditate')
    expect(grid[0].days.map((d) => d.date)).toEqual(days7)
    expect(grid[0].days.every((d) => d.scheduled && d.count === 0 && !d.done)).toBe(true)
  })

  it('a custom habit is scheduled only on its weekdays (the BR-S2-4 predicate)', async () => {
    await h.svc.createHabit({ name: 'Run', frequency: 'custom', days_of_week: [dow('2026-10-12'), dow('2026-10-14'), dow('2026-10-16')] })
    const [row] = await h.svc.getCompletionGrid(WEEK)
    expect(row.days.filter((d) => d.scheduled).map((d) => d.date)).toEqual(['2026-10-12', '2026-10-14', '2026-10-16'])
  })

  it('done = count >= target_count; an off-schedule completion keeps scheduled:false with its count/done', async () => {
    const pushups = await h.svc.createHabit({ name: 'Pushups', frequency: 'daily', target_count: 2 })
    await h.svc.logCompletion(pushups.id, { date: '2026-10-12', count: 1 })
    await h.svc.logCompletion(pushups.id, { date: '2026-10-13', count: 2 })
    const mondays = await h.svc.createHabit({ name: 'Plan', frequency: 'custom', days_of_week: [dow('2026-10-12')], sort_order: 1 })
    await h.svc.logCompletion(mondays.id, { date: '2026-10-13' }) // Tuesday — off-schedule
    const grid = await h.svc.getCompletionGrid(WEEK)
    const p = grid.find((r) => r.habit.id === pushups.id)!
    expect(p.days[0]).toMatchObject({ date: '2026-10-12', scheduled: true, count: 1, done: false })
    expect(p.days[1]).toMatchObject({ date: '2026-10-13', scheduled: true, count: 2, done: true })
    const m = grid.find((r) => r.habit.id === mondays.id)!
    expect(m.days[1]).toMatchObject({ date: '2026-10-13', scheduled: false, count: 1, done: true })
  })

  it('excludes inactive and soft-deleted habits', async () => {
    const keep = await h.svc.createHabit({ name: 'Keep' })
    await h.svc.createHabit({ name: 'Paused', is_active: false })
    const gone = await h.svc.createHabit({ name: 'Gone' })
    await h.svc.softDeleteHabit(gone.id)
    const grid = await h.svc.getCompletionGrid(WEEK)
    expect(grid.map((r) => r.habit.id)).toEqual([keep.id])
  })

  it('orders by sort_order, then id (code-unit) — never creation order', async () => {
    const late = await h.svc.createHabit({ name: 'Late', sort_order: 2 })
    const a = await h.svc.createHabit({ name: 'A', sort_order: 1 })
    const b = await h.svc.createHabit({ name: 'B', sort_order: 1 })
    const ids = (await h.svc.getCompletionGrid(WEEK)).map((r) => r.habit.id)
    // uuidv7 has no counter: two ids minted in one millisecond can sort either way — expect the id order itself
    expect(ids).toEqual([...[a.id, b.id].sort(), late.id])
  })

  it('no habits → []; an inverted or malformed range → rows with zero days, no throw', async () => {
    expect(await h.svc.getCompletionGrid(WEEK)).toEqual([])
    await h.svc.createHabit({ name: 'Water' })
    expect((await h.svc.getCompletionGrid({ from: '2026-10-18', to: '2026-10-12' }))[0].days).toEqual([])
    expect((await h.svc.getCompletionGrid({ from: 'nope', to: '2026-10-18' }))[0].days).toEqual([])
  })

  it('reads the completions ledger with exactly ONE query (never one per habit)', async () => {
    for (const name of ['A', 'B', 'C']) {
      const hab = await h.svc.createHabit({ name })
      await h.svc.logCompletion(hab.id, { date: ASOF })
    }
    // the driver prepares every statement through bsql.prepare at query time — count SELECTs on the ledger
    const prepare = h.bsql.prepare.bind(h.bsql)
    let ledgerSelects = 0
    h.bsql.prepare = ((sql: string) => {
      if (/^\s*select/i.test(sql) && /"habit_completions"/.test(sql)) ledgerSelects++
      return prepare(sql)
    }) as typeof h.bsql.prepare
    ledgerSelects = 0 // reset right before the call — seeding ran its own ledger SELECTs
    const grid = await h.svc.getCompletionGrid(WEEK)
    expect(grid).toHaveLength(3)
    expect(ledgerSelects).toBe(1)
  })
})
