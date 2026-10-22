// ============================================================================
// mod-routines #64 ① · S1 + S2 (built) + S2c floor conformance (LIF-138)
//
// Node / better-sqlite3 live-store harness (mirrors habits/finance/checkins): REAL data store,
// UNLOCKED vault (the sync-hash path runs even with empty [E]), migrate() applies 018_routines so
// the reframe tables exist. Covers the slice-map.md S1 Verification Gate: CRUD happy + faithful
// create echo (defaults backfilled, nullables null) + partial update (no blanking) + soft-delete
// hides (ledger untouched) + listRoutines lifecycle filter + 2 failure paths (invalid-enum reject,
// missing-name reject) + co-transactional sync_queue enqueue (persistence probe).
// ============================================================================

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { ZodError } from 'zod'
import Database from 'better-sqlite3'
import { createDrizzleProxy, type SqliteDriver, type DrizzleDb } from '../../../db/adapter'
import { migrate } from '../../../db/migrations/runner'
import { initVault } from '../../../encryption/vault'
import { syncQueue } from '../../../db/schema'
import { createTaggableTypeRegistry } from '../../../foundation/spaces/registry'
import { UnknownEntityType } from '../../../foundation/spaces/types'
import {
  createRoutinesService,
  RoutineNotFoundError,
  StepNotFoundError,
  CompletionNotFoundError,
  InvalidRecurrenceRuleError,
  type RoutinesService,
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
  const svc = createRoutinesService({ db, deviceId: 'test-device', registry: createTaggableTypeRegistry() })
  return { svc, db, bsql }
}

describe('mod-routines S1 — routine definition CRUD', () => {
  let h: Harness
  beforeEach(async () => {
    h = await setup()
  })

  it('createRoutine echoes a FAITHFUL row — notNull-defaults backfilled, nullables → null (RT-2/RT-19, interp §4.8)', async () => {
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

  it('listRoutines filters by lifecycle (interp §4.7 — explicit soft-delete filter)', async () => {
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

  it('addStep echoes a FAITHFUL step — defaults backfilled, nullables → null, skip_dates round-trips (RT-3/RT-8, interp §4.8)', async () => {
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
    expect(s.skip_dates).toEqual(['2026-10-20', '2026-10-21']) // JSON round-trip (interp §4.9)
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

  it('addStep on a missing/archived routine throws RoutineNotFoundError — no orphan step (RT-3, interp §4.6)', async () => {
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

  it('reorderSteps sets step_order by position; foreign/unknown ids are ignored (BR-RT-S2-6)', async () => {
    const a = await h.svc.addStep(routineId, { title: 'A', step_order: 0 })
    const b = await h.svc.addStep(routineId, { title: 'B', step_order: 1 })
    const c = await h.svc.addStep(routineId, { title: 'C', step_order: 2 })
    await h.svc.reorderSteps(routineId, [c.id, 'foreign-id', a.id, b.id]) // foreign-id skipped
    const steps = await h.svc.listSteps(routineId)
    expect(steps.map((s) => s.title)).toEqual(['C', 'A', 'B']) // C→0, A→1, B→2
  })

  it('archiveRoutine cascade-soft-deletes its steps (RT-17, interp §4.6)', async () => {
    await h.svc.addStep(routineId, { title: 'A' })
    await h.svc.addStep(routineId, { title: 'B' })
    expect((await h.svc.listSteps(routineId)).length).toBe(2)
    await h.svc.archiveRoutine(routineId)
    expect((await h.svc.listSteps(routineId)).length).toBe(0) // steps cascaded
  })
})

describe('mod-routines S3 — completion ledger + skip', () => {
  let h: Harness
  let stepId: string
  beforeEach(async () => {
    h = await setup()
    const routineId = (await h.svc.createRoutine({ name: 'Morning' })).id
    stepId = (await h.svc.addStep(routineId, { title: 'Stretch' })).id
  })

  it('completeStep records a DONE occurrence (skipped=false, completed_at stamped) (RT-5)', async () => {
    const c = await h.svc.completeStep(stepId, { date: '2026-10-13', actual_duration_minutes: 12 })
    expect(c.routine_step_id).toBe(stepId)
    expect(c.completed_date).toBe('2026-10-13')
    expect(c.skipped).toBe(false)
    expect(c.skip_reason).toBeNull()
    expect(c.actual_duration_minutes).toBe(12)
    expect(c.completed_at).toBeGreaterThan(0)
    expect(c._sync_status).toBe('pending')
  })

  it('completeStep UPSERTs per (step,date) — no duplicate row (RT-18 UNIQUE)', async () => {
    await h.svc.completeStep(stepId, { date: '2026-10-13' })
    await h.svc.completeStep(stepId, { date: '2026-10-13', actual_duration_minutes: 30 })
    const ledger = await h.svc.listCompletions(stepId)
    expect(ledger.length).toBe(1) // upsert, not insert
    expect(ledger[0]!.actual_duration_minutes).toBe(30)
  })

  it('skipStep logs a skip on the day (skipped=true + reason) distinct from a done (RT-8)', async () => {
    const c = await h.svc.skipStep(stepId, { date: '2026-10-13', reason: 'sick' })
    expect(c.skipped).toBe(true)
    expect(c.skip_reason).toBe('sick')
  })

  it('complete→skip and skip→complete flip the SAME (step,date) row (upsert)', async () => {
    await h.svc.completeStep(stepId, { date: '2026-10-13' })
    const skipped = await h.svc.skipStep(stepId, { date: '2026-10-13', reason: 'changed mind' })
    expect(skipped.skipped).toBe(true)
    const redone = await h.svc.completeStep(stepId, { date: '2026-10-13' })
    expect(redone.skipped).toBe(false)
    expect(redone.skip_reason).toBeNull() // done clears the skip reason
    expect((await h.svc.listCompletions(stepId)).length).toBe(1)
  })

  it('planSkipDates writes step.skip_dates (deduped+sorted), NOT a completion row (RT-8 pre-planned)', async () => {
    const step = await h.svc.planSkipDates(stepId, ['2026-12-25', '2026-10-20', '2026-12-25'])
    expect(step.skip_dates).toEqual(['2026-10-20', '2026-12-25']) // deduped + sorted
    expect((await h.svc.listCompletions(stepId)).length).toBe(0) // no ledger row written
    // merges with a subsequent call
    const again = await h.svc.planSkipDates(stepId, ['2026-10-19'])
    expect(again.skip_dates).toEqual(['2026-10-19', '2026-10-20', '2026-12-25'])
  })

  it('editCompletion patches an existing (step,date); CompletionNotFoundError if absent (RT-5)', async () => {
    await h.svc.completeStep(stepId, { date: '2026-10-13' })
    const edited = await h.svc.editCompletion(stepId, '2026-10-13', { actual_duration_minutes: 45, skipped: true, skip_reason: 'late' })
    expect(edited.actual_duration_minutes).toBe(45)
    expect(edited.skipped).toBe(true)
    expect(edited.skip_reason).toBe('late')
    await expect(h.svc.editCompletion(stepId, '2099-01-01', {})).rejects.toBeInstanceOf(CompletionNotFoundError)
  })

  it('deleteCompletion HARD-deletes; CompletionNotFoundError if absent (RT-14 ledger)', async () => {
    await h.svc.completeStep(stepId, { date: '2026-10-13' })
    await h.svc.deleteCompletion(stepId, '2026-10-13')
    expect((await h.svc.listCompletions(stepId)).length).toBe(0)
    await expect(h.svc.deleteCompletion(stepId, '2026-10-13')).rejects.toBeInstanceOf(CompletionNotFoundError)
  })

  it('listCompletions returns the ledger sorted by date', async () => {
    await h.svc.completeStep(stepId, { date: '2026-10-15' })
    await h.svc.completeStep(stepId, { date: '2026-10-13' })
    await h.svc.skipStep(stepId, { date: '2026-10-14', reason: 'x' })
    expect((await h.svc.listCompletions(stepId)).map((c) => c.completed_date)).toEqual([
      '2026-10-13',
      '2026-10-14',
      '2026-10-15',
    ])
  })

  // ── failure paths ──────────────────────────────────────────────────
  it('completeStep/skipStep on a missing or archived step throw StepNotFoundError — no orphan completion (RT-3)', async () => {
    await expect(h.svc.completeStep('no-such-step', { date: '2026-10-13' })).rejects.toBeInstanceOf(StepNotFoundError)
    await h.svc.removeStep(stepId) // soft-delete the step
    await expect(h.svc.skipStep(stepId, { date: '2026-10-13' })).rejects.toBeInstanceOf(StepNotFoundError)
  })

  it('planSkipDates on a missing step throws StepNotFoundError', async () => {
    await expect(h.svc.planSkipDates('no-such-step', ['2026-10-20'])).rejects.toBeInstanceOf(StepNotFoundError)
  })
})

// ============================================================================
// S2c — floor conformance (PLAN-S2c-floor-conformance.md · Verification Gate 1–13)
// ============================================================================
describe('mod-routines S2c — floor conformance', () => {
  let h: Harness
  let routineId: string
  const queueCount = async (): Promise<number> => (await h.db.select().from(syncQueue).all()).length
  beforeEach(async () => {
    h = await setup()
    routineId = (await h.svc.createRoutine({ name: 'Morning' })).id
  })

  // 1 — setLifecycle happy path (ROU-17, A6)
  it('setLifecycle moves paused → off → active, each returning the faithful row', async () => {
    for (const lc of ['paused', 'off', 'active'] as const) {
      const r = await h.svc.setLifecycle(routineId, lc)
      expect(r.lifecycle).toBe(lc)
      expect((await h.svc.getRoutine(routineId))?.lifecycle).toBe(lc)
    }
  })

  // 2 — setLifecycle on an archived / missing routine → typed, no write
  it('setLifecycle on an archived or missing routine throws RoutineNotFoundError with no write', async () => {
    await h.svc.archiveRoutine(routineId)
    const rowBefore = (await h.bsql.prepare('SELECT _sync_version, updated_at, lifecycle FROM routines WHERE id = ?').get(routineId)) as Record<string, unknown>
    const before = await queueCount()
    await expect(h.svc.setLifecycle(routineId, 'paused')).rejects.toBeInstanceOf(RoutineNotFoundError)
    await expect(h.svc.setLifecycle('no-such-routine', 'paused')).rejects.toBeInstanceOf(RoutineNotFoundError)
    expect(await queueCount()).toBe(before)
    expect(h.bsql.prepare('SELECT _sync_version, updated_at, lifecycle FROM routines WHERE id = ?').get(routineId)).toEqual(rowBefore)
  })

  // 3 — setLifecycle off-tuple → ZodError, no write
  it('setLifecycle rejects an off-tuple lifecycle before any write', async () => {
    const before = await queueCount()
    await expect(h.svc.setLifecycle(routineId, 'sleeping' as never)).rejects.toBeInstanceOf(ZodError)
    expect((await h.svc.getRoutine(routineId))?.lifecycle).toBe('active')
    expect(await queueCount()).toBe(before)
  })

  // 4 — addStep entity_type validated against the registry (A10, R2)
  it('addStep validates entity_type against the registry; unregistered → UnknownEntityType, no row', async () => {
    await expect(h.svc.addStep(routineId, { title: 'Read', entity_type: 'habit', entity_id: 'h1' })).resolves.toBeTruthy()
    await expect(h.svc.addStep(routineId, { title: 'Alarm' })).resolves.toBeTruthy() // null entity_type = actionable
    const before = await queueCount()
    await expect(
      h.svc.addStep(routineId, { title: 'Bad', entity_type: 'not_a_type', entity_id: 'x' }),
    ).rejects.toBeInstanceOf(UnknownEntityType)
    expect((await h.svc.listSteps(routineId)).length).toBe(2)
    expect(await queueCount()).toBe(before)
  })

  // 5 — updateStep entity_type validated too
  it('updateStep setting an unregistered entity_type throws UnknownEntityType and leaves the step unchanged', async () => {
    const s = await h.svc.addStep(routineId, { title: 'Read', entity_type: 'habit', entity_id: 'h1' })
    const before = await queueCount()
    await expect(h.svc.updateStep(s.id, { entity_type: 'not_a_type' })).rejects.toBeInstanceOf(UnknownEntityType)
    expect((await h.svc.listSteps(routineId))[0].entity_type).toBe('habit')
    expect(await queueCount()).toBe(before)
  })

  // 6 — calendar-date shape on every date entry point (B1, rule 16)
  it('rejects a non YYYY-MM-DD date at every date entry point, with no write', async () => {
    const s = await h.svc.addStep(routineId, { title: 'Read' })
    await h.svc.completeStep(s.id, { date: '2026-10-20' })
    const before = await queueCount()
    await expect(h.svc.completeStep(s.id, { date: '2026-1-5' })).rejects.toBeInstanceOf(ZodError)
    await expect(h.svc.skipStep(s.id, { date: 'yesterday' })).rejects.toBeInstanceOf(ZodError)
    await expect(h.svc.planSkipDates(s.id, ['2026/10/01'])).rejects.toBeInstanceOf(ZodError)
    await expect(h.svc.addStep(routineId, { title: 'X', skip_dates: ['bad'] })).rejects.toBeInstanceOf(ZodError)
    await expect(h.svc.updateStep(s.id, { skip_dates: ['bad'] })).rejects.toBeInstanceOf(ZodError)
    // ZodError, not CompletionNotFoundError — the declared B1 error-type change (pre-S2c code threw the latter).
    await expect(h.svc.editCompletion(s.id, 'bad', { skipped: true })).rejects.toBeInstanceOf(ZodError)
    await expect(h.svc.deleteCompletion(s.id, 'bad')).rejects.toBeInstanceOf(ZodError)
    expect(await queueCount()).toBe(before)
    await expect(h.svc.planSkipDates(s.id, ['2026-12-24'])).resolves.toBeTruthy()
  })

  // 7 — progress override 0..100 int (B2)
  it('progress accepts 0, 100, null and rejects 101, -1, 1.5', async () => {
    for (const ok of [0, 100, null]) await expect(h.svc.updateRoutine(routineId, { progress: ok })).resolves.toBeTruthy()
    await h.svc.updateRoutine(routineId, { progress: 40 })
    for (const bad of [101, -1, 1.5]) await expect(h.svc.updateRoutine(routineId, { progress: bad })).rejects.toBeInstanceOf(ZodError)
    expect((await h.svc.getRoutine(routineId))?.progress).toBe(40) // rejected updates leave the stored value
  })

  // 8 — recurrence_rule parse-validated at write (B3; verified ical.js 2.2.1 behaviour)
  it('validates recurrence_rule: FREQ required, parser throws rejected, null allowed', async () => {
    for (const ok of ['FREQ=DAILY', 'FREQ=WEEKLY;BYDAY=MO,WE', 'FREQ=DAILY;INTERVAL=0']) {
      await expect(h.svc.createRoutine({ name: 'R', recurrence_rule: ok })).resolves.toBeTruthy()
    }
    await expect(h.svc.createRoutine({ name: 'R', recurrence_rule: null })).resolves.toBeTruthy()
    const routinesBefore = (await h.svc.listRoutines()).length
    const queueBefore = await queueCount()
    for (const bad of ['NOT A RULE', 'BYDAY=MO', '', 'RRULE:FREQ=DAILY', 'FREQ=BOGUS', 'FREQ=DAILY;COUNT=abc', 'FREQ=DAILY;BYDAY=XX']) {
      await expect(h.svc.createRoutine({ name: 'R', recurrence_rule: bad })).rejects.toBeInstanceOf(InvalidRecurrenceRuleError)
    }
    expect((await h.svc.listRoutines()).length).toBe(routinesBefore)
    expect(await queueCount()).toBe(queueBefore)
    await h.svc.updateRoutine(routineId, { recurrence_rule: 'FREQ=DAILY' })
    await expect(h.svc.updateRoutine(routineId, { recurrence_rule: 'BYDAY=MO' })).rejects.toBeInstanceOf(InvalidRecurrenceRuleError)
    expect((await h.svc.getRoutine(routineId))?.recurrence_rule).toBe('FREQ=DAILY')
  })

  // 9 — non-empty name/title (B16)
  it('rejects an empty name or title on create and update', async () => {
    await expect(h.svc.createRoutine({ name: '' })).rejects.toBeInstanceOf(ZodError)
    await expect(h.svc.updateRoutine(routineId, { name: '' })).rejects.toBeInstanceOf(ZodError)
    await expect(h.svc.addStep(routineId, { title: '' })).rejects.toBeInstanceOf(ZodError)
    const s = await h.svc.addStep(routineId, { title: 'Ok' })
    await expect(h.svc.updateStep(s.id, { title: '' })).rejects.toBeInstanceOf(ZodError)
  })

  // 10 — listRoutines ordering: sort_order, created_at, id codepoint (A8)
  it('listRoutines orders by sort_order, then created_at, then id', async () => {
    await h.svc.archiveRoutine(routineId)
    let t = 1_000
    const spy = vi.spyOn(Date, 'now').mockImplementation(() => (t += 10))
    const c = await h.svc.createRoutine({ name: 'C', sort_order: 1 })
    const a = await h.svc.createRoutine({ name: 'A', sort_order: 0 })
    const b = await h.svc.createRoutine({ name: 'B', sort_order: 0 })
    spy.mockImplementation(() => 5_000) // forced same created_at → id codepoint decides
    const x = await h.svc.createRoutine({ name: 'X', sort_order: 2 })
    const y = await h.svc.createRoutine({ name: 'Y', sort_order: 2 })
    spy.mockRestore()
    const ids = (await h.svc.listRoutines()).map((r) => r.id)
    const [first, second] = [x.id, y.id].sort()
    expect(ids).toEqual([a.id, b.id, c.id, first, second])
  })

  // 11 — addStep appends (max+1); reorder then add lands last (A11)
  it('addStep appends at max+1 over live steps; explicit step_order wins; reorder-then-add lands last', async () => {
    const a = await h.svc.addStep(routineId, { title: 'A' })
    const b = await h.svc.addStep(routineId, { title: 'B' })
    const c = await h.svc.addStep(routineId, { title: 'C' })
    expect([a.step_order, b.step_order, c.step_order]).toEqual([0, 1, 2])
    const pinned = await h.svc.addStep(routineId, { title: 'P', step_order: 0 })
    expect(pinned.step_order).toBe(0)
    await h.svc.removeStep(pinned.id)
    await h.svc.reorderSteps(routineId, [c.id, a.id, b.id])
    const d = await h.svc.addStep(routineId, { title: 'D' })
    expect((await h.svc.listSteps(routineId)).map((s) => s.id)).toEqual([c.id, a.id, b.id, d.id])
  })

  // 12 — reorderSteps returns the live steps (A12)
  it('reorderSteps returns the live steps in the new order, deep-equal to a fresh listSteps', async () => {
    const a = await h.svc.addStep(routineId, { title: 'A' })
    const b = await h.svc.addStep(routineId, { title: 'B' })
    const returned = await h.svc.reorderSteps(routineId, [b.id, a.id])
    expect(returned.map((s) => s.id)).toEqual([b.id, a.id])
    expect(returned).toEqual(await h.svc.listSteps(routineId))
  })

  // 13 — persistence probe (RT-18)
  it('setLifecycle enqueues a co-transactional sync_queue row', async () => {
    const before = (await h.db.select().from(syncQueue).all()).filter((x) => x.row_id === routineId).length
    await h.svc.setLifecycle(routineId, 'paused')
    const after = (await h.db.select().from(syncQueue).all()).filter((x) => x.row_id === routineId).length
    expect(after).toBeGreaterThan(before)
  })
})
