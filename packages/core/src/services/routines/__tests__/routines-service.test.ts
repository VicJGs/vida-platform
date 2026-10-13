// ============================================================================
// mod-routines #64 ① · S1 — routine definition CRUD + @vida/types reconcile (LIF-138)
//
// Node / better-sqlite3 live-store harness (mirrors habits/finance/checkins): REAL data store,
// UNLOCKED vault (the sync-hash path runs even with empty [E]), migrate() applies 018_routines so
// the reframe tables exist. Covers the slice-map.md S1 Verification Gate: CRUD happy + faithful
// create echo (defaults backfilled, nullables null) + partial update (no blanking) + soft-delete
// hides (ledger untouched) + listRoutines lifecycle filter + 2 failure paths (invalid-enum reject,
// missing-name reject) + co-transactional sync_queue enqueue (persistence probe).
// ============================================================================

import { describe, it, expect, beforeEach } from 'vitest'
import Database from 'better-sqlite3'
import { createDrizzleProxy, type SqliteDriver, type DrizzleDb } from '../../../db/adapter'
import { migrate } from '../../../db/migrations/runner'
import { initVault } from '../../../encryption/vault'
import { syncQueue } from '../../../db/schema'
import { createRoutinesService, RoutineNotFoundError, type RoutinesService } from '../index'

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
  svc: RoutinesService
  db: DrizzleDb
  bsql: Database.Database
}

async function setup(): Promise<Harness> {
  await initVault()
  const bsql = new Database(':memory:')
  const driver = createBetterSqlite3Driver(bsql)
  await migrate(driver)
  const db = createDrizzleProxy(driver)
  const svc = createRoutinesService({ db, deviceId: 'test-device' })
  return { svc, db, bsql }
}

describe('mod-routines S1 — routine definition CRUD', () => {
  let h: Harness
  beforeEach(async () => {
    h = await setup()
  })

  it('createRoutine echoes a FAITHFUL row — notNull-defaults backfilled, nullables → null (RT-2/RT-19, IR-8)', async () => {
    const r = await h.svc.createRoutine({ name: 'Morning sequence' })
    expect(r.id).toBeTruthy()
    expect(r.name).toBe('Morning sequence')
    expect(r.lifecycle).toBe('active') // NN default backfilled
    expect(r.measurement_kind).toBe('rate') // NN default backfilled (RT-19 natural)
    expect(r.sort_order).toBe(0) // NN default backfilled
    expect(r.description).toBeNull() // nullable coalesced (not undefined)
    expect(r.recurrence_rule).toBeNull()
    expect(r.binding_mode).toBeNull() // nullable enum — not dropped (null ⇒ derive)
    expect(r.progress).toBeNull() // nullable override slot (RT-14 — no cached streak)
    expect(r.deleted_at).toBeNull()
    expect(r._sync_status).toBe('pending')
  })

  it('createRoutine honours explicit lifecycle/measurability/schedule/progress (RT-6/RT-11/RT-19)', async () => {
    const r = await h.svc.createRoutine({
      name: 'Evening wind-down',
      description: 'before bed',
      recurrence_rule: 'FREQ=DAILY',
      lifecycle: 'paused',
      measurement_kind: 'milestone',
      binding_mode: 'derived-pull',
      progress: 40,
      sort_order: 3,
    })
    expect(r.description).toBe('before bed')
    expect(r.recurrence_rule).toBe('FREQ=DAILY')
    expect(r.lifecycle).toBe('paused')
    expect(r.measurement_kind).toBe('milestone')
    expect(r.binding_mode).toBe('derived-pull')
    expect(r.progress).toBe(40)
    expect(r.sort_order).toBe(3)
  })

  it('getRoutine returns the row, and null for a missing id', async () => {
    const r = await h.svc.createRoutine({ name: 'Focus block' })
    expect(await h.svc.getRoutine(r.id)).toMatchObject({ id: r.id, name: 'Focus block' })
    expect(await h.svc.getRoutine('does-not-exist')).toBeNull()
  })

  it('updateRoutine patches only the passed keys — never blanks an unpassed field', async () => {
    const r = await h.svc.createRoutine({ name: 'Study loop', description: 'keep' })
    const up = await h.svc.updateRoutine(r.id, { lifecycle: 'off' })
    expect(up.lifecycle).toBe('off')
    expect(up.description).toBe('keep') // untouched — partial update didn't null it
    expect(up.name).toBe('Study loop')
  })

  it('archiveRoutine soft-deletes — getRoutine → null, listRoutines excludes it (RT-17)', async () => {
    const r = await h.svc.createRoutine({ name: 'Weekly review' })
    await h.svc.archiveRoutine(r.id)
    expect(await h.svc.getRoutine(r.id)).toBeNull()
    const all = await h.svc.listRoutines()
    expect(all.find((x) => x.id === r.id)).toBeUndefined()
  })

  it('listRoutines filters by lifecycle (IR-10 — explicit soft-delete filter)', async () => {
    await h.svc.createRoutine({ name: 'A', lifecycle: 'active' })
    await h.svc.createRoutine({ name: 'B', lifecycle: 'paused' })
    await h.svc.createRoutine({ name: 'C', lifecycle: 'active' })
    expect((await h.svc.listRoutines()).length).toBe(3)
    const paused = await h.svc.listRoutines({ lifecycle: 'paused' })
    expect(paused.map((r) => r.name)).toEqual(['B'])
  })

  // ── failure paths ──────────────────────────────────────────────────
  it('createRoutine rejects an invalid lifecycle enum (Zod, before any write)', async () => {
    await expect(
      // @ts-expect-error — exercising the runtime validator with an off-tuple value
      h.svc.createRoutine({ name: 'Bad', lifecycle: 'archived' }),
    ).rejects.toThrow()
    expect((await h.svc.listRoutines()).length).toBe(0) // no row written
  })

  it('createRoutine rejects a missing name (Zod)', async () => {
    // @ts-expect-error — name is required
    await expect(h.svc.createRoutine({})).rejects.toThrow()
  })

  // ── persistence probe ──────────────────────────────────────────────
  it('createRoutine enqueues a co-transactional sync_queue row (local-first, RT-18)', async () => {
    const r = await h.svc.createRoutine({ name: 'Sync me' })
    const rows = await h.db.select().from(syncQueue).all()
    expect(rows.filter((x) => x.row_id === r.id).length).toBeGreaterThanOrEqual(1)
  })
})

describe('mod-routines S2 — step CRUD + ordering + cascade', () => {
  let h: Harness
  let routineId: string
  beforeEach(async () => {
    h = await setup()
    routineId = (await h.svc.createRoutine({ name: 'Morning' })).id
  })

  it('addStep echoes a FAITHFUL step — defaults backfilled, nullables → null, skip_dates round-trips (RT-3/RT-8, IR-8)', async () => {
    const s = await h.svc.addStep(routineId, { title: 'Stretch', skip_dates: ['2026-10-20', '2026-10-21'] })
    expect(s.id).toBeTruthy()
    expect(s.routine_id).toBe(routineId)
    expect(s.title).toBe('Stretch')
    expect(s.step_order).toBe(0) // default backfilled
    expect(s.is_required).toBe(false) // default backfilled
    expect(s.step_type).toBeNull() // nullable coalesced
    expect(s.entity_type).toBeNull()
    expect(s.entity_id).toBeNull()
    expect(s.description).toBeNull()
    expect(s.time_of_day).toBeNull()
    expect(s.skip_dates).toEqual(['2026-10-20', '2026-10-21']) // JSON round-trip (IR-6)
    expect(s.deleted_at).toBeNull()
    expect(s._sync_status).toBe('pending')
  })

  it('addStep honours an explicit polymorphic driven step (RT-3)', async () => {
    const s = await h.svc.addStep(routineId, {
      title: 'Workout',
      step_type: 'workout', // OPEN vocab — no enum validation
      entity_type: 'session',
      entity_id: 'sess-123',
      is_required: true,
      time_of_day: 'morning',
      step_order: 2,
    })
    expect(s.step_type).toBe('workout')
    expect(s.entity_type).toBe('session')
    expect(s.entity_id).toBe('sess-123')
    expect(s.is_required).toBe(true)
    expect(s.time_of_day).toBe('morning')
    expect(s.step_order).toBe(2)
  })

  it('addStep allows an alarm-like actionable step with NO driven entity (RT-4)', async () => {
    const s = await h.svc.addStep(routineId, { title: 'Drink water', step_type: 'task' })
    expect(s.entity_type).toBeNull()
    expect(s.entity_id).toBeNull()
  })

  it('addStep on a missing/archived routine throws RoutineNotFoundError — no orphan step (RT-3, IR-3)', async () => {
    await expect(h.svc.addStep('no-such-routine', { title: 'X' })).rejects.toBeInstanceOf(RoutineNotFoundError)
    await h.svc.archiveRoutine(routineId)
    await expect(h.svc.addStep(routineId, { title: 'Y' })).rejects.toBeInstanceOf(RoutineNotFoundError)
  })

  it('updateStep patches only passed keys; skip_dates can be set then cleared (no blanking)', async () => {
    const s = await h.svc.addStep(routineId, { title: 'keep', step_type: 'habit' })
    const up = await h.svc.updateStep(s.id, { is_required: true })
    expect(up.is_required).toBe(true)
    expect(up.step_type).toBe('habit') // untouched
    expect(up.title).toBe('keep')
    const withSkips = await h.svc.updateStep(s.id, { skip_dates: ['2026-11-01'] })
    expect(withSkips.skip_dates).toEqual(['2026-11-01'])
    const cleared = await h.svc.updateStep(s.id, { skip_dates: null })
    expect(cleared.skip_dates).toBeNull()
  })

  it('removeStep soft-deletes — listSteps excludes it', async () => {
    const a = await h.svc.addStep(routineId, { title: 'A' })
    const b = await h.svc.addStep(routineId, { title: 'B' })
    await h.svc.removeStep(a.id)
    const steps = await h.svc.listSteps(routineId)
    expect(steps.map((s) => s.id)).toEqual([b.id])
  })

  it('listSteps returns the steps sorted by step_order', async () => {
    await h.svc.addStep(routineId, { title: 'third', step_order: 3 })
    await h.svc.addStep(routineId, { title: 'first', step_order: 1 })
    await h.svc.addStep(routineId, { title: 'second', step_order: 2 })
    expect((await h.svc.listSteps(routineId)).map((s) => s.title)).toEqual(['first', 'second', 'third'])
  })

  it('reorderSteps sets step_order by position; foreign/unknown ids are ignored (IR-3)', async () => {
    const a = await h.svc.addStep(routineId, { title: 'A', step_order: 0 })
    const b = await h.svc.addStep(routineId, { title: 'B', step_order: 1 })
    const c = await h.svc.addStep(routineId, { title: 'C', step_order: 2 })
    await h.svc.reorderSteps(routineId, [c.id, 'foreign-id', a.id, b.id]) // foreign-id skipped
    const steps = await h.svc.listSteps(routineId)
    expect(steps.map((s) => s.title)).toEqual(['C', 'A', 'B']) // C→0, A→1, B→2
  })

  it('archiveRoutine cascade-soft-deletes its steps (RT-17, IR-3)', async () => {
    await h.svc.addStep(routineId, { title: 'A' })
    await h.svc.addStep(routineId, { title: 'B' })
    expect((await h.svc.listSteps(routineId)).length).toBe(2)
    await h.svc.archiveRoutine(routineId)
    expect((await h.svc.listSteps(routineId)).length).toBe(0) // steps cascaded
  })
})
